"""D5 — DeepWaterMap pretrained water segmentation at plan sites (Sentinel-2).

Model: DeepWaterMap v2 (Isikdogan et al., UT Austin) — pretrained on Landsat-8
B2–B7; we feed the standard Sentinel-2 band mapping (blue, green, red, nir,
swir16, swir22), a documented cross-sensor transfer. Checkpoint cp.135.ckpt
(UT Box, see data/raw/deepwatermap/SOURCE.md). Preprocessing copied verbatim
from the authors' inference.py (min-max normalize, reflect-pad to /32).

For the top plan blocks: pre- and post-monsoon scenes 2023–2025 from the AWS
open Sentinel-2 archive (earth-search STAC, no auth), 160-px window at block
centroid, DWM water probability > 0.5 vs NDWI > 0.05 baseline — both reported
per scene (the honest comparison table). Production would target exact
structure coordinates (stated in UI).

Output: web/src/data/works_verify.json (upgraded schema)
        reports/d5_cv_comparison.md
"""

from __future__ import annotations

import os

os.environ["TF_USE_LEGACY_KERAS"] = "1"  # 2019 model + TF1 ckpt need Keras 2

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "vendor"))

from jal.ingest.sentinel import WINDOW_PX, best_scene  # noqa: E402

OUT = Path("data/processed")
WEB = Path("web/src/data")
REPORTS = Path("reports")
CKPT = Path("data/raw/deepwatermap/cp.135.ckpt")

BANDS = ["blue", "green", "red", "nir", "swir16", "swir22"]  # ≈ Landsat B2–B7
WINDOWS = [("2023-04-15", "2023-06-15"), ("2023-10-01", "2023-12-15"),
           ("2024-04-15", "2024-06-15"), ("2024-10-01", "2024-12-15"),
           ("2025-04-15", "2025-06-15"), ("2025-10-01", "2025-12-15")]
N_SITES = 8   # the 8 wettest discovered sites x 6 seasonal windows


def read_stack(scene: dict, lon: float, lat: float) -> np.ndarray | None:
    import rasterio
    from rasterio.warp import transform as wt
    from rasterio.windows import Window

    chans = []
    for b in BANDS:
        href = scene["assets"].get(b, {}).get("href")
        if not href:
            return None
        with rasterio.open(href) as src:
            xs, ys = wt("EPSG:4326", src.crs, [lon], [lat])
            row, col = src.index(xs[0], ys[0])
            scale = 10 / abs(src.transform.a)  # 20m bands need half-size window
            half = int(WINDOW_PX / 2 * scale)
            arr = src.read(1, window=Window(col - half, row - half, 2 * half, 2 * half))
            if arr.size == 0:
                return None
            if arr.shape != (WINDOW_PX, WINDOW_PX):
                z = np.zeros((WINDOW_PX, WINDOW_PX), dtype=arr.dtype)
                r = np.repeat(np.repeat(arr, 2, axis=0), 2, axis=1) if scale < 1 else arr
                z[: min(WINDOW_PX, r.shape[0]), : min(WINDOW_PX, r.shape[1])] = \
                    r[:WINDOW_PX, :WINDOW_PX]
                arr = z
            chans.append(arr.astype(np.float32))
    return np.stack(chans, axis=-1)


def dwm_predict(model, img: np.ndarray) -> np.ndarray:
    x = np.nan_to_num(img, nan=0.0, posinf=0.0, neginf=0.0)
    x = x - x.min()
    x = x / max(x.max(), 1)
    pad = (32 - img.shape[0] % 32) % 32
    if pad:
        x = np.pad(x, ((0, pad), (0, pad), (0, 0)), "reflect")
    prob = model.predict(x[None, ...], verbose=0)[0, :, :, 0]
    return prob[: img.shape[0], : img.shape[1]]


def main() -> None:
    import deepwatermap  # vendored model definition

    model = deepwatermap.model()
    model.load_weights(str(CKPT)).expect_partial()

    # A3 v2: track SATELLITE-DISCOVERED water sites, not bare block centroids
    disc = pd.read_parquet(OUT / "cv_sites.parquet")
    disc = disc.sort_values("mndwi_water_pct", ascending=False).head(N_SITES)
    print(f"tracking {len(disc)} discovered sites "
          f"(water {disc.mndwi_water_pct.min():.2f}-{disc.mndwi_water_pct.max():.2f}%)")

    sites, rows = [], []
    for _, r in disc.iterrows():
        lon, lat = float(r.lon), float(r.lat)
        name = str(r.block_name)
        series = []
        for start, end in WINDOWS:
            try:
                scene = best_scene(lon, lat, start, end)
                if not scene:
                    continue
                img = read_stack(scene, lon, lat)
                if img is None:
                    continue
                prob = dwm_predict(model, img)
                dwm_pct = float((prob > 0.5).mean()) * 100
                g, nir = img[:, :, 1], img[:, :, 3]
                ndwi_pct = float(((g - nir) / np.clip(g + nir, 1e-6, None) > 0.05).mean()) * 100
                d = scene["properties"]["datetime"][:10]
                series.append({"date": d, "dwmPct": round(dwm_pct, 2),
                               "ndwiPct": round(ndwi_pct, 2)})
                rows.append({"site": name, "date": d, "dwm": round(dwm_pct, 2),
                             "ndwi": round(ndwi_pct, 2)})
                print(f"{name} {d}: DWM {dwm_pct:.2f}% · NDWI {ndwi_pct:.2f}%")
            except Exception as exc:
                print(f"{name} {start}: {type(exc).__name__}: {str(exc)[:80]}")
        if series:
            sites.append({"block": name, "district": str(r.district),
                          "lon": lon, "lat": lat,
                          "discoveryWaterPct": float(r.mndwi_water_pct),
                          "series": series})

    json.dump({"sites": sites,
               "method": "DeepWaterMap v2 pretrained (Landsat-trained, standard S2 "
                         "band transfer) vs NDWI>0.05 over a 1.6 km box at "
                         "SATELLITE-DISCOVERED water sites (MNDWI search over a 6.4 km "
                         "window per plan block) — not block centroids. Production "
                         "targets surveyed structure coordinates."},
              open(WEB / "works_verify.json", "w"))
    cmp_df = pd.DataFrame(rows)
    lines = ["# D5 — DeepWaterMap vs NDWI comparison (honest table)", "",
             f"Sites: {len(sites)} · scenes: {len(rows)} · model: cp.135 pretrained",
             "", cmp_df.to_markdown(index=False) if len(rows) else "(no scenes)",
             "", "Desert-centroid windows are legitimately near-0% water; the",
             "signal is DWM-vs-NDWI agreement and post-monsoon deltas at sites",
             "with actual water bodies. Cross-sensor transfer (Landsat->S2) is",
             "standard but stated."]
    (REPORTS / "d5_cv_comparison.md").write_text("\n".join(lines) + "\n")
    print(f"\nsites: {len(sites)} · scene-rows: {len(rows)} -> works_verify.json")


if __name__ == "__main__":
    main()
