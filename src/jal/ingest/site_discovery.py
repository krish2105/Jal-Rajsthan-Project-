"""A3 v2 — satellite-guided water-site discovery (replaces the OSM route).

OpenStreetMap's Overpass API was unreachable from this environment (504 on the
main endpoint, timeouts on mirrors — logged in reports/a3_sites.md), so instead
of trusting a gazetteer we let the imagery find its own targets:

  1. take a WIDE post-monsoon window (~6.4 km) around each top plan block centroid
  2. compute MNDWI (green - swir)/(green + swir) — better than NDWI for turbid
     inland water — on that window
  3. slide a 1.6 km box and keep the position with the highest water fraction
  4. that box becomes the block's tracking SITE for the DeepWaterMap time series

This is strictly better than centroid sampling (which sat on bare sand) and is
self-contained: no third-party gazetteer, and the discovery step is auditable
(we store the chosen coordinates and their MNDWI score).

Output: data/processed/cv_sites.parquet [block_uuid, block_name, district,
        lon, lat, mndwi_water_pct, scene_date]
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import rasterio
from rasterio.warp import transform as warp_transform
from rasterio.windows import Window

from jal.ingest.sentinel import best_scene

OUT = Path("data/processed")
WIDE_PX = 640     # ~6.4 km search area at 10 m
BOX_PX = 160      # ~1.6 km tracking box
STRIDE = 80
N_BLOCKS = 12
SEARCH_WINDOWS = [("2023-09-15", "2023-12-20"), ("2024-09-15", "2024-12-20")]


def read_band(href: str, lon: float, lat: float, px: int) -> tuple[np.ndarray, float, float] | None:
    with rasterio.open(href) as src:
        xs, ys = warp_transform("EPSG:4326", src.crs, [lon], [lat])
        row, col = src.index(xs[0], ys[0])
        scale = 10 / abs(src.transform.a)
        half = int(px / 2 * scale)
        try:
            arr = src.read(1, window=Window(col - half, row - half, 2 * half, 2 * half))
        except Exception:
            return None
        if arr.size == 0:
            return None
        if scale != 1:  # 20 m band -> upsample to the 10 m grid
            arr = np.repeat(np.repeat(arr, int(scale), axis=0), int(scale), axis=1)
        return arr.astype("float32"), src.transform.a, 0.0


def discover(lon: float, lat: float) -> dict | None:
    """Find the wettest 1.6 km box inside a 6.4 km search window."""
    for start, end in SEARCH_WINDOWS:
        scene = best_scene(lon, lat, start, end)
        if not scene:
            continue
        g = read_band(scene["assets"]["green"]["href"], lon, lat, WIDE_PX)
        s = read_band(scene["assets"]["swir16"]["href"], lon, lat, WIDE_PX)
        if g is None or s is None:
            continue
        green, swir = g[0], s[0]
        h = min(green.shape[0], swir.shape[0])
        w = min(green.shape[1], swir.shape[1])
        green, swir = green[:h, :w], swir[:h, :w]
        mndwi = (green - swir) / np.clip(green + swir, 1e-6, None)
        water = mndwi > 0.0  # MNDWI>0 is the standard inland-water threshold

        best = (0.0, h // 2, w // 2)
        for r0 in range(0, max(1, h - BOX_PX), STRIDE):
            for c0 in range(0, max(1, w - BOX_PX), STRIDE):
                frac = float(water[r0:r0 + BOX_PX, c0:c0 + BOX_PX].mean())
                if frac > best[0]:
                    best = (frac, r0 + BOX_PX // 2, c0 + BOX_PX // 2)

        frac, cr, cc = best
        # pixel offset -> lon/lat (10 m pixels; ~0.00009 deg per 10 m)
        d_lat = -(cr - h / 2) * 10 / 111_320
        d_lon = (cc - w / 2) * 10 / (111_320 * np.cos(np.radians(lat)))
        return {"lon": round(lon + d_lon, 5), "lat": round(lat + d_lat, 5),
                "mndwi_water_pct": round(100 * frac, 3),
                "scene_date": scene["properties"]["datetime"][:10]}
    return None


def main() -> None:
    plan = pd.read_parquet(OUT / "m4_plan.parquet")
    top = plan.groupby("block_uuid").cost_lakh.sum().nlargest(N_BLOCKS).index.tolist()
    reg = pd.read_csv(OUT / "canonical_blocks.csv")
    r21 = reg[reg.vintage == 2021].set_index("block_uuid")

    rows = []
    for uuid in top:
        if uuid not in r21.index:
            continue
        r = r21.loc[uuid]
        name = str(r.block_name).title()
        try:
            hit = discover(float(r.centroid_lon), float(r.centroid_lat))
        except Exception as exc:
            print(f"{name:20s} FAILED {type(exc).__name__}")
            continue
        if not hit:
            print(f"{name:20s} no scene")
            continue
        rows.append({"block_uuid": uuid, "block_name": name,
                     "district": str(r.district_name).title(), **hit})
        print(f"{name:20s} water {hit['mndwi_water_pct']:6.3f}% at "
              f"({hit['lon']:.4f},{hit['lat']:.4f}) [{hit['scene_date']}]")

    df = pd.DataFrame(rows)
    df.to_parquet(OUT / "cv_sites.parquet", index=False)
    print(f"\nsites discovered: {len(df)} · with water>0.1%: {(df.mndwi_water_pct > 0.1).sum()}")


if __name__ == "__main__":
    main()
