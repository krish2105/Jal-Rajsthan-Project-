"""RAG golden-set eval — retrieval hit-rate on methodology questions.

A hit = any top-5 chunk contains the expected key phrase (case-insensitive).
Gate: >= 80% hit rate. Run: uv run python -m jal.rag.eval
"""

from __future__ import annotations

from jal.rag.index import search

GOLDEN = [
    ("what categories are used for assessment units", "over-exploited"),
    ("basis for categorization of assessment sub units", "categoriz"),
    ("stage of ground water extraction definition", "stage of ground water extraction"),
    ("what is recharge worthy area", "recharge worthy"),
    ("rainfall infiltration factor method", "infiltration"),
    ("water level fluctuation method for recharge estimation", "fluctuation"),
    ("specific yield values for alluvial areas", "specific yield"),
    ("norms for ground water extraction for domestic use", "domestic"),
    ("command and non command area assessment", "command"),
    ("saline ground water assessment", "saline"),
    ("total annual ground water recharge of india", "recharge"),
    ("environmental flows in ground water assessment", "environment"),
]


def main() -> None:
    hits = 0
    for q, key in GOLDEN:
        top = search(q, k=5)
        ok = any(key.lower() in c["text"].lower() for c in top)
        hits += ok
        print(f"{'HIT ' if ok else 'MISS'} {q[:55]}")
    rate = hits / len(GOLDEN)
    print(f"\nhit@5 = {hits}/{len(GOLDEN)} = {rate:.0%} (gate: 80%)")
    if rate < 0.8:
        raise SystemExit("RAG EVAL FAILED")


if __name__ == "__main__":
    main()
