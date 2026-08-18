"""Copilot eval harness — tool routing + answer grounding, scored like a test.

20 cases: each states the question, the tool that SHOULD be called, and a
substring the answer must contain (or must NOT contain). Run:
    uv run python -m jal.eval.copilot_eval
Gate: routing >= 80%, grounding >= 80%, zero unevidenced numeric claims.
"""

from __future__ import annotations

import json
from pathlib import Path

from jal.agents.copilot import chat

CASES = [
    ("How many blocks are over-exploited in Rajasthan?", "get_state_summary", "213", None),
    ("Give me the current groundwater picture for the state.", "get_state_summary", None, None),
    ("Tell me about Jhotwara block.", "get_block", "Jhotwara", None),
    ("What is the stage of extraction in Osian?", "get_block", None, None),
    ("Which blocks are most likely to worsen next year?", "get_watchlist", "Talwara", None),
    ("Show me the top blocks at risk of category deterioration.", "get_watchlist", None, None),
    ("Which blocks give the best value per hectare-metre?", "get_plan_top", None, None),
    ("What are the most cost-effective interventions in the plan?", "get_plan_top", None, None),
    ("What happens if the budget is cut to 300 crore?", "run_optimiser", None, None),
    ("Re-run the plan with a 50% equity floor.", "run_optimiser", None, None),
    ("What does GEC-2015 say about categorization of assessment units?",
     # ranking varies across compilations; routing is the assertion
     "search_documents", None, None),
    ("How does the methodology define recharge worthy area?", "search_documents", None, None),
    # updated 2026-08-19: sentence-window retrieval now reaches the state total
    # (Rs 19,318.10 Cr, Master Plan p.130); the old fixture asserted the WD&SC
    # component (Rs 1,440 Cr) because that was all retrieval could see before.
    ("What does the CGWB Master Plan say about Rajasthan's recharge cost?",
     "search_documents", "19,318", None),
    ("Explain the water level fluctuation method.", "search_documents", None, None),
    ("What is the specific yield used for alluvial areas?", "search_documents", None, None),
    ("राजस्थान में कितने ब्लॉक अति-दोहित हैं?", "get_state_summary", None, None),
    ("नागौर ज़िले की स्थिति बताइए।", "get_block", None, None),
    ("Which district has the worst fluoride exposure?", None, None, None),
    ("How many people are at risk from fluoride?", "get_state_summary", None, None),
    ("Is Talwara worth investing in?", None, None, None),
]


def main() -> None:
    routing_ok = grounded_ok = unevidenced = 0
    scored_routing = scored_grounding = 0
    results = []
    for q, want_tool, must, must_not in CASES:
        evs = list(chat(q))
        tools = [e["tool"] for e in evs if e["type"] == "tool_call"]
        text = next((e["text"] for e in evs if e["type"] == "text"), "")
        audit = next((e.get("audit", {}) for e in evs if e["type"] == "text"), {})
        r = {"q": q[:60], "tools": tools, "ok_route": None, "ok_ground": None}
        if want_tool:
            scored_routing += 1
            r["ok_route"] = want_tool in tools
            routing_ok += bool(r["ok_route"])
        if must or must_not:
            scored_grounding += 1
            ok = (must is None or must in text) and (must_not is None or must_not not in text)
            r["ok_ground"] = ok
            grounded_ok += bool(ok)
        if audit.get("unevidenced_numbers"):
            unevidenced += 1
            r["unevidenced"] = audit["unevidenced_numbers"]
        results.append(r)
        print(f"{'✓' if r['ok_route'] is not False else '✗'} {q[:52]:54s} {tools}")

    route_pct = round(100 * routing_ok / max(scored_routing, 1))
    ground_pct = round(100 * grounded_ok / max(scored_grounding, 1))
    summary = {"cases": len(CASES), "routing_pct": route_pct, "grounding_pct": ground_pct,
               "answers_with_unevidenced_numbers": unevidenced}
    Path("reports").mkdir(exist_ok=True)
    lines = ["# Copilot eval — tool routing & grounding", "",
             f"Cases: {len(CASES)} · routing **{route_pct}%** (gate 80) · "
             f"grounding **{ground_pct}%** (gate 80) · answers with unevidenced "
             f"numbers: **{unevidenced}** (gate 0)", "",
             "| question | tools called | route | ground |", "|---|---|---|---|"]
    for r in results:
        lines.append(f"| {r['q']} | {', '.join(r['tools']) or '-'} | "
                     f"{'✓' if r['ok_route'] else ('✗' if r['ok_route'] is False else '·')} | "
                     f"{'✓' if r['ok_ground'] else ('✗' if r['ok_ground'] is False else '·')} |")
    Path("reports/copilot_eval.md").write_text("\n".join(lines) + "\n")
    Path("web/src/data/copilot_eval.json").write_text(json.dumps(summary))
    print("\n" + json.dumps(summary))


if __name__ == "__main__":
    main()
