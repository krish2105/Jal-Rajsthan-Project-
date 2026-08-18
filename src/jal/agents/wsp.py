"""Water Security Plan (WSP) generator — the document Atal Bhujal Yojana requires.

Drafts a block-level WSP from the deterministic evidence pack: situation, water
budget, proposed works (from the M4 plan for that block, with funding scheme),
costing, and monitoring indicators. The AI writes prose around numbers it is
given; officials edit and approve. Bilingual on request.

Stream events mirror the pipeline: {type: "wsp_section"|"final"|"error"}.
"""

from __future__ import annotations

import json
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pandas as pd

from jal.agents.copilot import _strip_think
from jal.agents.llm import get_client, load_replays
from jal.agents.tools import EvidenceRegistry, get_block

OUT = Path("data/processed")

SYSTEM = """You draft Water Security Plans (WSPs) for Rajasthan blocks under the
Atal Bhujal Yojana format. You are given the complete evidence pack — block profile,
water budget numbers, and the optimiser's proposed works with funding schemes.
Write in clear administrative prose. NEVER invent numbers: every figure must come
from the pack, cited like [E1]. Sections, in order:
1. स्थिति / Situation — category, stage, trajectory, forecast
2. जल बजट / Water budget — recharge vs extraction, the gap
3. प्रस्तावित कार्य / Proposed works — table-like list: structure, count, cost, scheme
4. निगरानी / Monitoring — which indicators to track till next assessment
Write the section headings bilingual (Hindi / English) and the body in {language}.
Under 300 words total. End with: 'Draft for Gram Sabha review — आँकड़े GWRA/INGRES से.'"""


def _works_for_block(block_name: str) -> list[dict[str, Any]]:
    plan = pd.read_parquet(OUT / "m4_plan.parquet")
    rows = plan[plan.block_name.str.upper() == block_name.upper()]
    if rows.empty:
        return []
    try:
        import yaml

        from jal.optimise.convergence import assign

        cfg = yaml.safe_load(open("config/structures.yaml"))
        full, _ = assign(plan, cfg["policy"]["default_budget_lakh"], cfg)
        rows = full[full.block_name.str.upper() == block_name.upper()]
        return [
            {"structure": r.structure, "count": int(r["count"]),
             "cost_lakh": round(float(r.cost_lakh)), "scheme": r.funding_scheme}
            for _, r in rows.iterrows()
        ]
    except Exception:
        return [
            {"structure": r.structure, "count": int(r["count"]),
             "cost_lakh": round(float(r.cost_lakh))}
            for _, r in rows.iterrows()
        ]


def generate_wsp(block_name: str, language: str = "English") -> Iterator[dict[str, Any]]:
    client, model, provider = get_client()
    if provider == "replay":
        samples = load_replays().get("wsp", {})
        # only ever return the plan recorded for this block — handing back
        # another block's water-security plan is worse than returning nothing
        doc = samples.get(block_name) or samples.get(block_name.title())
        if doc:
            yield {"type": "final", "document": doc, "recorded": True, "block": block_name}
        else:
            available = ", ".join(sorted(samples)) or "none"
            yield {
                "type": "error",
                "message": (
                    f"No LLM and no recorded WSP draft for {block_name}. "
                    f"Recorded blocks: {available}."
                ),
            }
        return
    try:
        reg = EvidenceRegistry()
        profile = get_block(block_name)
        e1 = reg.add("get_block", {"name": block_name}, profile)
        works = _works_for_block(block_name)
        e2 = reg.add("plan_works", {"block": block_name}, works)
        pack = f"[{e1}] block profile: {profile}\n[{e2}] proposed works: {works}"
        resp = client.chat.completions.create(
            model=model,
            temperature=0.3,
            messages=[
                {"role": "system", "content": SYSTEM.replace("{language}", language)},
                {"role": "user", "content": f"EVIDENCE PACK:\n{pack}\n\nDraft the WSP."},
            ],
        )
        doc = _strip_think(resp.choices[0].message.content or "")
        yield {"type": "final", "document": doc, "block": block_name,
               "evidence": reg.items, "provider": provider}
    except Exception as exc:
        yield {"type": "error", "message": f"{type(exc).__name__}: {exc}"}


if __name__ == "__main__":
    import sys

    block = sys.argv[1] if len(sys.argv) > 1 else "Talwara"
    for ev in generate_wsp(block):
        print(json.dumps(ev, ensure_ascii=False)[:800])
