# Phase 9C ZIP A — Executive Analytics Dashboard

This package replaces the placeholder Analytics Hub page with a live executive dashboard.

It uses the existing endpoint:

```text
GET /api/dashboard-intelligence/overview
```

No database schema or backend route is changed.

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase9C-Zip-A-Executive-Analytics-Dashboard.zip -d phase9c-a

node \
  phase9c-a/phase9c-zip-a-executive-analytics/install-phase9c-a.mjs
```

## Build

```bash
PORT=5173 BASE_PATH=/ \
pnpm --filter @workspace/commandcentre build
```

## Run

```bash
fuser -k 5173/tcp 2>/dev/null || true

export PORT=5173
export BASE_PATH=/

pnpm --filter @workspace/commandcentre dev
```

Open Analytics Hub and verify:

- total constituent count
- support classification
- demographic distribution
- geographic coverage
- top wards
- data quality
- recent import activity

The Growth, Messaging, Field, Sentiment, KOLs and Intelligence tabs remain visible for later Phase 9C packages.
