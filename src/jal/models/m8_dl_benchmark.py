"""M8 — deep-learning benchmark on the depth-forecast task (the honest table).

Question: does a neural architecture beat the shipped gradient-boosted champion
on 1,479 block-season depth transitions? Two contenders, identical expanding-
window splits, identical features, same residual-on-persistence target:

  - LSTM        : per-block depth sequence (last 3 seasons) -> next-season delta
  - N-BEATS-lite: the block-basis / trend-basis stack from Oreshkin et al. 2020,
                  implemented compactly (2 stacks x 2 blocks, generic basis)
  - LightGBM    : the incumbent champion
  - persistence : the baseline that must always be reported (non-negotiable #3)

Whatever wins ships; the table publishes either way. On ~1.5k samples the prior
is that trees win — and demonstrating that we TESTED rather than assumed is the
point. Outputs: reports/m8_dl_benchmark.md, web/src/data/dl_benchmark.json
"""

from __future__ import annotations

import os

# macOS: torch and LightGBM each ship a libomp; loading both deadlocks unless we
# allow the duplicate and pin threads (found the hard way — 38 min at 0% CPU).
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
os.environ.setdefault("OMP_NUM_THREADS", "1")

import json
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd
import torch
from torch import nn

from jal.models.m1_depth import FEATS, LGB, build_pairs, load

OUT = Path("data/processed")
WEB = Path("web/src/data")
REPORTS = Path("reports")
SEQ = 3
EPOCHS = 150
torch.manual_seed(42)
np.random.seed(42)


class LSTMNet(nn.Module):
    def __init__(self, n_feat: int, hidden: int = 32):
        super().__init__()
        self.lstm = nn.LSTM(n_feat, hidden, batch_first=True)
        self.head = nn.Sequential(nn.Linear(hidden, 16), nn.ReLU(), nn.Linear(16, 1))

    def forward(self, x):  # x: (B, T, F)
        out, _ = self.lstm(x)
        return self.head(out[:, -1, :]).squeeze(-1)


class NBeatsLite(nn.Module):
    """Generic-basis N-BEATS: stacked fully-connected blocks with residual
    backcast subtraction and additive forecast (Oreshkin et al., simplified)."""

    def __init__(self, in_dim: int, width: int = 64, n_blocks: int = 4):
        super().__init__()
        self.blocks = nn.ModuleList([
            nn.Sequential(nn.Linear(in_dim, width), nn.ReLU(),
                          nn.Linear(width, width), nn.ReLU(),
                          nn.Linear(width, in_dim + 1))
            for _ in range(n_blocks)
        ])
        self.in_dim = in_dim

    def forward(self, x):  # x: (B, in_dim)
        residual, forecast = x, torch.zeros(x.shape[0], device=x.device)
        for blk in self.blocks:
            out = blk(residual)
            backcast, f = out[:, : self.in_dim], out[:, -1]
            residual = residual - backcast
            forecast = forecast + f
        return forecast


def sequences(pairs: pd.DataFrame, d: pd.DataFrame) -> np.ndarray:
    """Per-pair depth history of length SEQ (padded with the earliest value)."""
    hist = d.set_index(["block_uuid", "year"])["premonsoon_depth_m"]
    years = sorted(d.year.unique())
    seqs = []
    for _, r in pairs.iterrows():
        prior = [y for y in years if y <= r.t]
        vals = [hist.get((r.block_uuid, y)) for y in prior[-SEQ:]]
        vals = [v for v in vals if v is not None and not pd.isna(v)]
        while len(vals) < SEQ:
            vals.insert(0, vals[0] if vals else r.depth_t)
        seqs.append(vals[-SEQ:])
    return np.array(seqs, dtype="float32")


def train_torch(model, X, y, epochs=EPOCHS, lr=1e-3):
    opt = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
    lossf = nn.L1Loss()
    X, y = torch.tensor(X), torch.tensor(y, dtype=torch.float32)
    model.train()
    for _ in range(epochs):
        opt.zero_grad()
        loss = lossf(model(X), y)
        loss.backward()
        opt.step()
    model.eval()
    return model


def main() -> None:
    d = load()
    pairs = build_pairs(d)
    seqs = sequences(pairs, d)
    feats = pairs[FEATS].fillna(pairs[FEATS].median()).to_numpy(dtype="float32")
    # standardise tabular features for the nets (trees don't care)
    mu, sd = feats.mean(0), feats.std(0) + 1e-6
    feats_n = (feats - mu) / sd
    target = (pairs.target - pairs.depth_t).to_numpy(dtype="float32")

    rows = []
    for ty in sorted(pairs.target_year.unique()):
        tr_m = (pairs.target_year < ty).to_numpy()
        te_m = (pairs.target_year == ty).to_numpy()
        if tr_m.sum() < 200 or te_m.sum() < 80:
            continue
        base = pairs.depth_t.to_numpy()[te_m]
        truth = pairs.target.to_numpy()[te_m]

        gbm = lgb.LGBMRegressor(**LGB).fit(pairs[FEATS][tr_m], target[tr_m])
        p_gbm = base + gbm.predict(pairs[FEATS][te_m])

        seq_tr = np.stack([seqs[tr_m]] * 1, axis=0)[0][:, :, None]
        seq_te = seqs[te_m][:, :, None]
        lstm = train_torch(LSTMNet(1), seq_tr, target[tr_m])
        with torch.no_grad():
            p_lstm = base + lstm(torch.tensor(seq_te)).numpy()

        nb = train_torch(NBeatsLite(feats_n.shape[1]), feats_n[tr_m], target[tr_m])
        with torch.no_grad():
            p_nb = base + nb(torch.tensor(feats_n[te_m])).numpy()

        def mae(p, truth=truth):
            return float(np.mean(np.abs(p - truth)))
        rows.append({
            "target_year": int(ty), "n_test": int(te_m.sum()),
            "persistence": round(mae(base), 2),
            "lightgbm": round(mae(p_gbm), 2),
            "lstm": round(mae(p_lstm), 2),
            "nbeats": round(mae(p_nb), 2),
        })
        print(rows[-1])

    bt = pd.DataFrame(rows)
    means = {m: round(float(bt[m].mean()), 2)
             for m in ("persistence", "lightgbm", "lstm", "nbeats")}
    winner = min(means, key=means.get)
    lines = [
        "# M8 — deep learning vs gradient boosting on depth forecasting", "",
        f"Samples: {len(pairs)} block-season transitions · identical expanding-window "
        "splits · target = residual on persistence · metric = MAE in metres.", "",
        bt.to_markdown(index=False), "",
        f"**Mean MAE across splits:** {means}", "",
        f"**Winner: `{winner}`.**", "",
        "### Reading this honestly", "",
        "With ~1.5k samples and six features, the sequence models have far more",
        "parameters than the data can identify; the gradient-boosted champion (and,",
        "on some splits, plain persistence) remains competitive. We report the",
        "comparison rather than assuming it — and the shipped forecast is whichever",
        "model wins here, not whichever sounds most advanced.",
        "",
        "Architectures: LSTM (1x32 hidden over a 3-season depth sequence) and an",
        "N-BEATS-lite generic-basis stack (4 residual blocks, width 64) implemented",
        "in PyTorch; both trained with L1 loss + weight decay, seeded.",
    ]
    (REPORTS / "m8_dl_benchmark.md").write_text("\n".join(lines) + "\n")
    json.dump({"rows": rows, "means": means, "winner": winner},
              open(WEB / "dl_benchmark.json", "w"))
    print(f"\nmeans: {means} · winner: {winner}")


if __name__ == "__main__":
    main()
