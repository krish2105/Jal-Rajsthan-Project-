# M1 backtest — next-assessment stage-of-extraction forecast

Expanding-window time-series splits (train target_year < T, test = T).
Transition pairs: 1469; excluded at 2020->2022 vintage crosswalk: 12.

|   test_year |   n_train |   n_test |   mae_lgbm |   mae_persistence |   mae_lineartrend |   improvement_vs_persistence_pct |   coverage_80pct_interval |
|------------:|----------:|---------:|-----------:|------------------:|------------------:|---------------------------------:|--------------------------:|
|     2023.00 |    572.00 |   299.00 |      12.70 |             10.49 |             16.65 |                           -21.09 |                      0.91 |
|     2024.00 |    871.00 |   299.00 |       4.64 |              4.27 |             11.48 |                            -8.63 |                      0.98 |
|     2025.00 |   1170.00 |   299.00 |       6.56 |              5.38 |              6.93 |                           -21.91 |                      0.88 |

Persistence = next stage equals current. Linear trend = current + previous delta.
Coverage target for the q10-q90 band is 0.80 (empirical bands run conservative).

## Champion decision (non-negotiable #3)
The LightGBM challenger did NOT beat persistence on any split, so the shipped
point forecast IS persistence, with empirical gap-matched delta quantiles as the
uncertainty band. Stage-of-extraction is highly persistent over one assessment
cycle; the model's value-add is calibrated uncertainty plus M2's transition
probabilities, not point accuracy. The challenger remains in the eval for audit.
