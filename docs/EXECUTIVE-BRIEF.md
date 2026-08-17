# JAL · जल — Executive brief
### Rajasthan Groundwater Intelligence Platform
**Live demo: https://jal-rajasthan.vercel.app**

---

## The problem — budgeted, not abstract

Rajasthan extracts more groundwater than nature returns. In the latest official
assessment (GWRA 2025), **213 of 302 assessed blocks are over-exploited**; the state's
extraction runs at roughly one-and-a-half times its recharge. Meanwhile **68 blocks
carry official fluoride quality tags**, with an estimated **1.17 crore people** living
in affected blocks. There *is* money to act — 65% of MGNREGA funds in over-exploited
and critical blocks are earmarked for water works. The unanswered question is
allocative: **which structures, in which blocks, buy the most future water and avert
the most exposure per rupee?**

## What JAL does

| Layer | Output | Method |
|---|---|---|
| Diagnose | Category, stage %, trend for all 302 blocks, 6 assessment rounds (2017–2025) | CGWB PDFs parsed + INGRES API, cross-verified |
| Forecast | Pre-monsoon depth per block in metres, 80% band | LightGBM beats persistence on all 5 backtest years (up to +14.7%) on 29.8k station readings |
| Watchlist | P(category worsens) per block — top-50 list is 5–7× sharper than chance | Gradient-boosted transition model, time-series splits |
| Exposure | People-at-risk from fluoride per block | Official CGWB quality tags × Census 2011 population |
| Prescribe | ₹-ranked recharge plan: 6 structure types, block by block | MILP optimiser: budget, feasibility, equity floor, per-block caps |
| Explain | Bilingual (EN/हिन्दी) Policy Copilot + visible multi-agent analysis | Local/private LLM; every number traces to a model tool; critic gate |

## Why the numbers can be trusted

- **Ground truth locked.** The 2022 parse must reconcile exactly to the published
  302-block split (219/22/20/38/3). It does; the build fails if it ever doesn't.
- **Two independent official sources agree.** PDF parses cross-check against the
  CGWB/IIT-H INGRES system for every year.
- **The baseline won and we shipped it.** Our ML challenger lost to persistence on
  point forecasts; we say so and ship the honest choice with calibrated uncertainty.
- **AI never computes.** Deterministic models produce every number; the AI layer only
  decides which tool to call and explains results — with citations audited per answer.

## The headline result

> At an identical ₹600-crore budget, the optimised plan buys **+69% more
> risk-weighted recharge than uniform spending**, while guaranteeing at least 25% of
> funds reach fluoride-affected blocks — a constraint no ranking heuristic honours.

## Geostatistics & verification (V4)
Ordinary kriging over 585 monitoring stations produces a continuous water-table
surface **and its uncertainty map** — LOOCV error ±14.7 m, 31% better than
assuming the state average, with half the variance living below station spacing:
a quantified argument for where new piezometers belong. Satellite site discovery
(MNDWI search over 6.4 km windows) located real water bodies in 7 of 12 priority
blocks — DeepWaterMap now tracks those coordinates seasonally instead of bare
centroids. A works ledger with database-enforced row-level security lets district
officers record progress on their own blocks and nobody else's.

## Depth of build (V3 additions)
Station depth data (1,394 CGWB stations, 79% block coverage, COVID monitoring gap
documented) · anomaly detection + six named aquifer personas · DeepWaterMap
satellite verification over 60 Sentinel-2 scenes (60/60 DL-NDWI agreement) ·
doc-grounded copilot citing GEC-2015 and the Master Plan by page (100% retrieval
eval) · real authentication with httpOnly sessions · Postgres row-level security
proven: a district officer's connection physically cannot read another district ·
Playwright E2E + CI security scanning · runbook and SLOs.

## What a deployment would add

Station-level telemetry (India-WRIS ingestion is built and pending portal
availability), difference-in-differences evaluation of completed works, INGRES
write-back for assessment workflows, and district-officer dashboards. The pipeline
is state-agnostic: any Indian state runs by swapping the block registry.

---
*All data public and official: CGWB · INGRES (IIT Hyderabad) · Census 2011 · MGNREGA.
Code, raw-file checksums, and every reconciliation override are in the open repository:
https://github.com/krish2105/Jal-Rajsthan-Project-*
