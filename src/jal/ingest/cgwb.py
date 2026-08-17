"""CGWB block-wise categorization PDF parser — Rajasthan rows, all assessment years.

Input : data/raw/cgwb_assessment/blockwise_categorization_gwra{YEAR}.pdf
Output: data/raw/cgwb_assessment/raj_categories_{YEAR}.jsonl
        (slno, district_block_raw, category — splitting district/block happens in
         reconcile, where the district vocabulary lives)

Format drift across years (observed 2026-08-17, documented in SOURCE.md):
  2017: "3658 Rajasthan AJMER ARAIN Over-exploited"
  2020: "3733 Rajasthan Ajmer ARAIN Over-Exploited"
  2022: "3764 Rajasthan Ajmer Ajmer_Urban Over-Exploited"
  2023: "3780Rajasthan Ajmer Ajmer_Urban Over-Exploited"   (no space after slno)
  2024: "4214 Rajasthan Ajmer Ajmer_Urban Over_Exploited"
  2025: "4951 RAJASTHAN Ajmer Arain over_exploited"        (upper state, lower cat)

GROUND TRUTH (non-negotiable #1): GWRA2022 must reconcile to exactly 302 blocks =
219 over_exploited / 22 critical / 20 semi_critical / 38 safe / 3 saline.
The parser HARD-FAILS if 2022 is parsed and does not match.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path

import pdfplumber

RAW_DIR = Path("data/raw/cgwb_assessment")

YEARS = ("2017", "2020", "2022", "2023", "2024", "2025")

CATEGORY_MAP = {
    "over-exploited": "over_exploited",
    "over_exploited": "over_exploited",
    "overexploited": "over_exploited",
    "critical": "critical",
    "semi-critical": "semi_critical",
    "semi_critical": "semi_critical",
    "semicritical": "semi_critical",
    "safe": "safe",
    "saline": "saline",
}

# category token as it appears at end-of-line, any of the observed spellings
_CAT_RE = r"(over[-_ ]?exploited|semi[-_ ]?critical|critical|safe|saline)"

# slno may abut the state name (2023); state may be any case
_ROW_RE = re.compile(
    rf"^(\d+)\s*Rajasthan\s+(.+?)\s+{_CAT_RE}\s*$",
    re.IGNORECASE,
)

# published Rajasthan splits used as parse ground truth where known
EXPECTED_2022 = {
    "over_exploited": 219,
    "critical": 22,
    "semi_critical": 20,
    "safe": 38,
    "saline": 3,
}


def parse_year(year: str) -> list[dict]:
    path = RAW_DIR / f"blockwise_categorization_gwra{year}.pdf"
    rows: list[dict] = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            for line in text.split("\n"):
                m = _ROW_RE.match(line.strip())
                if not m:
                    continue
                slno, district_block, cat = m.group(1), m.group(2).strip(), m.group(3)
                category = CATEGORY_MAP[cat.lower().replace(" ", "_").replace("-", "_")
                                        .replace("__", "_")]
                rows.append(
                    {
                        "gwra_year": year,
                        "slno": int(slno),
                        "district_block_raw": district_block,
                        "category": category,
                    }
                )
    return rows


def run(years: list[str]) -> None:
    for year in years:
        rows = parse_year(year)
        counts = Counter(r["category"] for r in rows)
        print(f"GWRA{year}: {len(rows)} Rajasthan rows -> {dict(counts)}")

        if year == "2022":
            if dict(counts) != EXPECTED_2022 or len(rows) != 302:
                raise SystemExit(
                    f"PARSE FAILED ground truth: got {len(rows)} rows {dict(counts)}, "
                    f"expected 302 rows {EXPECTED_2022}. Refusing to write output."
                )
            print("GWRA2022 ground-truth reconciliation PASSED (302 = 219/22/20/38/3)")

        out = RAW_DIR / f"raj_categories_{year}.jsonl"
        with open(out, "w") as f:
            for r in rows:
                f.write(json.dumps(r) + "\n")
        print(f"  -> {out}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--years", default=",".join(YEARS))
    args = ap.parse_args()
    run([y.strip() for y in args.years.split(",")])
