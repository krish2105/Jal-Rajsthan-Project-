"""V2 KPIs — Day-Zero Horizon, Water Debt Index, Aquifer Equity Gini.

Methods (stated, simple, defensible):
- Overdraft (ham/yr) = extraction_total - recharge_total (latest assessment).
- Day-Zero Horizon = future_availability / overdraft, only where overdraft > 0
  and availability > 0; a screening indicator of years of remaining buffer at
  current imbalance, NOT a hydrogeological prediction (stated in UI).
- Water Debt = cumulative positive overdraft across assessment years (gap-
  weighted) expressed in years of latest recharge needed to repay.
- Equity Gini = Gini coefficient of stage% across blocks (state + per district).

Output: web/src/data/v2_kpis.json
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

OUT = Path("data/processed")
WEB = Path("web/src/data")
YEAR_GAPS = {2017: 3, 2020: 2, 2022: 1, 2023: 1, 2024: 1, 2025: 1}  # yrs to next


def gini(x: np.ndarray) -> float:
    x = np.sort(x[~np.isnan(x)])
    if len(x) < 2 or x.sum() == 0:
        return 0.0
    n = len(x)
    return float((2 * np.arange(1, n + 1) - n - 1).dot(x) / (n * x.sum()))


def main() -> None:
    p = pd.read_parquet(OUT / "block_year.parquet")
    latest = p[p.year == 2025].copy()

    over = latest.extraction_total_ham - latest.recharge_total_ham
    horizon = np.where(
        (over > 0) & (latest.future_availability_ham > 0),
        latest.future_availability_ham / over,
        np.nan,
    )
    latest["dayzero_years"] = np.clip(horizon, 0, 50)

    debt = (
        p.assign(gap=(p.extraction_total_ham - p.recharge_total_ham).clip(lower=0)
                 * p.year.map(YEAR_GAPS).fillna(1))
        .groupby("block_uuid")["gap"].sum()
    )
    latest = latest.set_index("block_uuid")
    latest["water_debt_years"] = (debt / latest.recharge_total_ham).clip(0, 99)

    worst_dz = latest.nsmallest(5, "dayzero_years")
    state = {
        "dayZero": {
            "medianYears": round(float(latest.dayzero_years.median()), 1),
            "blocksUnder5y": int((latest.dayzero_years < 5).sum()),
            "worst": [
                {"block": str(r.block_name).title(), "district": str(r.district_name).title(),
                 "years": round(float(r.dayzero_years), 1)}
                for _, r in worst_dz.iterrows()
            ],
        },
        "waterDebt": {
            "stateYears": round(float(
                debt.sum() / latest.recharge_total_ham.sum()), 1),
            "worst": [
                {"block": str(r.block_name).title(), "district": str(r.district_name).title(),
                 "years": round(float(r.water_debt_years), 1)}
                for _, r in latest.nlargest(5, "water_debt_years").iterrows()
            ],
        },
        "equityGini": {
            "state": round(gini(latest.stage_pct.to_numpy(dtype=float)), 3),
            "mostUnequalDistricts": [
                {"district": str(d).title(), "gini": round(gini(g.stage_pct.to_numpy(dtype=float)), 3)}
                for d, g in sorted(latest.groupby("district_name"),
                                   key=lambda kv: -gini(kv[1].stage_pct.to_numpy(dtype=float)))[:3]
            ],
        },
    }
    WEB.mkdir(parents=True, exist_ok=True)
    json.dump(state, open(WEB / "v2_kpis.json", "w"))
    print(json.dumps(state, indent=1)[:700])


if __name__ == "__main__":
    main()
