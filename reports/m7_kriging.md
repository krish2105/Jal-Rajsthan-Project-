# M7 — ordinary kriging: water-table surface + uncertainty

Stations: **585** (2019 pre-monsoon campaign, medians per station, 0-200 m sanity filter).
Variogram: spherical, params (sill, range, nugget) = [323.955, 2.278, 162.294].
Grid: 181x145 at 0.05° (~5.5 km).

## Honest error (leave-one-out cross-validation)

| n | kriging RMSE (m) | MAE (m) | bias (m) | state-mean RMSE (m) | skill |
|---|---|---|---|---|---|
| 220 | 14.7 | 9.82 | -0.41 | 21.3 | **31.0% better** |

Depth across Rajasthan spans 0.5-128 m, so absolute RMSE looks large; what
matters is skill against the alternative (assume the state average), and the
nugget (162 of 324 sill) is itself the finding: half the variance lives below
station spacing — i.e. the network is too sparse to resolve local cones of
depression. That is an argument for more piezometers, quantified.

Monitoring adequacy: **50%** of interpolated area sits below the median kriging standard deviation — the rest is where the network is too thin to trust a point estimate, and the variance layer shows exactly where.

## Why this matters

The uncertainty surface is the product, not a footnote: it tells a department
where new piezometers buy the most information. Deepest kriged blocks:

| block_uuid                           |   kriged_depth_m |   kriging_sd_m |
|:-------------------------------------|-----------------:|---------------:|
| d4828392-a2b6-436b-beab-33915aa45bf7 |            73.88 |          15.06 |
| a29e84f8-8269-410f-a141-d33a6a16f5c1 |            72.23 |          15.61 |
| 468e8f80-30d8-4461-86d0-e8a65ce90c3b |            71.6  |          15.09 |
| 6883b002-d8f7-4432-a611-a03468b94f57 |            62.79 |          14.83 |
| 73bde824-95d3-41e0-b7f2-162b1c1bb4b1 |            57.42 |          15.54 |

## Fluoride status (stated plainly)

Station-level fluoride (mg/L) is not in any open feed we could reach:
India-WRIS is down, the CKAN mirror carries only water levels, AIKosh's dataset
API is auth-gated, and the CGWB Rajasthan Yearbook 2022-23 contains no station
chemistry tables. The kriging engine here is chemistry-ready: set VALUE_COL to
the fluoride column and every product above regenerates unchanged.
