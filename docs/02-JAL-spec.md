# JAL — Rajasthan Groundwater Risk & Recharge Prioritiser
**जल** · Flagship #2 · 8 weeks (Roadmap Weeks 11–18) · ~130 hours

---

## 1. Problem statement

Rajasthan is running out of groundwater and the state knows exactly which blocks are worst — but it does not know **where the next rupee of recharge money should go.**

The numbers that open your README:
- **219 of Rajasthan's 302 blocks are classified 'over-exploited'** — 22 critical, 20 semi-critical, only 38 safe. Jaipur has 16 over-exploited blocks (highest in the state), then Jodhpur (15), Nagaur (14), Barmer (14).
- **Extraction runs at ~149% of recharge** — the second-highest rate in India. Water-table drops of 25–40 m in Jodhpur and Jhunjhunu; Jaipur's Jhotwara block dropped ~25 m since 2020 alone.
- Pre-monsoon depth worsened from ~24.5 m below ground level in 2015 to ~28.8 m in 2024.
- **17 districts exceed the 1.5 mg/L fluoride limit**, with Nagaur highest at 5.8 mg/L — nearly 4× the standard. The western fluoride belt covers Nagaur, Barmer, Jalore, Jodhpur, Sikar, Jhunjhunu.
- Crucially, **there is money to allocate**: 65% of MGNREGA funds in over-exploited and critical blocks are earmarked for water works, and 15 additional recharge activities (recharge shafts, injection wells, filtration ponds, artificial wetlands, traditional water-body renovation, spring chambers) were newly permitted for exactly these blocks.

So the decision problem is real and budgeted: **given a fixed block-level MGNREGA water budget, which recharge interventions in which blocks buy the most future water and avert the most fluoride exposure?**

### Why this is your strongest differentiator
Almost no fresher builds geospatial government analytics. Everyone builds a churn model and a RAG chatbot. A live interactive block-level map of Rajasthan with a forecast layer and a ₹-ranked intervention table is visually arresting in a 30-minute interview, and it is unarguably real work on a real crisis. It also opens doors that generic ML projects don't: PHED, Water Resources Department, Jal Jeevan Mission state unit, CGWB regional office, and the new CoE-AI.

---

## 2. Data sources — all public, all real

| Source | What you get | Where | Difficulty |
|---|---|---|---|
| **CGWB Dynamic Ground Water Resources Assessment** | Block-level annual: recharge, extractable resource, extraction, stage-of-extraction %, category (safe/semi-critical/critical/over-exploited) | `cgwb.gov.in` — state reports, annual | **Hard.** PDFs with tables. This is 40% of your project effort. |
| **CGWB water-level monitoring** | Piezometer/observation-well depths, 4×/year (pre-monsoon May, post-monsoon Nov, Jan, Aug) | `cgwb.gov.in`, also India-WRIS `indiawris.gov.in` | Medium — India-WRIS has an API-ish interface |
| **India-WRIS** | Aggregated water resources: rainfall, groundwater level, reservoir | `indiawris.gov.in` | Medium |
| **IMD rainfall** | District/gridded monthly + daily rainfall | `imdpune.gov.in`, `mausam.imd.gov.in` | Medium |
| **CGWB water-quality reports** | Fluoride, nitrate, salinity, TDS by district and station | CGWB annual water-quality reports | Hard (PDF) |
| **MGNREGA works data** | Water-conservation asset counts and expenditure by block | `nrega.nic.in` reports | Medium |
| **Crop production** | District × season × crop area and production | `data.gov.in` — district-wise season-wise crop production statistics | Easy |
| **Land use / land cover** | LULC raster, water bodies | Bhuvan `bhuvan.nrsc.gov.in` | Medium |
| **Boundaries** | Rajasthan district + block shapefiles | Survey of India, or the DataMeet India maps community repos | Easy–Medium |
| **Population** | Block/tehsil population for exposure weighting | Census 2011 + projected; `censusindia.gov.in` | Easy |
| **CGWB artificial-recharge feasibility** | Master Plan for Artificial Recharge — feasible structure types and unit costs by hydrogeological setting | CGWB Master Plan for Artificial Recharge to Groundwater | Hard but **essential** — this gives you real unit costs |

**Reality check on the hard part:** CGWB publishes assessment tables inside PDFs with merged cells and inconsistent block naming across years ("Jhunjhunun" / "Jhunjhunu", district reorganisation splitting blocks). Budget two full weeks for extraction and name reconciliation. Build a canonical block registry with alias mapping and *commit it* — that artefact alone is genuinely useful to others and is a candidate AIKosh contribution alongside SETU's corpus.

---

## 3. What the system actually produces

Four outputs, in increasing order of value:

1. **Diagnosis layer** — current state per block: stage of extraction, category, trend in metres/year, fluoride exposure
2. **Forecast layer** — predicted pre-monsoon depth and category next year, per block, with uncertainty
3. **Exposure layer** — people-at-risk from fluoride, block-weighted by population
4. **Prescription layer** — ranked recharge interventions: *"Block X, 40 recharge shafts + 12 farm ponds, ₹Y lakh, expected +Z hectare-metres/yr, ₹{Y/Z} per hectare-metre"*

The prescription layer is what separates this from a dashboard. A dashboard describes; an optimiser decides. Interviewers notice the difference.

---

## 4. Architecture

```
INGEST
  ├── CGWB assessment PDFs   → camelot/pdfplumber → block-year panel
  ├── CGWB water levels      → station-level time series
  ├── IMD rainfall           → block-aggregated monthly
  ├── Water quality          → station-level fluoride/nitrate
  ├── MGNREGA works          → block-year asset counts + spend
  ├── Crop stats             → district-year area under water-intensive crops
  └── Geometry               → block polygons (GeoJSON), station points

RECONCILE  ← the unglamorous core of the project
  ├── canonical_blocks.csv   # block_id, district, aliases[], geometry_key
  ├── name matching          # rapidfuzz + manual override table
  ├── district reorg mapping # pre/post-2023 Rajasthan district changes
  └── spatial join           # stations → blocks, rainfall grid → blocks

PANEL
  └── DuckDB: block_year fact table
      [block_id, year, recharge_ham, extractable_ham, extraction_ham,
       stage_pct, category, premonsoon_depth_m, postmonsoon_depth_m,
       rainfall_mm, rainfall_anomaly, fluoride_mgl, nitrate_mgl,
       mgnrega_water_assets, mgnrega_spend_lakh, water_intensive_crop_ha,
       population, lulc_shares...]

MODEL
  ├── M1  Depletion forecast
  │       target: premonsoon_depth_m at t+1
  │       LightGBM on lagged depth (t, t-1, t-2), rainfall, rainfall anomaly,
  │       extraction, crop mix, neighbour-block mean depth (spatial lag)
  │       + quantile models (q10/q50/q90) for uncertainty bands
  │
  ├── M2  Category transition classifier
  │       P(category at t+1 | features at t), 4-class ordinal
  │       reports P(worsens) per block — the headline risk number
  │
  ├── M3  Fluoride exposure surface
  │       ordinary kriging (pykrige) over station fluoride readings
  │       → block mean + block max → × population = people_at_risk
  │       report kriging cross-validation RMSE, don't hide interpolation error
  │
  └── M4  Recharge siting optimiser  ← the differentiator
          MILP (PuLP / OR-Tools CBC)
          decision vars: n_structures[block, structure_type] ∈ ℤ₊
          maximise: Σ expected_recharge_ham × risk_weight[block]
          subject to:
            Σ cost ≤ block_budget (MGNREGA earmark)
            n_structures ≤ feasibility_cap[block, type]  (CGWB Master Plan)
            structure_type allowed only if hydrogeology permits
            min allocation to fluoride-belt blocks (equity constraint)
          output: intervention plan + ₹/hectare-metre ranking

SERVE
  FastAPI: /blocks, /blocks/{id}, /forecast, /optimise (scenario params)

SURFACE
  Next.js + MapLibre GL / deck.gl
  ├── choropleth: category · stage% · trend m/yr · P(worsens) · people_at_risk
  ├── block detail drawer: time series, forecast fan chart, SHAP waterfall
  ├── top-25 priority table sorted by ₹/hectare-metre
  └── scenario panel: rainfall −20% / budget ×0.5 / equity weight slider
                      → re-runs optimiser live
```

---

## 5. Tech stack

```
Data eng     Python 3.12 · pdfplumber · camelot-py · rapidfuzz · pandas · DuckDB · Parquet
Geospatial   geopandas · shapely · rasterio · pykrige · rtree
ML           LightGBM (incl. quantile objective) · scikit-learn · SHAP
Optimisation PuLP with CBC (free) — fall back to OR-Tools if model grows
Backend      FastAPI · Pydantic v2
Frontend     Next.js 15 · TypeScript · MapLibre GL JS · deck.gl · Recharts · Tailwind
Eval         GAUGE (see 05-GAUGE-shared-eval-harness.md)
Deploy       Render (API) · Vercel (web) · DuckDB file or Neon Postgres + PostGIS
```

Why LightGBM and not a spatio-temporal GNN: ~302 blocks × ~10 years = ~3,000 rows. That is a tabular problem with a spatial lag feature, not a deep-learning problem. **Say this in the interview** — correctly refusing to over-engineer is a stronger signal than using the fancier model. Mention the GNN as the path if you had 20 years of daily station data.

---

## 6. Sprint plan — 8 weeks

### Week 11 — Extraction pipeline
- CGWB assessment PDF → table extraction for 3 years first (not all 10). Prove the parser before scaling.
- Build `canonical_blocks.csv` with alias table and the pre/post-2023 district reorganisation map
- **Verify:** 3 years parsed, block counts match the published totals (302 blocks; 219/22/20/38 category split for the 2022 assessment reconciles exactly). If your numbers don't match the published split, your parser is wrong — this is your ground truth check.

### Week 12 — Full panel assembly
- Extend parser to all available years
- Join rainfall (spatial aggregation of gridded IMD to blocks), water levels (station→block spatial join), crop stats, MGNREGA, population
- **Verify:** `block_year` table with < 5% missingness on core columns; a data-quality report listing every imputation and why

### Week 13 — M1 depletion forecast
- Baseline first: persistence (next year = this year) and linear trend extrapolation. **Report both.**
- LightGBM with spatial lag features; quantile models for q10/q50/q90
- Backtest properly: **time-series split, train on ≤ year T, test on T+1.** Never random K-fold on panel data — leakage would inflate your numbers and any competent interviewer will ask.
- **Verify:** MAE in metres on held-out years, beating persistence by a stated margin; coverage of the 80% prediction interval ≈ 80%

### Week 14 — M2 category transitions
- 4-class ordinal classifier; report P(worsens) per block
- Confusion matrix + per-category recall (the over-exploited class matters most and is also the majority — handle imbalance and say how)
- SHAP global + per-block local explanations
- **Verify:** macro-recall and ordinal metric reported; SHAP waterfall renders for any block

### Week 15 — M3 fluoride exposure
- Kriging over station fluoride readings, leave-one-out cross-validation RMSE
- Block-level mean and max; population-weighted people-at-risk
- Cross-check against the known belt: your surface must show Nagaur highest (~5.8 mg/L) and flag ~17 districts above 1.5 mg/L. **If it doesn't, your interpolation is wrong.**
- **Verify:** LOOCV RMSE reported; known-belt validation passes

### Week 16 — M4 optimiser
- Encode CGWB Master Plan structure types, unit costs, and hydrogeological feasibility per block
- MILP formulation per §4; solve for the real MGNREGA earmark budget
- Compare against two baselines: uniform allocation, and allocation purely by severity rank. **Report the lift.** "My optimiser buys X% more hectare-metres than severity-ranked allocation at the same budget" is the money sentence of this project.
- **Verify:** solver returns optimal in < 30s; lift vs both baselines quantified; equity constraint demonstrably binding when the slider is on

### Week 17 — Map dashboard
- MapLibre choropleth with the five layers; block detail drawer with forecast fan chart and SHAP
- Top-25 table sorted by ₹/hectare-metre
- Scenario panel re-running the optimiser server-side
- **Verify:** loads under 3s, renders 302 polygons smoothly on mobile, no layout shift

### Week 18 — Eval, deploy, writeup
- GAUGE run → `reports/eval_latest.md`
- Deploy; README case study
- 90-second demo video, map-first
- **Ship gate:** live interactive map + top-25 ₹/ham table + eval report

---

## 7. Evaluation

**M1 forecast**
- MAE / RMSE in metres, on time-series-split held-out years
- vs persistence baseline and vs linear trend — both reported
- Prediction-interval coverage (does the 80% band contain the truth 80% of the time?)
- Error sliced by district and by category — western arid blocks will be harder, show it

**M2 transitions**
- Macro-recall, per-class recall, ordinal weighted kappa
- Precision at the top-50 "most likely to worsen" — this is the operationally relevant number

**M3 fluoride**
- Kriging LOOCV RMSE and a semivariogram plot
- Known-belt validation (Nagaur max, 17-district count)
- Sensitivity to station density — western Rajasthan has sparse coverage and your uncertainty must reflect it

**M4 optimiser**
- Objective value vs uniform and severity-rank baselines, at identical budget
- Solve time, constraint-binding report
- Sensitivity: how does the plan change at 50% budget? That's the question a real official asks.

**Headline for the README (fill from results):**
> Forecasts block-level pre-monsoon groundwater depth across Rajasthan's 302 blocks at {MAE} m MAE ({X}% better than persistence), flags the {N} blocks most likely to worsen category, maps fluoride exposure for {M} lakh people, and produces a MGNREGA-budget-constrained recharge plan buying {L}% more hectare-metres than severity-ranked allocation.

---

## 8. Limitations to state openly

1. **Annual data, ~10 years, 302 blocks.** ~3,000 observations total. This bounds model complexity hard — which is why LightGBM with spatial lags, not deep learning. Stating the reasoning is the point.
2. **Block boundary instability.** Rajasthan's 2023 district reorganisation split and renamed units. My canonical registry maps aliases but some pre/post series are genuinely not comparable, and those blocks are flagged rather than silently joined.
3. **Sparse water-quality stations in western Rajasthan.** Kriging uncertainty is highest exactly where fluoride risk is highest. I report the uncertainty surface alongside the estimate rather than showing a clean single number.
4. **Recharge-volume estimates are engineering assumptions, not measurements.** Expected hectare-metres per structure come from CGWB Master Plan design figures. Actual yield varies with local hydrogeology. The optimiser's absolute numbers are indicative; its *ranking* is the useful output.
5. **No irrigation-abstraction metering.** Extraction is estimated by CGWB methodology, not measured. All extraction-driven inference inherits that error.
6. **Causal claims not made.** This forecasts and ranks; it does not prove that intervention X caused recharge Y. A real evaluation needs a difference-in-differences design on blocks that did and didn't receive works.

---

## 9. `CLAUDE.md` for Claude Code

```markdown
# JAL — Claude Code Operating Doc

## What this project is
Block-level groundwater risk analytics for Rajasthan: extract CGWB assessments →
reconcile block identities → forecast depletion → map fluoride exposure →
optimise MGNREGA-budgeted recharge interventions. 302 blocks, ~10 years.

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

## Style
- geopandas for anything with geometry; never lat/lon in bare floats across boundaries
- All units explicit in column names: `_m`, `_ham` (hectare-metres), `_mgl`, `_lakh`
- DuckDB + Parquet for the panel; no in-memory-only pipelines
- Config in `config/`: model params, unit costs, budget assumptions, thresholds
- Every model has a `baseline_*` counterpart in the same module

## Working method
- Simplest model that works. 3,000 rows is a LightGBM problem, not a GNN problem.
  If asked to add deep learning, push back and explain why.
- Parse 3 years before parsing 10. Prove the pipeline small.
- Every task gets a verify step tied to a published number where one exists.
- Surgical edits. Don't reformat the reconciliation tables.

## Commands
uv run python -m jal.ingest.cgwb --years 2020,2021,2022   # parse + reconcile
uv run python -m jal.panel.build                          # assemble block_year
uv run python -m jal.models.train --model m1              # with backtest report
uv run python -m jal.optimise.run --budget-lakh 12000     # MILP
uv run python -m jal.eval.run_eval                        # GAUGE → reports/
uv run uvicorn jal.api.main:app --reload
cd web && pnpm dev

## Definition of done
- [ ] Reconciles to published CGWB category counts
- [ ] Baseline comparison in eval report
- [ ] Time-series split verified (assert in tests)
- [ ] Uncertainty intervals present and coverage-checked
- [ ] Data-quality report regenerated
- [ ] reports/eval_latest.md committed
```

### Phase prompts

**Phase 1 — extraction**
> Read CLAUDE.md. Build `src/jal/ingest/cgwb.py` to extract block-level tables from CGWB Dynamic Ground Water Resources PDFs for Rajasthan. Start with three years only. Use camelot for lattice tables, pdfplumber as fallback. Output raw JSONL per year. Then build `reconcile.py`: fuzzy-match block names to `canonical_blocks.csv` using rapidfuzz, but never auto-accept below 0.95 — write unmatched names to `data/unmatched.csv` for manual review. Add a hard assertion that parsed category counts reconcile to the published 219/22/20/38 split for 2022. State your assumptions about PDF structure before writing the parser.

**Phase 2 — panel**
> Build `src/jal/panel/build.py`. Assemble the `block_year` fact table in DuckDB from parsed CGWB assessments, CGWB water levels (spatial join stations to block polygons), IMD gridded rainfall (area-weighted aggregation to blocks), district crop statistics (allocate to blocks by cultivated area share, and document that this is an approximation), MGNREGA block works, and Census population. Emit `reports/data_quality.md` listing every column's missingness, every imputation with method and count, and every approximation made.

**Phase 3 — forecast**
> Build `src/jal/models/m1_depletion.py`. Target: `premonsoon_depth_m` at t+1. Implement `baseline_persistence` and `baseline_linear_trend` first. Then LightGBM with lagged depth (t, t-1, t-2), rainfall and rainfall anomaly, extraction, water-intensive crop share, and a spatial-lag feature (mean depth of adjacent blocks — compute adjacency from block polygons). Add quantile models at 0.1/0.5/0.9. Backtest with expanding-window time-series splits. Assert no shuffled split. Report MAE vs both baselines and 80% interval coverage, sliced by district and by category.

**Phase 4 — fluoride surface**
> Build `src/jal/models/m3_fluoride.py`. Ordinary kriging over station fluoride readings using pykrige. Fit and plot the semivariogram. Compute leave-one-out cross-validation RMSE. Produce block-level mean and max fluoride plus the kriging variance surface. Multiply block mean exceedance above 1.5 mg/L by block population for `people_at_risk`. Add a validation test asserting Nagaur shows the highest concentration and that at least 15 districts exceed 1.5 mg/L — if this fails the interpolation is wrong.

**Phase 5 — optimiser**
> Build `src/jal/optimise/`. Encode structure types, unit costs, and per-block feasibility caps from the CGWB Master Plan for Artificial Recharge into `config/structures.yaml`. Formulate a MILP in PuLP: integer decision variables for structure counts per block per type; maximise expected recharge weighted by block risk (from M2's P(worsens)); constraints on total budget, per-block feasibility caps, hydrogeological admissibility, and a configurable minimum allocation to fluoride-belt blocks. Implement `baseline_uniform` and `baseline_severity_rank` allocations and report the objective lift over both at identical budget. Expose a `solve(budget, equity_weight, rainfall_scenario)` function for the scenario panel.

**Phase 6 — map**
> Build the Next.js dashboard in `web/`. MapLibre GL choropleth of Rajasthan's 302 blocks with switchable layers: category, stage-of-extraction %, trend m/yr, P(worsens), people-at-risk. Clicking a block opens a detail drawer with its depth time series, forecast fan chart with the 80% band, and a SHAP waterfall. Below the map, a top-25 priority table sorted by ₹ per hectare-metre. A scenario panel with rainfall (−20% to +20%), budget multiplier, and equity-weight slider that calls `/optimise` and re-renders. Consult the frontend-design skill. Must render 302 polygons smoothly on mobile.

---

## 10. Viva / interview Q&A

**Q. Why not deep learning?**
302 blocks × ~10 years is roughly 3,000 observations. A GNN or LSTM on that will memorise. This is a tabular problem with spatial structure, so LightGBM with an explicit spatial-lag feature and quantile heads is the right complexity. If I had two decades of daily station-level data I'd revisit it — the graph structure is genuinely there. Choosing the smaller model deliberately is the answer, not a limitation.

**Q. How do you know your PDF parser is correct?**
Because CGWB publishes the category totals. Rajasthan has 302 assessed blocks splitting 219 over-exploited, 22 critical, 20 semi-critical, 38 safe in the 2022 assessment. My pipeline asserts that reconciliation and fails hard if it doesn't match. Any parser without an external ground-truth check is untrustworthy, and table extraction from government PDFs fails silently in ways that look plausible.

**Q. Panel data with 302 units and 10 years — how did you avoid leakage?**
Expanding-window time-series splits: train on all years ≤ T, predict T+1. There's an assertion in the test suite that no shuffled split is used. There's also a subtler leakage risk I had to handle — the spatial-lag feature must use neighbour depths at time t, not t+1, or the model peeks at the answer through adjacent blocks.

**Q. Your fluoride map is interpolated from sparse stations. Isn't that made up?**
It's an estimate with quantified uncertainty, which is different. I fit a semivariogram, report leave-one-out cross-validation RMSE, and publish the kriging variance surface next to the estimate — and station density is lowest in western Rajasthan, which is exactly where fluoride risk is highest, so the uncertainty is largest where it matters most. I validate against known ground truth: Nagaur must come out highest at roughly 5.8 mg/L and around 17 districts must exceed 1.5 mg/L. If those checks fail, the surface is wrong.

**Q. What does the optimiser actually buy over just fixing the worst blocks first?**
That's my severity-rank baseline, and it's the intuitive policy. It loses because it ignores cost heterogeneity and feasibility — a recharge shaft in hard-rock terrain yields far less per rupee than a farm pond in alluvium, and the worst blocks aren't always the cheapest to help. My optimiser reports the lift in hectare-metres at identical budget. I also report the equity tension explicitly: maximising water bought and prioritising fluoride-exposed populations are different objectives, so that's a slider a policymaker controls, not a choice I hide inside a loss function.

**Q. What's the weakest assumption in the whole system?**
Expected recharge per structure. Those come from CGWB Master Plan design figures, not measured yield. So the optimiser's absolute hectare-metre numbers are indicative, and I say so — the *ranking* is the defensible output. A real deployment would instrument a sample of structures and recalibrate.

**Q. A joint secretary asks "should we build 500 recharge shafts in Barmer?" What do you say?**
I'd show what the model can and can't answer. It can say Barmer has 14 over-exploited blocks, give the forecast trajectory with uncertainty, and rank shafts against other structure types by ₹ per hectare-metre under the CGWB feasibility constraints for that hydrogeology. It cannot tell you the causal effect, because nobody has run that experiment. What I'd propose is staging: fund the top-ranked blocks, hold back a matched comparison group, and measure — which turns the next assessment cycle into an actual evaluation instead of another allocation.

**Q. How does this generalise beyond Rajasthan?**
The CGWB assessment format is national, so the pipeline runs on any state by swapping the block registry and geometry. Punjab is the obvious next case — highest extraction in India. The structure also transfers off water entirely: it's constrained resource allocation under spatial risk, which is the same shape as branch-network planning, insurance risk pricing by geography, or infrastructure capex prioritisation. That's how I'd pitch it to a non-government interviewer.
