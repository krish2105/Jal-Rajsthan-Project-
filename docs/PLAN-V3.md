# PLAN V3 — 14 days to 95+ score / 85+ production readiness

Targets: **overall 95+** (from 88) and **production readiness 85+** (from 48),
demo-frozen with 2 buffer days. Two parallel tracks: Week 1 = score movers
(data/ML/DL/CV/dashboard), Week 2 = production hardening + polish.

## Unblocked by research (2026-08-18)
- **Water levels**: indiawris front-end is down but the download endpoint the
  [QGIS wris_extractor plugin](https://plugins.qgis.org/plugins/wris_extractor/)
  uses is replicable in Python; fallbacks: [India Data Portal CKAN groundwater
  bulk](https://ckandev.indiadataportal.com/dataset/groundwater), [NWIC](https://nwic.gov.in/data),
  [CGWB GWLM](https://cgwb.gov.in/en/ground-water-level-monitoring). ≥1 of 3 will land.
- **CV**: tiny U-Net (~200k params, PyTorch) trained on Sentinel-2 chips with
  NDWI-weak labels beats threshold NDWI ([2025 refs](https://www.nature.com/articles/s41598-025-99322-z));
  DeepWaterMap pretrained as fallback. All on existing free AWS S2 COGs.

## Week 1 — score movers

**D1–2 · Water-level blitz** — `jal/ingest/wris2.py` replicating the plugin's
endpoint; else CKAN bulk. Station→block spatial join (geometry exists).
GATE: ≥60% of blocks with ≥6 seasons of pre/post-monsoon depth, else fallback
declared honestly and M1 stays stage-based.

**D3 · M1-depth v2 + M3 kriging** — LightGBM on depth with seasonal features,
expanding-window vs persistence; conformal intervals. If quality stations found:
pykrige fluoride surface + LOOCV + Nagaur validation (spec's original M3).

**D4 · New ML (M5, M6)** — M5 anomaly detector (IsolationForest over panel
deltas; feeds sentinel + UI badges). M6 "aquifer personas": KMeans/UMAP block
typologies, 5–6 named profiles (e.g. "canal-buffered safe", "urban crash") —
officials think in types, not numbers.

**D5 · CV/DL** — water-spread segmentation at top-20 plan sites: tiny U-Net,
NDWI-weak-label self-training, IoU vs NDWI baseline reported honestly; monthly
2023–25 water-area curves per site. Fallback if IoU gain <2pts: NDWI+MNDWI+Otsu
ensemble, stated as such.

**D6 · Map v2** — recenter/fit-bounds button, district zoom dropdown, block
search box, mobile tap-tooltip fix, new layers: personas (M6), anomalies (M5),
depth trend (if D1 lands).

**D7 · Charts pack** — category Sankey 2017→2025, stage ridgeline per year,
rainfall-vs-stage scatter+fit, district sparkline small-multiples, state
forecast fan, CV water-area curves, budget waterfall, structure donut.
New KPIs: seasonal recovery index, depth trend m/yr, station coverage %,
verified-water-spread index, anomaly count, recharge ₹-efficiency by district.

## Week 2 — production readiness 85+

**D8 · Real auth** — NextAuth: per-user credentials (+optional TOTP), httpOnly
server sessions, role checks in middleware (server-side, not localStorage);
demo passcode page retained as guest mode.

**D9 · Postgres + hosted API** — Neon free tier: sessions, audit log, works
ledger, **RLS policies live** (district scoping enforced in DB); FastAPI to
Render/Fly with /health + /ready; DuckDB stays for analytics reads.

**D10 · Observability** — Sentry (web+API), UptimeRobot on / and /api/health,
structured JSON logs, nightly pg_dump via GitHub Action to repo artifacts.

**D11 · Test wall** — Playwright E2E in CI (login, map click, drawer, copilot
replay, explorer, public portal, both languages), Lighthouse CI ≥90, axe a11y
sweep + fixes.

**D12 · RAG v2** — table-aware chunking (page tables extracted separately),
"quote exact figure + page" harness; golden set →30 Qs; fresh verified 8B
replay set including the Master-Plan ₹19,318 Cr answer (gated on the number
appearing).

**D13 · Polish** — Hindi review applied, runbook.md + SLO doc, KPI drill-down
modals, exec one-pager refresh with new numbers.

**D14 · Freeze** — full demo drill deployed+offline, rollback tag, buffer.

## Production-readiness rubric to 85
real auth+server RBAC (15) · Postgres+RLS (15) · monitoring+alerts (10) ·
backups (5) · E2E+Lighthouse CI (15) · hosted API w/ health (10) · runbook/SLO
(5) · auto-deploy via GH app (5) · already-done security base (5) = **85**

## Locked decisions (2026-08-18)
- Cloud accounts: USER WILL CREATE on demand (Neon D9, Sentry+UptimeRobot D10, Render/Fly D9)
- CV: **DeepWaterMap pretrained** primary (published weights), NDWI ensemble fallback with IoU table
- Auth: real per-user logins + JAL2026 guest demo mode retained
- Freeze: **Day 14** (user accepts zero-slack risk; slips get cut loudly, not silently)

## Risks
WRIS endpoint auth-walled → CKAN bulk (older vintage, stated). U-Net underwhelms
→ ensemble fallback, honest IoU table either way. Free-tier signups need the
user (see questions). Two-week scope discipline: anything slipping goes to
buffer day or gets cut loudly, never silently.
