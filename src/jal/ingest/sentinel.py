"""Satellite works verification — Sentinel-2 NDWI before/after monsoon.

For selected plan blocks, pulls two low-cloud Sentinel-2 L2A scenes (pre- and
post-monsoon) from the AWS open-data archive via the Element84 earth-search STAC
API (no auth), reads a small window around the block centroid directly from the
COGs, and computes the NDWI water fraction. Post-monsoon minus pre-monsoon water
fraction is the crudest honest signal of "did surface water storage appear?" —
the production version would evaluate exact structure coordinates, not centroids
(stated in the UI).

Output: web/src/data/works_verify.json
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import requests

STAC = "https://earth-search.aws.element84.com/v1/search"
OUT = Path("data/processed")
WEB = Path("web/src/data")

WINDOW_PX = 160  # ~1.6 km at 10 m resolution


def best_scene(lon: float, lat: float, start: str, end: str) -> dict | None:
    body = {
        "collections": ["sentinel-2-l2a"],
        "intersects": {"type": "Point", "coordinates": [lon, lat]},
        "datetime": f"{start}T00:00:00Z/{end}T23:59:59Z",
        "query": {"eo:cloud_cover": {"lt": 25}},
        "sortby": [{"field": "properties.eo:cloud_cover", "direction": "asc"}],
        "limit": 1,
    }
    r = requests.post(STAC, json=body, timeout=60)
    r.raise_for_status()
    feats = r.json().get("features", [])
    return feats[0] if feats else None


def water_fraction(scene: dict, lon: float, lat: float) -> float | None:
    import rasterio
    from rasterio.warp import transform as warp_transform
    from rasterio.windows import Window

    try:
        g_href = scene["assets"]["green"]["href"]
        n_href = scene["assets"]["nir"]["href"]
    except KeyError:
        return None

    def read_window(href: str) -> np.ndarray | None:
        with rasterio.open(href) as src:
            xs, ys = warp_transform("EPSG:4326", src.crs, [lon], [lat])
            row, col = src.index(xs[0], ys[0])
            half = WINDOW_PX // 2
            win = Window(col - half, row - half, WINDOW_PX, WINDOW_PX)
            try:
                return src.read(1, window=win).astype("float32")
            except Exception:
                return None

    g, n = read_window(g_href), read_window(n_href)
    if g is None or n is None or g.size == 0:
        return None
    ndwi = (g - n) / np.clip(g + n, 1e-6, None)
    return float((ndwi > 0.05).mean())


def main() -> None:
    reg = pd.read_csv(OUT / "canonical_blocks.csv")
    plan = pd.read_parquet(OUT / "m4_plan.parquet")
    top = (
        plan.groupby("block_uuid")["cost_lakh"].sum().nlargest(3).index.tolist()
    )
    r21 = reg[reg.vintage == 2021].set_index("block_uuid")

    results = []
    for uuid in top:
        if uuid not in r21.index:
            continue
        row = r21.loc[uuid]
        lon, lat = float(row.centroid_lon), float(row.centroid_lat)
        name = str(row.block_name).title()
        print(f"{name}: querying scenes at ({lon:.3f},{lat:.3f})")
        try:
            pre = best_scene(lon, lat, "2025-04-15", "2025-06-15")
            post = best_scene(lon, lat, "2025-09-15", "2025-11-15")
            if not pre or not post:
                print("  no scenes")
                continue
            wf_pre = water_fraction(pre, lon, lat)
            wf_post = water_fraction(post, lon, lat)
            if wf_pre is None or wf_post is None:
                print("  window read failed")
                continue
            results.append(
                {
                    "block": name,
                    "district": str(row.district_name).title(),
                    "preDate": pre["properties"]["datetime"][:10],
                    "postDate": post["properties"]["datetime"][:10],
                    "preWaterPct": round(100 * wf_pre, 2),
                    "postWaterPct": round(100 * wf_post, 2),
                    "deltaPct": round(100 * (wf_post - wf_pre), 2),
                    "preCloud": round(pre["properties"].get("eo:cloud_cover", -1), 1),
                    "postCloud": round(post["properties"].get("eo:cloud_cover", -1), 1),
                }
            )
            print(f"  pre {100*wf_pre:.2f}% → post {100*wf_post:.2f}% water pixels")
        except Exception as exc:
            print(f"  FAILED: {type(exc).__name__}: {exc}")

    WEB.mkdir(parents=True, exist_ok=True)
    json.dump(
        {"sites": results, "method": "Sentinel-2 L2A NDWI>0.05 over a 1.6 km window "
                                     "at the block centroid; production verifies exact "
                                     "structure coordinates."},
        open(WEB / "works_verify.json", "w"),
    )
    print(f"works_verify.json: {len(results)} sites")


if __name__ == "__main__":
    main()
