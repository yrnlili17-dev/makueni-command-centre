# Phase 10B ZIP C — County Situation Room

This package adds a county-wide situation room to the existing War Room.

## Backend

Adds:

- `GET /api/command-centre/situation-room`

The response includes:

- ward readiness
- ward risk score
- ward opportunity score
- open strategic actions
- recent incidents
- upcoming events

## Frontend

Adds:

- Situation Room tab
- ward selector
- selected ward summary
- highest-risk wards
- highest-opportunity wards
- strategic action panel
- incident matrix
- campaign timeline
- direct module navigation

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase10B-Zip-C-County-Situation-Room.zip -d phase10b-c

node \
  phase10b-c/phase10b-zip-c-county-situation-room/install-phase10b-c.mjs
```

## Build

```bash
pnpm --filter @workspace/api-server build

PORT=5173 BASE_PATH=/ \
pnpm --filter @workspace/commandcentre build
```

Restart backend and frontend, log in, and open `/war-room`.
