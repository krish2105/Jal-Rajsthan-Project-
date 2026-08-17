# JAL · जल — Rajasthan Groundwater Intelligence Platform

**Live demo: [jal-rajasthan.vercel.app](https://jal-rajasthan.vercel.app)** ·
Executive brief: [docs/EXECUTIVE-BRIEF.md](docs/EXECUTIVE-BRIEF.md) ·
Demo script: [docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md)

Block-level groundwater **diagnosis → forecast → exposure → prescription** for all
302 assessed blocks of Rajasthan, built end-to-end on official public data, with a
bilingual (English/हिन्दी) agentic AI layer whose every number traces to a
deterministic model.

> **Headline:** at an identical ₹600-crore MGNREGA budget, the MILP-optimised
> recharge plan buys **+69% more risk-weighted recharge than uniform allocation**,
> while guaranteeing ≥25% of spend reaches fluoride-affected blocks. The top-50
> "likely to worsen" watchlist is **5–7× sharper than chance**.

## Data — all real, all official, all verified

| Source | What | Verification |
|---|---|---|
| CGWB block-wise categorization PDFs (GWRA 2017–2025, 6 rounds) | Category per block-year | 2022 parse reconciles **exactly** to the published 302 = 219/22/20/38/3 split (hard assert + pytest) |
| INGRES (CGWB/IIT-H) verified assessments | Recharge, extraction, stage %, rainfall per block-year | Block counts match PDF parses for every year |
| INGRES GeoServer WFS | Official assessment-unit polygons (2019 + 2021 vintages) | UUIDs join business data directly |
| Census of India 2011 | District populations | Sums to the official 68,548,437 |

1,792 block-year records reconciled with **zero unmatched** — 54 hand-curated
overrides (transliteration variants, unit renames, PDF line-wraps), each committed in
[`data/processed/match_overrides.csv`](data/processed/match_overrides.csv).

## Models (`reports/` has full backtests)

- **M1 · Stage forecast** — expanding-window time-series backtests; the LightGBM
  challenger **lost to persistence and we shipped persistence**, wrapped in
  calibrated empirical uncertainty bands (0.88–0.98 coverage vs 0.80 target).
- **M2 · Category transitions** — macro-recall up to 0.95; top-50 worsening
  watchlist precision 0.10–0.14 vs 0.02 base rate.
- **M3 · Fluoride exposure** — official CGWB quality tags × population:
  68 tagged blocks, ≈1.17 crore people; Nagaur known-belt validation enforced.
- **M4 · MILP optimiser** — PuLP/CBC, ~1,800 integer vars, ≤25 s: budget,
  per-structure feasibility caps, ≥25% fluoride-equity floor, ≤2% per-block cap.

## Agentic layer — deterministic core, AI interface

- **Policy Copilot** (EN/हिन्दी): tool-calling loop over the models. Every numeric
  claim must cite an evidence id; an auditor flags unevidenced numbers per answer.
- **Analysis pipeline**: Hydrologist → Economist → Equity Auditor → Report Writer,
  with a **Critic** that rejects drafts on enumerable rules — reasoning streamed
  visibly to the UI.
- Providers: local **Ollama** (default `qwen3:4b`), any OpenAI-compatible endpoint,
  or **replay** — recorded real runs so the public demo can never fail.

## Frontend

Next.js 15 · MapLibre GL (official geometry, 5 lenses, 2D/3D extrusion) · React
Three Fiber hero · Motion animations · Lenis scroll · Recharts · dark/light theme ·
full EN/हिन्दी toggle · `prefers-reduced-motion` respected.

## Run it

```bash
# full local demo (API + web; live agents if Ollama is up)
scripts/run_local.sh

# pipeline pieces
uv run python -m jal.ingest.ingres --years 2022-2023   # pull assessment data
uv run python -m jal.ingest.cgwb                       # parse PDFs (+ ground-truth gate)
uv run python -m jal.reconcile.blocks                  # reconcile identities
uv run python -m jal.panel.build                       # DuckDB block_year panel
uv run python -m jal.models.m1_stage                   # forecast + backtests
uv run python -m jal.models.m2_transitions             # transition model
uv run python -m jal.models.m3_fluoride                # exposure layer
uv run python -m jal.optimise.milp                     # ₹600 Cr plan + baselines
uv run python -m jal.export.web                        # refresh dashboard data
uv run pytest                                          # ground-truth gates
```

## Honesty ledger (`docs/02-JAL-spec.md` §8 + `reports/`)

Assessment years are irregular; boundary vintages differ pre/post reorganisation
(flagged, crosswalked); fluoride tags are categorical, not concentrations
(station-level kriging pending India-WRIS availability); structure yields are stated
CGWB-derived design assumptions — the **ranking** is the defensible output; no causal
claims — evaluating actual works needs a difference-in-differences design.
