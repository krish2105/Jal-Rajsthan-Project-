#!/usr/bin/env bash
# Assessment-day autopilot: when a new GWRA drops, one command re-runs the
# entire pipeline with every ground-truth gate armed. Fails loudly on any gate.
set -euo pipefail
cd "$(dirname "$0")/.."
echo "── JAL autopilot ──"
uv run python -m jal.ingest.cgwb
uv run python -m jal.reconcile.blocks
uv run python -m jal.panel.build
uv run python -m jal.models.m1_stage
uv run python -m jal.models.m2_transitions
uv run python -m jal.models.m3_fluoride
uv run python -m jal.optimise.milp
uv run python -m jal.models.exec_kpis
uv run python -m jal.models.v2_kpis
uv run python -m jal.export.web
uv run pytest -q
echo "── all gates green — review reports/, then: cd web && npx vercel deploy --prod --yes ──"
