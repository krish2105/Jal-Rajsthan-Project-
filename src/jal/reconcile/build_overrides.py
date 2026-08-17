"""Build the hand-curated match override table (non-negotiable #6).

Each entry below was individually reviewed against the official INGRES registry
block lists (see data/raw/boundaries/SOURCE.md). Three classes:
  - transliteration variants (MASUDA/MASOODA, BAITU/BAYTOO, SHIV/SHEO)
  - unit renames where the PDF uses the town and the registry the panchayat
    samiti (SILORA->KISHANGARH, BHILWARA->SUWANA, RAWATBHATA->BHAINSRORGARH)
  - PDF line-wrap truncations ("Pali" alone = Marwar Junction row, JAMWA RAM,
    VIRATNAGA, KUMBHALGA, GOVINDGAR)

Writes data/processed/match_overrides.csv keyed by "{pdf_year}|{district_block_raw}".
"""

from __future__ import annotations

import csv
from pathlib import Path

from jal.reconcile.blocks import YEAR_MAP, load_registry, norm

# (pdf_year, raw_key, target_district_norm, target_block_norm)
PAIRS: list[tuple[str, str, str, str]] = [
    ("2017", "AJMER MASUDA", "AJMER", "MASOODA"),
    ("2017", "AJMER SILORA", "AJMER", "KISHANGARH"),
    ("2017", "AJMER PISANGAN", "AJMER", "PEESANGAN"),
    ("2017", "ALWAR KISHANGARH", "ALWAR", "KISHANGARH BAS"),
    ("2017", "ALWAR UMRAIN", "ALWAR", "UMREN"),
    ("2017", "BANSWARA CHHOTI SARWAN", "BANSWARA", "CHHOTISARVAN"),
    ("2017", "BARAN ANTA", "BARAN", "ANTAH"),
    ("2017", "BARMER SEDWA", "BARMER", "SERWA"),
    ("2017", "BARMER DHANAU", "BARMER", "DHANAOO"),
    ("2017", "BARMER SINDHARY", "BARMER", "SINDHARI"),
    ("2017", "BARMER BAITU", "BARMER", "BAYTOO"),
    ("2017", "BARMER SAMADRI", "BARMER", "SAMDARI"),
    ("2017", "BARMER GADRA ROAD", "BARMER", "GADRAROAD"),
    ("2017", "BARMER DHORIMANA", "BARMER", "DHORIMANNA"),
    ("2017", "BARMER GIDA", "BARMER", "GIRA"),
    ("2017", "BARMER SHIV", "BARMER", "SHEO"),
    ("2017", "BHILWARA BIJOLIYA", "BHILWARA", "BIJOLIYAN"),
    ("2017", "BHILWARA BHILWARA", "BHILWARA", "SUWANA"),
    ("2017", "CHITTAURGARH BHUPALSAGAR", "CHITTAURGARH", "BHOPALSAGAR"),
    ("2017", "CHITTAURGARH RAWATBHATA", "CHITTAURGARH", "BHAINSRORGARH"),
    ("2017", "DUNGARPUR GALIYKOT", "DUNGARPUR", "GALIAKOT"),
    ("2017", "DUNGARPUR JOTHRI", "DUNGARPUR", "JHONTHRI"),
    ("2017", "DUNGARPUR CHIKHLI", "DUNGARPUR", "CHEEKHLI"),
    ("2017", "DUNGARPUR DOVDA", "DUNGARPUR", "DOVRA"),
    ("2017", "GANGANAGAR ANOOPGARH", "GANGANAGAR", "ANUPGARH"),
    ("2017", "GANGANAGAR VIJAINAGAR", "GANGANAGAR", "SRI VIJAYNAGAR"),
    ("2017", "GANGANAGAR GHARSANA", "GANGANAGAR", "GHADSANA"),
    ("2017", "HANUMANGARH SANGRIA", "HANUMANGARH", "SANGARIYA"),
    ("2017", "HANUMANGARH TIBBI", "HANUMANGARH", "TIBI"),
    ("2017", "HANUMANGARH PILIBANGAN", "HANUMANGARH", "PILIBANGA"),
    ("2017", "JAIPUR VIRATNAGA", "JAIPUR", "VIRATNAGAR"),
    ("2017", "JAIPUR JAMWA RAM", "JAIPUR", "JAMWA RAMGARH"),
    ("2017", "JAIPUR JALSU", "JAIPUR", "JALSOO"),
    ("2017", "JAIPUR GOVINDGAR", "JAIPUR", "GOVINDGARH"),
    ("2017", "JALOR JALOR", "JALOR", "JALORE"),
    ("2017", "JHALAWAR DUG", "JHALAWAR", "DAG"),
    ("2017", "JODHPUR DECHU", "JODHPUR", "DECHOO"),
    ("2017", "JODHPUR TINWARI", "JODHPUR", "TIWARI"),
    ("2017", "KARAULI Mandrial", "KARAULI", "MANDRAIL"),
    ("2017", "NAGAUR RIYAN", "NAGAUR", "RIYAN BARI"),
    ("2017", "NAGAUR KHINVSAR", "NAGAUR", "KHEENVSAR"),
    ("2017", "NAGAUR KUCHAMAN", "NAGAUR", "KUCHAMAN CITY"),
    ("2017", "PALI RANI", "PALI", "RANI STATION"),
    ("2017", "PALI MARWAR JU", "PALI", "KHARCHI (MARWAR JUNC"),
    ("2017", "RAJSAMAND KUMBHALGA", "RAJSAMAND", "KUMBHALGARH"),
    ("2017", "SAWAI MADHOPUR CHAUTH KA BERWADA", "SAWAI MADHOPUR", "CHAUTH KA BARWARA"),
    ("2017", "SIKAR DHOD", "SIKAR", "DHOND"),
    ("2017", "UDAIPUR KURAWAD", "UDAIPUR", "KURAWAR"),
    ("2017", "UDAIPUR SAYARA", "UDAIPUR", "SAYRA"),
    ("2017", "UDAIPUR BHINDER", "UDAIPUR", "BHINDAR"),
    ("2017", "UDAIPUR BADGAON", "UDAIPUR", "BARGAON"),
    ("2017", "UDAIPUR JALLARA", "UDAIPUR", "JHALARA"),
    # line-wrap rows: block name lost to wrapping; identified as the only
    # unmatched Pali unit in those years (Marwar Junction / Kharchi)
    ("2020", "Pali", "PALI", "KHARCHI (MARWAR JUNC"),
    ("2022", "Pali", "PALI", "KHARCHI (MARWAR JUNCTION)"),
]


def main() -> None:
    registry = load_registry()
    out = Path("data/processed/match_overrides.csv")
    rows = []
    for pdf_year, raw_key, dist, block in PAIRS:
        vintage = YEAR_MAP[pdf_year][1]
        cand = registry[
            (registry.vintage == vintage)
            & (registry.district_norm == norm(dist))
            & (registry.block_norm == norm(block))
        ]
        if len(cand) != 1:
            raise SystemExit(
                f"override target ambiguous/missing: {pdf_year} {dist}/{block} -> {len(cand)} hits"
            )
        rows.append({"key": f"{pdf_year}|{raw_key}", "block_uuid": cand.iloc[0].block_uuid})
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["key", "block_uuid"])
        w.writeheader()
        w.writerows(rows)
    print(f"wrote {len(rows)} overrides -> {out}")


if __name__ == "__main__":
    main()
