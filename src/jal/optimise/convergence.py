"""Scheme Convergence Advisor — assign each planned structure a funding scheme.

Post-processes the M4 plan: greedy assignment of (block, structure) rows to the
configured schemes (config/structures.yaml `schemes`), honouring per-scheme
admissible structure types, budget share caps, and Atal Jal's priority for
over-exploited/critical blocks. Rows no scheme can absorb fall to MGNREGA
overflow with a flag (surfaced, never hidden).

Output columns added to the plan: funding_scheme, convergence_note.
Also returns a per-scheme rollup for the dashboard.
"""

from __future__ import annotations

from typing import Any

import pandas as pd
import yaml


def assign(plan: pd.DataFrame, budget_lakh: float,
           cfg: dict[str, Any] | None = None) -> tuple[pd.DataFrame, list[dict[str, Any]]]:
    if cfg is None:
        cfg = yaml.safe_load(open("config/structures.yaml"))
    schemes: dict[str, dict[str, Any]] = cfg["schemes"]
    remaining = {k: v["share_cap"] * budget_lakh for k, v in schemes.items()}

    # scheme preference per row: schemes that allow the structure type, Atal Jal
    # first where its category priority matches, then by remaining headroom
    def pick(row: pd.Series) -> str | None:
        candidates = [
            k for k, v in schemes.items()
            if row.structure in v["allowed"] and remaining[k] >= row.cost_lakh
        ]
        if not candidates:
            return None
        def rank(k: str) -> tuple[int, float]:
            v = schemes[k]
            prio = 0 if row.category in v.get("priority_categories", []) else 1
            return (prio, -remaining[k])
        return sorted(candidates, key=rank)[0]

    out = plan.copy().sort_values("cost_lakh", ascending=False)
    assigned, notes = [], []
    for _, row in out.iterrows():
        k = pick(row)
        if k is None:
            assigned.append("mgnrega")
            notes.append("overflow: no scheme headroom — needs reallocation")
            remaining["mgnrega"] -= row.cost_lakh  # may go negative; visible in rollup
        else:
            assigned.append(k)
            notes.append("")
            remaining[k] -= row.cost_lakh
    out["funding_scheme"] = assigned
    out["convergence_note"] = notes

    rollup = []
    for k, v in schemes.items():
        spent = float(out.loc[out.funding_scheme == k, "cost_lakh"].sum())
        cap = v["share_cap"] * budget_lakh
        rollup.append(
            {
                "scheme": k,
                "label_en": v["label_en"],
                "label_hi": v["label_hi"],
                "capLakh": round(cap),
                "spentLakh": round(spent),
                "utilisationPct": round(100 * spent / cap, 1) if cap else 0.0,
                "structures": int(out.loc[out.funding_scheme == k, "count"].sum()),
                "overCap": spent > cap + 1e-6,
            }
        )
    return out, rollup
