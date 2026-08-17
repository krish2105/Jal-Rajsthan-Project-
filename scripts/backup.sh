#!/usr/bin/env bash
# Nightly DB backup, 7-day weekday rotation. cron: 30 2 * * * bash scripts/backup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
source .env 2>/dev/null || true
: "${DATABASE_URL:?set DATABASE_URL in .env}"
# backups need the OWNER connection (RLS blocks bulk COPY for the app role — by design)
BK_URL="${BACKUP_DATABASE_URL:-$DATABASE_URL}"
mkdir -p backups
pg_dump "$BK_URL" | gzip > "backups/jal_$(date +%u).sql.gz"
ls -lh backups/ | tail -3
