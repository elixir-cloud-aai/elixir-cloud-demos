"""Tests for the generator of the synthetic test data sets."""

import hashlib
import json
from pathlib import Path

import pytest

import generate_test_data as gen

REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "data"


def test_rows_are_deterministic() -> None:
    """The same node and seed always give the same rows."""
    assert gen.make_rows(node="node-a", n_rows=5) == gen.make_rows(
        node="node-a", n_rows=5
    )


def test_rows_differ_between_nodes() -> None:
    """Each node gets its own partition."""
    assert gen.make_rows(node="node-a", n_rows=5) != gen.make_rows(
        node="node-b", n_rows=5
    )


def test_rows_have_expected_columns() -> None:
    """Every row has the documented columns and value types."""
    rows = gen.make_rows(node="node-a", n_rows=20)
    assert len(rows) == 20
    for row in rows:
        assert list(row) == list(gen.COLUMNS)
        assert row["sample_id"].startswith("node-a-")
        assert row["condition"] in gen.CONDITIONS
        assert float(row["od600"]) > 0


def test_rows_reject_non_positive_count() -> None:
    """Asking for no rows is an error."""
    with pytest.raises(ValueError, match="positive"):
        gen.make_rows(node="node-a", n_rows=0)


def test_write_data_sets_creates_files_and_manifest(tmp_path: Path) -> None:
    """Writing creates one CSV per node and a manifest with checksums."""
    manifest = gen.write_data_sets(out_dir=tmp_path, base_url="https://x.org/data")
    files = manifest["datasets"][0]["files"]
    assert [f["node"] for f in files] == list(gen.NODES)
    for entry in files:
        path = tmp_path / entry["path"]
        content = path.read_bytes()
        assert entry["sha256"] == hashlib.sha256(content).hexdigest()
        assert entry["size"] == len(content)
        assert entry["url"] == f"https://x.org/data/{entry['path']}"
    on_disk = json.loads((tmp_path / "manifest.json").read_text())
    assert on_disk == manifest


def test_committed_data_match_generator(tmp_path: Path) -> None:
    """The committed data sets are exactly what the generator writes."""
    gen.write_data_sets(out_dir=tmp_path)
    for name in ["manifest.json"] + [
        f["path"]
        for f in json.loads((tmp_path / "manifest.json").read_text())["datasets"][0][
            "files"
        ]
    ]:
        assert (DATA_DIR / name).read_bytes() == (tmp_path / name).read_bytes(), name


def test_main_writes_to_given_directory(tmp_path: Path) -> None:
    """The command line entry point writes into the given directory."""
    assert gen.main(["--out-dir", str(tmp_path)]) == 0
    assert (tmp_path / "manifest.json").is_file()


def test_node_b_has_higher_mean_od600() -> None:
    """The partitions differ like data of two sites, as the README says."""

    def mean_od600(node: str) -> float:
        rows = gen.make_rows(node=node)
        return sum(float(r["od600"]) for r in rows) / len(rows)

    assert mean_od600("node-b") > mean_od600("node-a")
