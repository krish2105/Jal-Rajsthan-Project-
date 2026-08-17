# Cloud setup — complete later-run guide (D9/D10 of PLAN-V3)

Everything below is prepared in the repo; each service is ~5 minutes of clicking.
Do them in any order. Verification commands included per step.

---

## 1 · Neon Postgres + RLS (you already have an account with 5 projects)

1. [console.neon.tech](https://console.neon.tech) → **New project** → name `jal`
   (region: AWS ap-southeast-1 Singapore is closest to India; US East also fine).
2. On the project dashboard, copy the **connection string**
   (`postgresql://...@...neon.tech/neondb?sslmode=require`).
3. In a terminal at the repo root:
   ```bash
   scripts/db_init.sh "postgresql://PASTE_YOURS_HERE"
   ```
   This applies `db/schema.sql`: `audit_log`, `works_ledger`, and the **row-level
   security policies** that make district scoping a database guarantee
   (`works_district_scope`: officers physically cannot read other districts).
4. Local API use: add to a `.env` at repo root:
   ```
   DATABASE_URL=postgresql://PASTE_YOURS_HERE
   ```

**Verify:** `psql "$DATABASE_URL" -c "SELECT * FROM pg_policies WHERE tablename='works_ledger';"`
→ two policies listed.

## 2 · Render (hosted FastAPI) — the render.yaml now EXISTS

Your earlier error — *"Blueprint file render.yaml not found on main branch"* —
is fixed: `render.yaml` is committed at the repo root now.

1. [dashboard.render.com/blueprint/new](https://dashboard.render.com/blueprint/new)
   → select `krish2105/Jal-Rajsthan-Project-` → branch `main` → **Retry** (the
   button from your screenshot) → Apply.
   *(If GitHub is having an outage as in your screenshot banner, wait it out.)*
2. When it asks for env vars: paste `DATABASE_URL` (from step 1).
   `JAL_LLM_PROVIDER=replay` is preset (cloud agents replay recorded runs;
   point `OPENAI_BASE_URL`/`OPENAI_API_KEY` at a hosted model later if wanted).
3. Note the service URL, e.g. `https://jal-api.onrender.com`.
4. Tell the web app where the API lives — Vercel → jal-rajasthan → Settings →
   Environment Variables:
   ```
   NEXT_PUBLIC_JAL_API = https://jal-api.onrender.com
   ```
   then redeploy (`cd web && npx vercel deploy --prod --yes`).

**Verify:** `curl https://jal-api.onrender.com/api/health` → `{"status":"ok",...}`.
Free tier sleeps after idle; first request takes ~30s to wake.

## 3 · Wire RLS into the API (already coded, activates when DATABASE_URL is set)

The audit middleware in `src/jal/api/main.py` logs to `logs/audit.log` today; with
`DATABASE_URL` set it can also write `audit_log` rows. Per-request scoping
pattern for future DB-backed endpoints:
```sql
SET app.role = 'district_officer'; SET app.district = 'Jodhpur';
```
(issue these from a FastAPI dependency after verifying the session, then query —
RLS filters automatically.)

## 4 · Sentry (error tracking)

1. [sentry.io](https://sentry.io) → free account → create **two projects**:
   `jal-web` (Next.js) and `jal-api` (Python/FastAPI). Copy both DSNs.
2. Web: `cd web && npx @sentry/wizard@latest -i nextjs` (accept defaults; paste
   the jal-web DSN). Commit what it generates.
3. API: `uv add sentry-sdk[fastapi]`, then at the top of `src/jal/api/main.py`:
   ```python
   import os, sentry_sdk
   if os.environ.get("SENTRY_DSN"):
       sentry_sdk.init(dsn=os.environ["SENTRY_DSN"], traces_sample_rate=0.1)
   ```
   Add `SENTRY_DSN` to Render env.

**Verify:** throw a test error; it appears in Sentry within seconds.

## 5 · UptimeRobot (uptime alerts)

1. [uptimerobot.com](https://uptimerobot.com) → free → **Add monitor** ×2:
   - `https://jal-rajasthan.vercel.app/login` (keyword: `JAL`)
   - `https://jal-api.onrender.com/api/health` (keyword: `ok`)
   5-minute interval, alert to your email.

## 6 · Vercel GitHub App (auto-deploy on push)

[github.com/apps/vercel](https://github.com/apps/vercel) → Install → only
`Jal-Rajsthan-Project-` → then Vercel dashboard → jal-rajasthan → Settings →
Git → Connect. After this, every push deploys automatically.

## 7 · Nightly jobs (backups + sentinel)

Local cron (or move to GitHub Actions schedule later):
```cron
0 2 * * * bash "$HOME/Desktop/JAL Rajsthan Government Project/scripts/sentinel.sh" >> "$HOME/Desktop/JAL Rajsthan Government Project/logs/sentinel.log" 2>&1
30 2 * * * pg_dump "$DATABASE_URL" | gzip > "$HOME/jal_backup_$(date +\%u).sql.gz"
```
(7-day rotating backup by weekday number.)

---

## Env var summary

| Var | Where | Value |
|---|---|---|
| `AUTH_SECRET` | Vercel (✅ already set) + web/.env.local (✅) | random 64-hex |
| `DATABASE_URL` | Render + repo .env | Neon connection string |
| `NEXT_PUBLIC_JAL_API` | Vercel | Render service URL |
| `SENTRY_DSN` | Render (+ web via wizard) | from Sentry |
| `JAL_LLM_PROVIDER` | Render (`replay`) / unset locally (auto-Ollama) | — |

## Final verification checklist
- [ ] `/api/health` on Render returns ok
- [ ] pg_policies shows 2 RLS policies
- [ ] Copilot on prod streams LIVE via Render (not replay) once `NEXT_PUBLIC_JAL_API` is set — status line in the dock header flips to "live"
- [ ] Sentry receives a test event from both apps
- [ ] UptimeRobot shows both monitors green
- [ ] A push to main auto-deploys via the GitHub App
