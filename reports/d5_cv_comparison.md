# D5 — DeepWaterMap vs NDWI comparison (honest table)

Sites: 10 · scenes: 60 · model: cp.135 pretrained

| site            | date       |   dwm |   ndwi |
|:----------------|:-----------|------:|-------:|
| Sayla           | 2023-05-10 |  0    |   0    |
| Sayla           | 2023-11-06 |  0    |   0    |
| Sayla           | 2024-06-03 |  0    |   0    |
| Sayla           | 2024-10-31 |  0    |   0    |
| Sayla           | 2025-06-08 |  0    |   0    |
| Sayla           | 2025-12-15 |  0    |   0    |
| Bassi           | 2023-05-09 |  0    |   0    |
| Bassi           | 2023-12-15 |  0    |   0    |
| Bassi           | 2024-04-23 |  0    |   0    |
| Bassi           | 2024-10-30 |  0    |   0.04 |
| Bassi           | 2025-04-28 |  0    |   0    |
| Bassi           | 2025-12-09 |  0    |   0    |
| Jaisalmer_Rural | 2023-05-05 |  0    |   0    |
| Jaisalmer_Rural | 2023-11-11 |  0    |   0    |
| Jaisalmer_Rural | 2024-05-24 |  0    |   0    |
| Jaisalmer_Rural | 2024-10-26 |  0    |   0    |
| Jaisalmer_Rural | 2025-04-16 |  0    |   0    |
| Jaisalmer_Rural | 2025-10-16 |  0    |   0.05 |
| Baytoo          | 2023-04-15 |  0    |   0    |
| Baytoo          | 2023-11-06 |  0    |   0    |
| Baytoo          | 2024-05-24 |  0    |   0    |
| Baytoo          | 2024-11-05 |  0    |   0    |
| Baytoo          | 2025-05-24 |  0    |   0    |
| Baytoo          | 2025-10-16 |  0    |   0    |
| Lalsot          | 2023-05-09 |  0    |   0    |
| Lalsot          | 2023-12-15 |  0    |   0    |
| Lalsot          | 2024-05-13 |  0    |   0    |
| Lalsot          | 2024-10-30 |  0    |   0    |
| Lalsot          | 2025-04-28 |  0    |   0    |
| Lalsot          | 2025-12-09 |  0    |   0    |
| Balotra         | 2023-05-10 |  0    |   0    |
| Balotra         | 2023-11-06 |  0    |   0    |
| Balotra         | 2024-06-03 |  0    |   0    |
| Balotra         | 2024-10-31 |  0    |   0    |
| Balotra         | 2025-06-08 |  0    |   0    |
| Balotra         | 2025-12-15 |  0    |   0    |
| Nawalgarh       | 2023-05-09 |  0    |   0    |
| Nawalgarh       | 2023-10-29 |  0    |   0    |
| Nawalgarh       | 2024-05-21 |  0    |   0    |
| Nawalgarh       | 2024-10-28 |  0    |   0    |
| Nawalgarh       | 2025-05-13 |  0    |   0    |
| Nawalgarh       | 2025-10-13 |  0    |   0    |
| Dhorimanna      | 2023-04-15 |  0    |   0    |
| Dhorimanna      | 2023-11-06 |  0.14 |   0.13 |
| Dhorimanna      | 2024-05-24 |  0    |   0    |
| Dhorimanna      | 2024-11-05 |  0.13 |   0.1  |
| Dhorimanna      | 2025-05-24 |  0    |   0    |
| Dhorimanna      | 2025-10-16 |  0.12 |   0.1  |
| Rajgarh         | 2023-04-22 |  0    |   0.01 |
| Rajgarh         | 2023-10-14 |  0.01 |   0.02 |
| Rajgarh         | 2024-05-21 |  0    |   0.01 |
| Rajgarh         | 2024-10-28 |  0    |   0    |
| Rajgarh         | 2025-05-01 |  0    |   0.04 |
| Rajgarh         | 2025-11-12 |  0    |   0    |
| Sheo            | 2023-05-10 |  0    |   0.04 |
| Sheo            | 2023-10-02 |  0    |   0    |
| Sheo            | 2024-05-09 |  0    |   0.03 |
| Sheo            | 2024-11-05 |  0    |   0    |
| Sheo            | 2025-04-16 |  0    |   0.02 |
| Sheo            | 2025-10-16 |  0    |   0    |

Desert-centroid windows are legitimately near-0% water; the
signal is DWM-vs-NDWI agreement and post-monsoon deltas at sites
with actual water bodies. Cross-sensor transfer (Landsat->S2) is
standard but stated.
