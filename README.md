# TES Dashboard

[![license][badge-license]][badge-url-license]
[![chat][badge-chat]][badge-url-chat]

A clean, modern dashboard for monitoring Task Execution Service (TES) instances and workflow execution across multiple cloud providers, built as part of the [**ELIXIR Cloud**][res-elixir-cloud] ecosystem.

## Features

- Real-time monitoring of TES instances
- Workflow submission and tracking
- Interactive dashboard with analytics
- Modern React frontend with Flask backend
- Cross-platform compatibility

## Quick Start

### Prerequisites

- Python 3.7+
- Node.js 14+
- npm or yarn

### Run the Dashboard

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd elixir-cloud-demos
   ```

2. Run the dashboard (starts both frontend and backend):
   ```bash
   ./run.sh
   ```

   This will:
   - Install backend dependencies in a virtual environment
   - Install frontend dependencies
   - Start the backend server on http://localhost:5000
   - Start the frontend server on http://localhost:3000

3. Open your browser and navigate to http://localhost:3000

### Manual Setup

If you prefer to run the services manually:

#### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

#### Frontend
```bash
cd frontend
npm install
npm start
```

## Project Structure

```
├── backend/           # Flask backend API
│   ├── app.py        # Main application
│   ├── requirements.txt
│   └── ...
├── frontend/         # React frontend
│   ├── package.json
│   ├── src/
│   └── public/
├── run.sh           # Quick start script
└── README.md
```

## Contributing

This project lives off your contributions, be it in the form of new demos, bug
reports, pull requests or discussions. Please read our [contributor
guidelines][docs-contributing] if you want to contribute. And please mind our
[Code of Conduct][docs-coc] for all interactions with the community.

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
[docs-coc]: <https://elixir-cloud-aai.github.io/about/code-of-conduct/>
[docs-contributing]: <https://elixir-cloud-aai.github.io/guides/guide-contributor/>
[docs-license]: LICENSE
[req-conda]: <https://conda.io/>
[req-git]: <https://git-scm.com/>
[req-mamba]: <https://mamba.readthedocs.io/>
[res-elixir]: <https://elixir-europe.org/>
[res-elixir-cloud]: <https://elixir-cloud.dcc.sib.swiss/>
[res-ga4gh]: <https://ga4gh.org/>
