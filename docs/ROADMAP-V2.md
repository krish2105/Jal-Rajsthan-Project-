# JAL V2 — world-class master plan
*Benchmarked against the global state of the art: California's [SGMA Portal](https://sgma.water.ca.gov/) (statutory submission workflow + [SGMA Data Viewer](https://www.drought.gov/data-maps-tools/sustainable-groundwater-management-sgma-data-viewer) organised around plan requirements) and Australia's [Groundwater Explorer](https://www.bom.gov.au/water/groundwater/explorer/) (900k bores, weekly telemetry, 3D models, no-GIS downloads). JAL's edge over both: prescription + agentic explanation; V2 closes their strengths (workflow, telemetry, explorer depth) into ours.*

## A. Out-of-the-box KPIs (none exist in any Indian dashboard today)
1. **Day-Zero Horizon** — per block: years until stage trajectory implies practical exhaustion of extractable resource at current trend, with uncertainty band. The single scariest, most actionable number.
2. **Water Debt Index** — cumulative overdraft since 2017 expressed as *years of average recharge needed to repay*. Converts flow into stock language a Finance Secretary understands.
3. **Aquifer Equity Index** — Gini coefficient of stage% across blocks per district; tracks whether stress is concentrating or spreading.
4. **Policy Latency** — days from a block first flagged (P(worsens) top-50) to first sanctioned work in it. Measures the government's own reflexes.
5. **Verification Coverage** — % of sanctioned works with satellite-confirmed water signal (Sentinel-2 pipeline already built).
6. **₹ Value-at-Risk** — agricultural GDP exposed in blocks forecast to cross 150% stage (crop-value × block, from data.gov.in crop statistics).
7. **DLI Readiness Score** — composite tracking Atal Jal disbursement-linked indicators, projected before the assessment lands.

## B. New tabs / deep-dive surfaces
- **Aquifer Explorer** (Australia-style): per-block drill-down page with full history, neighbours comparison, downloadable CSV/GeoJSON — no GIS needed.
- **Compliance & DLI Tracker** (California-style): the statutory-reporting workflow surface — what each district owes, when, status.
- **Works Ledger**: sanctioned → built → satellite-verified lifecycle per structure, with the Policy Latency clock.
- **Data Health**: live provenance panel — source freshness, checksums, reconciliation status, model-eval drift. Trust as a feature.
- **Public Portal** (read-only, GIGW/WCAG-AA, Hindi-first): block lookup for citizens; builds the political case.
- **Admin Console**: scheme-rule editor (the YAML as a form), user/role management, audit-log viewer.

## C. Hybrid RAG (the next AI leap — fully buildable now)
**Corpus**: GEC-2015 methodology, CGWB Master Plan, Atal Jal & MGNREGA operational guidelines, MJSA circulars, National Compilation reports (already downloaded), state GRs.
**Architecture** (all local, no new accounts):
- Chunking: heading-aware, page-anchored (pdfplumber already in stack)
- **Hybrid retrieval**: BM25 (rank-bm25) + dense vectors via **nomic-embed-text already in the user's Ollama** → reciprocal-rank fusion → optional cross-encoder rerank
- Store: DuckDB VSS extension (keeps single-file philosophy) or sqlite-vec
- Copilot upgrade: new tool `search_documents(query)` returns chunks with `[doc, page]` citations; answers must cite page anchors; retrieved text wrapped in untrusted-content tags (prompt-injection defence); evidence auditor extended to text citations
- Eval: 30-question golden set (methodology + scheme-rule questions), measured retrieval hit-rate before shipping
**Why it wins**: the copilot stops being data-only and starts answering "what does GEC-2015 say counts as recharge-worthy area?" — the questions officers actually argue about.

## D. Automations (agentic ops)
- **Nightly sentinel** (cron): re-pull INGRES for changed values, run anomaly rules (|Δstage|>30 pts, category flips without stage movement), write to the agent-activity feed; escalate via alert.
- **Weekly brief**: auto-generate the Monday review PDF per district (pipeline already produces briefings) + optional email via gov SMTP.
- **Assessment-day autopilot**: when a new GWRA drops, one command re-runs parse → reconcile → panel → models → export → deploy with all ground-truth gates.
- **Model watchdog**: backtest drift check on every data refresh; blocks deploy if gates regress.

## E. Security hardening (senior sec-engineer pass)
- **Threat model (STRIDE)** documented per surface; the demo's localStorage session called out vs the RajSSO+RLS production path (SECURITY.md already frames this).
- API: rate limiting (slowapi), request-ID audit log (who asked what, which evidence served — retained), strict Pydantic bounds everywhere (done), CORS pinned (done).
- Supply chain: Dependabot + pip-audit/npm-audit in CI; SBOM (syft) artefact per release; pinned lockfiles (done).
- Web: CSP/HSTS/frame-deny shipped; add SRI once external assets exist; secrets scanning hook (gitleaks) in CI.
- AI: retrieved/parsed text always untrusted-wrapped; injection detections logged as a metric; agents remain read-only tools; replay mode = zero attack surface for public demo.

## F. Sprint plan
| Sprint | Scope | Exit proof |
|---|---|---|
| **1. Hybrid RAG** | Corpus ingest + hybrid retrieval + copilot doc-tool + golden-set eval | Copilot answers a GEC-2015 methodology question with page citation, ≥80% golden-set hit |
| **2. KPI + Explorer** | Day-Zero, Water Debt, Equity Index, ₹-VaR + Aquifer Explorer tab + Data Health | Every KPI computed from panel with stated method; explorer page per block |
| **3. Ops automation** | Nightly sentinel + assessment-day autopilot + weekly brief | Cron demo run visible in agent feed; autopilot re-runs end-to-end green |
| **4. Compliance + Public** | DLI tracker, Works Ledger, public portal, admin console | Statutory workflow demo + WCAG-AA public page |
| **5. Sec hardening** | STRIDE doc, rate limits, audit log, CI scanners, SBOM | Clean pip-audit/npm-audit; audit-log query demo |

Sources: [SGMA Portal](https://sgma.water.ca.gov/) · [SGMA Data Viewer](https://data.cnra.ca.gov/showcase/sgma-data-viewer) · [CA DWR data & tools](https://water.ca.gov/programs/groundwater-management/data-and-tools) · [Australian Groundwater Explorer](https://www.bom.gov.au/water/groundwater/explorer/) · [NGIS](https://www.bom.gov.au/water/groundwater/ngis/)
