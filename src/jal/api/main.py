"""JAL API — deterministic core + agent layer over HTTP.

Run: uv run uvicorn jal.api.main:app --reload
SSE endpoints stream NDJSON-style events for the web UI's copilot and pipeline
theater. CORS open to localhost dev and the Vercel deployment.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
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

app = FastAPI(title="JAL API", version="0.2.0")

# ── Sprint 5: rate limiting + audit log ──────────────────────────────────────
import time as _time
import uuid as _uuid
from collections import defaultdict, deque
from fastapi import Request
from fastapi.responses import JSONResponse

_BUCKETS: dict[str, deque] = defaultdict(deque)
_LIMIT, _WINDOW = 60, 60.0  # 60 requests / minute / client
_AUDIT = Path("logs"); _AUDIT.mkdir(exist_ok=True)


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
    with open(_AUDIT / "audit.log", "a") as f:
        f.write(json.dumps({
            "ts": round(now, 3), "rid": rid, "ip": ip,
            "path": request.url.path, "status": response.status_code,
            "ms": round(1000 * (_time.time() - t0)),
        }) + "\n")
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

    return {"status": "ok", "llm_provider": detect_provider()}


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


@app.get("/api/pipeline/{block_name}")
def api_pipeline(block_name: str) -> StreamingResponse:
    return _sse(run_pipeline(block_name))


@app.get("/api/wsp/{block_name}")
def api_wsp(block_name: str, language: str = "English") -> StreamingResponse:
    return _sse(generate_wsp(block_name, language))
