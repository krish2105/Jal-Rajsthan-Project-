# JAL — evaluation summary (generated 2026-08-17)

All numbers below come from real government data: CGWB categorization PDFs
(6 assessment years), INGRES verified assessments, official CGWB block geometry,
Census 2011 populations. Full per-model reports live beside this file.

## Data foundation gates
| Gate | Result |
|---|---|
| GWRA2022 parse vs published split (302 = 219/22/20/38/3) | **PASS** (hard assert + pytest) |
| PDF counts vs independent INGRES API, all years | **PASS** (295/295/302/302 match) |
| Block reconciliation across 6 years | **1,792 rows, 0 unmatched** (54 curated overrides) |
| Census population total | 68,548,437 = official state total |

## M1 — next-assessment stage forecast (reports/m1_backtest.md)
- Expanding-window time-series splits only; no shuffled splits (asserted).
- **Champion: persistence.** The LightGBM challenger lost on every split
  (MAE 4.6–12.7 vs 4.3–10.5) and is reported, not shipped — the honest call
  the spec demands (non-negotiable #3).
- Uncertainty: empirical gap-matched delta bands; coverage 0.88–0.98 vs 0.80
  target (conservative, stated).

## M2 — category transitions (reports/m2_backtest.md)
- Macro-recall 0.69 / 0.95 / 0.85 across 2023/2024/2025 test years.
- P(worsens) top-50 watchlist precision 0.10–0.14 vs 0.02 base rate:
  **5–7× lift** over random — the operational number persistence cannot produce.

## M3 — fluoride exposure (reports/m3_exposure.md)
- 68 fluoride-tagged blocks (official INGRES quality tagging), 35 "in part".
- **≈11.7M people at risk** (weighted; Census-2011-based, stated approximations).
- Known-belt validation: Nagaur must be fluoride-tagged — PASS (7 blocks).

## M4 — recharge siting optimiser (reports/m4_optimiser.md)
- MILP (CBC): optimal/near-optimal ≤ 25s, ~1,800 integer variables.
- Constraints: ₹600 crore budget, ≥25% spend to fluoride blocks, ≤2% per block,
  area-based feasibility caps per structure type.
- **+68.8% risk-weighted recharge vs uniform allocation** at identical budget.
- +0.5% vs a severity-greedy baseline — while ALSO honouring the equity floor
  the baseline ignores. The optimiser's value is feasibility + equity + cost
  efficiency simultaneously, not beating greedy on one axis.
- Unit costs/yields are stated config assumptions; the ranking is the output.

## Pending (documented, not hidden)
- Station-level depth + fluoride mg/L (India-WRIS unreachable; wris_PENDING.md).
- Agent-layer evals (citation coverage, bilingual golden set) — next phase.
