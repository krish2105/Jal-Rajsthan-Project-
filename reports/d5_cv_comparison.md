# D5 — DeepWaterMap vs NDWI comparison (honest table)

Sites: 8 · scenes: 48 · model: cp.135 pretrained

| site            | date       |   dwm |   ndwi |
|:----------------|:-----------|------:|-------:|
| Balotra         | 2023-05-10 |  0    |   0    |
| Balotra         | 2023-11-06 | 14.09 |   0.55 |
| Balotra         | 2024-06-03 |  0    |   0    |
| Balotra         | 2024-10-31 |  3.31 |   0    |
| Balotra         | 2025-06-08 |  0    |   0    |
| Balotra         | 2025-12-15 |  6.39 |   0.02 |
| Jaisalmer_Rural | 2023-05-05 |  0    |   1.23 |
| Jaisalmer_Rural | 2023-11-11 |  1.98 |   1.51 |
| Jaisalmer_Rural | 2024-05-24 |  0    |   1.01 |
| Jaisalmer_Rural | 2024-10-26 |  0.93 |   1.43 |
| Jaisalmer_Rural | 2025-04-16 |  0    |   0.28 |
| Jaisalmer_Rural | 2025-10-16 |  0.2  |   0.08 |
| Rajgarh         | 2023-04-22 |  0.2  |   0.66 |
| Rajgarh         | 2023-10-14 |  0.41 |   0.56 |
| Rajgarh         | 2024-05-21 |  0    |   0.84 |
| Rajgarh         | 2024-10-28 |  0.77 |   0.41 |
| Rajgarh         | 2025-05-01 |  0    |   0.32 |
| Rajgarh         | 2025-11-24 |  0.12 |   0.05 |
| Lalsot          | 2023-05-09 |  0    |   0.01 |
| Lalsot          | 2023-12-15 |  0    |   0.01 |
| Lalsot          | 2024-05-13 |  0    |   0.02 |
| Lalsot          | 2024-10-30 |  0    |   0    |
| Lalsot          | 2025-04-28 |  0    |   0    |
| Lalsot          | 2025-12-09 |  0    |   0    |
| Dhorimanna      | 2023-04-15 |  0    |   0    |
| Dhorimanna      | 2023-11-06 |  1.46 |   0.6  |
| Dhorimanna      | 2024-05-24 |  0    |   0    |
| Dhorimanna      | 2024-11-05 |  0.42 |   0.32 |
| Dhorimanna      | 2025-05-24 |  0    |   0    |
| Dhorimanna      | 2025-10-16 |  0.42 |   0.43 |
| Sheo            | 2023-05-10 |  0    |   0    |
| Sheo            | 2023-10-02 |  0.19 |   0.32 |
| Sheo            | 2024-05-09 |  0    |   0    |
| Sheo            | 2024-11-05 |  0.58 |   0.48 |
| Sheo            | 2025-04-16 |  0    |   0.08 |
| Sheo            | 2025-10-16 |  0    |   0.29 |
| Sankra          | 2023-05-10 |  0    |   0    |
| Sankra          | 2023-10-02 |  0.19 |   0.55 |
| Sankra          | 2024-05-09 |  0    |   0.01 |
| Sankra          | 2024-11-05 |  2.03 |   1.4  |
| Sankra          | 2025-04-16 |  0    |   0.12 |
| Sankra          | 2025-10-16 |  1.9  |   1.27 |
| Bassi           | 2023-05-09 |  0    |   0    |
| Bassi           | 2023-12-15 |  0    |   0.01 |
| Bassi           | 2024-04-23 |  0    |   0    |
| Bassi           | 2024-10-30 |  0    |   0    |
| Bassi           | 2025-04-28 |  0    |   0    |
| Bassi           | 2025-12-09 |  0    |   0    |

Desert-centroid windows are legitimately near-0% water; the
signal is DWM-vs-NDWI agreement and post-monsoon deltas at sites
with actual water bodies. Cross-sensor transfer (Landsat->S2) is
standard but stated.
