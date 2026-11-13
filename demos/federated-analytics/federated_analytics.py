#!/usr/bin/env python3
"""Run the same analysis at several Nodes and combine the results.

For each partition of the test data set, the client sends a GA4GH TES task
that runs ``local_stats.py`` on that partition and prints aggregates (count,
sum and sum of squares). The client reads them from the task logs and
combines them into the statistics of the whole data set: mean and standard
deviation per condition, and Welch's t statistic of treated against control.
The rows never leave the Nodes; the result is the same as if all rows were in
one place.

Send all tasks to one proTES gateway (``--tes https://protes.example.org``),
or each partition to a TES service of its own (one ``--tes`` per partition).
With ``--local``, the client runs ``local_stats.py`` on the local copies of
the partitions instead, without any service.
"""

import argparse
import json
import math
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from collections.abc import Callable, Sequence
from pathlib import Path
from typing import Any

from local_stats import GROUP_COLUMN, VALUE_COLUMNS, Stats

HERE = Path(__file__).resolve().parent
DATA_DIR = HERE.parents[1] / "data"
DATASET = "synthetic-growth"
SCRIPT = HERE / "local_stats.py"
DEFAULT_IMAGE = "python:3.13-slim"
TES_PATH = "/ga4gh/tes/v1/tasks"
TERMINAL_STATES = {"COMPLETE", "EXECUTOR_ERROR", "SYSTEM_ERROR", "CANCELED"}
CONTROL, TREATED = "control", "treated"

# Sends a request and returns the decoded JSON response.
Transport = Callable[[urllib.request.Request], Any]


class TaskError(RuntimeError):
    """A TES task failed or its output could not be read."""


def load_partitions(manifest: Path, dataset: str = DATASET) -> list[dict[str, Any]]:
    """Read the partitions of a data set from the manifest.

    Args:
        manifest: Path of ``manifest.json``.
        dataset: Name of the data set.

    Returns:
        The file entries of the data set, one per partition.

    Raises:
        KeyError: If the manifest has no such data set.
    """
    data = json.loads(manifest.read_text())
    for entry in data["datasets"]:
        if entry["name"] == dataset:
            return list(entry["files"])
    raise KeyError(f"data set {dataset!r} not in {manifest}")


def combine(partials: Sequence[Stats]) -> dict[str, dict[str, dict[str, float]]]:
    """Combine the aggregates of several partitions.

    Args:
        partials: Aggregates of each partition, as ``local_stats.summarise``
            returns them.

    Returns:
        ``{condition: {column: {"n", "mean", "sd"}}}`` over all partitions;
        ``sd`` is the sample standard deviation (``nan`` for one value).
    """
    totals: Stats = {}
    for partial in partials:
        for group, columns in partial.items():
            for col, agg in columns.items():
                total = totals.setdefault(group, {}).setdefault(
                    col, {"n": 0.0, "sum": 0.0, "sumsq": 0.0}
                )
                for key in ("n", "sum", "sumsq"):
                    total[key] += agg[key]
    result: dict[str, dict[str, dict[str, float]]] = {}
    for group, columns in totals.items():
        for col, agg in columns.items():
            n = agg["n"]
            mean = agg["sum"] / n
            var = (
                max(0.0, (agg["sumsq"] - n * mean * mean) / (n - 1))
                if n > 1
                else math.nan
            )
            result.setdefault(group, {})[col] = {
                "n": n,
                "mean": mean,
                "sd": math.sqrt(var),
            }
    return result


def welch_t(a: dict[str, float], b: dict[str, float]) -> float:
    """Compute Welch's t statistic of ``b`` against ``a``.

    Args:
        a: ``n``, ``mean`` and ``sd`` of the first group.
        b: ``n``, ``mean`` and ``sd`` of the second group.

    Returns:
        The t statistic; ``nan`` if it is undefined.
    """
    se = math.sqrt(a["sd"] ** 2 / a["n"] + b["sd"] ** 2 / b["n"])
    if se == 0 or math.isnan(se):
        return math.nan
    return (b["mean"] - a["mean"]) / se


def run_local(partitions: Sequence[dict[str, Any]], data_dir: Path) -> list[Stats]:
    """Run ``local_stats.py`` on the local copies of the partitions.

    Args:
        partitions: File entries of the manifest.
        data_dir: Directory that holds the files under their ``path``.

    Returns:
        The aggregates of each partition.
    """
    partials = []
    for part in partitions:
        out = subprocess.run(  # noqa: S603 - fixed script, paths from manifest
            [sys.executable, str(SCRIPT), str(data_dir / part["path"])],
            check=True,
            capture_output=True,
            text=True,
        )
        partials.append(json.loads(out.stdout))
    return partials


def make_task(part: dict[str, Any], script: str, image: str) -> dict[str, Any]:
    """Build the TES task for one partition.

    Args:
        part: File entry of the manifest.
        script: Source code of ``local_stats.py``.
        image: Container image with Python 3.

    Returns:
        The task, as the TES API expects it.
    """
    return {
        "name": f"federated-analytics-{part['node']}",
        "description": "Summary statistics of one partition (elixir-cloud-demos)",
        "inputs": [
            {"url": part["url"], "path": "/data/input.csv", "type": "FILE"},
            {"content": script, "path": "/data/local_stats.py", "type": "FILE"},
        ],
        "executors": [
            {
                "image": image,
                "command": ["python3", "/data/local_stats.py", "/data/input.csv"],
            }
        ],
    }


def _http(request: urllib.request.Request) -> Any:  # pragma: no cover
    """Send a request and decode the JSON response.

    Args:
        request: The request.

    Returns:
        The decoded response body.
    """
    with urllib.request.urlopen(request, timeout=60) as response:  # noqa: S310
        return json.load(response)


class TesClient:
    """Minimal client of the GA4GH TES API.

    Args:
        base_url: Base URL of the service, without ``/ga4gh/tes/v1``.
        token: Access token, sent as bearer token if given.
        transport: Function that sends requests; for tests.
    """

    def __init__(
        self, base_url: str, token: str | None = None, transport: Transport = _http
    ) -> None:
        """Initialise the client."""
        self.url = base_url.rstrip("/") + TES_PATH
        self.token = token
        self.transport = transport

    def _request(self, url: str, body: dict[str, Any] | None = None) -> Any:
        """Send a GET request, or a POST request if there is a body.

        Args:
            url: URL to send to.
            body: JSON body of a POST request.

        Returns:
            The decoded response body.

        Raises:
            TaskError: If the request fails.
        """
        headers = {"Accept": "application/json"}
        data = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(body).encode()
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        request = urllib.request.Request(url, data=data, headers=headers)
        try:
            return self.transport(request)
        except urllib.error.HTTPError as exc:
            hint = " (is TES_TOKEN set and valid?)" if exc.code in (401, 403) else ""
            raise TaskError(f"{url}: HTTP {exc.code} {exc.reason}{hint}") from exc
        except urllib.error.URLError as exc:
            raise TaskError(f"{url}: {exc.reason}") from exc

    def submit(self, task: dict[str, Any]) -> str:
        """Create a task.

        Args:
            task: The task.

        Returns:
            The ID of the task.
        """
        return str(self._request(self.url, task)["id"])

    def wait(
        self,
        task_id: str,
        poll: float = 5.0,
        timeout: float = 1800.0,
        sleep: Callable[[float], None] = time.sleep,
        clock: Callable[[], float] = time.monotonic,
    ) -> str:
        """Wait for a task to end and return the output of its executor.

        Args:
            task_id: ID of the task.
            poll: Seconds between status requests.
            timeout: Seconds to wait at most for this task, requests included.
            sleep: Function to wait with; for tests.
            clock: Monotonic clock in seconds; for tests.

        Returns:
            The standard output of the last executor.

        Raises:
            TaskError: If the task doesn't complete in time, fails, or has no
                output in its logs.
        """
        deadline = clock() + timeout
        while True:
            task = self._request(f"{self.url}/{task_id}?view=FULL")
            state = task.get("state", "UNKNOWN")
            if state in TERMINAL_STATES:
                break
            if clock() >= deadline:
                raise TaskError(f"task {task_id} still {state} after {timeout}s")
            sleep(poll)
        if state != "COMPLETE":
            raise TaskError(f"task {task_id} ended in state {state}")
        try:
            return str(task["logs"][-1]["logs"][-1]["stdout"])
        except (KeyError, IndexError, TypeError) as exc:
            raise TaskError(f"task {task_id} has no executor output") from exc


def run_tes(
    partitions: Sequence[dict[str, Any]],
    clients: Sequence[TesClient],
    image: str = DEFAULT_IMAGE,
    **wait_kwargs: Any,
) -> list[Stats]:
    """Run ``local_stats.py`` as one TES task per partition.

    Partitions go to the clients in turn: with one client (a gateway), all
    tasks go there; with one client per partition, each gets its own.

    Args:
        partitions: File entries of the manifest.
        clients: TES clients.
        image: Container image with Python 3.
        **wait_kwargs: Passed on to ``TesClient.wait``.

    Returns:
        The aggregates of each partition.
    """
    script = SCRIPT.read_text()
    submitted = []
    for idx, part in enumerate(partitions):
        client = clients[idx % len(clients)]
        task_id = client.submit(make_task(part, script, image))
        print(f"Submitted {part['node']} to {client.url}: {task_id}", file=sys.stderr)
        submitted.append((client, task_id))
    partials = []
    for client, task_id in submitted:
        stdout = client.wait(task_id, **wait_kwargs)
        try:
            partials.append(json.loads(stdout.strip().splitlines()[-1]))
        except (IndexError, json.JSONDecodeError) as exc:
            raise TaskError(f"task {task_id} printed no JSON: {stdout!r}") from exc
    return partials


def report(result: dict[str, dict[str, dict[str, float]]]) -> str:
    """Format the combined statistics as a table.

    Args:
        result: Output of ``combine``.

    Returns:
        The table, one line per condition and column, then Welch's t.
    """
    lines = [f"{GROUP_COLUMN:<10} {'column':<11} {'n':>4} {'mean':>8} {'sd':>8}"]
    for group in sorted(result):
        for col in VALUE_COLUMNS:
            agg = result[group][col]
            lines.append(
                f"{group:<10} {col:<11} {agg['n']:>4.0f} "
                f"{agg['mean']:>8.3f} {agg['sd']:>8.3f}"
            )
    if CONTROL in result and TREATED in result:
        for col in VALUE_COLUMNS:
            t = welch_t(result[CONTROL][col], result[TREATED][col])
            lines.append(f"Welch's t ({TREATED} vs {CONTROL}), {col}: {t:.2f}")
    return "\n".join(lines)


def main(argv: Sequence[str] | None = None, transport: Transport = _http) -> int:
    """Run the demo from the command line.

    Args:
        argv: Command line arguments; ``sys.argv[1:]`` if not given.
        transport: Function that sends requests to TES; for tests.

    Returns:
        The exit code.
    """
    parser = argparse.ArgumentParser(description="Federated analytics demo.")
    where = parser.add_mutually_exclusive_group(required=True)
    where.add_argument(
        "--local", action="store_true", help="run locally, without services"
    )
    where.add_argument(
        "--tes",
        action="append",
        metavar="URL",
        help="base URL of a TES service or gateway; repeat for one per partition",
    )
    parser.add_argument("--manifest", type=Path, default=DATA_DIR / "manifest.json")
    parser.add_argument("--image", default=DEFAULT_IMAGE)
    parser.add_argument("--json", action="store_true", help="print JSON")
    parser.add_argument(
        "--poll", type=float, default=5.0, help="seconds between status requests"
    )
    parser.add_argument(
        "--timeout", type=float, default=1800.0, help="seconds to wait per task"
    )
    args = parser.parse_args(argv)

    partitions = load_partitions(args.manifest)
    if args.local:
        partials = run_local(partitions, args.manifest.parent)
    else:
        if len(args.tes) not in (1, len(partitions)):
            parser.error(
                f"give --tes once (gateway) or {len(partitions)} times "
                "(one per partition)"
            )
        token = os.environ.get("TES_TOKEN") or None
        clients = [TesClient(url, token=token, transport=transport) for url in args.tes]
        try:
            partials = run_tes(
                partitions,
                clients,
                image=args.image,
                poll=args.poll,
                timeout=args.timeout,
            )
        except TaskError as exc:
            print(f"Error: {exc}", file=sys.stderr)
            return 1
    result = combine(partials)
    print(json.dumps(result, indent=2, sort_keys=True) if args.json else report(result))
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
