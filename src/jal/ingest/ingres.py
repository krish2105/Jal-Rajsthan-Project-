"""INGRES (ingres.iith.ac.in) ingestion — official CGWB/IIT-H groundwater assessment system.

Pulls block-level quantitative assessment data (recharge, extraction, stage of
extraction, availability, rainfall) for Rajasthan by drilling the public
`getBusinessDataForUserOpen` endpoint: STATE -> DISTRICT -> BLOCK rows.

Output: data/raw/ingres/raj_blocks_{year}.jsonl  (one JSON object per block)
        data/raw/ingres/raj_districts_{year}.json

The endpoint is the same one the public INGRES dashboard calls; no login is
required for verified published assessments (verificationStatus=1, approvalLevel=1).
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import Any

import requests

BASE = "https://ingres.iith.ac.in/api/gec"
INDIA_UUID = "ffce954d-24e1-494b-ba7e-0931d8ad6085"
RAJASTHAN_UUID = "785cc6f0-e9d0-4961-9578-08ed2f24377a"

# INGRES assessment-year strings -> GWRA report vintage
ASSESSMENT_YEARS = {
    "2016-2017": "GWRA2017",
    "2019-2020": "GWRA2020",
    "2021-2022": "GWRA2022",
    "2022-2023": "GWRA2023",
    "2023-2024": "GWRA2024",
    "2024-2025": "GWRA2025",
}

RAW_DIR = Path("data/raw/ingres")


def _payload(
    locname: str, loctype: str, locuuid: str, parent_name: str, parent_uuid: str, year: str
) -> dict[str, Any]:
    return {
        "parentLocName": parent_name,
        "locname": locname,
        "loctype": loctype,
        "view": "admin",
        "locuuid": locuuid,
        "year": year,
        "computationType": "normal",
        "component": "recharge",
        "period": "annual",
        "category": "safe",
        "mapOnClickParams": "true",
        "stateuuid": None,
        "verificationStatus": 1,
        "approvalLevel": 1,
        "parentuuid": parent_uuid,
    }


def fetch_children(
    session: requests.Session,
    locname: str,
    loctype: str,
    locuuid: str,
    parent_name: str,
    parent_uuid: str,
    year: str,
    retries: int = 3,
) -> list[dict[str, Any]]:
    """One drill-down call. Returns child-location rows (skips the 'total' row)."""
    body = _payload(locname, loctype, locuuid, parent_name, parent_uuid, year)
    for attempt in range(retries):
        try:
            r = session.post(
                f"{BASE}/getBusinessDataForUserOpen", json=body, timeout=120, verify=False
            )
            r.raise_for_status()
            rows = r.json()
            if not isinstance(rows, list):
                raise ValueError(f"unexpected response type: {type(rows)}")
            return [x for x in rows if x.get("locationName") not in (None, "total")]
        except (requests.RequestException, ValueError):
            if attempt == retries - 1:
                raise
            time.sleep(2 * (attempt + 1))
    return []


def flatten_block(row: dict[str, Any], district: str, year: str) -> dict[str, Any]:
    """Keep the analytically relevant fields; preserve raw nesting for audit."""

    def g(*path: str) -> Any:
        cur: Any = row
        for p in path:
            if not isinstance(cur, dict) or cur.get(p) is None:
                return None
            cur = cur[p]
        return cur

    return {
        "assessment_year": year,
        "district": district,
        "block": row.get("locationName"),
        "location_uuid": row.get("locationUUID"),
        "rainfall_mm": g("rainfall", "total"),
        "recharge_total_ham": g("rechargeData", "total", "total"),
        "recharge_rainfall_ham": g("rechargeData", "rainfall", "total"),
        "recharge_canal_ham": g("rechargeData", "canal", "total"),
        "recharge_surface_irrigation_ham": g("rechargeData", "surface_irrigation", "total"),
        "recharge_gw_irrigation_ham": g("rechargeData", "gw_irrigation", "total"),
        "recharge_water_body_ham": g("rechargeData", "water_body", "total"),
        "recharge_artificial_ham": g("rechargeData", "artificial_structure", "total"),
        "loss_total_ham": g("loss", "total"),
        "extractable_ham": g("totalGWAvailability", "total"),
        "extraction_agriculture_ham": g("draftData", "agriculture", "total"),
        "extraction_domestic_ham": g("draftData", "domestic", "total"),
        "extraction_industry_ham": g("draftData", "industry", "total"),
        "extraction_total_ham": g("draftData", "total", "total"),
        "stage_of_extraction_pct": g("stageOfExtraction", "total"),
        "future_availability_ham": g("availabilityForFutureUse", "total"),
        "allocation_domestic_ham": g("gwallocation", "domestic", "total"),
        "area_recharge_worthy_ha": g("area", "recharge_worthy", "totalArea"),
        "area_total_ha": g("area", "total", "totalArea"),
    }


def run(years: list[str], sleep_s: float = 0.8) -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers["Content-Type"] = "application/json"
    requests.packages.urllib3.disable_warnings()  # gov TLS chains are messy; we checksum instead

    for year in years:
        districts = fetch_children(
            session, "RAJASTHAN", "STATE", RAJASTHAN_UUID, "INDIA", INDIA_UUID, year
        )
        (RAW_DIR / f"raj_districts_{year}.json").write_text(json.dumps(districts, indent=1))
        print(f"[{year}] districts: {len(districts)}")

        blocks: list[dict[str, Any]] = []
        raw_blocks: list[dict[str, Any]] = []
        for d in districts:
            dname, duuid = d["locationName"], d["locationUUID"]
            rows = fetch_children(
                session, dname, "DISTRICT", duuid, "RAJASTHAN", RAJASTHAN_UUID, year
            )
            for row in rows:
                raw_blocks.append({"district": dname, **row})
                blocks.append(flatten_block(row, dname, year))
            print(f"[{year}] {dname}: {len(rows)} blocks (running total {len(blocks)})")
            time.sleep(sleep_s)

        with open(RAW_DIR / f"raj_blocks_{year}.jsonl", "w") as f:
            for b in blocks:
                f.write(json.dumps(b) + "\n")
        with open(RAW_DIR / f"raj_blocks_raw_{year}.jsonl", "w") as f:
            for b in raw_blocks:
                f.write(json.dumps(b) + "\n")
        print(f"[{year}] TOTAL blocks: {len(blocks)} -> raj_blocks_{year}.jsonl")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--years",
        default="2022-2023",
        help=f"comma-separated INGRES years, from: {','.join(ASSESSMENT_YEARS)}",
    )
    args = ap.parse_args()
    run([y.strip() for y in args.years.split(",")])
