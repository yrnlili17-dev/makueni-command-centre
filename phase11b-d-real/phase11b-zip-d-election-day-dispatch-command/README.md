# Phase 11B ZIP D — Election Day Dispatch Command

This is the real implementation package for the Election Day Dispatch layer.

## Backend

Adds:

- `GET /api/turnout/operations-centre/election-dispatch`
- `PATCH /api/turnout/operations-centre/election-dispatch/stations/:code`
- `POST /api/turnout/operations-centre/election-dispatch/incidents`
- `PATCH /api/turnout/operations-centre/election-dispatch/incidents/:id`

Automatic tables:

- `gotv_polling_dispatch`
- `gotv_dispatch_incidents`

## Frontend

Adds:

- Election Day Dispatch Command
- county readiness KPIs
- ward dispatch readiness
- polling-station opening status
- agent presence monitoring
- materials and device status
- queue monitoring
- hourly turnout capture
- election incident command

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase11B-Zip-D-Election-Day-Dispatch-Command.zip \
  -d phase11b-d-real

node \
  phase11b-d-real/phase11b-zip-d-election-day-dispatch-command/install-phase11b-d.mjs
```

## Build

```bash
pnpm --filter @workspace/api-server build

PORT=5173 BASE_PATH=/ \
pnpm --filter @workspace/commandcentre build
```

Restart backend and frontend, log in, and open `/turnout`.
