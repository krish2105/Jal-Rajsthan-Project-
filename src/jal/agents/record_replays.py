"""Record real agent runs (via local Ollama) into replay fixtures.

The deployed demo has no LLM; it replays these VERBATIM runs — real tool calls,
real model prose, clearly labelled as recorded. Regenerate whenever models or
data change: uv run python -m jal.agents.record_replays
"""

from __future__ import annotations

import json
from pathlib import Path

from jal.agents.copilot import chat
from jal.agents.llm import REPLAY_PATH, detect_provider
from jal.agents.pipeline import run_pipeline

QUESTIONS = [
    "Which blocks are most likely to worsen next year, and what should we do about the top one?",
    "Give me the current groundwater picture for Rajasthan.",
    "Tell me about Jhotwara block in Jaipur.",
    "राजस्थान में भूजल की वर्तमान स्थिति क्या है?",
]

PIPELINE_BLOCKS = ["Talwara"]


def main() -> None:
    provider = detect_provider()
    if provider == "replay":
        raise SystemExit("No live LLM available — cannot record replays.")

    out: dict[str, dict] = {"chat": {}, "pipeline": {}}
    for q in QUESTIONS:
        print(f"chat: {q[:60]}…")
        events = [ev for ev in chat(q)]
        ok = any(e["type"] == "text" for e in events)
        print("   ", "ok" if ok else "FAILED", f"({len(events)} events)")
        if ok:
            for e in events:
                if e["type"] == "text":
                    e["recorded"] = True
            out["chat"][q] = events

    for b in PIPELINE_BLOCKS:
        print(f"pipeline: {b}")
        events = [ev for ev in run_pipeline(b)]
        ok = any(e["type"] == "final" for e in events)
        print("   ", "ok" if ok else "FAILED", f"({len(events)} events)")
        if ok:
            for e in events:
                if e["type"] == "final":
                    e["recorded"] = True
            out["pipeline"][b] = events

    REPLAY_PATH.write_text(json.dumps(out, ensure_ascii=False))
    web = Path("web/src/data/replays.json")
    web.write_text(json.dumps(out, ensure_ascii=False))
    print(f"wrote {REPLAY_PATH} and {web}")


if __name__ == "__main__":
    main()
