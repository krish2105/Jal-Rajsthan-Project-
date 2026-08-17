"""Hybrid RAG index — BM25 + local embeddings over the CGWB rulebook corpus.

Corpus: methodology/guideline PDFs already on disk (GEC-2015 guidelines,
National Compilations). Chunks are page-anchored so every answer can cite
[doc p.N]. Dense vectors come from the user's local Ollama nomic-embed-text;
lexical side is BM25; query fusion is reciprocal-rank (RRF).

Build:  uv run python -m jal.rag.index build
Query:  uv run python -m jal.rag.index query "what counts as recharge worthy area"
Store:  data/processed/rag_chunks.parquet (text + page + doc + embedding)
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pdfplumber
import requests

RAW = Path("data/raw/cgwb_assessment")
OUT = Path("data/processed")
STORE = OUT / "rag_chunks.parquet"

CORPUS = {
    "GEC-2015 Guidelines": RAW / "gec2015_guidelines.pdf",
    "National Compilation 2024": RAW / "national_compilation_2024.pdf",
    "National Compilation 2023": RAW / "national_compilation_2023.pdf",
}

EMBED_URL = "http://localhost:11434/api/embed"
EMBED_MODEL = "nomic-embed-text"
CHUNK_CHARS = 1400
OVERLAP = 200


def embed(texts: list[str]) -> np.ndarray:
    r = requests.post(EMBED_URL, json={"model": EMBED_MODEL, "input": texts}, timeout=300)
    r.raise_for_status()
    return np.array(r.json()["embeddings"], dtype="float32")


def chunk_pdf(name: str, path: Path) -> list[dict]:
    chunks = []
    with pdfplumber.open(path) as pdf:
        for pno, page in enumerate(pdf.pages, start=1):
            text = re.sub(r"[ \t]+", " ", page.extract_text() or "").strip()
            if len(text) < 200:
                continue
            i = 0
            while i < len(text):
                piece = text[i : i + CHUNK_CHARS]
                chunks.append({"doc": name, "page": pno, "text": piece})
                i += CHUNK_CHARS - OVERLAP
    return chunks


def build() -> None:
    rows: list[dict] = []
    for name, path in CORPUS.items():
        if not path.exists():
            print(f"skip (missing): {name}")
            continue
        cs = chunk_pdf(name, path)
        print(f"{name}: {len(cs)} chunks")
        rows.extend(cs)
    df = pd.DataFrame(rows)
    embs = []
    B = 64
    for i in range(0, len(df), B):
        embs.append(embed(df.text.iloc[i : i + B].tolist()))
        print(f"embedded {min(i + B, len(df))}/{len(df)}")
    df["embedding"] = list(np.vstack(embs))
    df.to_parquet(STORE, index=False)
    print(f"-> {STORE} ({len(df)} chunks)")


def search(query: str, k: int = 5) -> list[dict]:
    from rank_bm25 import BM25Okapi

    df = pd.read_parquet(STORE)
    tokens = [t.lower().split() for t in df.text]
    bm25 = BM25Okapi(tokens)
    lex = bm25.get_scores(query.lower().split())
    lex_rank = np.argsort(-lex)

    qv = embed([query])[0]
    mat = np.vstack(df.embedding.to_numpy())
    sim = mat @ qv / (np.linalg.norm(mat, axis=1) * np.linalg.norm(qv) + 1e-9)
    den_rank = np.argsort(-sim)

    rrf = np.zeros(len(df))
    for rank_list in (lex_rank, den_rank):
        for r_, idx in enumerate(rank_list[:60]):
            rrf[idx] += 1.0 / (60 + r_)
    top = np.argsort(-rrf)[:k]
    return [
        {"doc": df.iloc[i].doc, "page": int(df.iloc[i].page),
         "score": round(float(rrf[i]), 4), "text": df.iloc[i].text[:600]}
        for i in top
    ]


if __name__ == "__main__":
    if sys.argv[1] == "build":
        build()
    else:
        print(json.dumps(search(" ".join(sys.argv[2:]) or sys.argv[1]), indent=1)[:2000])
