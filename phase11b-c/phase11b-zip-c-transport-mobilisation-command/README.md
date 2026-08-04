# Phase 11B ZIP C — Transport & Mobilisation Command

This package adds the live command and monitoring layer to Phase 11B.

## Backend

Adds:

- `PATCH /api/turnout/operations-centre/households/:id`
- `PATCH /api/turnout/operations-centre/contacts/:id`
- `PATCH /api/turnout/operations-centre/transport/:id`
- `GET /api/turnout/operations-centre/live-command`

## Frontend

Adds:

- live GOTV command board
- 30-second automatic refresh
- pause and resume controls
- county mobilisation score
- county risk score
- ward mobilisation risk matrix
- executive GOTV alerts
- household, contact and transport timeline
- transport backlog monitoring

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase11B-Zip-C-Transport-Mobilisation-Command.zip \
  -d phase11b-c

node \
  phase11b-c/phase11b-zip-c-transport-mobilisation-command/install-phase11b-c.mjs
```

## Build

```bash
pnpm --filter @workspace/api-server build

PORT=5173 BASE_PATH=/ \
pnpm --filter @workspace/commandcentre build
```

Restart backend and frontend, log in, and open `/turnout`.
