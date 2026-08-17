"""Export block depth series for the dashboard (D6/D7 UI days)."""
import json
from pathlib import Path

import pandas as pd

d = pd.read_parquet("data/processed/block_depth_seasons.parquet")
out: dict[str, list] = {}
for uuid, g in d.groupby("block_uuid"):
    out[uuid] = [
        {"year": int(r.year),
         "pre": r.premonsoon_depth_m if pd.notna(r.premonsoon_depth_m) else None,
         "post": r.postmonsoon_depth_m if pd.notna(r.postmonsoon_depth_m) else None,
         "recovery": r.seasonal_recovery_m if pd.notna(r.seasonal_recovery_m) else None,
         "n": int(r.n_stations_pre)}
        for _, r in g.sort_values("year").iterrows()
    ]
Path("web/src/data").mkdir(parents=True, exist_ok=True)
json.dump(out, open("web/src/data/depth.json", "w"))
print(f"depth.json: {len(out)} blocks")
