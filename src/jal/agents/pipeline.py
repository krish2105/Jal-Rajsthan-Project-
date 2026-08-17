"""Multi-agent analysis pipeline — Hydrologist → Economist → Equity Auditor →
Critic → Report Writer, producing a per-block investment briefing.

Deliberate design choice: the topology is FIXED (a deterministic sequential graph
with one critic gate), not an LLM-routed swarm. At this scale a framework adds
nothing — every hop is auditable, every node's input is typed, and the critic's
rejection criteria are enumerable. The LLM writes prose; every number in the
briefing comes from the evidence pack assembled by deterministic tools.

Streams typed trace events so the UI can show the reasoning live:
  {type:"agent_start"|"agent_output"|"critic_verdict"|"final"|"error", ...}
"""

from __future__ import annotations

import re
from collections.abc import Iterator
from typing import Any

from jal.agents.copilot import _strip_think
from jal.agents.llm import get_client, load_replays
from jal.agents.tools import EvidenceRegistry, get_block, get_plan_top, get_watchlist

AGENTS = {
    "hydrologist": (
        "You are the Hydrologist. Given the block's data pack, assess the physical "
        "groundwater situation: stage trajectory, forecast band, what it means for the "
        "aquifer. 3-4 sentences, cite evidence ids like [E1]. Numbers only from the pack."
    ),
    "economist": (
        "You are the Economist. Given the data pack and the hydrologist's note, assess "
        "investment efficiency: is this block in the cost-effective plan, what does "
        "₹/hectare-metre look like vs alternatives. 3-4 sentences, cite [E*]."
    ),
    "equity": (
        "You are the Equity Auditor. Assess exposure: fluoride tagging, population at "
        "risk, whether pure cost-efficiency would under-serve this block and why the "
        "equity floor matters (or not) here. 2-3 sentences, cite [E*]."
    ),
    "writer": (
        "You are the Report Writer for a Joint Secretary. Merge the three specialist "
        "notes into a crisp briefing: Situation / Investment case / Equity note / "
        "Recommendation. <=160 words, keep the [E*] citations, no invented numbers."
    ),
}

CRITIC_RULES = """You are the Critic. Reject the draft if ANY of:
R1: a numeric claim carries no [E*] citation
R2: a cited number contradicts the evidence pack
R3: a recommendation exceeds what the models can support (causal claims, guarantees)
R4: hedging so vague the briefing says nothing
Reply exactly: VERDICT: ACCEPT  or  VERDICT: REJECT <rule id> — <one-line reason>."""


def _evidence_pack(block_name: str) -> tuple[EvidenceRegistry, str]:
    reg = EvidenceRegistry()
    b = get_block(block_name)
    e1 = reg.add("get_block", {"name": block_name}, b)
    wl = get_watchlist(10)
    e2 = reg.add("get_watchlist", {"n": 10}, wl)
    plan = get_plan_top(15)
    e3 = reg.add("get_plan_top", {"n": 15}, plan)
    pack = (
        f"[{e1}] block profile: {b}\n"
        f"[{e2}] state watchlist (top10 P(worsens)): {wl}\n"
        f"[{e3}] plan cost-effectiveness top15: {plan}"
    )
    return reg, pack


def run_pipeline(block_name: str) -> Iterator[dict[str, Any]]:
    client, model, provider = get_client()
    if provider == "replay":
        yield from _replay_pipeline(block_name)
        return

    try:
        reg, pack = _evidence_pack(block_name)
        yield {"type": "evidence", "count": len(reg.items), "block": block_name}

        notes: dict[str, str] = {}
        for role in ("hydrologist", "economist", "equity"):
            yield {"type": "agent_start", "agent": role}
            context = "\n\n".join(f"{k} note: {v}" for k, v in notes.items())
            resp = client.chat.completions.create(
                model=model,
                temperature=0.3,
                messages=[
                    {"role": "system", "content": AGENTS[role]},
                    {"role": "user", "content": f"DATA PACK:\n{pack}\n\n{context}"},
                ],
            )
            note = _strip_think(resp.choices[0].message.content or "")
            notes[role] = note
            yield {"type": "agent_output", "agent": role, "text": note}

        draft = ""
        for attempt in range(2):
            yield {"type": "agent_start", "agent": "writer", "attempt": attempt + 1}
            resp = client.chat.completions.create(
                model=model,
                temperature=0.3,
                messages=[
                    {"role": "system", "content": AGENTS["writer"]},
                    {"role": "user",
                     "content": f"DATA PACK:\n{pack}\n\nNOTES:\n"
                                + "\n\n".join(f"{k}: {v}" for k, v in notes.items())
                                + ("" if attempt == 0 else
                                   "\n\nYour previous draft was REJECTED by the critic. "
                                   "Fix the cited problem.")},
                ],
            )
            draft = _strip_think(resp.choices[0].message.content or "")
            yield {"type": "agent_output", "agent": "writer", "text": draft}

            yield {"type": "agent_start", "agent": "critic"}
            resp = client.chat.completions.create(
                model=model,
                temperature=0.0,
                messages=[
                    {"role": "system", "content": CRITIC_RULES},
                    {"role": "user", "content": f"EVIDENCE PACK:\n{pack}\n\nDRAFT:\n{draft}"},
                ],
            )
            verdict = _strip_think(resp.choices[0].message.content or "")
            accepted = bool(re.search(r"VERDICT:\s*ACCEPT", verdict, re.I))
            yield {"type": "critic_verdict", "accepted": accepted, "text": verdict}
            if accepted:
                break

        yield {"type": "final", "briefing": draft, "block": block_name,
               "evidence": reg.items, "provider": provider, "model": model}
    except Exception as exc:
        yield {"type": "error", "message": f"{type(exc).__name__}: {exc}"}


def _replay_pipeline(block_name: str) -> Iterator[dict[str, Any]]:
    replays = load_replays().get("pipeline", {})
    key = block_name.title()
    events = replays.get(key) or next(iter(replays.values()), None)
    if not events:
        yield {"type": "error",
               "message": "No LLM configured and no recorded pipeline run available."}
        return
    yield from events
