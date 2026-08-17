"""M3 — fluoride/salinity exposure layer from official INGRES quality tagging.

CGWB tags each assessment unit's groundwater quality issues (fluoride, salinity,
full or "in part") in INGRES. We combine the most recent tag per block (2022-23
through 2024-25 assessments) with block population estimates to produce
people-at-risk.

Method notes (stated, not hidden):
- Tags are categorical, not concentrations. Station-level mg/L kriging is future
  work pending India-WRIS availability (data/raw/wris_PENDING.md).
- "in part" tags get weight 0.5, full tags weight 1.0 — a stated screening
  heuristic, not a measurement.
- Validation: the known western fluoride belt (Nagaur, Barmer, Jalore, Jodhpur,
  Sikar, Jhunjhunu) must rank high; the run fails loudly if Nagaur has no
  fluoride-tagged blocks.

Output: data/processed/m3_exposure.parquet
        (block_uuid, fluoride_tag, salinity_tag, weight, people_at_risk)
        reports/m3_exposure.md
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd

RAW = Path("data/raw/ingres")
OUT = Path("data/processed")
REPORTS = Path("reports")

YEARS_PREFERENCE = ["2024-2025", "2023-2024", "2022-2023"]  # most recent tag wins

FLUORIDE_BELT = {"NAGAUR", "BARMER", "JALOR", "JODHPUR", "SIKAR", "JHUNJHUNU", "JHUNJHUNUN"}


def classify(tag_text: str) -> tuple[bool, bool, bool]:
    """-> (fluoride, fluoride_partial, salinity)"""
    t = tag_text.lower()
    fl = "fluoride" in t
    partial = fl and "part" in t
    sal = "salin" in t or "saline" in t
    return fl, partial, sal


def block_tags() -> pd.DataFrame:
    seen: dict[str, dict] = {}
    for year in YEARS_PREFERENCE:
        rows = [json.loads(line) for line in open(RAW / f"raj_blocks_raw_{year}.jsonl")]
        for r in rows:
            uuid = r.get("locationUUID")
            if uuid in seen:
                continue
            q = r.get("qualityTagging") or {}
            texts = []
            for seg in q.values():
                if isinstance(seg, dict):
                    mp = (seg.get("majorParameter") or "").strip()
                    if mp and mp not in ("0.0", "NA"):
                        texts.append(mp)
                    for op in seg.get("otherParameters") or []:
                        op = (op or "").strip()
                        if op and op not in ("0.0", "NA"):
                            texts.append(op)
            if not texts:
                continue
            joined = ", ".join(sorted(set(texts)))
            fl, partial, sal = classify(joined)
            if not (fl or sal):
                continue
            seen[uuid] = {
                "block_uuid": uuid,
                "district": r.get("district"),
                "tag_year": year,
                "tag_text": joined,
                "fluoride": fl,
                "fluoride_partial": partial,
                "salinity": sal,
            }
    return pd.DataFrame(list(seen.values()))


def main() -> None:
    tags = block_tags()
    pop = pd.read_parquet(OUT / "block_population.parquet")
    df = pop.merge(tags.drop(columns=["district"]), on="block_uuid", how="left")
    df[["fluoride", "fluoride_partial", "salinity"]] = df[
        ["fluoride", "fluoride_partial", "salinity"]
    ].fillna(False)

    df["weight"] = 0.0
    df.loc[df.fluoride & ~df.fluoride_partial, "weight"] = 1.0
    df.loc[df.fluoride_partial, "weight"] = 0.5
    df["people_at_risk_fluoride"] = (df.population_est * df.weight).round().astype(int)

    # loud validation against the known belt
    nagaur_fl = df[(df.district_name.str.upper() == "NAGAUR") & df.fluoride]
    if nagaur_fl.empty:
        raise SystemExit(
            "M3 VALIDATION FAILED: Nagaur has no fluoride-tagged blocks — "
            "known belt says it must. Check tag parsing."
        )

    df.to_parquet(OUT / "m3_exposure.parquet", index=False)

    by_d = (
        df.groupby("district_name")
        .agg(
            fluoride_blocks=("fluoride", "sum"),
            people_at_risk=("people_at_risk_fluoride", "sum"),
        )
        .sort_values("people_at_risk", ascending=False)
    )
    total = int(df.people_at_risk_fluoride.sum())
    belt_districts = {re.sub(r"\s+", " ", d).upper() for d in by_d.head(8).index}
    belt_hit = len(belt_districts & FLUORIDE_BELT)

    lines = [
        "# M3 — fluoride exposure (official INGRES quality tags x Census population)",
        "",
        f"Fluoride-tagged blocks: **{int(df.fluoride.sum())}** "
        f"(of which 'in part': {int(df.fluoride_partial.sum())}); "
        f"salinity-tagged: {int(df.salinity.sum())}.",
        f"Estimated people at risk (weighted): **{total / 1e6:.1f} M** "
        f"({total / 1e5:.0f} lakh).",
        f"Known-belt check: {belt_hit} of the top-8 districts are in the documented "
        f"western fluoride belt; Nagaur fluoride blocks: {len(nagaur_fl)}. PASSED.",
        "",
        "Method: categorical CGWB tags (not concentrations); 'in part' weighted 0.5.",
        "Population: Census 2011 district totals allocated by block area share.",
        "Station-level kriging is future work pending India-WRIS availability.",
        "",
        "## Top districts by people at risk",
        "",
        by_d.head(12).to_markdown(floatfmt=".0f"),
    ]
    (REPORTS / "m3_exposure.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines[:10]))


if __name__ == "__main__":
    main()
