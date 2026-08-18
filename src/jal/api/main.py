"""JAL API — deterministic core + agent layer over HTTP.

Run: uv run uvicorn jal.api.main:app --reload
SSE endpoints stream NDJSON-style events for the web UI's copilot and pipeline
theater. CORS open to localhost dev and the Vercel deployment.
"""

from __future__ import annotations

import json
import os as _os0
import time as _time
import uuid as _uuid
from collections import defaultdict, deque
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from jal.agents.copilot import chat
from jal.agents.pipeline import run_pipeline
from jal.agents.tools import (
    get_block,
    get_plan_top,
    get_state_summary,
    get_watchlist,
    run_optimiser,
)
from jal.agents.wsp import generate_wsp

# ── D10: error tracking — activates the moment SENTRY_DSN exists (SETUP-CLOUD §4)
if _os0.environ.get("SENTRY_DSN"):
    import sentry_sdk

    sentry_sdk.init(dsn=_os0.environ["SENTRY_DSN"], traces_sample_rate=0.1,
                    environment=_os0.environ.get("RENDER", "local") and "production")

app = FastAPI(title="JAL API", version="0.3.0")

# ── D9: Postgres (audit sink + RLS-scoped ledger). Activates iff DATABASE_URL. ──
_DB_URL = _os0.environ.get("DATABASE_URL")
_pool = None
if _DB_URL:
    try:
        from psycopg_pool import ConnectionPool
        _pool = ConnectionPool(_DB_URL, min_size=0, max_size=4, open=True)
    except Exception:  # psycopg_pool optional; fall back to direct connects
        _pool = None


def _db():
    import psycopg
    return psycopg.connect(_DB_URL)

# ── Sprint 5: rate limiting + audit log ──────────────────────────────────────
_BUCKETS: dict[str, deque] = defaultdict(deque)
_LIMIT, _WINDOW = 60, 60.0  # 60 requests / minute / client
_AUDIT = Path("logs")
_AUDIT.mkdir(exist_ok=True)


@app.middleware("http")
async def guard(request: Request, call_next):
    ip = request.client.host if request.client else "unknown"
    now = _time.time()
    q = _BUCKETS[ip]
    while q and now - q[0] > _WINDOW:
        q.popleft()
    if len(q) >= _LIMIT:
        return JSONResponse({"error": "rate limit exceeded"}, status_code=429)
    q.append(now)
    rid = _uuid.uuid4().hex[:12]
    t0 = _time.time()
    response = await call_next(request)
    entry = {
        "ts": round(now, 3), "rid": rid, "ip": ip,
        "path": request.url.path, "status": response.status_code,
        "ms": round(1000 * (_time.time() - t0)),
    }
    with open(_AUDIT / "audit.log", "a") as f:
        f.write(json.dumps(entry) + "\n")
    if _DB_URL:
        try:
            with _db() as conn:
                conn.execute(
                    "INSERT INTO audit_log (request_id, actor, role, path, status, latency_ms)"
                    " VALUES (%s,%s,%s,%s,%s,%s)",
                    (rid, "api", "-", entry["path"], entry["status"], entry["ms"]))
        except Exception:
            pass  # audit sink must never break requests
    response.headers["X-Request-Id"] = rid
    return response
# ─────────────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost(:\d+)?|.*\.vercel\.app)",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    from jal.agents.llm import detect_provider

    db = "unconfigured"
    if _DB_URL:
        try:
            with _db() as conn:
                conn.execute("SELECT 1")
            db = "ok"
        except Exception:
            db = "error"
    return {"status": "ok", "llm_provider": detect_provider(), "database": db,
            "sentry": "on" if _os0.environ.get("SENTRY_DSN") else "off"}


@app.get("/api/summary")
def summary() -> dict[str, Any]:
    return get_state_summary()


@app.get("/api/blocks/{name}")
def block(name: str) -> dict[str, Any]:
    return get_block(name)


@app.get("/api/watchlist")
def watchlist(n: int = 10) -> list[dict[str, Any]]:
    return get_watchlist(n)


@app.get("/api/plan/top")
def plan_top(n: int = 10) -> list[dict[str, Any]]:
    return get_plan_top(n)


class OptimiseReq(BaseModel):
    budget_crore: float = Field(600, ge=50, le=2000)
    equity_share: float = Field(0.25, ge=0, le=0.5)
    rainfall_factor: float = Field(1.0, ge=0.8, le=1.2)


@app.post("/api/optimise")
def optimise(req: OptimiseReq) -> dict[str, Any]:
    return run_optimiser(req.budget_crore, req.equity_share, req.rainfall_factor)


class ChatReq(BaseModel):
    message: str = Field(..., max_length=2000)
    history: list[dict[str, str]] = Field(default_factory=list)


def _sse(events) -> StreamingResponse:
    def gen():
        for ev in events:
            yield f"data: {json.dumps(ev, ensure_ascii=False)}\n\n"
    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache"})


@app.post("/api/chat")
def api_chat(req: ChatReq) -> StreamingResponse:
    return _sse(chat(req.message, req.history))


@app.get("/api/ledger")
def ledger(role: str = "secretary", district: str | None = None) -> list[dict[str, Any]]:
    """Works ledger, scoped by Postgres row-level security — the DB enforces
    district visibility, not this code. 503 without DATABASE_URL."""
    if not _DB_URL:
        return [{"error": "DATABASE_URL not configured (see docs/SETUP-CLOUD.md)"}]
    with _db() as conn:
        conn.execute("SELECT set_config('app.role', %s, false)", (role,))
        conn.execute("SELECT set_config('app.district', %s, false)", (district or "",))
        rows = conn.execute(
            "SELECT district, structure, scheme, sanctioned_n, built_n, verified_n"
            " FROM works_ledger ORDER BY district, structure LIMIT 500").fetchall()
    return [{"district": r[0], "structure": r[1], "scheme": r[2],
             "sanctioned": r[3], "built": r[4], "verified": r[5]} for r in rows]


class LedgerUpdate(BaseModel):
    id: int
    built_n: int = Field(..., ge=0, le=100000)
    role: str = "district_officer"
    district: str | None = None


@app.post("/api/ledger/update")
def ledger_update(u: LedgerUpdate) -> dict[str, Any]:
    """Officers record progress; Postgres RLS decides whether the row is even
    visible to them — an officer updating another district's row affects 0 rows."""
    if not _DB_URL:
        return {"error": "DATABASE_URL not configured"}
    with _db() as conn:
        conn.execute("SELECT set_config('app.role', %s, false)", (u.role,))
        conn.execute("SELECT set_config('app.district', %s, false)", (u.district or "",))
        cur = conn.execute(
            "UPDATE works_ledger SET built_n = %s, updated_by = %s, updated_at = now()"
            " WHERE id = %s", (u.built_n, u.role, u.id))
        n = cur.rowcount
        conn.commit()
    return {"updated": n, "blocked_by_rls": n == 0}


@app.get("/api/notifications")
def notifications(limit: int = 12) -> list[dict[str, Any]]:
    """Feed for the UI bell: model anomalies + watchlist + data-freshness."""
    items: list[dict[str, Any]] = []
    try:
        anom = json.load(open("web/src/data/anomalies.json"))
        for a in anom[:5]:
            items.append({"kind": "anomaly", "severity": "high",
                          "title": f"{a['block']} ({a['district']}) flagged anomalous",
                          "detail": f"stage Δ {a.get('stageDelta')} · depth trend "
                                    f"{a.get('depthTrend')} m/yr", "score": a["score"]})
    except Exception:
        pass
    try:
        wl = get_watchlist(5)
        for w in wl:
            items.append({"kind": "watchlist", "severity": "medium",
                          "title": f"{w['block']} may worsen category",
                          "detail": f"P(worsens) = {round(100 * w['p_worsens'])}%",
                          "score": w["p_worsens"]})
    except Exception:
        pass
    items.append({"kind": "data", "severity": "low",
                  "title": "Assessment data current to GWRA 2025",
                  "detail": "next autopilot run on publication of GWRA 2026", "score": 0})
    return items[:limit]


@app.get("/api/pipeline/{block_name}")
def api_pipeline(block_name: str) -> StreamingResponse:
    return _sse(run_pipeline(block_name))


@app.get("/api/wsp/{block_name}")
def api_wsp(block_name: str, language: str = "English") -> StreamingResponse:
    return _sse(generate_wsp(block_name, language))
