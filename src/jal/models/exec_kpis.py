"""Executive KPIs — the numbers a Chief Secretary's review meeting runs on.

1. Net category migration (2024 -> 2025): blocks improved minus deteriorated.
2. Rainfall-normalised stage change: regress block-level stage delta on rainfall
   delta (one state-wide OLS coefficient), split each block's observed change
   into a weather component and a residual "management effect". Answers the
   question every senior officer asks: did our works work, or did it just rain?
3. MJSA-alignment: plan structures vs the 5-lakh MJSA 2.0 target (annualised),
   labelled clearly as an alignment metric, not a delivery claim.
4. Cost per protected person: plan spend in fluoride blocks / people at risk there.

Output: web/src/data/exec_kpis.json
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

OUT = Path("data/processed")
WEB = Path("web/src/data")

MJSA_TARGET_STRUCTURES = 500_000  # 5 lakh structures over 4 years (MJSA 2.0)
MJSA_YEARS = 4


def main() -> None:
    panel = pd.read_parquet(OUT / "block_year.parquet")
    a = panel[panel.year == 2024].set_index("block_uuid")
    b = panel[panel.year == 2025].set_index("block_uuid")
    common = a.index.intersection(b.index)

    # 1) category migration
    ca, cb = a.loc[common, "category_ordinal"], b.loc[common, "category_ordinal"]
    ok = ca.notna() & cb.notna()
    improved = int((cb[ok] < ca[ok]).sum())
    worsened = int((cb[ok] > ca[ok]).sum())

    # 2) rainfall-normalised stage change
    ds = (b.loc[common, "stage_pct"] - a.loc[common, "stage_pct"]).astype(float)
    dr = (b.loc[common, "rainfall_mm"] - a.loc[common, "rainfall_mm"]).astype(float)
    m = ds.notna() & dr.notna()
    x, y = dr[m].to_numpy(), ds[m].to_numpy()
    beta = float(np.polyfit(x, y, 1)[0]) if len(x) > 30 else 0.0
    weather = beta * x
    management = y - weather
    mgmt_by_district = (
        pd.DataFrame({"district": b.loc[common, "district_name"][m], "mgmt": management})
        .groupby("district")["mgmt"].mean().sort_values()
    )

    # 3) MJSA alignment + 4) cost per protected person
    plan = pd.read_parquet(OUT / "m4_plan.parquet")
    m3 = pd.read_parquet(OUT / "m3_exposure.parquet").set_index("block_uuid")
    plan_structures = int(plan["count"].sum())
    fl_plan = plan[plan.fluoride]
    fl_spend_lakh = float(fl_plan.cost_lakh.sum())
    fl_people = int(
        m3.loc[m3.index.intersection(set(fl_plan.block_uuid)), "people_at_risk_fluoride"].sum()
    )

    kpis = {
        "migration": {
            "improved": improved,
            "worsened": worsened,
            "net": improved - worsened,
            "windowEn": "GWRA 2024 → 2025",
        },
        "managementEffect": {
            "meanStagePts": round(float(np.mean(management)), 2),
            "weatherBetaPtsPer100mm": round(beta * 100, 2),
            "bestDistricts": [
                {"district": str(d).title(), "pts": round(float(v), 1)}
                for d, v in mgmt_by_district.head(3).items()
            ],
            "worstDistricts": [
                {"district": str(d).title(), "pts": round(float(v), 1)}
                for d, v in mgmt_by_district.tail(3).items()
            ],
        },
        "mjsa": {
            "planStructures": plan_structures,
            "annualTarget": MJSA_TARGET_STRUCTURES // MJSA_YEARS,
            "sharePct": round(100 * plan_structures / (MJSA_TARGET_STRUCTURES / MJSA_YEARS), 1),
        },
        "equityDelivery": {
            "fluorideSpendLakh": round(fl_spend_lakh),
            "peopleCovered": fl_people,
            "rsPerPerson": round(fl_spend_lakh * 1e5 / fl_people) if fl_people else None,
        },
    }
    WEB.mkdir(parents=True, exist_ok=True)
    json.dump(kpis, open(WEB / "exec_kpis.json", "w"))
    print(json.dumps(kpis, indent=1)[:600])


if __name__ == "__main__":
    main()
