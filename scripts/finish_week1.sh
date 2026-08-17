#!/usr/bin/env bash
# Waits for the DWM + copilot-eval jobs, integrates their outputs, redeploys.
cd "$(dirname "$0")/.."
mkdir -p logs
LOG=logs/finish_week1.log
echo "$(date) watcher armed" >> $LOG
while pgrep -qf sentinel_dwm || pgrep -qf copilot_eval; do sleep 30; done
echo "$(date) jobs done — integrating" >> $LOG
uv run python -m jal.export.analytics >> $LOG 2>&1
uv run ruff check --fix . >> $LOG 2>&1
git add -A
git commit -q -m "A3+A4 results integrated: DeepWaterMap on discovered sites, copilot eval scores

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>" >> $LOG 2>&1
git push -q >> $LOG 2>&1
cd web && pnpm build >> ../$LOG 2>&1 && npx -y vercel deploy --prod --yes >> ../$LOG 2>&1
echo "$(date) DEPLOYED" >> ../$LOG
