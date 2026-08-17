"""Export model outputs as static JSON for the web dashboard.

Everything the frontend renders comes from these files — real data, no
frontend-side fabrication. Scenario grid is precomputed so the scenario studio
works instantly client-side; the live /optimise API supersedes it when running.

Outputs (web/src/data/):
  blocks.geo.json      — simplified 2021-vintage polygons + per-block properties
  blocks.json          — per-block detail: timeseries + forecasts + exposure
  summary.json         — state KPIs, category counts per year, district rollups
  plan.json            — M4 default-scenario plan rows + totals
  scenarios.json       — precomputed optimiser grid (budget x equity x rainfall)
  eval.json            — headline eval numbers for the transparency section
"""

from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
import pandas as pd

from jal.optimise.convergence import assign
from jal.optimise.milp import baseline_severity, baseline_uniform, solve

OUT = Path("data/processed")
WEB = Path("web/src/data")


def r(x, nd=1):
    return None if x is None or pd.isna(x) else round(float(x), nd)


def export_geo(panel: pd.DataFrame) -> None:
    gdf = gpd.read_file("data/raw/boundaries/rajasthan_blocks_ingres.geojson")
    gdf = gdf[(gdf["type"] == "BLOCK") & (gdf["year"] == 2021)][["uuid", "geometry"]]
    gdf["geometry"] = gdf.geometry.simplify(0.005, preserve_topology=True)

    latest = panel[panel.year == 2025].set_index("block_uuid")
    m1 = pd.read_parquet(OUT / "m1_predictions.parquet").set_index("block_uuid")
    m2 = pd.read_parquet(OUT / "m2_predictions.parquet").set_index("block_uuid")
    m3 = pd.read_parquet(OUT / "m3_exposure.parquet").set_index("block_uuid")
    per = pd.read_parquet(OUT / "m5_anomalies.parquet").set_index("block_uuid") \
        if (OUT / "m5_anomalies.parquet").exists() else None
    tr = pd.read_parquet(OUT / "depth_trends.parquet").set_index("block_uuid") \
        if (OUT / "depth_trends.parquet").exists() else None

    feats = []
    for _, row in gdf.iterrows():
        u = row["uuid"]
        if u not in latest.index:
            continue
        p = latest.loc[u]
        props = {
            "uuid": u,
            "name": str(p.block_name).title(),
            "district": str(p.district_name).title(),
            "category": p.category if pd.notna(p.category) else "saline",
            "stage": r(p.stage_pct),
            "trendStage": r(p.stage_pct - panel[(panel.block_uuid == u) & (panel.year == 2024)]
                            .stage_pct.iloc[0]) if len(panel[(panel.block_uuid == u)
                            & (panel.year == 2024)]) else None,
            "pWorsens": r(m2.p_worsens.get(u), 3),
            "stageQ50": r(m1.stage_q50.get(u)),
            "fluoride": bool(m3.fluoride.get(u, False)),
            "peopleAtRisk": int(m3.people_at_risk_fluoride.get(u, 0)),
            "persona": str(per.persona_en.get(u)) if per is not None and u in per.index else None,
            "personaColor": str(per.persona_color.get(u)) if per is not None and u in per.index else None,
            "anomaly": bool(per.anomaly.get(u, False)) if per is not None and u in per.index else False,
            "depthTrend": r(tr.depth_trend_m_per_yr.get(u), 2) if tr is not None and u in tr.index else None,
        }
        feats.append({"type": "Feature", "geometry": row.geometry.__geo_interface__,
                      "properties": props})
    WEB.mkdir(parents=True, exist_ok=True)
    json.dump({"type": "FeatureCollection", "features": feats},
              open(WEB / "blocks.geo.json", "w"))
    print(f"blocks.geo.json: {len(feats)} features, "
          f"{(WEB / 'blocks.geo.json').stat().st_size / 1e6:.1f} MB")


def export_blocks(panel: pd.DataFrame) -> None:
    m1 = pd.read_parquet(OUT / "m1_predictions.parquet").set_index("block_uuid")
    m2 = pd.read_parquet(OUT / "m2_predictions.parquet").set_index("block_uuid")
    m3 = pd.read_parquet(OUT / "m3_exposure.parquet").set_index("block_uuid")
    xwalk_ts: dict[str, list] = {}
    for u, grp in panel.groupby("block_uuid"):
        ts = [
            {
                "year": int(g.year),
                "stage": r(g.stage_pct),
                "rechargeHam": r(g.recharge_total_ham, 0),
                "extractionHam": r(g.extraction_total_ham, 0),
                "rainfallMm": r(g.rainfall_mm, 0),
                "category": g.category if pd.notna(g.category) else None,
            }
            for _, g in grp.sort_values("year").iterrows()
        ]
        xwalk_ts[u] = ts

    blocks = {}
    latest = panel[panel.year == 2025]
    for _, p in latest.iterrows():
        u = p.block_uuid
        blocks[u] = {
            "uuid": u,
            "name": str(p.block_name).title(),
            "district": str(p.district_name).title(),
            "category": p.category if pd.notna(p.category) else "saline",
            "stage": r(p.stage_pct),
            "timeseries": xwalk_ts.get(u, []),
            "forecast": {
                "year": 2026,
                "q10": r(m1.stage_q10.get(u)),
                "q50": r(m1.stage_q50.get(u)),
                "q90": r(m1.stage_q90.get(u)),
            },
            "pWorsens": r(m2.p_worsens.get(u), 3),
            "probs": {
                c: r(m2[f"p_{c}"].get(u), 3)
                for c in ("safe", "semi_critical", "critical", "over_exploited")
                if u in m2.index
            },
            "fluoride": bool(m3.fluoride.get(u, False)),
            "fluoridePartial": bool(m3.fluoride_partial.get(u, False)),
            "peopleAtRisk": int(m3.people_at_risk_fluoride.get(u, 0)),
            "population": int(m3.population_est.get(u, 0)),
        }
    json.dump(blocks, open(WEB / "blocks.json", "w"))
    print(f"blocks.json: {len(blocks)} blocks")


def export_summary(panel: pd.DataFrame) -> None:
    m3 = pd.read_parquet(OUT / "m3_exposure.parquet")
    cat_by_year = {}
    for y, grp in panel.groupby("year"):
        cat_by_year[int(y)] = grp.category.value_counts().to_dict()
    latest = panel[panel.year == 2025]
    summary = {
        "blocks": int(latest.block_uuid.nunique()),
        "overExploited": int((latest.category == "over_exploited").sum()),
        "critical": int((latest.category == "critical").sum()),
        "semiCritical": int((latest.category == "semi_critical").sum()),
        "safe": int((latest.category == "safe").sum()),
        "extractionOverRecharge": r(100 * latest.extraction_total_ham.sum()
                                    / latest.recharge_total_ham.sum()),
        "fluorideBlocks": int(m3.fluoride.sum()),
        "peopleAtRisk": int(m3.people_at_risk_fluoride.sum()),
        "categoryByYear": cat_by_year,
        "districts": [
            {
                "name": str(d).title(),
                "blocks": int(len(g)),
                "overExploited": int((g.category == "over_exploited").sum()),
                "meanStage": r(g.stage_pct.mean()),
            }
            for d, g in latest.groupby("district_name")
        ],
    }
    json.dump(summary, open(WEB / "summary.json", "w"))
    print("summary.json written")


def export_plan() -> dict:
    res = solve()
    plan = res["plan"]
    df, cfg = res["_inputs"], res["_cfg"]
    plan, scheme_rollup = assign(plan, res["budget_lakh"], cfg)
    scheme_by_block = (
        plan.groupby(["block_uuid", "funding_scheme"])["cost_lakh"].sum().reset_index()
    )
    scheme_map: dict[str, dict] = {}
    for _, sb in scheme_by_block.iterrows():
        scheme_map.setdefault(sb.block_uuid, {})[sb.funding_scheme] = round(float(sb.cost_lakh))
    by_block = (
        plan.groupby(["block_uuid", "block_name", "district_name", "category", "fluoride"])
        .agg(costLakh=("cost_lakh", "sum"), rechargeHam=("recharge_ham", "sum"))
        .reset_index()
    )
    by_block["lakhPerHam"] = by_block.costLakh / by_block.rechargeHam
    structures = (
        plan.groupby(["block_uuid", "structure"])["count"].sum().reset_index()
    )
    struct_map: dict[str, dict] = {}
    for _, s in structures.iterrows():
        struct_map.setdefault(s.block_uuid, {})[s.structure] = int(s["count"])
    rows = []
    for _, b in by_block.sort_values("lakhPerHam").iterrows():
        rows.append(
            {
                "uuid": b.block_uuid,
                "name": str(b.block_name).title(),
                "district": str(b.district_name).title(),
                "category": b.category,
                "fluoride": bool(b.fluoride),
                "costLakh": r(b.costLakh, 0),
                "rechargeHam": r(b.rechargeHam, 0),
                "lakhPerHam": r(b.lakhPerHam, 2),
                "structures": struct_map.get(b.block_uuid, {}),
                "schemes": scheme_map.get(b.block_uuid, {}),
            }
        )
    b_uni = baseline_uniform(df, cfg, res["budget_lakh"], 1.0)
    b_sev = baseline_severity(df, cfg, res["budget_lakh"], 1.0)
    json.dump(
        {
            "budgetLakh": res["budget_lakh"],
            "equityShare": res["equity_share"],
            "totalRechargeHam": r(res["total_recharge_ham"], 0),
            "totalCostLakh": r(res["total_cost_lakh"], 0),
            "structureCount": int(plan["count"].sum()),
            "blockCount": int(plan.block_uuid.nunique()),
            "liftVsUniformPct": r(100 * (res["objective_weighted_ham"] - b_uni) / b_uni),
            "liftVsSeverityPct": r(100 * (res["objective_weighted_ham"] - b_sev) / b_sev),
            "schemeRollup": scheme_rollup,
            "structureCatalog": {
                k: {
                    "en": v["label_en"], "hi": v["label_hi"],
                    "costLakh": v["unit_cost_lakh"], "ham": v["recharge_ham_per_year"],
                }
                for k, v in cfg["structures"].items()
            },
            "rows": rows,
        },
        open(WEB / "plan.json", "w"),
    )
    print(f"plan.json: {len(rows)} blocks")
    return res


def export_scenarios(res: dict) -> None:
    # scenario grid — small, near-optimal solves for instant client-side sliders
    import pulp  # noqa: F401  (ensure solver available before the long loop)

    grid = []
    for bf in (0.5, 1.0, 1.5):
        for eq in (0.0, 0.25, 0.5):
            for rf in (0.8, 1.0, 1.2):
                s = solve(res["budget_lakh"] * bf, eq, rf)
                p = s["plan"]
                top = (
                    p.groupby(["block_name", "district_name"])["cost_lakh"].sum()
                    .nlargest(8).reset_index()
                )
                grid.append(
                    {
                        "budgetFactor": bf,
                        "equityShare": eq,
                        "rainfallFactor": rf,
                        "totalRechargeHam": r(s["total_recharge_ham"], 0),
                        "totalCostLakh": r(s["total_cost_lakh"], 0),
                        "structureCount": int(p["count"].sum()) if len(p) else 0,
                        "blockCount": int(p.block_uuid.nunique()) if len(p) else 0,
                        "topBlocks": [
                            {"name": str(t.block_name).title(),
                             "district": str(t.district_name).title(),
                             "costLakh": r(t.cost_lakh, 0)}
                            for _, t in top.iterrows()
                        ],
                    }
                )
                print(f"scenario bf={bf} eq={eq} rf={rf}: "
                      f"{grid[-1]['totalRechargeHam']} ham")
    json.dump(grid, open(WEB / "scenarios.json", "w"))
    print(f"scenarios.json: {len(grid)} scenarios")


def export_eval() -> None:
    json.dump(
        {
            "groundTruth": {"blocks2022": 302, "split": [219, 22, 20, 38, 3],
                            "reconciledRows": 1792, "unmatched": 0},
            "m1": {"champion": "persistence",
                   "maePersistence": [10.49, 4.27, 5.38],
                   "maeChallenger": [12.70, 4.64, 6.56],
                   "coverage": [0.91, 0.98, 0.88], "testYears": [2023, 2024, 2025]},
            "m2": {"macroRecall": [0.69, 0.95, 0.85],
                   "precisionTop50": [0.10, 0.10, 0.14], "baseRate": 0.02},
            "m3": {"fluorideBlocks": 68, "peopleAtRiskM": 11.7, "beltCheck": "pass"},
            "m4": {"liftVsUniformPct": 68.8, "liftVsSeverityPct": 0.5,
                   "solveSeconds": 25},
        },
        open(WEB / "eval.json", "w"),
    )
    print("eval.json written")


def main() -> None:
    panel = pd.read_parquet(OUT / "block_year.parquet")
    export_geo(panel)
    export_blocks(panel)
    export_summary(panel)
    res = export_plan()
    export_scenarios(res)
    export_eval()


if __name__ == "__main__":
    main()
