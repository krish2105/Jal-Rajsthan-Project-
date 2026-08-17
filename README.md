# JAL · जल — Rajasthan Groundwater Intelligence Platform

**Block-level groundwater risk, forecasting, fluoride exposure, and MGNREGA-budget-constrained
recharge optimisation for all 302 assessed blocks of Rajasthan — with an agentic AI layer
and a bilingual (EN/हिन्दी) interactive dashboard.**

> 219 of Rajasthan's 302 blocks are over-exploited. Extraction runs at ~149% of recharge —
> the second-highest rate in India. 17 districts exceed the 1.5 mg/L fluoride limit.
> There is money to act — 65% of MGNREGA funds in over-exploited blocks are earmarked for
> water works. The question this platform answers: **where should the next rupee go?**

## What it does

1. **Diagnosis** — current state per block: stage of extraction, category, trend, fluoride exposure
2. **Forecast** — predicted pre-monsoon depth & category next year, with uncertainty bands (LightGBM quantile)
3. **Exposure** — population-weighted people-at-risk from fluoride (ordinary kriging + variance surface)
4. **Prescription** — MILP-optimised recharge intervention plan: ranked ₹ per hectare-metre
5. **Agentic layer** — Policy Copilot (EN/HI), multi-agent analysis pipeline with visible
   reasoning and critic gate, autonomous data-ops validation, scenario simulation —
   all grounded: every number traces to a deterministic tool result

## Status

🚧 In development — Phase 1 (extraction pipeline). See `docs/02-JAL-spec.md` and `CLAUDE.md`.
