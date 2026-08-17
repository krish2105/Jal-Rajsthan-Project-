# PLAN V4 — two more weeks: 92→95+ · prod 78→85+

Roles in the room: CTO (architecture), CEO (the hiring pitch), COO (ops),
Sr Frontend/Backend/AI/Agentic/UI-UX (execution). Research 2026-08-19: fluoride
station data EXISTS ([AIKosh Rajasthan GW quality dataset](https://aikosh.indiaai.gov.in/home/datasets/details/ground_water_quality_in_rajasthan_2014.html),
[CGWB Yearbook 2022-23 Rajasthan](https://cgwb.gov.in/cgwbpnm/) station tables) —
the last missing spec piece (M3 kriging) is now buildable.

## Where the remaining points actually live
92→95+: fluoride kriging (+~1.5) · DL benchmark done right (+0.5) · CV on real
water bodies (+0.5) · officer WORKFLOWS not just views (+1) · RAG/copilot eval
harness + voice (+0.5). Prod 78→85+: your four signups (+7 by rubric) + hosted
API wiring + Lighthouse/axe CI + security scans.

---

## TRACK A — score (Week 1)

**A1 · D1-2 — M3 v2: real fluoride kriging (the spec's crown jewel)**
AIKosh dataset (browser-assisted download) + Yearbook station tables (PDF parse,
retry harness). Station mg/L → ordinary kriging (pykrige) → block mean/max +
VARIANCE surface → people-at-risk v2 (pop × >1.5mg/L exceedance). Gates: LOOCV
RMSE reported; Nagaur ≈ max (~5.8); ≥15 districts >1.5. New map layers: fluoride
mg/L + uncertainty. New KPIs: pop-weighted fluoride severity, % stations >limit.

**A2 · D3 — DL done right (the "we know when not to use DL" flex, inverted)**
Benchmark N-BEATS + LSTM vs champion LightGBM on the 1,479 depth pairs; identical
expanding-window splits; honest table + error violins + calibration (QQ) plot.
Ship whichever wins; publish the table either way. Also: conformal calibration
report for all forecasts.

**A3 · D4 — CV v2: real water bodies, real signal**
OSM Overpass: reservoirs/tanks/ponds within plan blocks → DWM at TRUE water-body
coordinates (replaces centroids) → nonzero seasonal area curves; works-verified
KPI becomes meaningful. Per-site sparkline cards; before/after monsoon imagery
thumbnails if cheap.

**A4 · D5 — Agent layer hardening**
Sentence-window RAG chunking (fixes ₹19,318 retrieval); copilot EVAL HARNESS:
20-case tool-routing + answer-accuracy suite, scored in CI like the retrieval
eval; VOICE INPUT: Web Speech API hi-IN + en-IN mic button on the copilot (free,
in-browser, huge demo moment); critic verdict trimmed to 2 lines.

**A5 · D6-7 — From dashboard to TOOL: officer workflows**
Works-ledger UI backed by the RLS API: officers update built counts (their
district only — RLS enforced), secretary approves, satellite verify status shown;
notification center (bell) fed by sentinel/anomaly runs; plan-execution % KPI
(built/sanctioned from ledger). This is the "officials would USE this daily"
argument — the biggest hiring-room differentiator left.

## TRACK B — production (Week 2)

**B1 · D8 — Your 20 minutes (the +7):** per [SETUP-CLOUD.md](SETUP-CLOUD.md):
Neon URL paste → `db_init.sh` · Render blueprint Retry · Sentry 2 DSNs ·
UptimeRobot 2 monitors · Vercel GitHub App. I wire everything same-day:
NEXT_PUBLIC_JAL_API, DSNs, live cloud replay agents, auto-deploy verified.

**B2 · D9 — Perf & a11y wall:** Lighthouse CI (≥90 budget enforced) + axe
automated pass in Playwright; bundle audit (defer three.js below fold, image
optimization); Core Web Vitals verified on 4G profile.

**B3 · D10 — Security close-out:** gitleaks + dependabot in CI; self-run
pen-checklist (OWASP top-10 walk); rate-limit + auth E2E cases; SECURITY.md
final. Target prod ≥85 by rubric re-score.

**B4 · D11-12 — UX polish sprint (Sr UI/UX):** ⌘K command palette (jump to
block/district/section) · guided DEMO TOUR mode (8-step spotlight, the exact
90-second script as an interactive overlay) · PWA manifest + offline shell ·
skeleton loaders everywhere · empty/error states audit · print-ready state
report page · your Hindi corrections applied.

**B5 · D13 — Content & pitch:** exec brief v3, README refresh, 12 new KPIs
live, demo video one-take (optional), outreach one-pager for PHED/GWD/CoE-AI.

**B6 · D14 — FREEZE + tag v1.0:** full E2E, autopilot dry-run, prod sweep,
rollback tag, rehearsal checklist.

## New KPIs (12)
pop-weighted fluoride severity · % stations >1.5mg/L · risk momentum (stage Δ ×
depth trend composite) · plan execution % (ledger) · works verified % · DLI
projection score · data freshness (hrs since source check) · forecast skill vs
persistence % · district league movement (↑↓ vs last assessment) · per-capita
stress (ham deficit/person) · monsoon dependency index (recovery/extraction) ·
copilot answer accuracy % (from the eval harness)

## New charts (8)
kriged fluoride surface + variance map · feature correlation heatmap · persona
composition per district (stacked) · DL-vs-GBM error violins · works funnel
(sanctioned→built→verified) · anomaly timeline strip · year-faceted choropleth
small-multiples · forecast calibration QQ

## Locked decisions (2026-08-19)
- NO cloud signups this round — B1 replaced by: deepen local-equivalent prod
  (hosted-API dry-run via ngrok-free? NO — keyless only: local API + docs).
  Prod ceiling this round: ~80; stated honestly in the score.
- DL: full N-BEATS + LSTM benchmark table.
- Voice: hi-IN/en-IN mic on copilot — IN.
- Freeze: Day 14, zero slack (user's call; slips get cut loudly).

## Risks
AIKosh download may need the browser (planned); yearbook PDFs flaky (retry);
N-BEATS may lose to GBM (fine — the table is the deliverable); OSM sparse in
desert blocks (fall back to district tanks); signups slip → prod stays ~78 and
we say so.
