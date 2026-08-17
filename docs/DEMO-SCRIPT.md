# JAL — 90-second demo script (C-level)

**Setup:** open https://jal-rajasthan.vercel.app (or `scripts/run_local.sh` offline).
Dark mode default. Have the Hindi toggle ready — use it mid-demo, it lands.

---

**0:00 — Hero.** *"219 of Rajasthan's 302 blocks are over-exploited — the state knows
this. What it doesn't know is where the next rupee of recharge money should go.
This platform answers that, on official data only."* Scroll slowly; counters animate.

**0:15 — Map.** *"Every one of the 302 assessed blocks, official CGWB geometry.
Red is over-exploited."* Click **3D** — *"height is extraction stage: this is the
state's groundwater debt, literally standing up."* Switch to **P(worsens)** —
*"and this is next year's problem, ranked by a model that is 5–7× sharper than
chance."*

**0:35 — Block drawer.** Click a Jodhpur block. *"Any block: six assessments of
history, the 2026 forecast with an honest uncertainty band, and the odds of category
change. No black boxes — the transparency page shows where our ML lost to a simple
baseline and why we shipped the baseline."*

**0:50 — Priority table.** *"Now the decision: a ₹600-crore MGNREGA plan, optimised
across six structure types. Ranked by rupees per hectare-metre of water bought.
+69% more water than spreading the budget evenly — with a quarter guaranteed to
fluoride-affected blocks."*

**1:05 — Scenario studio.** Drag budget to ₹300 Cr. *"Cut the budget in half — the
plan re-concentrates. Raise the equity floor — watch efficiency trade against
fairness. That trade-off is the minister's choice; the model makes it visible
instead of hiding it."*

**1:20 — Copilot (switch to हिन्दी).** Ask: *"राजस्थान में भूजल की वर्तमान स्थिति क्या है?"*
*"Officials ask in plain language; every number in the answer is traced to a model
tool and audited — the AI explains, it never invents."*

**1:30 — Close.** *"Built on six years of CGWB assessments, cross-verified against
INGRES, open source end to end. This is deployable for any state in India."*

---

## Contingencies
- No internet: `scripts/run_local.sh` serves the identical site + live agents.
- No Ollama on demo machine: copilot and pipeline replay real recorded runs
  (labelled as such — honesty is part of the pitch).
- Projector kills dark mode: theme toggle, top right, one click.

## Killer Q&A (from docs/02-JAL-spec.md §10)
Why not deep learning? · How do you know the parser is right? · Isn't the fluoride
map interpolated? · What does the optimiser buy over "fix the worst first"? · What's
the weakest assumption? — rehearse these five; the spec has the full answers.
