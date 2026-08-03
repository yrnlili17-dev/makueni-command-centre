# Phase 11A ZIP A — Election Operations Centre

This package extends the existing Election War Room without replacing its working polling-station, results, incident and tally functionality.

## Backend

Adds protected Election Day operations endpoints:

- `GET /api/election-day/operations-centre`
- `PATCH /api/election-day/operations-centre/stations/:code/readiness`
- `POST /api/election-day/operations-centre/agents`
- `PATCH /api/election-day/operations-centre/agents/:id`
- `POST /api/election-day/operations-centre/vehicles`
- `POST /api/election-day/operations-centre/observers`
- `POST /api/election-day/operations-centre/escalations`
- `PATCH /api/election-day/operations-centre/escalations/:id`

Automatic tables:

- `election_station_readiness`
- `election_agent_operations`
- `election_vehicle_deployments`
- `election_observer_assignments`
- `election_incident_escalations`

## Frontend

Adds:

- polling-station readiness dashboard
- ward readiness index
- agent operations panel
- vehicle deployment panel
- observer management panel
- incident escalation matrix
- election operations KPIs

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase11A-Zip-A-Election-Operations-Centre.zip \
  -d phase11a-a

node \
  phase11a-a/phase11a-zip-a-election-operations-centre/install-phase11a-a.mjs
```

## Build

```bash
pnpm --filter @workspace/api-server build

PORT=5173 BASE_PATH=/ \
pnpm --filter @workspace/commandcentre build
```

Restart the backend and frontend, log in, and open `/election-war-room`.
