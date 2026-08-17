# Security posture — JAL

## What the public demo does (today)

- **Read-only by construction.** The deployed site is statically generated; model
  outputs are baked JSON. There is no writable state, no user data collected, no
  external calls at runtime — nothing to exfiltrate or mutate.
- **Demo RBAC.** Three roles (Secretary, District Officer, Analyst) with
  capability-based gating (`web/src/lib/auth.tsx`): district officers get
  district-scoped tables and no state-budget levers; the analysis pipeline is
  restricted to Secretary/Analyst. A shared demo passcode makes the gate honest
  about being a demo — it demonstrates the authorization *model*, not a login.
- **Agent guardrails.** The LLM layer cannot compute or act: tools are read-only,
  numeric claims are audited against tool evidence, a critic rejects unevidenced
  drafts, prompts never receive secrets. In replay mode there is no model at all.
- **Supply chain.** Lockfiles committed (uv.lock, pnpm-lock.yaml); CI runs lint,
  types, tests; raw data files carry SHA-256 checksums in committed SOURCE.md
  manifests.

## Production path (what a department deployment adds)

| Layer | Plan |
|---|---|
| Identity | **Rajasthan SSO (RajSSO) / Parichay** OIDC; officer identity from the state directory, MFA per state policy |
| Sessions | Server-side sessions (httpOnly, SameSite=strict), short TTL, refresh rotation — replacing the demo localStorage session |
| Authorization | Same role model, enforced **server-side**; districts assigned from the LGD organisational mapping, not user choice |
| Data | Panel moves DuckDB → **Postgres + PostGIS with row-level security**: `CREATE POLICY district_scope ON block_year USING (district_code = current_setting('app.district'))` — officers physically cannot query other districts |
| API | Rate limiting, request signing between web and API, audit log of every optimiser run and AI answer (who asked what, which evidence served) |
| AI | LLM stays inside the state network (self-hosted); prompt-injection surface limited to read-only tools; all agent traces retained for audit |
| Transport | TLS everywhere; CSP already effectively strict (no third-party scripts); add explicit CSP headers + SRI on deploy |
| Compliance | Aligns with CERT-In guidelines and MeitY GIGW 3.0 accessibility/security requirements for government web applications |

## Reporting

This is a portfolio/demonstration project. Issues: open a GitHub issue or contact
the repository owner.

## STRIDE threat model (summary)

| Threat | Surface | Mitigation |
|---|---|---|
| Spoofing | demo login | Demo-only by design; production = RajSSO OIDC + server sessions |
| Tampering | model outputs | Read-only static exports; ground-truth asserts in CI; checksummed sources |
| Repudiation | API usage | Per-request audit log (rid, ip, path, status, latency) + X-Request-Id |
| Info disclosure | data | All data already public/official; no PII collected anywhere |
| DoS | API | 60 req/min/IP token bucket → 429; deployed site is static (CDN-absorbed) |
| Elevation | roles | Capability checks per feature; production = Postgres RLS per district |
| Prompt injection | RAG/agents | Untrusted-excerpt wrapping; read-only tools; evidence auditor; critic gate |
