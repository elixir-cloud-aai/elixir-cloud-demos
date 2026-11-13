# Demonstrator federated-analytics

Runs the same analysis at two Nodes through GA4GH TES, optionally through the
proTES gateway, and combines the results. Only aggregates leave the Nodes,
never the rows.

> [!IMPORTANT]
> The demo uses the synthetic test data of [`data/`](../../data/README.md).
> Never run it on real, personal or other sensitive data.

## How it works

1. The data set `synthetic-growth` has one partition per Node (`node-a`,
   `node-b`). [`data/manifest.json`](../../data/manifest.json) lists their
   URLs.
2. For each partition, [`federated_analytics.py`](federated_analytics.py)
   sends one TES task. The task downloads the partition and runs
   [`local_stats.py`](local_stats.py) in a `python:3.13-slim` container. The
   script prints the count, sum and sum of squares of each value column per
   condition, as JSON.
3. The client reads that output from the task logs (`view=FULL`, standard
   output of the executor), so no object store is needed for outputs.
4. The client combines the aggregates into the mean and standard deviation per
   condition, and Welch's t statistic of `treated` against `control`. The
   result is exactly the one of all rows in one place; the tests check this.

## Quick start (no services)

From a fresh clone, with Python 3.12 or later:

```sh
python demos/federated-analytics/federated_analytics.py --local
```

`--local` runs `local_stats.py` on the local copies of the partitions instead
of in TES tasks. It works if the output ends like this:

```text
Welch's t (treated vs control), od600: 13.81
Welch's t (treated vs control), expression: 8.48
```

Add `--json` for machine-readable output. CI runs this quick start on every
change.

## Run against TES services

Through one proTES gateway (all tasks to the gateway, which routes them to its
TES instances):

```sh
export TES_TOKEN=<access token for the gateway>
python demos/federated-analytics/federated_analytics.py --tes https://protes.example.org
```

With one TES service per partition (in the order of the manifest: `node-a`,
then `node-b`):

```sh
python demos/federated-analytics/federated_analytics.py \
  --tes https://tes.node-a.example.org \
  --tes https://tes.node-b.example.org
```

| Option or variable | Meaning |
| --- | --- |
| `--tes URL` | Base URL of a TES service or gateway, without `/ga4gh/tes/v1`. With one URL, all tasks go there; with several, partitions go to them in turn. |
| `TES_TOKEN` | Access token, sent as bearer token if set. proTES 0.3.0 and later need one, from an identity provider the gateway accepts (see [Access control](https://protes.readthedocs.io/en/latest/access-control/)). |
| `--image` | Container image with Python 3 for the tasks (default: `python:3.13-slim`). |
| `--manifest` | Manifest of the partitions (default: `data/manifest.json`). |

The services need:

- to download the partitions from `raw.githubusercontent.com`, or copies of
  them at URLs they can reach (edit a copy of the manifest and pass it with
  `--manifest`);
- to accept inputs with `content` (TES 1.1), for the script;
- to report the standard output of executors in the task logs.

proTES routes each task to one of its TES instances at random, unless its
operator enables [routing by distance to the
data](https://protes.readthedocs.io/en/latest/plugins/#routing-by-distance-to-the-data-opt-in).
For the federated case, where each partition stays at its Node, place each
partition at its Node and enable that routing, or send each partition to its
Node's TES service directly.

## What has been run

- The quick start (`--local`) and the TES client against an in-memory fake TES
  service, in the tests of this repository.
- **Not run:** against a deployed TES service or proTES gateway with access
  tokens. Please report results in the
  [issues](https://github.com/elixir-cloud-aai/elixir-cloud-demos/issues).
