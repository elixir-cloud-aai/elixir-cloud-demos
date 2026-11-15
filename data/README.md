# Test data

Small, open test data sets for the demos of this repository, and for anyone
who wants to try a federated analysis on ELIXIR On-Cloud services without
real data.

> [!IMPORTANT]
> All data sets here are **synthetic**: a seeded random number generator made
> them up. They describe no person, organism or experiment. Don't add real
> data, and never personal or other sensitive data, to this folder.

## Data sets

| Data set | Files | Columns | License |
| --- | --- | --- | --- |
| `synthetic-growth` | One CSV file per Node: [`node-a.csv`](synthetic-growth/node-a.csv), [`node-b.csv`](synthetic-growth/node-b.csv), 50 rows each | `sample_id`, `condition` (`control` or `treated`), `od600` (optical density at 600 nm), `expression` (reporter expression level) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

The partitions differ slightly on purpose (`node-b` has a higher mean
`od600`), like data of the same kind from two sites.

## Locations

[`manifest.json`](manifest.json) lists every file with its Node, its URL, its
size and its SHA-256 checksum. The URLs point to the `main` branch of this
repository on GitHub, e.g.:

```text
https://raw.githubusercontent.com/elixir-cloud-aai/elixir-cloud-demos/main/data/synthetic-growth/node-a.csv
```

The URLs follow `main`: a change to the data changes what they serve and
the checksums in the manifest. For a fixed copy, replace `main` by a commit
SHA in the URLs.

A TES task can use such a URL directly as an input (`inputs[].url`), as long
as the TES service may download from GitHub. To place the data at a Node
instead, e.g. in its object store, copy the files there and check them
against the checksums of the manifest:

```sh
sha256sum synthetic-growth/*.csv
```

## Regenerate

The files are made by
[`scripts/generate_test_data.py`](../scripts/generate_test_data.py). To change
them, change the script and run, from the repository root:

```sh
uv run python scripts/generate_test_data.py
```

The tests (`uv run pytest`) fail if the committed files and the
manifest differ from what the script writes.
