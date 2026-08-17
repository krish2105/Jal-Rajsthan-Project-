"""M4 — MGNREGA-budget-constrained recharge siting optimiser (MILP, PuLP/CBC).

maximise   sum over blocks b, structures s of
              n[b,s] * recharge_ham(s) * risk_weight(b)
subject to sum n[b,s] * cost(s)               <= budget_lakh
           n[b,s]                             <= feasibility_cap(b, s)
           sum over fluoride blocks of spend  >= equity_share * budget
           n[b,s] integer >= 0

risk_weight(b) = normalised stage severity + M2 P(worsens)  (deterministic inputs).

Baselines (always reported, spec §6/§7):
  uniform        — budget split equally across eligible blocks, greedy fill
  severity_rank  — blocks ordered by stage_pct, each filled to feasibility cap

Outputs: data/processed/m4_plan.parquet, reports/m4_optimiser.md
Public API: solve(budget_lakh, equity_share, rainfall_factor) for the scenario
studio and the agents.
"""

from __future__ import annotations

import time
from pathlib import Path

import pandas as pd
import pulp
import yaml

OUT = Path("data/processed")
REPORTS = Path("reports")
CONFIG = Path("config/structures.yaml")


def load_inputs() -> tuple[pd.DataFrame, dict]:
    cfg = yaml.safe_load(open(CONFIG))
    panel = pd.read_parquet(OUT / "block_year.parquet")
    latest = panel[panel.year == 2025].copy()
    m2 = pd.read_parquet(OUT / "m2_predictions.parquet")[["block_uuid", "p_worsens"]]
    m3 = pd.read_parquet(OUT / "m3_exposure.parquet")[
        ["block_uuid", "fluoride", "people_at_risk_fluoride"]
    ]
    df = latest.merge(m2, on="block_uuid", how="left").merge(m3, on="block_uuid", how="left")
    df["fluoride"] = df["fluoride"].fillna(False)
    df["p_worsens"] = df["p_worsens"].fillna(0.0)

    eligible = set(cfg["policy"]["eligible_categories"])
    df = df[df.category.isin(eligible)].copy()

    stage = df.stage_pct.clip(lower=0, upper=400)
    df["risk_weight"] = (stage / stage.max()).fillna(0.5) + df.p_worsens
    df["area_rw_ha"] = df.area_recharge_worthy_ha.fillna(0.0).clip(lower=0.0)
    return df.reset_index(drop=True), cfg


def feasibility_caps(df: pd.DataFrame, cfg: dict) -> dict[tuple[int, str], int]:
    caps = {}
    for i, r in df.iterrows():
        for s, sc in cfg["structures"].items():
            caps[(i, s)] = int(r.area_rw_ha / 1000.0 * sc["max_per_1000ha_recharge_worthy"])
    return caps


def solve(
    budget_lakh: float | None = None,
    equity_share: float | None = None,
    rainfall_factor: float = 1.0,
) -> dict:
    """rainfall_factor scales expected recharge per structure (scenario lever)."""
    df, cfg = load_inputs()
    budget = budget_lakh if budget_lakh is not None else cfg["policy"]["default_budget_lakh"]
    equity = (
        equity_share
        if equity_share is not None
        else cfg["policy"]["equity_min_share_fluoride"]
    )
    S = cfg["structures"]
    caps = feasibility_caps(df, cfg)

    t0 = time.time()
    prob = pulp.LpProblem("jal_recharge", pulp.LpMaximize)
    n = {
        (i, s): pulp.LpVariable(f"n_{i}_{s}", lowBound=0, upBound=caps[(i, s)], cat="Integer")
        for i in df.index
        for s in S
        if caps[(i, s)] > 0
    }
    recharge = lambda s: S[s]["recharge_ham_per_year"] * rainfall_factor  # noqa: E731
    prob += pulp.lpSum(
        n[k] * recharge(k[1]) * df.loc[k[0], "risk_weight"] for k in n
    )
    prob += (
        pulp.lpSum(n[k] * S[k[1]]["unit_cost_lakh"] for k in n) <= budget,
        "budget",
    )
    max_share = cfg["policy"].get("max_block_share", 1.0)
    if max_share < 1.0:
        for i in df.index:
            keys = [k for k in n if k[0] == i]
            if keys:
                prob += (
                    pulp.lpSum(n[k] * S[k[1]]["unit_cost_lakh"] for k in keys)
                    <= max_share * budget,
                    f"block_cap_{i}",
                )
    fl_idx = set(df[df.fluoride].index)
    if fl_idx and equity > 0:
        prob += (
            pulp.lpSum(n[k] * S[k[1]]["unit_cost_lakh"] for k in n if k[0] in fl_idx)
            >= equity * budget,
            "equity_fluoride",
        )
    prob.solve(pulp.PULP_CBC_CMD(msg=False, timeLimit=25))
    solve_s = time.time() - t0

    rows = []
    for (i, s), var in n.items():
        v = int(var.value() or 0)
        if v > 0:
            rows.append(
                {
                    "block_uuid": df.loc[i, "block_uuid"],
                    "block_name": df.loc[i, "block_name"],
                    "district_name": df.loc[i, "district_name"],
                    "category": df.loc[i, "category"],
                    "fluoride": bool(df.loc[i, "fluoride"]),
                    "structure": s,
                    "count": v,
                    "cost_lakh": v * S[s]["unit_cost_lakh"],
                    "recharge_ham": v * recharge(s),
                    "weighted_value": v * recharge(s) * df.loc[i, "risk_weight"],
                }
            )
    plan = pd.DataFrame(rows)
    obj = float(pulp.value(prob.objective) or 0.0)
    return {
        "status": pulp.LpStatus[prob.status],
        "objective_weighted_ham": obj,
        "total_recharge_ham": float(plan.recharge_ham.sum()) if len(plan) else 0.0,
        "total_cost_lakh": float(plan.cost_lakh.sum()) if len(plan) else 0.0,
        "solve_seconds": solve_s,
        "budget_lakh": budget,
        "equity_share": equity,
        "rainfall_factor": rainfall_factor,
        "plan": plan,
        "_inputs": df,
        "_cfg": cfg,
    }


def baseline_uniform(df: pd.DataFrame, cfg: dict, budget: float, rainfall_factor: float) -> float:
    """Equal budget per eligible block, spent greedily by ham/₹ within caps."""
    S = cfg["structures"]
    cap_lakh = cfg['policy'].get('max_block_share', 1.0) * budget
    per_block = min(budget / len(df), cap_lakh)
    order = sorted(S, key=lambda s: S[s]["recharge_ham_per_year"] / S[s]["unit_cost_lakh"],
                   reverse=True)
    total = 0.0
    for i, r in df.iterrows():
        left = per_block
        for s in order:
            cap = int(r.area_rw_ha / 1000.0 * S[s]["max_per_1000ha_recharge_worthy"])
            k = min(cap, int(left // S[s]["unit_cost_lakh"]))
            total += k * S[s]["recharge_ham_per_year"] * rainfall_factor * r.risk_weight
            left -= k * S[s]["unit_cost_lakh"]
    return total


def baseline_severity(df: pd.DataFrame, cfg: dict, budget: float, rainfall_factor: float) -> float:
    """Worst blocks first (by stage), fill each to cap until budget is gone."""
    S = cfg["structures"]
    order_s = sorted(S, key=lambda s: S[s]["recharge_ham_per_year"] / S[s]["unit_cost_lakh"],
                     reverse=True)
    cap_lakh = cfg['policy'].get('max_block_share', 1.0) * budget
    total, left = 0.0, budget
    for _, r in df.sort_values("stage_pct", ascending=False).iterrows():
        if left <= 0:
            break
        block_left = min(cap_lakh, left)
        for s in order_s:
            cap = int(r.area_rw_ha / 1000.0 * S[s]["max_per_1000ha_recharge_worthy"])
            k = min(cap, int(block_left // S[s]["unit_cost_lakh"]))
            total += k * S[s]["recharge_ham_per_year"] * rainfall_factor * r.risk_weight
            spend = k * S[s]["unit_cost_lakh"]
            left -= spend
            block_left -= spend
    return total


def main() -> None:
    res = solve()
    df, cfg = res["_inputs"], res["_cfg"]
    b_uni = baseline_uniform(df, cfg, res["budget_lakh"], res["rainfall_factor"])
    b_sev = baseline_severity(df, cfg, res["budget_lakh"], res["rainfall_factor"])
    lift_uni = 100 * (res["objective_weighted_ham"] - b_uni) / b_uni
    lift_sev = 100 * (res["objective_weighted_ham"] - b_sev) / b_sev

    plan = res["plan"]
    plan.to_parquet(OUT / "m4_plan.parquet", index=False)

    by_block = (
        plan.groupby(["block_name", "district_name"])
        .agg(cost_lakh=("cost_lakh", "sum"), recharge_ham=("recharge_ham", "sum"))
        .assign(lakh_per_ham=lambda d: d.cost_lakh / d.recharge_ham)
        .sort_values("lakh_per_ham")
    )
    lines = [
        "# M4 — recharge siting optimiser",
        "",
        f"Status **{res['status']}** in {res['solve_seconds']:.1f}s "
        f"(budget ₹{res['budget_lakh']:.0f} lakh, equity >= "
        f"{100 * res['equity_share']:.0f}% to fluoride blocks).",
        f"Plan: {plan['count'].sum()} structures across {plan.block_uuid.nunique()} blocks; "
        f"total recharge {res['total_recharge_ham']:.0f} ham/yr at "
        f"₹{res['total_cost_lakh']:.0f} lakh.",
        "",
        "## Lift vs baselines (identical budget, risk-weighted ham objective)",
        "",
        f"- vs uniform allocation: **{lift_uni:+.1f}%**",
        f"- vs severity-ranked allocation: **{lift_sev:+.1f}%**",
        "",
        "## Top 25 blocks by cost-effectiveness (₹ lakh per hectare-metre)",
        "",
        by_block.head(25).to_markdown(floatfmt=".1f"),
        "",
        "Unit costs and per-structure recharge are stated config assumptions",
        "(config/structures.yaml); the ranking, not the absolute ham, is the output.",
    ]
    (REPORTS / "m4_optimiser.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines[:12]))


if __name__ == "__main__":
    main()
