-- JAL production schema (Neon Postgres) — sessions stay in JWT; this holds the
-- durable, auditable state. RLS enforces district scoping AT THE DATABASE.

CREATE TABLE IF NOT EXISTS audit_log (
  id          bigserial PRIMARY KEY,
  ts          timestamptz NOT NULL DEFAULT now(),
  request_id  text,
  actor       text,          -- username or 'guest'
  role        text,
  path        text,
  status      int,
  latency_ms  int
);

CREATE TABLE IF NOT EXISTS works_ledger (
  id             bigserial PRIMARY KEY,
  block_uuid     uuid NOT NULL,
  district       text NOT NULL,
  structure      text NOT NULL,
  sanctioned_n   int  NOT NULL DEFAULT 0,
  built_n        int  NOT NULL DEFAULT 0,
  verified_n     int  NOT NULL DEFAULT 0,   -- satellite-confirmed
  scheme         text,
  updated_by     text,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Row-level security: district officers only see their district.
ALTER TABLE works_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY works_secretary_all ON works_ledger
  USING (current_setting('app.role', true) IN ('secretary', 'analyst'));

CREATE POLICY works_district_scope ON works_ledger
  USING (
    current_setting('app.role', true) = 'district_officer'
    AND district = current_setting('app.district', true)
  );

-- API sets per-request: SET app.role = '...'; SET app.district = '...';
-- (see docs/SETUP-CLOUD.md §3 for the FastAPI dependency that does this)

CREATE INDEX IF NOT EXISTS idx_ledger_district ON works_ledger (district);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log (ts DESC);
