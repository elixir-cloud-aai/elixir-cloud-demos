"""Tests for the federated analytics demo."""

import csv
import json
import math
import statistics
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, cast

import pytest

import federated_analytics as fa
import local_stats

REPO_ROOT = Path(__file__).resolve().parents[1]
MANIFEST = REPO_ROOT / "data" / "manifest.json"
DEMO = REPO_ROOT / "demos" / "federated-analytics" / "federated_analytics.py"


def _all_rows() -> list[dict[str, str]]:
    """Read the rows of all partitions, as if they were in one place."""
    rows: list[dict[str, str]] = []
    for part in fa.load_partitions(MANIFEST):
        with (MANIFEST.parent / part["path"]).open(newline="") as handle:
            rows.extend(csv.DictReader(handle))
    return rows


class FakeTes:
    """In-memory TES service that runs ``local_stats`` on submitted tasks."""

    def __init__(
        self, states: list[str] | None = None, stdout: str | None = None
    ) -> None:
        """Set the states to report before the final one, and the output."""
        self.states = list(states or [])
        self.stdout = stdout
        self.tasks: dict[str, dict[str, Any]] = {}
        self.requests: list[urllib.request.Request] = []

    def __call__(self, request: urllib.request.Request) -> Any:
        """Answer a request like a TES service."""
        self.requests.append(request)
        if request.full_url.endswith(":cancel"):
            return {}
        if request.data is not None:
            task = json.loads(cast(bytes, request.data))
            task_id = f"task-{len(self.tasks) + 1}"
            self.tasks[task_id] = task
            return {"id": task_id}
        task_id = request.full_url.rsplit("/", 1)[1].split("?")[0]
        if self.states:
            return {"id": task_id, "state": self.states.pop(0)}
        task = self.tasks[task_id]
        if self.stdout is None:
            url = task["inputs"][0]["url"]
            part = next(p for p in fa.load_partitions(MANIFEST) if p["url"] == url)
            with (MANIFEST.parent / part["path"]).open(newline="") as handle:
                stdout = json.dumps(local_stats.summarise(csv.DictReader(handle)))
        else:
            stdout = self.stdout
        return {
            "id": task_id,
            "state": "COMPLETE",
            "logs": [{"logs": [{"stdout": stdout + "\n"}]}],
        }


def test_summarise_counts_sums_and_squares() -> None:
    """The aggregates of a partition are count, sum and sum of squares."""
    rows = [
        {"condition": "a", "od600": "1", "expression": "2"},
        {"condition": "a", "od600": "3", "expression": "4"},
    ]
    stats = local_stats.summarise(rows)
    assert stats["a"]["od600"] == {"n": 2, "sum": 4, "sumsq": 10}
    assert stats["a"]["expression"] == {"n": 2, "sum": 6, "sumsq": 20}


@pytest.mark.parametrize(
    "row",
    [
        {"condition": "a", "od600": "x", "expression": "1"},
        {"condition": "a", "od600": "1"},
        {"od600": "1", "expression": "1"},
    ],
)
def test_summarise_rejects_invalid_rows(row: dict[str, str]) -> None:
    """Rows with missing or non-numeric values are errors."""
    with pytest.raises(ValueError):
        local_stats.summarise([row])


def test_local_stats_main_prints_json(capsys: pytest.CaptureFixture[str]) -> None:
    """The script prints the aggregates of a file as JSON."""
    part = fa.load_partitions(MANIFEST)[0]
    assert local_stats.main([str(MANIFEST.parent / part["path"])]) == 0
    stats = json.loads(capsys.readouterr().out)
    assert stats["control"]["od600"]["n"] == 25


def test_local_stats_main_needs_one_argument() -> None:
    """Without exactly one file, the script exits with a usage error."""
    assert local_stats.main([]) == 2


def test_federated_result_equals_pooled_result() -> None:
    """Combining partition aggregates gives the statistics of all rows."""
    partials = fa.run_local(fa.load_partitions(MANIFEST), MANIFEST.parent)
    result = fa.combine(partials)
    rows = _all_rows()
    for group in local_stats.summarise(rows):
        for col in local_stats.VALUE_COLUMNS:
            values = [float(r[col]) for r in rows if r["condition"] == group]
            assert result[group][col]["n"] == len(values)
            assert result[group][col]["mean"] == pytest.approx(statistics.fmean(values))
            assert result[group][col]["sd"] == pytest.approx(statistics.stdev(values))


def test_combine_single_value_has_undefined_sd() -> None:
    """The standard deviation of one value is not a number."""
    result = fa.combine([{"a": {"x": {"n": 1, "sum": 2, "sumsq": 4}}}])
    assert result["a"]["x"]["mean"] == 2
    assert math.isnan(result["a"]["x"]["sd"])


def test_welch_t() -> None:
    """Welch's t is the mean difference over its standard error."""
    a = {"n": 4.0, "mean": 1.0, "sd": 2.0}
    b = {"n": 4.0, "mean": 3.0, "sd": 2.0}
    assert fa.welch_t(a, b) == pytest.approx(2 / math.sqrt(2))
    assert math.isnan(fa.welch_t(a | {"sd": 0.0}, b | {"sd": 0.0}))


def test_load_partitions_unknown_dataset() -> None:
    """Asking for a data set that isn't in the manifest is an error."""
    with pytest.raises(KeyError):
        fa.load_partitions(MANIFEST, dataset="nope")


def test_make_task_runs_script_on_partition() -> None:
    """The task downloads the partition and runs the script on it."""
    part = fa.load_partitions(MANIFEST)[0]
    task = fa.make_task(part, "print(1)", "img")
    assert task["inputs"][0]["url"] == part["url"]
    assert task["inputs"][1]["content"] == "print(1)"
    assert task["executors"][0]["image"] == "img"


def test_run_tes_through_gateway_equals_local() -> None:
    """Through one gateway, the result is the same as locally."""
    partitions = fa.load_partitions(MANIFEST)
    fake = FakeTes(states=["QUEUED", "RUNNING"])
    client = fa.TesClient("https://gw.example.org/", token="t", transport=fake)
    partials = fa.run_tes(partitions, [client], sleep=lambda _: None)
    assert partials == fa.run_local(partitions, MANIFEST.parent)
    assert len(fake.tasks) == len(partitions)
    first = fake.requests[0]
    assert first.full_url == "https://gw.example.org/ga4gh/tes/v1/tasks"
    assert first.get_header("Authorization") == "Bearer t"


def test_run_tes_one_service_per_partition() -> None:
    """With one service per partition, each gets one task."""
    partitions = fa.load_partitions(MANIFEST)
    fakes = [FakeTes() for _ in partitions]
    clients = [
        fa.TesClient(f"https://tes{i}.example.org", transport=f)
        for i, f in enumerate(fakes)
    ]
    fa.run_tes(partitions, clients)
    assert [len(f.tasks) for f in fakes] == [1] * len(partitions)
    assert fakes[0].requests[0].get_header("Authorization") is None


@pytest.mark.parametrize("state", ["EXECUTOR_ERROR", "SYSTEM_ERROR", "CANCELED"])
def test_wait_raises_on_failed_task(state: str) -> None:
    """A task that doesn't complete is an error."""
    fake = FakeTes(states=[state])
    client = fa.TesClient("https://tes.example.org", transport=fake)
    task_id = client.submit({})
    with pytest.raises(fa.TaskError, match=state):
        client.wait(task_id)


def test_wait_times_out() -> None:
    """A task that runs too long is an error."""
    fake = FakeTes(states=["RUNNING"] * 3)
    client = fa.TesClient("https://tes.example.org", transport=fake)
    task_id = client.submit({})
    with pytest.raises(fa.TaskError, match="still RUNNING"):
        client.wait(
            task_id,
            poll=1,
            timeout=1,
            sleep=lambda _: None,
            clock=iter(range(10)).__next__,
        )


def test_wait_raises_without_logs() -> None:
    """A completed task without executor logs is an error."""

    def transport(request: urllib.request.Request) -> Any:
        return {"id": "x"} if request.data else {"state": "COMPLETE", "logs": []}

    client = fa.TesClient("https://tes.example.org", transport=transport)
    with pytest.raises(fa.TaskError, match="no executor output"):
        client.wait(client.submit({}))


def test_run_tes_raises_on_non_json_output() -> None:
    """A task that prints no JSON is an error."""
    fake = FakeTes(stdout="oops")
    client = fa.TesClient("https://tes.example.org", transport=fake)
    with pytest.raises(fa.TaskError, match="no JSON"):
        fa.run_tes(fa.load_partitions(MANIFEST), [client])


def test_report_lists_groups_and_t() -> None:
    """The report has one line per condition and column, then Welch's t."""
    result = fa.combine(fa.run_local(fa.load_partitions(MANIFEST), MANIFEST.parent))
    text = fa.report(result)
    assert "control" in text and "treated" in text
    assert text.count("Welch's t") == len(local_stats.VALUE_COLUMNS)


def test_report_without_both_conditions() -> None:
    """Without both conditions, the report leaves out Welch's t."""
    result = fa.combine(
        [{"a": {c: {"n": 2, "sum": 2, "sumsq": 2} for c in local_stats.VALUE_COLUMNS}}]
    )
    assert "Welch" not in fa.report(result)


def test_main_local(capsys: pytest.CaptureFixture[str]) -> None:
    """``--local --json`` prints the combined statistics as JSON."""
    assert fa.main(["--local", "--json"]) == 0
    result = json.loads(capsys.readouterr().out)
    assert result["treated"]["expression"]["n"] == 50


def test_main_tes(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    """``--tes`` sends the tasks with the token of ``TES_TOKEN``."""
    fake = FakeTes()
    monkeypatch.setenv("TES_TOKEN", "secret-for-test")
    assert fa.main(["--tes", "https://gw.example.org"], transport=fake) == 0
    assert "Welch's t" in capsys.readouterr().out
    assert fake.requests[0].get_header("Authorization") == "Bearer secret-for-test"


def test_main_rejects_mismatched_tes_count(
    capsys: pytest.CaptureFixture[str],
) -> None:
    """``--tes`` must be given once or once per partition."""
    n_parts = len(fa.load_partitions(MANIFEST))
    urls = [arg for i in range(n_parts + 1) for arg in ("--tes", f"https://{i}.org")]
    with pytest.raises(SystemExit) as exc:
        fa.main(urls, transport=FakeTes())
    assert exc.value.code == 2
    assert "give --tes once" in capsys.readouterr().err


@pytest.mark.parametrize("value", ["0", "-1", "x", "nan", "inf"])
def test_main_rejects_non_positive_poll(value: str) -> None:
    """``--poll`` and ``--timeout`` must be positive numbers."""
    with pytest.raises(SystemExit):
        fa.main(["--tes", "https://gw.org", "--poll", value], transport=FakeTes())


def test_main_reports_task_errors(capsys: pytest.CaptureFixture[str]) -> None:
    """A failed task ends the run with a message and exit code 1."""
    fake = FakeTes(states=["SYSTEM_ERROR"] * 2)
    assert (
        fa.main(["--tes", "https://gw.example.org", "--poll", "0.01"], transport=fake)
        == 1
    )
    assert "SYSTEM_ERROR" in capsys.readouterr().err


def test_request_wraps_http_errors() -> None:
    """HTTP and network errors become task errors with a hint."""

    def transport(request: urllib.request.Request) -> Any:
        raise urllib.error.HTTPError(request.full_url, 401, "Unauthorized", {}, None)  # type: ignore[arg-type]

    client = fa.TesClient("https://tes.example.org", transport=transport)
    with pytest.raises(fa.TaskError, match="401.*TES_TOKEN"):
        client.submit({})


def test_wait_counts_request_time() -> None:
    """The timeout includes the time requests take, not only sleeps."""
    fake = FakeTes(states=["RUNNING"] * 5)
    client = fa.TesClient("https://tes.example.org", transport=fake)
    task_id = client.submit({})
    ticks = iter([0.0, 100.0, 200.0])
    with pytest.raises(fa.TaskError, match="still RUNNING"):
        client.wait(
            task_id,
            poll=1,
            timeout=150,
            sleep=lambda _: None,
            clock=lambda: next(ticks),
        )


def test_quick_start_runs_as_script() -> None:
    """The README's quick start works from a fresh clone."""
    out = subprocess.run(
        [sys.executable, str(DEMO), "--local"],
        check=True,
        capture_output=True,
        text=True,
    )
    assert "Welch's t (treated vs control), expression" in out.stdout


def test_request_wraps_network_errors() -> None:
    """Network errors become task errors."""

    def transport(request: urllib.request.Request) -> Any:
        raise urllib.error.URLError("no route")

    client = fa.TesClient("https://tes.example.org", transport=transport)
    with pytest.raises(fa.TaskError, match="no route"):
        client.submit({})


def test_request_wraps_timeouts() -> None:
    """Read timeouts become task errors."""

    def transport(request: urllib.request.Request) -> Any:
        raise TimeoutError("read timed out")

    client = fa.TesClient("https://tes.example.org", transport=transport)
    with pytest.raises(fa.TaskError, match="timed out"):
        client.submit({})


def test_summarise_errors_name_no_values() -> None:
    """Errors give the row number and column, never the values of the row."""
    rows = [
        {"condition": "a", "od600": "1", "expression": "2"},
        {"condition": "secret-group", "od600": "secret-value", "expression": "2"},
    ]
    with pytest.raises(ValueError) as exc:
        local_stats.summarise(rows)
    assert "row 2" in str(exc.value) and "od600" in str(exc.value)
    assert "secret" not in str(exc.value)
    assert exc.value.__cause__ is None


@pytest.mark.parametrize("value", ["nan", "inf", "-inf"])
def test_summarise_rejects_non_finite_values(value: str) -> None:
    """Non-finite values are errors."""
    with pytest.raises(ValueError, match="finite"):
        local_stats.summarise([{"condition": "a", "od600": value, "expression": "1"}])


def test_summarise_rejects_empty_partition() -> None:
    """A partition without rows is an error."""
    with pytest.raises(ValueError, match="no rows"):
        local_stats.summarise([])


def test_local_stats_main_reports_invalid_data(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    """Invalid data end with a short message and exit code 1, no traceback."""
    path = tmp_path / "bad.csv"
    path.write_text("condition,od600,expression\nsecret,x,1\n")
    assert local_stats.main([str(path)]) == 1
    err = capsys.readouterr().err
    assert "row 1" in err and "secret" not in err


def test_json_output_has_no_nan() -> None:
    """Undefined values are null in JSON output."""
    result = fa.combine([{"a": {"x": {"n": 1, "sum": 2, "sumsq": 4}}}])
    assert json.loads(fa.to_json(result))["a"]["x"]["sd"] is None


@pytest.mark.parametrize(
    "response", [{"no": "id"}, ["not", "an", "object"]], ids=["no-id", "list"]
)
def test_submit_rejects_malformed_responses(response: Any) -> None:
    """A response without a task ID is a task error."""
    client = fa.TesClient("https://tes.example.org", transport=lambda _: response)
    with pytest.raises(fa.TaskError, match="malformed"):
        client.submit({})


def test_wait_rejects_malformed_responses() -> None:
    """A status response that is not an object is a task error."""

    def transport(request: urllib.request.Request) -> Any:
        return {"id": "x"} if request.data else ["oops"]

    client = fa.TesClient("https://tes.example.org", transport=transport)
    with pytest.raises(fa.TaskError, match="malformed"):
        client.wait(client.submit({}))


def test_token_needs_https() -> None:
    """A token is never sent over plain HTTP, except to localhost."""
    with pytest.raises(ValueError, match="HTTPS"):
        fa.TesClient("http://tes.example.org", token="t")
    fa.TesClient("http://localhost:8000", token="t")
    fa.TesClient("http://127.0.0.1:8000", token="t")
    fa.TesClient("http://tes.example.org")


def test_main_refuses_token_over_http(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    """The command line refuses to send a token over plain HTTP."""
    monkeypatch.setenv("TES_TOKEN", "t")
    with pytest.raises(SystemExit):
        fa.main(["--tes", "http://gw.example.org"], transport=FakeTes())
    assert "HTTPS" in capsys.readouterr().err


def test_redirects_are_refused() -> None:
    """Redirects are refused, so that tokens never go to another origin."""
    handler = fa.NoRedirect()
    request = urllib.request.Request("https://tes.example.org/x")
    with pytest.raises(urllib.error.HTTPError, match="redirect"):
        handler.redirect_request(
            request, None, 302, "Found", {}, "https://evil.example.org/"
        )


def test_run_tes_cancels_tasks_on_failure() -> None:
    """When a task fails, the client cancels the tasks it has sent."""
    fake = FakeTes(states=["SYSTEM_ERROR"])
    client = fa.TesClient("https://tes.example.org", transport=fake)
    with pytest.raises(fa.TaskError):
        fa.run_tes(fa.load_partitions(MANIFEST), [client])
    cancelled = [r.full_url for r in fake.requests if r.full_url.endswith(":cancel")]
    assert cancelled == [f"{client.url}/task-{i}:cancel" for i in (1, 2)]


def test_cancel_ignores_errors() -> None:
    """Cancelling is best effort: errors are ignored."""

    def transport(request: urllib.request.Request) -> Any:
        raise urllib.error.URLError("down")

    fa.TesClient("https://tes.example.org", transport=transport).cancel("x")
