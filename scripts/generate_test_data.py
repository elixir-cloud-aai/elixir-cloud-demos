#!/usr/bin/env python3
"""Generate the synthetic test data sets of the demos.

The data are made up from a seeded random number generator: they describe no
person, organism or experiment. Each Node of a federated demo gets its own
partition, so that the demos can run the same analysis at several Nodes and
combine the results.

Run ``python scripts/generate_test_data.py`` from the repository root to
rewrite ``data/``; the tests check that the committed files match.
"""

import argparse
import csv
import hashlib
import io
import json
import random
from collections.abc import Sequence
from pathlib import Path
from typing import Any

BASE_URL = (
    "https://raw.githubusercontent.com/elixir-cloud-aai/elixir-cloud-demos/main/data"
)
DATASET = "synthetic-growth"
NODES = ("node-a", "node-b")
N_ROWS = 50
COLUMNS = ("sample_id", "condition", "od600", "expression")
CONDITIONS = ("control", "treated")
# Mean optical density and expression per condition; node offsets mimic batch
# effects between sites.
MEANS = {"control": (0.80, 10.0), "treated": (1.10, 12.5)}
NODE_OFFSET = {"node-a": 0.0, "node-b": 0.05}


def _seed(node: str) -> int:
    """Derive a stable seed from a Node name.

    Args:
        node: Name of the Node.

    Returns:
        A seed that is the same on every platform and Python version.
    """
    return int.from_bytes(hashlib.sha256(node.encode()).digest()[:8], "big")


def make_rows(node: str, n_rows: int = N_ROWS) -> list[dict[str, str]]:
    """Make the rows of one Node's partition.

    Args:
        node: Name of the Node; it seeds the generator and prefixes sample IDs.
        n_rows: Number of rows.

    Returns:
        Rows with the columns of ``COLUMNS``, values formatted as strings.

    Raises:
        ValueError: If ``n_rows`` is not positive.
    """
    if n_rows < 1:
        raise ValueError("n_rows must be positive")
    rng = random.Random(_seed(node))
    offset = NODE_OFFSET.get(node, 0.0)
    rows = []
    for idx in range(n_rows):
        condition = CONDITIONS[idx % len(CONDITIONS)]
        od_mean, expr_mean = MEANS[condition]
        rows.append(
            {
                "sample_id": f"{node}-{idx + 1:03d}",
                "condition": condition,
                "od600": f"{max(0.01, rng.gauss(od_mean + offset, 0.1)):.3f}",
                "expression": f"{rng.gauss(expr_mean, 1.5):.3f}",
            }
        )
    return rows


def _to_csv(rows: list[dict[str, str]]) -> bytes:
    """Serialise rows as CSV with Unix line endings.

    Args:
        rows: Rows to write.

    Returns:
        The CSV file content.
    """
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=COLUMNS, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue().encode()


def write_data_sets(out_dir: Path, base_url: str = BASE_URL) -> dict[str, Any]:
    """Write the data sets and their manifest.

    Args:
        out_dir: Directory to write into; it is created if missing.
        base_url: URL under which ``out_dir`` is published.

    Returns:
        The manifest, as also written to ``manifest.json``.
    """
    files = []
    for node in NODES:
        rel_path = f"{DATASET}/{node}.csv"
        content = _to_csv(make_rows(node=node))
        target = out_dir / rel_path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        files.append(
            {
                "node": node,
                "path": rel_path,
                "url": f"{base_url}/{rel_path}",
                "sha256": hashlib.sha256(content).hexdigest(),
                "size": len(content),
            }
        )
    manifest: dict[str, Any] = {
        "datasets": [
            {
                "name": DATASET,
                "description": (
                    "Synthetic growth measurements (optical density at 600 nm "
                    "and a reporter expression level) under two conditions, "
                    "split into one partition per Node. Made up by a seeded "
                    "random number generator; describes no real sample."
                ),
                "license": "CC0-1.0",
                "columns": list(COLUMNS),
                "files": files,
            }
        ]
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest


def main(argv: Sequence[str] | None = None) -> int:
    """Generate the data sets from the command line.

    Args:
        argv: Command line arguments; ``sys.argv`` if not given.

    Returns:
        The exit code.
    """
    parser = argparse.ArgumentParser(description="Generate the test data sets.")
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "data",
        help="directory to write into (default: data/ of the repository)",
    )
    args = parser.parse_args(argv)
    write_data_sets(out_dir=args.out_dir)
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
