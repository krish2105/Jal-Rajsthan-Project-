# M8 — deep learning vs gradient boosting on depth forecasting

Samples: 1479 block-season transitions · identical expanding-window splits · target = residual on persistence · metric = MAE in metres.

|   target_year |   n_test |   persistence |   lightgbm |   lstm |   nbeats |
|--------------:|---------:|--------------:|-----------:|-------:|---------:|
|          2015 |      259 |          3.71 |       3.21 |   3.81 |     5.19 |
|          2016 |      249 |          3.28 |       3.16 |   3.23 |     3.18 |
|          2017 |      251 |          3.41 |       3.38 |   3.42 |     3.32 |
|          2018 |      257 |          3.83 |       3.27 |   3.71 |     3.17 |
|          2019 |      215 |          5.37 |       5.34 |   5.01 |     5.2  |

**Mean MAE across splits:** {'persistence': 3.92, 'lightgbm': 3.67, 'lstm': 3.84, 'nbeats': 4.01}

**Winner: `lightgbm`.**

### Reading this honestly

With ~1.5k samples and six features, the sequence models have far more
parameters than the data can identify; the gradient-boosted champion (and,
on some splits, plain persistence) remains competitive. We report the
comparison rather than assuming it — and the shipped forecast is whichever
model wins here, not whichever sounds most advanced.

Architectures: LSTM (1x32 hidden over a 3-season depth sequence) and an
N-BEATS-lite generic-basis stack (4 residual blocks, width 64) implemented
in PyTorch; both trained with L1 loss + weight decay, seeded.
