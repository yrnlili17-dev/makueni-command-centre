# Phase 9A — Combined Live Dashboard Intelligence

Replaces the placeholder Command Overview with live campaign metrics from the Phase 8 constituent database.

## Install

```bash
cd ~/Projects/makueni-command-centre
unzip Phase9A-Combined-Live-Dashboard-Intelligence.zip -d phase9a
node phase9a/phase9a-live-dashboard-intelligence/install-phase9a.mjs
```

## Build

```bash
pnpm --filter @workspace/api-server build
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
```

## Restart backend

```bash
fuser -k 3001/tcp 2>/dev/null || true
set -a
source .env
set +a
export PORT=3001
pnpm --filter @workspace/api-server dev
```

## Restart frontend

```bash
fuser -k 5173/tcp 2>/dev/null || true
export PORT=5173
export BASE_PATH=/
pnpm --filter @workspace/commandcentre dev
```

## Test

```bash
curl -s http://localhost:3001/api/dashboard-intelligence/health | python -m json.tool
curl -s http://localhost:3001/api/dashboard-intelligence/overview | python -m json.tool
```

The dashboard shows live constituent totals, phone coverage, demographics, ward coverage, readiness, support classification, import history and operational metrics where data exists. Missing modules show `NO_ACTIVITY_YET` rather than invented values.
