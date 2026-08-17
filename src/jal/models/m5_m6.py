"""M5 anomaly detection + M6 aquifer personas.

M5 — IsolationForest over per-block change vectors (stage delta, depth trend,
seasonal recovery, extraction shift). Flags blocks whose recent behaviour is
statistically strange — feeds the nightly sentinel and map badges. Scores are
screening signals for review, not verdicts (stated in UI).

M6 — KMeans typology over standardized block features -> named "aquifer
personas". Officials reason in types; six names beat 302 numbers. Names are
assigned from cluster centroids and hard-coded below after inspection (rerun
prints centroids for re-review whenever features change).

Outputs: data/processed/m5_anomalies.parquet, m6_personas.parquet,
         web/src/data/anomalies.json, personas.json
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

OUT = Path("data/processed")
WEB = Path("web/src/data")

PERSONA_NAMES = {  # named from 2026-08-18 centroids (rerun prints them for review)
    0: {"en": "Deep & falling fast", "hi": "गहरा और तेज़ी से गिरता",
        "color": "#f87171"},   # +2σ depth, +1.8σ trend — Alwar/Behror belt
    1: {"en": "Arid over-drafted", "hi": "शुष्क अति-दोहित",
        "color": "#fb923c"},   # low rain, high stage — Barmer/Balotra west
    2: {"en": "Rocky rain-fed safe", "hi": "पहाड़ी वर्षा-पोषित सुरक्षित",
        "color": "#34d399"},   # -1.8σ recharge-worthy share, good rain, low stage
    3: {"en": "Data-shift outlier", "hi": "आँकड़ा-विचलन विशेष",
        "color": "#94a3b8"},   # singleton (Jaisalmer_Rural, -98pt stage revision)
    4: {"en": "Mainstream stressed", "hi": "मुख्यधारा तनावग्रस्त",
        "color": "#38bdf8"},   # largest cluster, near-average profile
    5: {"en": "Fluoride-burdened", "hi": "फ्लोराइड-प्रभावित",
        "color": "#e879f9"},   # +1.9σ fluoride tagging
}


def features() -> pd.DataFrame:
    p = pd.read_parquet(OUT / "block_year.parquet")
    a, b = p[p.year == 2024].set_index("block_uuid"), p[p.year == 2025].set_index("block_uuid")
    tr = pd.read_parquet(OUT / "depth_trends.parquet").set_index("block_uuid")
    dep = pd.read_parquet(OUT / "block_depth_seasons.parquet")
    rec = dep.dropna(subset=["seasonal_recovery_m"]).groupby("block_uuid").seasonal_recovery_m.mean()
    m3 = pd.read_parquet(OUT / "m3_exposure.parquet").set_index("block_uuid")

    df = pd.DataFrame({
        "stage_2025": b.stage_pct,
        "stage_delta": b.stage_pct - a.stage_pct.reindex(b.index),
        "rainfall_mm": b.rainfall_mm,
        "agri_share": b.extraction_agriculture_ham / b.extraction_total_ham.replace(0, np.nan),
        "rw_share": b.area_recharge_worthy_ha / b.area_total_ha.replace(0, np.nan),
        "depth_trend": tr.depth_trend_m_per_yr.reindex(b.index),
        "latest_depth": tr.latest_depth_m.reindex(b.index),
        "recovery": rec.reindex(b.index),
        "fluoride": m3.fluoride.reindex(b.index).fillna(False).astype(float),
    })
    df["block_name"] = b.block_name.str.title()
    df["district"] = b.district_name.str.title()
    return df


def main() -> None:
    df = features()
    num = df.drop(columns=["block_name", "district"])
    filled = num.fillna(num.median(numeric_only=True))
    X = StandardScaler().fit_transform(filled)

    # M5 — anomalies on the CHANGE-focused subset
    chg = filled[["stage_delta", "depth_trend", "recovery"]]
    Xc = StandardScaler().fit_transform(chg)
    iso = IsolationForest(n_estimators=300, contamination=0.05, random_state=42).fit(Xc)
    df["anomaly_score"] = -iso.score_samples(Xc)  # higher = stranger
    df["anomaly"] = iso.predict(Xc) == -1
    m5 = df[df.anomaly].sort_values("anomaly_score", ascending=False)
    print(f"M5 anomalies: {len(m5)} blocks flagged")
    print(m5[["block_name", "district", "stage_delta", "depth_trend"]].head(6).to_string())

    # M6 — personas
    km = KMeans(n_clusters=6, n_init=10, random_state=42).fit(X)
    df["cluster"] = km.labels_
    cent = pd.DataFrame(km.cluster_centers_, columns=num.columns)
    print("\nM6 centroids (standardized):")
    print(cent.round(2).to_string())
    for c in range(6):
        sub = df[df.cluster == c]
        print(f"cluster {c}: n={len(sub)} · e.g. " + ", ".join(sub.block_name.head(3)))

    df["persona_en"] = df.cluster.map(lambda c: PERSONA_NAMES[c]["en"])
    df["persona_hi"] = df.cluster.map(lambda c: PERSONA_NAMES[c]["hi"])
    df["persona_color"] = df.cluster.map(lambda c: PERSONA_NAMES[c]["color"])

    df.reset_index().rename(columns={"index": "block_uuid"}).to_parquet(
        OUT / "m5_anomalies.parquet", index=False)
    df.reset_index().rename(columns={"index": "block_uuid"})[
        ["block_uuid", "cluster", "persona_en", "persona_hi", "persona_color"]
    ].to_parquet(OUT / "m6_personas.parquet", index=False)

    WEB.mkdir(exist_ok=True)
    json.dump(
        {u: {"anomaly": bool(r.anomaly), "score": round(float(r.anomaly_score), 3),
             "persona": r.persona_en, "personaHi": r.persona_hi,
             "personaColor": r.persona_color, "cluster": int(r.cluster)}
         for u, r in df.iterrows()},
        open(WEB / "personas.json", "w"), ensure_ascii=False)
    json.dump(
        [{"uuid": u, "block": r.block_name, "district": r.district,
          "score": round(float(r.anomaly_score), 3),
          "stageDelta": round(float(r.stage_delta), 1) if pd.notna(r.stage_delta) else None,
          "depthTrend": round(float(r.depth_trend), 2) if pd.notna(r.depth_trend) else None}
         for u, r in m5.iterrows()],
        open(WEB / "anomalies.json", "w"), ensure_ascii=False)
    print(f"\npersonas.json ({len(df)}) + anomalies.json ({len(m5)}) exported")


if __name__ == "__main__":
    main()
