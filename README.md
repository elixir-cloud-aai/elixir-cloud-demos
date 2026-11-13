# ELIXIR Cloud Demos

[![license][badge-license]][badge-url-license]
[![chat][badge-chat]][badge-url-chat]

Demonstrators of the [**ELIXIR Cloud**][res-elixir-cloud], an
[ELIXIR][res-elixir] federated compute infrastructure based on
[GA4GH][res-ga4gh] standards.

> [!WARNING]
> The demo `2023-ecp-f2f` is **retired**: it is kept for the record only and
> is not maintained. It depends on service versions, forks and FTP servers
> that no longer exist, and current proTES versions refuse its tasks. See the
> [Demos page](https://docs.elixir-on.cloud/en/latest/demos/#retired-demos) of the Documentation
> Hub for details and for the current demos.

## Usage

Each demonstrator is self-contained and available in its own folder, together
with demo-specific installation and usage instructions. There are, however,
some [global requirements](#requirements) for all demos.

Follow the shortcuts in the following table to the individual demos.

| Name | First Demo | Description |
| --- | --- | --- |
| [2023-ecp-f2f](demos/2023-ecp-f2f/README.md) | ELIXIR Compute Face-to-Face, Helsinki, Feb 7-8, 2023 | Task execution via the [Task Execution Service (TES) API](https://github.com/ga4gh/task-execution-schemas/) on Kubernetes and HPC; TES-based task distribution with random and distance-based task distribution logic; execution of a CWL workflow via the `cwl-tes` TES backend |

## Test data

The folder [`data/`](data/README.md) holds small, open and synthetic test
data sets for the demos, e.g. one partition per Node for federated analytics.
Its [`manifest.json`](data/manifest.json) lists the URL, size and checksum of
every file. The data are made up; never add real or sensitive data.

## Requirements

All demos require the following software to be installed:

- [Conda][req-conda]
- [Git][req-git]

We further recommend installing the following software:

- [Mamba][req-mamba]

> We recommend installing the latest versions of each of these packages.

## Contributing

This project lives off your contributions, be it in the form of new demos, bug
reports, pull requests or discussions. Please read our [contributor
guidelines][docs-contributing] if you want to contribute. And please mind our
[Code of Conduct][docs-coc] for all interactions with the community.

To run the checks of the CI on your computer, install [uv][req-uv] and run,
from the repository root:

```sh
uv run ruff check .
uv run ruff format --check .
uv run mypy
uv run pytest
```

## Versioning

Outside of version control, individual demos are not explicitly versioned. When
a demo is first given, it becomes feature-locked, from which point on only
maintenance and documentation chores may be performed on that demo in order to
ensure its functionality.

## License

This project is covered by the [Apache License 2.0][badge-url-license] also
[shipped with this repository][docs-license].

## Contact

If you have suggestions for or find issue with this app, please use the
[issue tracker][contact-issue-tracker]. If you would like to reach out to us
for anything else, you can join our [Slack board][badge-url-chat], start a
thread in our [Q&A forum][contact-qa], or send us an [email][contact-email].

[badge-chat]: <https://img.shields.io/static/v1?label=chat&message=Slack&color=ff6994>
[badge-license]: <https://img.shields.io/badge/license-Apache%202.0-blue.svg>
[badge-url-chat]: <https://join.slack.com/t/elixir-cloud/shared_invite/zt-1r9z32xg5-GgRguOCqsgEHtB~dN2wfZg>
[badge-url-license]: <http://www.apache.org/licenses/LICENSE-2.0>
[contact-email]: <mailto:cloud-service@elixir-europe.org>
[contact-issue-tracker]: <https://github.com/elixir-cloud-aai/landing-page/issues>
[contact-qa]: <https://github.com/elixir-cloud-aai/elixir-cloud-aai/discussions>
[docs-coc]: <https://github.com/elixir-cloud-aai/.github/blob/main/CODE_OF_CONDUCT.md>
[docs-contributing]: <https://github.com/elixir-cloud-aai/.github/blob/main/CONTRIBUTING.md>
[docs-license]: LICENSE
[req-conda]: <https://conda.io/>
[req-git]: <https://git-scm.com/>
[req-mamba]: <https://mamba.readthedocs.io/>
[req-uv]: <https://docs.astral.sh/uv/>
[res-elixir]: <https://elixir-europe.org/>
[res-elixir-cloud]: <https://elixir-cloud.dcc.sib.swiss/>
[res-ga4gh]: <https://ga4gh.org/>
