#!/usr/bin/env bash
# One-command Neon setup: scripts/db_init.sh "postgresql://...neon.tech/neondb"
set -euo pipefail
DB_URL="${1:?usage: db_init.sh <DATABASE_URL>}"
psql "$DB_URL" -f "$(dirname "$0")/../db/schema.sql"
psql "$DB_URL" -c "\dt" 
echo "✓ schema + RLS applied"
