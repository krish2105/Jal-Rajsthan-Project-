"""Record real agent runs (via local Ollama) into replay fixtures.

The deployed demo has no LLM; it replays these VERBATIM runs — real tool calls,
real model prose, clearly labelled as recorded. Regenerate whenever models or
data change:

    uv run python -m jal.agents.record_replays              # fill in what's missing
    uv run python -m jal.agents.record_replays --force      # re-record everything
    uv run python -m jal.agents.record_replays --only pipeline

Every block offered by a UI dropdown must appear here. When a visitor picks a
block with no recording, the studio has nothing honest to show and falls back to
someone else's run — which reads as the app ignoring the click.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from jal.agents.copilot import chat
from jal.agents.llm import REPLAY_PATH, detect_provider
from jal.agents.pipeline import run_pipeline
from jal.agents.wsp import generate_wsp

WEB_PATH = Path("web/src/data/replays.json")

QUESTIONS = [
    "Which blocks are most likely to worsen next year, and what should we do about the top one?",
    "Give me the current groundwater picture for Rajasthan.",
    "Tell me about Jhotwara block in Jaipur.",
    "राजस्थान में भूजल की वर्तमान स्थिति क्या है?",
]

# Names must match the canonical block names in the panel exactly — the UI keys
# its lookup on them ("Jhotwara" silently missed "Jhotwara_Rural" for a while).
PIPELINE_BLOCKS = [
    "Talwara", "Osian", "Jhotwara_Rural", "Kheenvsar",
    "Sayla", "Dechoo", "Reni", "Mundwa",
]

WSP_BLOCKS = ["Sayla", "Bassi", "Dechoo", "Reni", "Mundwa", "Jhotwara_Rural"]


def _load() -> dict[str, dict[str, Any]]:
    """Start from whatever is already recorded, so a partial run never drops
    sections this invocation isn't touching."""
    for path in (REPLAY_PATH, WEB_PATH):
        if path.exists():
            data = json.loads(path.read_text())
            return {k: data.get(k, {}) for k in ("chat", "pipeline", "wsp")}
    return {"chat": {}, "pipeline": {}, "wsp": {}}


def _save(out: dict[str, dict[str, Any]]) -> None:
    blob = json.dumps(out, ensure_ascii=False)
    REPLAY_PATH.write_text(blob)
    WEB_PATH.parent.mkdir(parents=True, exist_ok=True)
    WEB_PATH.write_text(blob)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="re-record entries that already exist")
    ap.add_argument("--only", choices=["chat", "pipeline", "wsp"], help="record just one section")
    args = ap.parse_args()

    if detect_provider() == "replay":
        raise SystemExit("No live LLM available — cannot record replays.")

    out = _load()
    want = {args.only} if args.only else {"chat", "pipeline", "wsp"}

    if "chat" in want:
        for q in QUESTIONS:
            if q in out["chat"] and not args.force:
                print(f"chat: skip (have) {q[:50]}…")
                continue
            print(f"chat: {q[:60]}…")
            events = list(chat(q))
            if any(e["type"] == "text" for e in events):
                for e in events:
                    if e["type"] == "text":
                        e["recorded"] = True
                out["chat"][q] = events
                _save(out)
                print(f"    ok ({len(events)} events)")
            else:
                print("    FAILED")

    if "pipeline" in want:
        for b in PIPELINE_BLOCKS:
            if b in out["pipeline"] and not args.force:
                print(f"pipeline: skip (have) {b}")
                continue
            print(f"pipeline: {b}")
            events = list(run_pipeline(b))
            if any(e["type"] == "final" for e in events):
                for e in events:
                    if e["type"] == "final":
                        e["recorded"] = True
                out["pipeline"][b] = events
                _save(out)  # checkpoint after each block: these runs are slow
                print(f"    ok ({len(events)} events)")
            else:
                print("    FAILED")

    if "wsp" in want:
        for b in WSP_BLOCKS:
            if b in out["wsp"] and not args.force:
                print(f"wsp: skip (have) {b}")
                continue
            print(f"wsp: {b}")
            doc = None
            for ev in generate_wsp(b):
                if ev.get("type") == "final":
                    doc = ev.get("document")
            if doc:
                out["wsp"][b] = doc
                _save(out)
                print(f"    ok ({len(doc)} chars)")
            else:
                print("    FAILED")

    _save(out)
    print(
        f"wrote {REPLAY_PATH} and {WEB_PATH} — "
        f"chat={len(out['chat'])} pipeline={len(out['pipeline'])} wsp={len(out['wsp'])}"
    )


if __name__ == "__main__":
    main()
