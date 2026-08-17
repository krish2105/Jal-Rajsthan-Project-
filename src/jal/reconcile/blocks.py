"""Block identity reconciliation — the unglamorous core.

Builds the canonical block registry from official INGRES geometry (both vintages)
and matches PDF-parsed categorization rows onto it.

Outputs:
  data/processed/canonical_blocks.csv   — one row per (uuid, vintage); committed artefact
  data/processed/block_categories.parquet — (block_uuid, gwra_year, category, match_score)
  data/unmatched.csv                    — rows needing manual review (never auto-dropped)

Matching policy (non-negotiable #6): rapidfuzz proposes; >= 0.95 normalized ratio
within the same district auto-accepts; below that goes to unmatched.csv for the
hand-curated override table (data/processed/match_overrides.csv, committed).
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd
from rapidfuzz import fuzz, process

RAW = Path("data/raw")
OUT = Path("data/processed")

# PDF year -> (INGRES year label, boundary vintage year)
YEAR_MAP = {
    "2017": ("2016-2017", 2019),
    "2020": ("2019-2020", 2019),
    "2022": ("2021-2022", 2021),
    "2023": ("2022-2023", 2021),
    "2024": ("2023-2024", 2021),
    "2025": ("2024-2025", 2021),
}


def norm(s: str) -> str:
    """Normalize a block/district name for matching."""
    s = s.upper().replace("_", " ").replace("-", " ").replace(".", " ")
    s = re.sub(r"\s+", " ", s).strip()
    # collapse known district spelling variants (both appear across official sources)
    s = s.replace("JHUNJHUNUN", "JHUNJHUNU")
    return s


def load_registry() -> pd.DataFrame:
    """Canonical registry from official INGRES WFS geometry (both vintages)."""
    gj = json.load(open(RAW / "boundaries/rajasthan_blocks_ingres.geojson"))
    rows = []
    for f in gj["features"]:
        p = f["properties"]
        rows.append(
            {
                "block_uuid": p["uuid"],
                "block_name": p["name"],
                "block_norm": norm(p["name"]),
                "district_name": p["parent_name"],
                "district_norm": norm(p["parent_name"]),
                "vintage": p["year"],  # 2019 (295 blocks) or 2021 (302 blocks)
                "centroid_lon": p.get("longitude"),
                "centroid_lat": p.get("latitude"),
            }
        )
    return pd.DataFrame(rows)


def load_ingres_blocks(ingres_year: str) -> pd.DataFrame:
    rows = [json.loads(line) for line in open(RAW / f"ingres/raj_blocks_{ingres_year}.jsonl")]
    df = pd.DataFrame(rows)
    df["block_norm"] = df["block"].map(norm)
    df["district_norm"] = df["district"].map(norm)
    return df


def split_district_block(raw: str, districts: list[str]) -> tuple[str | None, str]:
    """Split 'Ajmer Ajmer_Urban' into (district, block) via longest district prefix."""
    n = norm(raw)
    best = None
    for d in districts:
        if n.startswith(d + " ") and (best is None or len(d) > len(best)):
            best = d
    if best is None:
        return None, n
    return best, n[len(best) + 1 :]


def match_pdf_year(
    pdf_year: str, registry: pd.DataFrame, overrides: pd.DataFrame
) -> tuple[pd.DataFrame, pd.DataFrame]:
    ingres_year, vintage = YEAR_MAP[pdf_year]
    reg = registry[registry["vintage"] == vintage]
    districts = sorted(reg["district_norm"].unique().tolist())

    cats = [
        json.loads(line)
        for line in open(RAW / f"cgwb_assessment/raj_categories_{pdf_year}.jsonl")
    ]
    matched, unmatched = [], []
    for row in cats:
        district, block = split_district_block(row["district_block_raw"], districts)
        okey = f"{pdf_year}|{row['district_block_raw']}"
        if okey in overrides.index:
            uuid = overrides.loc[okey, "block_uuid"]
            matched.append({**row, "block_uuid": uuid, "match_score": 1.0, "how": "override"})
            continue
        if district is None:
            unmatched.append({**row, "reason": "district_prefix_not_found"})
            continue
        cand = reg[reg["district_norm"] == district]
        if cand.empty:
            unmatched.append({**row, "reason": f"no_registry_district:{district}"})
            continue
        hit = process.extractOne(block, cand["block_norm"].tolist(), scorer=fuzz.ratio)
        if hit and hit[1] >= 95.0:
            uuid = cand.iloc[hit[2]]["block_uuid"]
            matched.append(
                {**row, "block_uuid": uuid, "match_score": hit[1] / 100.0, "how": "fuzzy"}
            )
        else:
            unmatched.append(
                {
                    **row,
                    "reason": f"best={hit[0] if hit else None}@{hit[1]:.0f}" if hit else "no_cand",
                }
            )
    return pd.DataFrame(matched), pd.DataFrame(unmatched)


def run() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    registry = load_registry()
    registry.to_csv(OUT / "canonical_blocks.csv", index=False)
    print(
        f"registry: {len(registry)} rows "
        f"({(registry.vintage == 2021).sum()} @2021, {(registry.vintage == 2019).sum()} @2019)"
    )

    opath = OUT / "match_overrides.csv"
    if opath.exists():
        overrides = pd.read_csv(opath).set_index("key")
    else:
        overrides = pd.DataFrame(columns=["key", "block_uuid"]).set_index("key")

    all_matched, all_unmatched = [], []
    for pdf_year in YEAR_MAP:
        m, u = match_pdf_year(pdf_year, registry, overrides)
        print(f"GWRA{pdf_year}: matched={len(m)} unmatched={len(u)}")
        all_matched.append(m)
        if len(u):
            all_unmatched.append(u)

    cat = pd.concat(all_matched, ignore_index=True)
    cat.to_parquet(OUT / "block_categories.parquet", index=False)
    print(f"block_categories.parquet: {len(cat)} rows")

    if all_unmatched:
        um = pd.concat(all_unmatched, ignore_index=True)
        um.to_csv("data/unmatched.csv", index=False)
        print(f"UNMATCHED: {len(um)} rows -> data/unmatched.csv (manual review required)")
    else:
        print("UNMATCHED: 0 — all rows reconciled")


if __name__ == "__main__":
    run()
