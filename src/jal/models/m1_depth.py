"""M1-depth v2 — pre-monsoon depth forecast in metres (the original spec §4 model).

Data: block-season depth series (2013–2021 usable; 2020–21 COVID-thin, stated).
Target: premonsoon_depth_m at t+1 (metres below ground; higher = worse).
Features (all at t or earlier): depth t, t-1, year delta, post-monsoon recovery,
neighbour mean depth (official adjacency), station count (reliability).
Champion rule unchanged: LightGBM residual-on-persistence challenger must beat
persistence on expanding-window backtests or persistence ships. Bands: empirical
delta quantiles (conformal-style). Also emits per-block depth trend (OLS m/yr)
— a new map layer.

Outputs: reports/m1_depth_backtest.md,
         data/processed/m1_depth_predictions.parquet (next-campaign forecast),
         data/processed/depth_trends.parquet (slope m/yr per block)
"""

from __future__ import annotations

from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd

from jal.models.adjacency import build as build_adjacency

OUT = Path("data/processed")
REPORTS = Path("reports")

FEATS = ["depth_t", "depth_tm1", "recovery_t", "neigh_depth_t", "n_stations", "gap"]

LGB = dict(objective="regression_l1", n_estimators=300, learning_rate=0.05,
           num_leaves=15, min_child_samples=20, subsample=0.9,
           colsample_bytree=0.8, reg_lambda=1.0, verbose=-1)


def load() -> pd.DataFrame:
    d = pd.read_parquet(OUT / "block_depth_seasons.parquet")
    reg = pd.read_csv(OUT / "canonical_blocks.csv")
    u21 = set(reg[reg.vintage == 2021].block_uuid)
    d = d[d.block_uuid.isin(u21)].dropna(subset=["premonsoon_depth_m"])
    return d.sort_values(["block_uuid", "year"])


def build_pairs(d: pd.DataFrame) -> pd.DataFrame:
    adj = build_adjacency(2021)
    depth = d.set_index(["block_uuid", "year"])["premonsoon_depth_m"]
    rows = []
    for uuid, g in d.groupby("block_uuid"):
        ys = g.year.tolist()
        for i, y in enumerate(ys[:-1]):
            ny = ys[i + 1]
            r = g[g.year == y].iloc[0]
            neigh = [depth.get((n, y)) for n in adj.get(uuid, [])]
            neigh = [v for v in neigh if v is not None and not pd.isna(v)]
            rows.append({
                "block_uuid": uuid, "t": y, "target_year": ny, "gap": ny - y,
                "depth_t": r.premonsoon_depth_m,
                "depth_tm1": depth.get((uuid, ys[i - 1])) if i > 0 else np.nan,
                "recovery_t": r.seasonal_recovery_m,
                "neigh_depth_t": float(np.mean(neigh)) if neigh else np.nan,
                "n_stations": r.n_stations_pre,
                "target": depth.get((uuid, ny)),
            })
    return pd.DataFrame(rows).dropna(subset=["target"])


def backtest(pairs: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    rows, notes = [], []
    for ty in sorted(pairs.target_year.unique()):
        tr, te = pairs[pairs.target_year < ty], pairs[pairs.target_year == ty]
        if len(tr) < 200 or len(te) < 80:
            notes.append(f"target {ty}: skipped (train {len(tr)}, test {len(te)})")
            continue
        delta_tr = tr.target - tr.depth_t
        m = lgb.LGBMRegressor(**LGB).fit(tr[FEATS], delta_tr)
        pred = te.depth_t + m.predict(te[FEATS])
        mae_m = float(np.mean(np.abs(pred - te.target)))
        mae_p = float(np.mean(np.abs(te.depth_t - te.target)))
        g = te.gap.iloc[0] if te.gap.nunique() == 1 else None
        dsub = delta_tr[tr.gap == g] if g and (tr.gap == g).sum() > 50 else delta_tr
        lo = te.depth_t + float(np.quantile(dsub, 0.1))
        hi = te.depth_t + float(np.quantile(dsub, 0.9))
        cov = float(np.mean((te.target >= lo) & (te.target <= hi)))
        rows.append({"target_year": int(ty), "n_train": len(tr), "n_test": len(te),
                     "mae_lgbm_m": round(mae_m, 2), "mae_persistence_m": round(mae_p, 2),
                     "improvement_pct": round(100 * (mae_p - mae_m) / mae_p, 1),
                     "coverage80": round(cov, 2)})
    return pd.DataFrame(rows), notes


def trends(d: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for uuid, g in d.groupby("block_uuid"):
        if len(g) >= 4:
            slope = float(np.polyfit(g.year, g.premonsoon_depth_m, 1)[0])
            rows.append({"block_uuid": uuid, "depth_trend_m_per_yr": round(slope, 3),
                         "seasons": len(g),
                         "latest_depth_m": float(g.premonsoon_depth_m.iloc[-1]),
                         "latest_year": int(g.year.iloc[-1])})
    return pd.DataFrame(rows)


def main() -> None:
    d = load()
    pairs = build_pairs(d)
    bt, notes = backtest(pairs)
    beats = (bt.improvement_pct > 0).mean() >= 0.5 if len(bt) else False
    champion = "lightgbm" if beats else "persistence"

    # final forecast from each block's latest season
    delta = pairs.target - pairs.depth_t
    model = lgb.LGBMRegressor(**LGB).fit(pairs[FEATS], delta)
    latest = d.groupby("block_uuid").tail(1).copy()
    adj = build_adjacency(2021)
    depth = d.set_index(["block_uuid", "year"])["premonsoon_depth_m"]
    feats = []
    for _, r in latest.iterrows():
        prev = d[(d.block_uuid == r.block_uuid) & (d.year < r.year)]
        neigh = [depth.get((n, r.year)) for n in adj.get(r.block_uuid, [])]
        neigh = [v for v in neigh if v is not None and not pd.isna(v)]
        feats.append({
            "depth_t": r.premonsoon_depth_m,
            "depth_tm1": prev.premonsoon_depth_m.iloc[-1] if len(prev) else np.nan,
            "recovery_t": r.seasonal_recovery_m,
            "neigh_depth_t": float(np.mean(neigh)) if neigh else np.nan,
            "n_stations": r.n_stations_pre, "gap": 1,
        })
    X = pd.DataFrame(feats)
    d1 = delta[pairs.gap == 1]
    q10, q50, q90 = (float(np.quantile(d1, q)) for q in (0.1, 0.5, 0.9))
    fc = latest[["block_uuid", "year", "premonsoon_depth_m"]].rename(
        columns={"year": "base_year", "premonsoon_depth_m": "base_depth_m"})
    if champion == "lightgbm":
        fc["forecast_depth_m"] = (X.depth_t + model.predict(X)).round(2)
    else:
        fc["forecast_depth_m"] = (fc.base_depth_m + q50).round(2)
    fc["q10_m"] = (fc.base_depth_m + q10).round(2)
    fc["q90_m"] = (fc.base_depth_m + q90).round(2)
    fc.to_parquet(OUT / "m1_depth_predictions.parquet", index=False)

    tr = trends(d)
    tr.to_parquet(OUT / "depth_trends.parquet", index=False)

    lines = ["# M1-depth v2 backtest — pre-monsoon depth (metres)", "",
             f"Pairs: {len(pairs)} · blocks: {pairs.block_uuid.nunique()} · "
             f"champion: **{champion}**", "",
             bt.to_markdown(index=False) if len(bt) else "(no valid splits)", "",
             "Skipped targets: " + "; ".join(notes) if notes else "", "",
             "COVID 2020–21 campaigns are thin (documented in data_quality.md);",
             "affected targets are skipped rather than padded.",
             "", f"Depth trends: {len(tr)} blocks with >=4 seasons; state median "
             f"{tr.depth_trend_m_per_yr.median():+.2f} m/yr "
             f"(positive = falling water table).",
             "Fastest-falling: "
             + ", ".join(f"{u[:8]}({v:+.2f})" for u, v in
                         tr.nlargest(3, 'depth_trend_m_per_yr')
                         [['block_uuid', 'depth_trend_m_per_yr']].values)]
    (REPORTS / "m1_depth_backtest.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines[:8]))
    print(f"forecasts: {len(fc)} blocks · trends: {len(tr)} blocks")


if __name__ == "__main__":
    main()
