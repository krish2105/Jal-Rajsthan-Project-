# M2 backtest — category transitions

|   test_year |   n_test |   macro_recall |   recall_safe |   recall_semi_critical |   recall_critical |   recall_over_exploited |   precision_at_top50_worsens |   worsens_base_rate |
|------------:|---------:|---------------:|--------------:|-----------------------:|------------------:|------------------------:|-----------------------------:|--------------------:|
|     2023.00 |   299.00 |           0.69 |          0.82 |                   0.59 |              0.35 |                    0.99 |                         0.10 |                0.02 |
|     2024.00 |   299.00 |           0.95 |          1.00 |                   0.95 |              0.85 |                    0.98 |                         0.10 |                0.02 |
|     2025.00 |   299.00 |           0.85 |          0.94 |                   0.59 |              0.87 |                    1.00 |                         0.14 |                0.02 |

P(worsens) precision@50 vs base rate is the operational lift: how much better
than random the top-50 watchlist is. Persistence predicts 'no change' always
and cannot rank worsening risk at all.
