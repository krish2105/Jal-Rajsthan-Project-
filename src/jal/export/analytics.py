"""D7 analytics export — every chart's data, precomputed honestly.

Outputs web/src/data/analytics.json:
  sankey        — category transitions across consecutive assessments
  ridgeline     — stage histograms per year (2017..2025)
  scatter       — rainfall vs stage per block (2025) + OLS fit
  sparklines    — district mean stage by year
  forecastFan   — state mean stage by year + 2026 band from M1
  waterfall     — budget by scheme (from convergence rollup)
  donut         — structures by type (from plan)
  kpis          — seasonal recovery, depth trend median, station coverage %,
                  anomaly count, verified-water-spread index, ₹-efficiency by district
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

OUT = Path("data/processed")
WEB = Path("web/src/data")

YEARS = [2017, 2020, 2022, 2023, 2024, 2025]
CATS = ["safe", "semi_critical", "critical", "over_exploited"]


def main() -> None:
    p = pd.read_parquet(OUT / "block_year.parquet")

    # sankey: consecutive-assessment category flows (uuid-stable pairs only)
    links, nodes = [], []
    for i, y in enumerate(YEARS[:-1]):
        ny = YEARS[i + 1]
        a = p[p.year == y].set_index("block_uuid").category
        b = p[p.year == ny].set_index("block_uuid").category
        common = a.index.intersection(b.index)
        flows = pd.DataFrame({"src": a.loc[common], "dst": b.loc[common]}).dropna()
        for (s_, d_), n in flows.value_counts().items():
            links.append({"source": f"{y}:{s_}", "target": f"{ny}:{d_}", "value": int(n)})
    for y in YEARS:
        for c in CATS + ["saline"]:
            if any(l["source"] == f"{y}:{c}" or l["target"] == f"{y}:{c}" for l in links):
                nodes.append({"id": f"{y}:{c}", "year": y, "cat": c})

    # ridgeline: stage histograms
    bins = list(range(0, 420, 20))
    ridge = []
    for y in YEARS:
        s = p[(p.year == y)].stage_pct.dropna().clip(0, 400)
        h, _ = np.histogram(s, bins=bins)
        ridge.append({"year": y, "bins": bins[:-1], "counts": h.tolist()})

    # scatter + OLS (2025)
    l25 = p[p.year == 2025].dropna(subset=["rainfall_mm", "stage_pct"])
    x, ysc = l25.rainfall_mm.to_numpy(), l25.stage_pct.clip(0, 400).to_numpy()
    beta, alpha = np.polyfit(x, ysc, 1)
    scatter = {
        "points": [{"x": round(float(a_), 0), "y": round(float(b_), 0),
                    "n": str(n_).title(), "c": c_}
                   for a_, b_, n_, c_ in zip(x, ysc, l25.block_name, l25.category)],
        "fit": {"alpha": round(float(alpha), 1), "beta": round(float(beta), 3),
                "x0": float(x.min()), "x1": float(x.max())},
    }

    # district sparklines
    spark = []
    for d, g in p.groupby("district_name"):
        series = g.groupby("year").stage_pct.mean().round(0)
        spark.append({"district": str(d).title(),
                      "values": [{"year": int(y), "stage": (None if pd.isna(v) else int(v))}
                                 for y, v in series.items()]})
    spark.sort(key=lambda s: -(s["values"][-1]["stage"] or 0))

    # forecast fan: state mean stage + 2026 band from M1 stage predictions
    fan = [{"year": int(y), "stage": round(float(p[p.year == y].stage_pct.mean()), 1)}
           for y in YEARS]
    m1 = pd.read_parquet(OUT / "m1_predictions.parquet")
    fan.append({"year": 2026, "stage": round(float(m1.stage_q50.mean()), 1),
                "q10": round(float(m1.stage_q10.mean()), 1),
                "q90": round(float(m1.stage_q90.mean()), 1)})

    # waterfall + donut from plan
    plan_json = json.load(open(WEB / "plan.json"))
    waterfall = [{"name": s["label_en"], "nameHi": s["label_hi"],
                  "value": round(s["spentLakh"] / 100)}  # ₹ Cr
                 for s in plan_json.get("schemeRollup", [])]
    plan = pd.read_parquet(OUT / "m4_plan.parquet")
    cat_lookup = plan_json["structureCatalog"]
    donut = [{"name": cat_lookup[s]["en"], "nameHi": cat_lookup[s]["hi"],
              "value": int(n)}
             for s, n in plan.groupby("structure")["count"].sum().items()]

    # KPIs
    dep = pd.read_parquet(OUT / "block_depth_seasons.parquet")
    tr = pd.read_parquet(OUT / "depth_trends.parquet")
    anom = json.load(open(WEB / "anomalies.json"))
    reg21 = set(pd.read_csv(OUT / "canonical_blocks.csv").query("vintage==2021").block_uuid)
    station_cov = len(set(dep[dep.block_uuid.isin(reg21)]
                          .dropna(subset=["premonsoon_depth_m"]).block_uuid))
    try:
        # seasonal water-spread signal: post-monsoon mean minus pre-monsoon mean
        # per site (the physically meaningful comparison, not first-vs-last scene)
        wv = json.load(open(WEB / "works_verify.json"))
        deltas, gained = [], 0
        for site in wv.get("sites", []):
            sr = site.get("series", [])
            pre = [r["dwmPct"] for r in sr if r.get("date", "")[5:7] in ("04", "05", "06")]
            post = [r["dwmPct"] for r in sr if r.get("date", "")[5:7] in ("10", "11", "12")]
            if pre and post:
                dlt = float(np.mean(post) - np.mean(pre))
                deltas.append(dlt)
                gained += dlt > 0.1
        verified_idx = round(float(np.mean(deltas)), 2) if deltas else None
        extra_cv = {"sitesGainingWater": gained, "sitesTracked": len(deltas)}
    except Exception:
        verified_idx = None
        extra_cv = {}

    per_d = plan.groupby(plan.district_name.str.title()).agg(
        cost=("cost_lakh", "sum"), ham=("recharge_ham", "sum"))
    per_d["lakh_per_ham"] = (per_d.cost / per_d.ham).round(2)
    eff = [{"district": d, "lakhPerHam": float(r.lakh_per_ham)}
           for d, r in per_d.sort_values("lakh_per_ham").iterrows()]

    # V4 additions
    extra = {}
    try:
        kr = json.load(open(WEB / "kriging.json"))
        extra["krigingRmseM"] = kr["loocv"]["rmse_m"]
        extra["krigingSkillPct"] = kr["loocv"]["skill_vs_mean_pct"]
        extra["monitoringAdequacyPct"] = kr["adequacyPct"]
        extra["krigingStations"] = kr["stations"]
    except Exception:
        pass
    try:
        sites = pd.read_parquet(OUT / "cv_sites.parquet")
        extra["cvSitesWithWater"] = int((sites.mndwi_water_pct > 0.1).sum())
        extra["cvSitesTotal"] = int(len(sites))
    except Exception:
        pass
    try:
        dl = json.load(open(WEB / "dl_benchmark.json"))
        extra["dlWinner"] = dl["winner"]
        extra["dlMeans"] = dl["means"]
    except Exception:
        pass
    try:
        ce = json.load(open(WEB / "copilot_eval.json"))
        extra["copilotRoutingPct"] = ce["routing_pct"]
        extra["copilotGroundingPct"] = ce["grounding_pct"]
    except Exception:
        pass

    kpis = {
        **extra, **extra_cv,
        "seasonalRecoveryM": round(float(dep.seasonal_recovery_m.mean()), 2),
        "depthTrendMedian": round(float(tr.depth_trend_m_per_yr.median()), 2),
        "stationCoverageBlocks": station_cov,
        "stationCoveragePct": round(100 * station_cov / 302),
        "anomalyCount": len(anom),
        "verifiedWaterDeltaPts": verified_idx,
        "efficiencyByDistrict": eff,
    }

    json.dump({"sankey": {"nodes": nodes, "links": links}, "ridgeline": ridge,
               "scatter": scatter, "sparklines": spark, "forecastFan": fan,
               "waterfall": waterfall, "donut": donut, "kpis": kpis},
              open(WEB / "analytics.json", "w"), ensure_ascii=False)
    print(f"analytics.json: {len(links)} sankey links · {len(spark)} districts · "
          f"kpis: {json.dumps(kpis)[:160]}")


if __name__ == "__main__":
    main()
