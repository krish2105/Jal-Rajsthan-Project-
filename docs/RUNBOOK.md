# JAL runbook — operations & incident response

## Daily operation
| What | How | Signal |
|---|---|---|
| Web app | Vercel (auto-heals) | UptimeRobot on /login (after SETUP-CLOUD §5) |
| API | `uv run uvicorn jal.api.main:app --port 8000` locally; Render in cloud | GET /api/health → `{status:ok, database:ok}` |
| DB | local Postgres (`brew services start postgresql@17`) or Neon | `pg_isready`; health endpoint `database` field |
| Nightly sentinel | cron → `scripts/sentinel.sh` | `logs/sentinel.log`; >0 anomalies → review |
| Backups | cron → `scripts/backup.sh` (owner URL; RLS blocks app-role dumps by design) | `backups/jal_<weekday>.sql.gz` |

## New assessment (GWRA) drops
`scripts/autopilot.sh` — parse → reconcile → panel → all models → KPIs → exports,
every ground-truth gate armed. Green → `cd web && npx vercel deploy --prod --yes`.

## Incidents
- **Map blank**: check `/maplibre-worker.mjs` + `maplibre-gl-shared.mjs` in web/public (Turbopack worker gotcha).
- **Copilot silent locally**: `ollama serve` up? `curl :11434/api/tags`. Deployed site always replay-falls-back — cannot hard-fail.
- **Login loops**: AUTH_SECRET mismatch between env and cookies — clear cookies, verify Vercel env.
- **RLS errors on dump/queries**: connecting as `jal_app` (by design); use owner URL for admin ops.
- **429s**: rate limiter (60/min/IP) — legitimate spike? raise `_LIMIT` in api/main.py.
- **Rollback**: `vercel rollback` (web) / previous git tag + redeploy (API).

## SLOs (demo-tier)
Web availability 99% monthly · API p95 < 800ms (excl. LLM streams) · assessment-to-
deploy < 1 day via autopilot · recovery from bad deploy < 10 min via rollback.
