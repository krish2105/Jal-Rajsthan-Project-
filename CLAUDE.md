# JAL — Claude Code Operating Doc

## What this project is
Block-level groundwater risk analytics for Rajasthan: extract CGWB assessments →
reconcile block identities → forecast depletion → map fluoride exposure →
optimise MGNREGA-budgeted recharge interventions → agentic AI layer (Policy Copilot,
multi-agent analysis pipeline, data-ops, scenario agents) → Aurora-glass Next.js
dashboard. 302 blocks, ~10 years. Deterministic core; LLMs never produce numbers.

## Non-negotiables
1. **Published totals are the parser's ground truth.** Rajasthan has 302 assessed
   blocks; the 2022 assessment splits 219 over-exploited / 22 critical /
   20 semi-critical / 38 safe. If a parse run doesn't reconcile to published
   category counts, the parse is WRONG. Fail loudly, never proceed with a
   partial table.
2. **Time-series splits only.** Train on years ≤ T, test on T+1. Random K-fold on
   panel data is leakage. Any `train_test_split(shuffle=True)` on the panel is a bug.
3. **Always report the persistence baseline.** Next year = this year. If the model
   doesn't beat it, say so.
4. **Uncertainty is not optional.** Quantile models for forecasts, kriging variance
   for fluoride. Any single-point estimate shown in the UI must carry its interval.
5. **Never silently impute.** Every fill is logged to the data-quality report with
   method and count. Prefer NULL and a flag over a fabricated value.
6. **canonical_blocks.csv is hand-curated and committed.** Fuzzy matching proposes;
   a human override table decides. Never auto-accept a fuzzy match below 0.95.
7. **Agents cite or die.** Every numeric claim from an agent carries evidence_ids
   resolving to tool results. The critic rejects unevidenced claims. LLM output
   containing invented numbers is a bug, not a style issue.

## Style
- geopandas for anything with geometry; never lat/lon in bare floats across boundaries
- All units explicit in column names: `_m`, `_ham` (hectare-metres), `_mgl`, `_lakh`
- DuckDB + Parquet for the panel; no in-memory-only pipelines
- Config in `config/`: model params, unit costs, budget assumptions, thresholds
- Every model has a `baseline_*` counterpart in the same module
- Frontend: dark default + light toggle (next-themes), EN/हिन्दी toggle (next-intl),
  every metric has a plain-language explainer, `prefers-reduced-motion` respected

## Working method
- Simplest model that works. 3,000 rows is a LightGBM problem, not a GNN problem.
- Parse 3 years before parsing 10. Prove the pipeline small.
- Every task gets a verify step tied to a published number where one exists.
- Every data source gets `data/raw/<source>/SOURCE.md` (URL, date, checksum).
- Surgical edits. Don't reformat the reconciliation tables.

## Commands
uv run python -m jal.ingest.cgwb --years 2020,2022,2023   # parse + reconcile
uv run python -m jal.panel.build                          # assemble block_year
uv run python -m jal.models.train --model m1              # with backtest report
uv run python -m jal.optimise.run --budget-lakh 12000     # MILP
uv run pytest
uv run uvicorn jal.api.main:app --reload
cd web && pnpm dev

## Definition of done
- [ ] Reconciles to published CGWB category counts
- [ ] Baseline comparison in eval report
- [ ] Time-series split verified (assert in tests)
- [ ] Uncertainty intervals present and coverage-checked
- [ ] Data-quality report regenerated
- [ ] reports/eval_latest.md committed
