"""Agent tools — thin, typed wrappers over the deterministic core.

Every call is registered in an EvidenceRegistry; results carry an evidence id
(E1, E2, …). The copilot's answers must cite these ids; numbers that don't trace
to a registered result are rejected (CLAUDE.md non-negotiable #7).

The LLM never computes: these functions read the panel/model outputs or run the
MILP. The model only decides WHICH tool to call and explains the results.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd

OUT = Path("data/processed")


@dataclass
class EvidenceRegistry:
    items: list[dict[str, Any]] = field(default_factory=list)

    def add(self, tool: str, args: dict[str, Any], result: Any) -> str:
        eid = f"E{len(self.items) + 1}"
        self.items.append({"id": eid, "tool": tool, "args": args, "result": result})
        return eid

    def numbers(self) -> set[str]:
        """All numeric tokens present in registered evidence (for citation checks)."""
        found: set[str] = set()

        def walk(x: Any) -> None:
            if isinstance(x, dict):
                for v in x.values():
                    walk(v)
            elif isinstance(x, list):
                for v in x:
                    walk(v)
            elif isinstance(x, (int, float)) and not isinstance(x, bool):
                found.add(f"{x:.0f}")
                found.add(f"{x:.1f}".rstrip("0").rstrip("."))
                if 0 < abs(x) <= 1:  # probabilities are often quoted as percentages
                    found.add(f"{x * 100:.0f}")
                    found.add(f"{x * 100:.1f}".rstrip("0").rstrip("."))
        walk({"items": self.items})
        return found


def _panel() -> pd.DataFrame:
    return pd.read_parquet(OUT / "block_year.parquet")


def get_state_summary() -> dict[str, Any]:
    p = _panel()
    latest = p[p.year == 2025]
    m3 = pd.read_parquet(OUT / "m3_exposure.parquet")
    return {
        "assessment_year": "GWRA 2025",
        "blocks": int(latest.block_uuid.nunique()),
        "over_exploited": int((latest.category == "over_exploited").sum()),
        "critical": int((latest.category == "critical").sum()),
        "semi_critical": int((latest.category == "semi_critical").sum()),
        "safe": int((latest.category == "safe").sum()),
        "fluoride_tagged_blocks": int(m3.fluoride.sum()),
        "people_at_risk_fluoride": int(m3.people_at_risk_fluoride.sum()),
    }


def get_block(name: str) -> dict[str, Any]:
    p = _panel()
    latest = p[p.year == 2025]
    hit = latest[latest.block_name.str.upper() == name.upper()]
    if hit.empty:
        hit = latest[latest.block_name.str.upper().str.contains(name.upper(), na=False)]
    if hit.empty:
        return {"error": f"block '{name}' not found"}
    r = hit.iloc[0]
    m1 = pd.read_parquet(OUT / "m1_predictions.parquet").set_index("block_uuid")
    m2 = pd.read_parquet(OUT / "m2_predictions.parquet").set_index("block_uuid")
    m3 = pd.read_parquet(OUT / "m3_exposure.parquet").set_index("block_uuid")
    u = r.block_uuid
    hist = p[p.block_uuid == u].sort_values("year")
    return {
        "block": str(r.block_name).title(),
        "district": str(r.district_name).title(),
        "category": r.category,
        "stage_pct_2025": round(float(r.stage_pct), 1) if pd.notna(r.stage_pct) else None,
        "stage_history": {int(g.year): round(float(g.stage_pct), 1)
                          for _, g in hist.iterrows() if pd.notna(g.stage_pct)},
        "forecast_2026_q50": round(float(m1.stage_q50.get(u)), 1) if u in m1.index else None,
        "forecast_2026_band": [round(float(m1.stage_q10.get(u)), 1),
                               round(float(m1.stage_q90.get(u)), 1)] if u in m1.index else None,
        "p_worsens": round(float(m2.p_worsens.get(u)), 3) if u in m2.index else None,
        "fluoride_tagged": bool(m3.fluoride.get(u, False)) if u in m3.index else False,
        "people_at_risk": int(m3.people_at_risk_fluoride.get(u, 0)) if u in m3.index else 0,
    }


def get_watchlist(n: int = 10) -> list[dict[str, Any]]:
    m2 = pd.read_parquet(OUT / "m2_predictions.parquet")
    top = m2.nlargest(min(n, 25), "p_worsens")
    return [
        {
            "block": str(r.block_name).title(),
            "district": str(r.district_name).title(),
            "category": r.category,
            "p_worsens": round(float(r.p_worsens), 3),
        }
        for _, r in top.iterrows()
    ]


def run_optimiser(budget_crore: float = 600, equity_share: float = 0.25,
                  rainfall_factor: float = 1.0) -> dict[str, Any]:
    from jal.optimise.milp import solve

    res = solve(budget_crore * 100, equity_share, rainfall_factor)
    plan = res["plan"]
    by_block = (
        plan.groupby(["block_name", "district_name"])
        .agg(cost_lakh=("cost_lakh", "sum"), recharge_ham=("recharge_ham", "sum"))
        .nlargest(8, "cost_lakh")
        .reset_index()
    )
    return {
        "status": res["status"],
        "budget_crore": budget_crore,
        "equity_share": equity_share,
        "rainfall_factor": rainfall_factor,
        "total_recharge_ham_per_year": round(res["total_recharge_ham"]),
        "structures": int(plan["count"].sum()) if len(plan) else 0,
        "blocks_funded": int(plan.block_uuid.nunique()) if len(plan) else 0,
        "largest_allocations": [
            {"block": str(b.block_name).title(), "district": str(b.district_name).title(),
             "cost_crore": round(float(b.cost_lakh) / 100, 1)}
            for _, b in by_block.iterrows()
        ],
    }


def get_plan_top(n: int = 10) -> list[dict[str, Any]]:
    plan = pd.read_parquet(OUT / "m4_plan.parquet")
    by_block = (
        plan.groupby(["block_name", "district_name"])
        .agg(cost_lakh=("cost_lakh", "sum"), recharge_ham=("recharge_ham", "sum"))
        .reset_index()
    )
    by_block["lakh_per_ham"] = (by_block.cost_lakh / by_block.recharge_ham).round(2)
    top = by_block.nsmallest(min(n, 25), "lakh_per_ham")
    return [
        {"block": str(r.block_name).title(), "district": str(r.district_name).title(),
         "cost_lakh": round(float(r.cost_lakh)), "recharge_ham": round(float(r.recharge_ham)),
         "lakh_per_ham": float(r.lakh_per_ham)}
        for _, r in top.iterrows()
    ]


TOOL_SPECS = [
    {
        "type": "function",
        "function": {
            "name": "get_state_summary",
            "description": "Current Rajasthan groundwater picture: block counts by category, fluoride exposure. Use for any state-level question.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_block",
            "description": "Full profile of one block: category, stage history, 2026 forecast with uncertainty band, worsening probability, fluoride tag.",
            "parameters": {
                "type": "object",
                "properties": {"name": {"type": "string", "description": "block name, e.g. 'Jhotwara'"}},
                "required": ["name"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_watchlist",
            "description": "Blocks most likely to worsen category by next assessment (M2 model ranking).",
            "parameters": {
                "type": "object",
                "properties": {"n": {"type": "integer", "minimum": 1, "maximum": 25}},
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_optimiser",
            "description": "Run the MILP recharge-investment optimiser for a budget (₹ crore), fluoride-equity floor (0-0.5) and rainfall factor (0.8-1.2). Returns the plan summary.",
            "parameters": {
                "type": "object",
                "properties": {
                    "budget_crore": {"type": "number", "minimum": 50, "maximum": 2000},
                    "equity_share": {"type": "number", "minimum": 0, "maximum": 0.5},
                    "rainfall_factor": {"type": "number", "minimum": 0.8, "maximum": 1.2},
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_plan_top",
            "description": "Most cost-effective blocks in the default ₹600-crore plan, ranked by ₹ per hectare-metre.",
            "parameters": {
                "type": "object",
                "properties": {"n": {"type": "integer", "minimum": 1, "maximum": 25}},
                "additionalProperties": False,
            },
        },
    },
]

TOOL_FNS = {
    "get_state_summary": get_state_summary,
    "get_block": get_block,
    "get_watchlist": get_watchlist,
    "run_optimiser": run_optimiser,
    "get_plan_top": get_plan_top,
}


def execute_tool(name: str, args: dict[str, Any], registry: EvidenceRegistry) -> tuple[str, str]:
    """Run tool, register evidence, return (evidence_id, json_result)."""
    fn = TOOL_FNS.get(name)
    if fn is None:
        return "", json.dumps({"error": f"unknown tool {name}"})
    result = fn(**args)
    eid = registry.add(name, args, result)
    return eid, json.dumps({"evidence_id": eid, "result": result}, ensure_ascii=False)
