"""Ground-truth gates (CLAUDE.md non-negotiable #1).

These tests assert against PUBLISHED CGWB numbers. If they fail, the pipeline is
wrong — never the other way around.
"""

from pathlib import Path

import pandas as pd
import pytest

CAT = Path("data/processed/block_categories.parquet")
REG = Path("data/processed/canonical_blocks.csv")

pytestmark = pytest.mark.skipif(
    not CAT.exists(), reason="processed data not present (run ingest + reconcile first)"
)


def test_gwra2022_published_split():
    cat = pd.read_parquet(CAT)
    y22 = cat[cat.gwra_year == "2022"]
    counts = y22.category.value_counts().to_dict()
    assert len(y22) == 302
    assert counts == {
        "over_exploited": 219,
        "critical": 22,
        "semi_critical": 20,
        "safe": 38,
        "saline": 3,
    }


def test_block_counts_per_year():
    cat = pd.read_parquet(CAT)
    counts = cat.groupby("gwra_year").size().to_dict()
    assert counts == {
        "2017": 295,
        "2020": 295,
        "2022": 302,
        "2023": 302,
        "2024": 299,  # 2024/2025 PDF vintages omit the 3 saline blocks
        "2025": 299,
    }


def test_no_duplicate_block_year():
    cat = pd.read_parquet(CAT)
    assert not cat.duplicated(subset=["block_uuid", "gwra_year"]).any()


def test_registry_vintages():
    reg = pd.read_csv(REG)
    assert (reg.vintage == 2021).sum() == 302
    assert (reg.vintage == 2019).sum() == 295


def test_all_category_rows_carry_registry_uuid():
    cat = pd.read_parquet(CAT)
    reg = pd.read_csv(REG)
    assert set(cat.block_uuid) <= set(reg.block_uuid)
