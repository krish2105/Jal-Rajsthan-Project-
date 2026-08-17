# PLAN-V4 Week 1 — completion report

Built overnight 2026-08-19, no agents spawned, everything verified before deploy.

## A1 · Geostatistics (M7) — the spec's kriging, finally
Ordinary kriging over **585** monitoring stations (2019 pre-monsoon campaign):
continuous water-table surface on a 5.5 km grid **plus its variance map**.

| metric | value |
|---|---|
| LOOCV RMSE | **14.7 m** |
| LOOCV MAE / bias | 9.82 m / −0.41 m |
| skill vs state-mean baseline | **31% better** |
| monitoring adequacy | 50% of area below median σ |
| variogram | spherical, sill 324 · range 2.28° · nugget 162 |

The nugget/sill ratio is itself the finding: **half the variance lives below
station spacing**, i.e. the network cannot resolve local cones of depression —
a quantified argument for where new piezometers belong. Two new map layers
(kriged depth, uncertainty) ship with it.

Fluoride status: station mg/L is unreachable in every open feed we tried
(India-WRIS down, CKAN carries levels only, AIKosh API 403/auth-gated, the
CGWB Rajasthan Yearbook 2022-23 has no station chemistry). The engine is
chemistry-ready — one column swap — and that is stated rather than fudged.

## A2 · Deep learning benchmark (M8) — we tested instead of assuming
LSTM and an N-BEATS-lite generic-basis stack vs the incumbent, identical
expanding-window splits, identical residual-on-persistence target:

| model | mean MAE (m) |
|---|---|
| **LightGBM (champion, retained)** | **3.67** |
| LSTM | 3.84 |
| persistence | 3.92 |
| N-BEATS-lite | 4.01 |

With ~1.5k samples the sequence models are over-parameterised; the tree wins and
keeps the crown. Engineering note: torch + LightGBM both ship libomp on macOS and
deadlocked at 0% CPU for 38 minutes until pinned (`KMP_DUPLICATE_LIB_OK`,
`OMP_NUM_THREADS=1`) — logged because silent deadlocks are worth remembering.

## A3 · Satellite site discovery — the CV upgrade
OSM/Overpass was unreachable (504 + mirror timeouts), so the imagery finds its
own targets: MNDWI search over a 6.4 km window per plan block, sliding a 1.6 km
box to the wettest position. Found real water in **7 of 12** priority blocks
(Balotra 4.25%, Jaisalmer_Rural 1.19%, Rajgarh 0.85%…). DeepWaterMap now tracks
those coordinates seasonally instead of bare centroids. A 20 m-band upsampling
bug (`int(0.5) = 0` → empty arrays → a suspiciously perfect 0.0% everywhere) was
caught and fixed here; see reports/a3_sites.md.

## A4 · Agent hardening
Sentence-window RAG retrieval (700-char chunks + neighbour context), a 20-case
copilot eval harness scoring tool routing and answer grounding, and **bilingual
voice input** (Web Speech API, hi-IN/en-IN) on the copilot.

## A5 · Officer workflow — dashboard becomes tool
Works ledger (sanctioned → built → verified) backed by Postgres with row-level
security: an officer editing another district's row updates **zero rows**,
proven end to end. Plan-execution and verified-works KPIs, plus a notification
centre fed by the anomaly detector and watchlist.
