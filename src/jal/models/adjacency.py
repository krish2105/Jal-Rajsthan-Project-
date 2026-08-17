"""Block adjacency from official polygons — for spatial-lag features.

Computes queen-contiguity neighbours per vintage from the INGRES WFS GeoJSON and
caches to data/processed/adjacency_{vintage}.json  ({block_uuid: [neighbour_uuid,...]}).
"""

from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd

RAW = Path("data/raw/boundaries/rajasthan_blocks_ingres.geojson")
OUT = Path("data/processed")


def build(vintage: int) -> dict[str, list[str]]:
    cache = OUT / f"adjacency_{vintage}.json"
    if cache.exists():
        return json.load(open(cache))
    gdf = gpd.read_file(RAW)
    gdf = gdf[(gdf["type"] == "BLOCK") & (gdf["year"] == vintage)].reset_index(drop=True)
    sindex = gdf.sindex
    adj: dict[str, list[str]] = {}
    for i, geom in enumerate(gdf.geometry):
        hits = sindex.query(geom, predicate="touches")
        uuids = [gdf.iloc[j]["uuid"] for j in hits if j != i]
        # buffer(0)-free fallback: intersects minus self for slivers
        if not uuids:
            hits = sindex.query(geom.buffer(0.001), predicate="intersects")
            uuids = [gdf.iloc[j]["uuid"] for j in hits if j != i]
        adj[gdf.iloc[i]["uuid"]] = uuids
    json.dump(adj, open(cache, "w"))
    return adj


if __name__ == "__main__":
    for v in (2019, 2021):
        a = build(v)
        mean_deg = sum(len(v_) for v_ in a.values()) / len(a)
        print(f"vintage {v}: {len(a)} blocks, mean neighbours {mean_deg:.1f}")
