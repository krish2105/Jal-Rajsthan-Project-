#!/usr/bin/env bash
# JAL — full local demo (offline-capable). Starts the API (with live Ollama agents
# if available) and the web app. Ctrl-C stops both.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "── JAL local demo ──────────────────────────────"
if curl -s -m 2 http://localhost:11434/api/tags >/dev/null 2>&1; then
  echo "✓ Ollama detected — agents run LIVE"
else
  echo "· Ollama not running — agents will use recorded replays"
fi

uv run uvicorn jal.api.main:app --port 8000 &
API_PID=$!
trap 'kill $API_PID 2>/dev/null' EXIT

cd web
pnpm install --prefer-offline
pnpm dev
