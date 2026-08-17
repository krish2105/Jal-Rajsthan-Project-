"""LLM client for the agent layer — provider-agnostic via the OpenAI-compatible API.

Providers (env `JAL_LLM_PROVIDER`, default auto-detect):
  ollama  — local Ollama (http://localhost:11434/v1), default model qwen3:4b
  openai  — any OpenAI-compatible endpoint via OPENAI_BASE_URL / OPENAI_API_KEY
  replay  — no LLM at all: recorded runs from data/processed/agent_replays.json
            (this is what the public deployed demo uses — it can never fail)

The deterministic core never depends on this module; agents are consumers.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

DEFAULT_OLLAMA_MODEL = os.environ.get("JAL_OLLAMA_MODEL", "qwen3:4b")
REPLAY_PATH = Path("data/processed/agent_replays.json")


def detect_provider() -> str:
    forced = os.environ.get("JAL_LLM_PROVIDER")
    if forced:
        return forced
    if os.environ.get("OPENAI_API_KEY"):
        return "openai"
    try:  # is Ollama up?
        import httpx

        r = httpx.get("http://localhost:11434/api/tags", timeout=2)
        if r.status_code == 200:
            return "ollama"
    except Exception:
        pass
    return "replay"


def get_client() -> tuple[Any, str, str]:
    """-> (openai_client_or_None, model_name, provider)"""
    provider = detect_provider()
    if provider == "replay":
        return None, "replay", provider
    from openai import OpenAI

    if provider == "ollama":
        client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama",
                        timeout=float(os.environ.get("JAL_LLM_TIMEOUT", "120")), max_retries=1)
        return client, DEFAULT_OLLAMA_MODEL, provider
    client = OpenAI()  # honours OPENAI_BASE_URL / OPENAI_API_KEY
    return client, os.environ.get("JAL_LLM_MODEL", "gpt-4o-mini"), provider


def load_replays() -> dict[str, Any]:
    if REPLAY_PATH.exists():
        return json.load(open(REPLAY_PATH))
    return {"chat": {}, "pipeline": {}}
