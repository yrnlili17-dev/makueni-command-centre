# Phase 10B ZIP D — Executive Decision Command Console

This package completes the Phase 10B War Room layer.

## Backend

Adds:

- `GET /api/command-centre/executive-decisions`
- `POST /api/command-centre/executive-decisions`
- `PATCH /api/command-centre/executive-decisions/:id`
- `DELETE /api/command-centre/executive-decisions/:id`
- `POST /api/command-centre/executive-decisions/generate`
- `GET /api/command-centre/executive-audit`

Tables:

- `executive_decisions`
- `executive_audit_log`

## Frontend

Adds:

- Decision Console tab
- automatic executive recommendations
- owner and priority assignment
- approve, in-progress, completed, deferred and archived states
- persistent audit trail
- manual decision creation
- decision deletion

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase10B-Zip-D-Executive-Decision-Command-Console.zip \
  -d phase10b-d

node \
  phase10b-d/phase10b-zip-d-executive-decision-command-console/install-phase10b-d.mjs
```

## Build

```bash
pnpm --filter @workspace/api-server build

PORT=5173 BASE_PATH=/ \
pnpm --filter @workspace/commandcentre build
```

Restart backend and frontend, log in, and open `/war-room`.
