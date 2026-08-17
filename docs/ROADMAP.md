# JAL — Master roadmap (beyond the current build)

What exists today is a complete vertical slice on real data. This is the staged
path from portfolio flagship to a deployable state system — each phase is
independently valuable and demoable.

## Phase A — Data depth (2–3 weeks)
- **India-WRIS station ingestion** (built as pending plugin): pre/post-monsoon
  depth per piezometer → block aggregation → M1 upgrades to depth forecasting
  with seasonal signals. (Portal was unreachable at build time; retry harness in
  `data/raw/wris_PENDING.md`.)
- **Fluoride mg/L kriging** (spec M3 full form): CGWB water-quality yearbook
  stations → ordinary kriging + variance surface → replaces categorical tags;
  LOOCV RMSE + Nagaur ≈5.8 mg/L validation.
- **IMD gridded rainfall** (0.25° NetCDF) → block rainfall anomalies as forecast
  features; drought-scenario coupling for the optimiser.
- **MGNREGA works ledger** by block: actual water-conservation assets and spend →
  budget-utilisation KPIs and plan-vs-actual tracking.

## Phase B — Product surface (2–3 weeks)
- **Alerts & subscriptions**: officers subscribe to their blocks; category-risk and
  anomaly alerts by email/SMS (gov SMS gateway).
- **Report studio**: one-click bilingual PDF briefing per district/block (the
  pipeline's output, letterhead-ready) for review meetings.
- **Comparison mode**: any two blocks/districts side by side; assessment-over-
  assessment diff view ("what changed since GWRA 2024").
- **Public layer**: a citizen-facing read-only view (block lookup + water story)
  meeting GIGW 3.0 accessibility (WCAG 2.1 AA, Hindi-first).
- **PWA/offline**: field-officer mode with cached district pack.

## Phase C — Institutional integration (4–6 weeks)
- **RajSSO/Parichay OIDC + Postgres RLS** (see SECURITY.md) — real identity,
  server-enforced district scoping, full audit trail.
- **INGRES write-back**: assessment-workflow annotations flowing back through
  the GEC system's authenticated APIs.
- **Jal Jeevan Mission / PHED linkage**: habitation-level water-quality joins —
  fluoride exposure moves from block-level to habitation-level accuracy.
- **Works evaluation**: difference-in-differences on completed MGNREGA recharge
  works vs matched control blocks — the causal answer the spec deliberately
  refuses to fake today. This turns the next assessment cycle into an experiment.
- **Multi-state**: the pipeline is registry-swappable; Punjab (highest extraction
  in India) is the natural second state.

## Phase D — Model upgrades (ongoing)
- Seasonal depth model once WRIS lands (persistence will be beatable with real
  seasonal signals — the honest current champion is a data statement, not a limit).
- Optimiser v2: multi-year budgets, construction-capacity constraints, structure
  maintenance decay, robust optimisation over rainfall scenarios.
- Copilot v2: Anthropic/Claude or state-hosted larger model behind the same
  citation-audit harness; voice input (Hindi) for field use.

## Non-goals (kept deliberately)
- No causal claims without the Phase C experiment design.
- No auto-approval of plans — the optimiser proposes, officers dispose.
- No dark-pattern "AI decides" framing: deterministic core stays the decider.
