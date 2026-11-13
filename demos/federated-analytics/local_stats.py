#!/usr/bin/env python3
"""Compute summary statistics of one Node's partition.

This script runs at each Node, inside a TES task (or locally with
``--local`` of ``federated_analytics.py``). It reads a CSV file with a
``condition`` column and numeric columns, and prints, as JSON, the count, sum
and sum of squares of each numeric column per condition. Only these
aggregates leave the Node, never the rows.

It needs only the Python standard library, so that any Python image can run
it.
"""

import csv
import json
import sys
from collections.abc import Iterable, Sequence
from pathlib import Path

VALUE_COLUMNS = ("od600", "expression")
GROUP_COLUMN = "condition"

Stats = dict[str, dict[str, dict[str, float]]]


def summarise(rows: Iterable[dict[str, str]]) -> Stats:
    """Compute count, sum and sum of squares per condition and column.

    Args:
        rows: Rows with a ``condition`` column and the columns of
            ``VALUE_COLUMNS``.

    Returns:
        Aggregates as ``{condition: {column: {"n", "sum", "sumsq"}}}``.

    Raises:
        ValueError: If a row lacks a column or has a non-numeric value.
    """
    stats: Stats = {}
    for row in rows:
        try:
            group = row[GROUP_COLUMN]
            values = {col: float(row[col]) for col in VALUE_COLUMNS}
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"invalid row {row!r}: {exc}") from exc
        per_group = stats.setdefault(group, {})
        for col, value in values.items():
            agg = per_group.setdefault(col, {"n": 0.0, "sum": 0.0, "sumsq": 0.0})
            agg["n"] += 1
            agg["sum"] += value
            agg["sumsq"] += value * value
    return stats


def main(argv: Sequence[str] | None = None) -> int:
    """Print the aggregates of a CSV file as JSON.

    Args:
        argv: Command line arguments (the path of the CSV file);
            ``sys.argv[1:]`` if not given.

    Returns:
        The exit code.
    """
    args = list(sys.argv[1:] if argv is None else argv)
    if len(args) != 1:
        print("usage: local_stats.py <csv-file>", file=sys.stderr)
        return 2
    with Path(args[0]).open(newline="") as handle:
        stats = summarise(csv.DictReader(handle))
    print(json.dumps(stats, sort_keys=True))
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
