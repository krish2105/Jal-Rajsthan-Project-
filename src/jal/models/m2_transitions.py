"""M2 — category transition model: P(worsens by next assessment) per block.

4-class ordinal target (safe=0, semi_critical=1, critical=2, over_exploited=3).
Headline output: P(worsens) = P(category at t+1 > category at t), which persistence
can never produce (persistence always says 0).

Backtest: expanding-window time-series splits, same pair construction as M1.
Metrics: macro-recall, per-class recall, P(worsens) precision@top-50 — the
operationally relevant number (spec §7).

Outputs:
  reports/m2_backtest.md
  data/processed/m2_predictions.parquet — per block: P(each class) at 2026 + P(worsens)
"""

from __future__ import annotations

from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd

from jal.models.m1_stage import FEATURES, build_pairs, load_panel

OUT = Path("data/processed")
REPORTS = Path("reports")

CLASSES = ["safe", "semi_critical", "critical", "over_exploited"]

LGB_PARAMS = dict(
    objective="multiclass",
    num_class=4,
    n_estimators=300,
    learning_rate=0.05,
    num_leaves=15,
    min_child_samples=25,
    subsample=0.9,
    colsample_bytree=0.8,
    reg_lambda=1.0,
    class_weight="balanced",  # over_exploited dominates; recall on the rest matters
    verbose=-1,
)


def build_class_pairs() -> pd.DataFrame:
    """M1 pairs + current and next category ordinals."""
    panel = load_panel()
    pairs = build_pairs(panel)
    cat = panel.set_index(["block_uuid", "year"])["category_ordinal"]
    cur, nxt = [], []
    for _, r in pairs.iterrows():
        cur.append(cat.get((r.block_uuid, r.feature_year), np.nan))
        nxt.append(cat.get((r.block_uuid, r.target_year), np.nan))
    pairs["cat_now"] = cur
    pairs["cat_next"] = nxt
    pairs = pairs.dropna(subset=["cat_now", "cat_next"])
    pairs["worsens"] = (pairs.cat_next > pairs.cat_now).astype(int)
    return pairs


M2_FEATURES = [*FEATURES, "cat_now"]


def backtest(pairs: pd.DataFrame) -> str:
    lines = ["# M2 backtest — category transitions", ""]
    rows = []
    for test_year in (2023, 2024, 2025):
        train = pairs[pairs.target_year < test_year]
        test = pairs[pairs.target_year == test_year]
        if train.empty or test.empty:
            continue
        m = lgb.LGBMClassifier(**LGB_PARAMS)
        m.fit(train[M2_FEATURES], train.cat_next)
        proba = m.predict_proba(test[M2_FEATURES])
        pred = proba.argmax(axis=1)
        y = test.cat_next.to_numpy().astype(int)

        recalls = {}
        for c in range(4):
            mask = y == c
            recalls[CLASSES[c]] = float((pred[mask] == c).mean()) if mask.any() else np.nan
        macro = float(np.nanmean(list(recalls.values())))

        # P(worsens): prob mass above current class
        cur = test.cat_now.to_numpy().astype(int)
        p_worse = np.array([proba[i, cur[i] + 1 :].sum() for i in range(len(test))])
        top50 = np.argsort(-p_worse)[:50]
        prec50 = float(test.worsens.to_numpy()[top50].mean())
        base_rate = float(test.worsens.mean())

        rows.append(
            {
                "test_year": test_year,
                "n_test": len(test),
                "macro_recall": macro,
                **{f"recall_{k}": v for k, v in recalls.items()},
                "precision_at_top50_worsens": prec50,
                "worsens_base_rate": base_rate,
            }
        )
    bt = pd.DataFrame(rows)
    lines += [
        bt.to_markdown(index=False, floatfmt=".2f"),
        "",
        "P(worsens) precision@50 vs base rate is the operational lift: how much better",
        "than random the top-50 watchlist is. Persistence predicts 'no change' always",
        "and cannot rank worsening risk at all.",
    ]
    return "\n".join(lines) + "\n"


def train_final_and_predict(pairs: pd.DataFrame) -> pd.DataFrame:
    m = lgb.LGBMClassifier(**LGB_PARAMS)
    m.fit(pairs[M2_FEATURES], pairs.cat_next)
    m.booster_.save_model(str(OUT / "m2_model.txt"))

    panel = load_panel()
    from jal.models.m1_stage import add_spatial_lag

    latest = add_spatial_lag(panel[panel.year == 2025].copy())
    idx = panel.set_index(["block_uuid", "year"])["stage_pct"]
    latest["stage_delta_prev"] = [
        (r.stage_pct - idx.get((r.block_uuid, 2024), np.nan)) for _, r in latest.iterrows()
    ]
    latest["year_gap"] = 1
    latest["cat_now"] = latest["category_ordinal"]
    latest = latest.dropna(subset=["cat_now", "stage_pct"])

    proba = m.predict_proba(latest[M2_FEATURES])
    cur = latest.cat_now.to_numpy().astype(int)
    out = latest[["block_uuid", "block_name", "district_name", "category", "stage_pct"]].copy()
    for c in range(4):
        out[f"p_{CLASSES[c]}"] = proba[:, c]
    out["p_worsens"] = [proba[i, cur[i] + 1 :].sum() for i in range(len(out))]
    out["forecast_year"] = 2026
    out.to_parquet(OUT / "m2_predictions.parquet", index=False)
    return out


def main() -> None:
    pairs = build_class_pairs()
    report = backtest(pairs)
    (REPORTS / "m2_backtest.md").write_text(report)
    print(report)
    out = train_final_and_predict(pairs)
    watch = out.nlargest(10, "p_worsens")[
        ["block_name", "district_name", "category", "p_worsens"]
    ]
    print(f"m2_predictions.parquet: {len(out)} blocks")
    print(watch.to_string(index=False))


if __name__ == "__main__":
    main()
