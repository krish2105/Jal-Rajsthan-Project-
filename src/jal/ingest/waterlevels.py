"""Station water-level ingestion — CGWB depth-to-water via India Data Portal bulk.

Source: CKAN resource `cgwb-changes-in-depth-to-water-level.csv` (see
data/raw/waterlevels/SOURCE.md). 1,394 Rajasthan stations with coordinates,
2013–2023, four seasonal campaigns (Jan / May pre-monsoon / Aug / Nov
post-monsoon).

Produces block-season depth series by point-in-polygon join against the
official INGRES block geometry (2021 vintage):
  data/processed/block_depth_seasons.parquet
    [block_uuid, year, premonsoon_depth_m, postmonsoon_depth_m,
     n_stations_pre, n_stations_post, seasonal_recovery_m]

Depth = metres below ground level (higher = worse). Block value = median of
station readings inside the polygon for the campaign window.
"""

from __future__ import annotations

from pathlib import Path

import geopandas as gpd
import pandas as pd

RAW = Path("data/raw")
OUT = Path("data/processed")

PRE_MONTHS = (4, 5, 6)     # pre-monsoon campaign (May-centred)
POST_MONTHS = (10, 11, 12)  # post-monsoon campaign (Nov-centred)


def build() -> pd.DataFrame:
    df = pd.read_parquet(RAW / "waterlevels/raj_depth.parquet")
    df["date"] = pd.to_datetime(df["date"])
    df["year"] = df.date.dt.year
    df["month"] = df.date.dt.month

    pts = gpd.GeoDataFrame(
        df, geometry=gpd.points_from_xy(df.longitude, df.latitude), crs="EPSG:4326"
    )
    all_blocks = gpd.read_file(RAW / "boundaries/rajasthan_blocks_ingres.geojson")
    frames = []
    for vintage in (2019, 2021):
        blocks = all_blocks[(all_blocks["type"] == "BLOCK") & (all_blocks["year"] == vintage)][
            ["uuid", "geometry"]
        ].rename(columns={"uuid": "block_uuid"})
        j = gpd.sjoin(pts, blocks, how="inner", predicate="within")
        j["vintage"] = vintage
        frames.append(j)
    joined = pd.concat(frames, ignore_index=True)
    print(f"readings joined to blocks: {len(joined)} / {len(df)}"
          f" · blocks hit: {joined.block_uuid.nunique()} / 302")

    rows = []
    for (uuid, year), g in joined.groupby(["block_uuid", "year"]):  # both vintages present
        pre = g[g.month.isin(PRE_MONTHS)]["currentlevel"]
        post = g[g.month.isin(POST_MONTHS)]["currentlevel"]
        rows.append(
            {
                "block_uuid": uuid,
                "year": int(year),
                "premonsoon_depth_m": round(float(pre.median()), 2) if len(pre) else None,
                "postmonsoon_depth_m": round(float(post.median()), 2) if len(post) else None,
                "n_stations_pre": int(pre.count()),
                "n_stations_post": int(post.count()),
            }
        )
    out = pd.DataFrame(rows)
    out["seasonal_recovery_m"] = (
        out.premonsoon_depth_m - out.postmonsoon_depth_m
    ).round(2)  # positive = monsoon lifted the water table

    out.to_parquet(OUT / "block_depth_seasons.parquet", index=False)

    # coverage gate (PLAN-V3 D1: >= 60% of blocks with >= 6 seasons of pre-monsoon)
    reg21 = set(all_blocks[(all_blocks["type"] == "BLOCK") & (all_blocks["year"] == 2021)]["uuid"])
    per_block = (
        out[out.block_uuid.isin(reg21)]
        .dropna(subset=["premonsoon_depth_m"]).groupby("block_uuid").size()
    )
    covered = int((per_block >= 6).sum())
    print(f"blocks with >=6 pre-monsoon seasons: {covered} / 302 "
          f"({100 * covered / 302:.0f}%) — gate: 60%")
    if covered / 302 < 0.6:
        print("GATE NOT MET — declare honestly, M1 stays stage-based for uncovered blocks")
    else:
        print("GATE MET — M1-depth v2 is GO")
    return out


if __name__ == "__main__":
    build()
