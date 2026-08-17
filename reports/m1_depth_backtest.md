# M1-depth v2 backtest — pre-monsoon depth (metres)

Pairs: 1479 · blocks: 273 · champion: **lightgbm**

|   target_year |   n_train |   n_test |   mae_lgbm_m |   mae_persistence_m |   improvement_pct |   coverage80 |
|--------------:|----------:|---------:|-------------:|--------------------:|------------------:|-------------:|
|          2015 |       245 |      259 |         3.21 |                3.71 |              13.5 |         0.81 |
|          2016 |       504 |      249 |         3.16 |                3.28 |               3.8 |         0.83 |
|          2017 |       753 |      251 |         3.38 |                3.41 |               0.9 |         0.8  |
|          2018 |      1004 |      257 |         3.27 |                3.83 |              14.7 |         0.8  |
|          2019 |      1261 |      215 |         5.34 |                5.37 |               0.6 |         0.68 |

Skipped targets: target 2014: skipped (train 0, test 245); target 2020: skipped (train 1476, test 2); target 2021: skipped (train 1478, test 1)

COVID 2020–21 campaigns are thin (documented in data_quality.md);
affected targets are skipped rather than padded.

Depth trends: 259 blocks with >=4 seasons; state median +0.17 m/yr (positive = falling water table).
Fastest-falling: 5400d45d(+8.24), 73bde824(+5.57), a7b5756c(+5.31)
