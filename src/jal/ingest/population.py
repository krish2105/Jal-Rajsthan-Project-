"""Block population estimates (Census 2011 district totals, area-share allocation).

Source: Census of India 2011 district populations (33 pre-reorg districts,
retrieved 2026-08-17 from census2011.co.in district list for Rajasthan; the 33
values sum to 68,548,437 — the official state total, which is the source check).
District spellings match the INGRES registry exactly.

APPROXIMATION (documented per non-negotiable #5, surfaced in data_quality.md):
District population is allocated to blocks proportional to block total area
(INGRES `area_total_ha`) — a uniform-density assumption. Adequate for
exposure-weighting a screening layer; NOT a census enumeration.

Output: data/processed/block_population.parquet (block_uuid, population_est)
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

OUT = Path("data/processed")

# Census 2011, pre-reorganisation districts (sums to 68,548,437 = official total)
DISTRICT_POP_2011: dict[str, int] = {
    "AJMER": 2583052, "ALWAR": 3674179, "BANSWARA": 1797485, "BARAN": 1222755,
    "BARMER": 2603751, "BHARATPUR": 2548462, "BHILWARA": 2408523, "BIKANER": 2363937,
    "BUNDI": 1110906, "CHITTAURGARH": 1544338, "CHURU": 2039547, "DAUSA": 1634409,
    "DHAULPUR": 1206516, "DUNGARPUR": 1388552, "GANGANAGAR": 1969168,
    "HANUMANGARH": 1774692, "JAIPUR": 6626178, "JAISALMER": 669919, "JALOR": 1828730,
    "JHALAWAR": 1411129, "JHUNJHUNUN": 2137045, "JODHPUR": 3687165, "KARAULI": 1458248,
    "KOTA": 1951014, "NAGAUR": 3307743, "PALI": 2037573, "PRATAPGARH": 867848,
    "RAJSAMAND": 1156597, "SAWAI MADHOPUR": 1335551, "SIKAR": 2677333,
    "SIROHI": 1036346, "TONK": 1421326, "UDAIPUR": 3068420,
}

ALIASES = {"JHUNJHUNU": "JHUNJHUNUN"}  # registry norm collapses the two spellings


def build() -> pd.DataFrame:
    assert sum(DISTRICT_POP_2011.values()) == 68_548_437, "census total check failed"
    panel = pd.read_parquet(OUT / "block_year.parquet")
    latest = panel[panel.year == 2025][
        ["block_uuid", "block_name", "district_name", "area_total_ha"]
    ].copy()
    latest["district_norm"] = latest.district_name.str.upper().str.strip()

    parts = []
    for district, grp in latest.groupby("district_norm"):
        key = ALIASES.get(district, district)
        dp = DISTRICT_POP_2011.get(key)
        if dp is None:
            raise SystemExit(f"no population for registry district {district}")
        area = grp.area_total_ha.fillna(grp.area_total_ha.median())
        share = area / area.sum()
        g = grp.copy()
        g["population_est"] = (share * dp).round().astype(int)
        parts.append(g)
    out = pd.concat(parts, ignore_index=True)[
        ["block_uuid", "block_name", "district_name", "population_est"]
    ]
    out.to_parquet(OUT / "block_population.parquet", index=False)
    print(
        f"block_population: {len(out)} blocks, state total {out.population_est.sum() / 1e6:.2f}M"
    )
    return out


if __name__ == "__main__":
    build()
