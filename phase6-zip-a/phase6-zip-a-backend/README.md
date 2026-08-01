# Phase 6 — ZIP A: Backend Incident Engine & API

This package adds the backend foundation for the Intelligence Operations Engine.

## What it does

- Converts narrative mentions into operational incidents.
- Generates incident IDs such as `INT-2027-000123`.
- Calculates:
  - recommended action
  - confidence score
  - estimated reach
  - duplicate count
  - topic
- Clusters repeated content using normalized fingerprints.
- Stores assignment, status and incident timeline events.
- Builds platform-specific response versions without API keys.
- Adds live incident metrics.
- Creates its own PostgreSQL tables automatically with `CREATE TABLE IF NOT EXISTS`.
- Does not alter existing narrative mention or response tables.

## Endpoints

```text
GET   /api/intelligence/incidents
GET   /api/intelligence/incidents/metrics
GET   /api/intelligence/incidents/:identifier
PATCH /api/intelligence/incidents/:identifier/assign
PATCH /api/intelligence/incidents/:identifier/status
POST  /api/intelligence/incidents/:identifier/events
POST  /api/intelligence/incidents/:identifier/channels
```

## Install

From the repository root:

```bash
unzip Phase6-Zip-A-Backend-Incident-Engine.zip -d phase6-zip-a
node phase6-zip-a/phase6-zip-a-backend/install-phase6-zip-a.mjs
```

## Build

```bash
pnpm --filter @workspace/api-server build
```

## Start backend

```bash
fuser -k 3001/tcp 2>/dev/null || true

set -a
source .env
set +a

export PORT=3001

pnpm --filter @workspace/api-server dev
```

## Test

```bash
curl -s http://localhost:3001/api/intelligence/incidents/metrics
```

```bash
curl -s http://localhost:3001/api/intelligence/incidents
```

For readable JSON, install `jq` or use Python:

```bash
curl -s http://localhost:3001/api/intelligence/incidents/metrics | python -m json.tool
```

## No API keys required

The multi-channel response endpoint uses a local campaign-safe response engine.

Example:

```bash
curl -s -X POST \
  http://localhost:3001/api/intelligence/incidents/INT-2027-000001/channels \
  | python -m json.tool
```

## Backup

The installer creates:

```text
.phase6-zip-a-backup-<timestamp>/
```

Keep it until the backend has been tested.
