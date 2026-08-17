#!/usr/bin/env bash
# Nightly sentinel (cron: 0 2 * * * bash scripts/sentinel.sh >> logs/sentinel.log 2>&1)
# Re-pulls the latest INGRES year and flags anomalies vs the committed panel.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p logs
uv run python -m jal.ingest.ingres --years 2024-2025
uv run python - <<'PY'
import json, pandas as pd
new = pd.DataFrame([json.loads(l) for l in open('data/raw/ingres/raj_blocks_2024-2025.jsonl')])
old = pd.read_parquet('data/processed/block_year.parquet')
old = old[old.year == 2025].set_index('block_uuid')
new = new.set_index('location_uuid')
j = old.join(new['stage_of_extraction_pct'], rsuffix='_new')
d = (j.stage_of_extraction_pct - j.stage_pct).abs()
anomalies = j[d > 30][['block_name', 'district_name', 'stage_pct', 'stage_of_extraction_pct']]
print(f"sentinel: {len(anomalies)} anomalies (|Δstage|>30)")
print(anomalies.head(10).to_string() if len(anomalies) else "all quiet")
PY
