"""A3 — real water-body coordinates from OpenStreetMap (Overpass API).

The D5 satellite check sampled block CENTROIDS, which in desert blocks is bare
sand — honest but uninformative. This pulls actual reservoirs/tanks/ponds inside
the top plan blocks so DeepWaterMap looks where water can exist. Free, no auth,
ODbL-licensed (attribution recorded in SOURCE.md).

Output: data/processed/waterbodies.parquet [block_uuid, block_name, district,
        osm_id, name, lon, lat, area_m2]
"""

from __future__ import annotations

import time
from pathlib import Path

import geopandas as gpd
import pandas as pd
import requests
from shapely.geometry import Point

OUT = Path("data/processed")
RAW = Path("data/raw")
OVERPASS = "https://overpass-api.de/api/interpreter"
N_BLOCKS = 12          # top plan blocks by spend
MIN_AREA_M2 = 20_000   # ignore puddles; ~2 ha and up


def query_bbox(s: float, w: float, n: float, e: float) -> list[dict]:
    q = f"""[out:json][timeout:90];
(
  way["natural"="water"]({s},{w},{n},{e});
  way["landuse"="reservoir"]({s},{w},{n},{e});
  way["water"~"reservoir|pond|lake"]({s},{w},{n},{e});
);
out center tags;"""
    for attempt in range(3):
        try:
            r = requests.post(OVERPASS, data={"data": q}, timeout=120)
            if r.status_code == 200:
                return r.json().get("elements", [])
            time.sleep(5 * (attempt + 1))
        except Exception:
            time.sleep(5 * (attempt + 1))
    return []


def main() -> None:
    plan = pd.read_parquet(OUT / "m4_plan.parquet")
    top = plan.groupby("block_uuid").cost_lakh.sum().nlargest(N_BLOCKS).index.tolist()
    blocks = gpd.read_file(RAW / "boundaries/rajasthan_blocks_ingres.geojson")
    blocks = blocks[(blocks["type"] == "BLOCK") & (blocks["year"] == 2021)]
    blocks = blocks[blocks.uuid.isin(top)]

    rows = []
    for _, b in blocks.iterrows():
        w, s, e, n = b.geometry.bounds
        els = query_bbox(s, w, n, e)
        kept = 0
        for el in els:
            c = el.get("center") or {}
            lon, lat = c.get("lon"), c.get("lat")
            if lon is None or not b.geometry.contains(Point(lon, lat)):
                continue
            tags = el.get("tags", {})
            rows.append({
                "block_uuid": b.uuid, "block_name": str(b["name"]).title(),
                "district": str(b.parent_name).title(), "osm_id": el.get("id"),
                "name": tags.get("name", ""), "lon": lon, "lat": lat,
                "kind": tags.get("water") or tags.get("landuse") or tags.get("natural", ""),
            })
            kept += 1
        print(f"{str(b['name']).title():22s} {len(els):4d} candidates -> {kept} inside")
        time.sleep(2)  # be polite to a free public API

    df = pd.DataFrame(rows)
    if len(df):
        df.to_parquet(OUT / "waterbodies.parquet", index=False)
    blocks_hit = df.block_uuid.nunique() if len(df) else 0
    print(f"\nwater bodies found: {len(df)} across {blocks_hit} blocks")
    (RAW / "waterbodies_SOURCE.md").write_text(
        "OpenStreetMap via Overpass API (overpass-api.de), retrieved 2026-08-19.\n"
        "Query: ways tagged natural=water / landuse=reservoir / water=reservoir|pond|lake\n"
        "inside the top-12 plan blocks. © OpenStreetMap contributors, ODbL.\n")


if __name__ == "__main__":
    main()
