# Phase 9C ZIP C.4 — Campaign KPI Dashboard

This package adds a dedicated `KPI DASHBOARD` tab to Analytics Hub.

## Adds

- overall KPI performance score
- live target tracking
- CRM growth target
- phone coverage
- support classification
- ward readiness
- constituency readiness
- Campaign Plan readiness
- field operations
- messaging performance
- demographic representation
- top ward performance
- print and CSV export
- one-click navigation to operating modules

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase9C-Zip-C4-Campaign-KPI-Dashboard.zip \
  -d phase9c-c4

node \
  phase9c-c4/phase9c-zip-c4-campaign-kpi-dashboard/install-phase9c-c4.mjs
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

Open Analytics Hub → KPI Dashboard.
