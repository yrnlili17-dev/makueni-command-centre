# Phase 10B ZIP A — Executive Operations Dashboard

This package upgrades the existing Executive Command page into a live executive operations dashboard.

## Uses

- `GET /api/command-centre/summary`
- `GET /api/dashboard-intelligence/overview`
- `GET /api/campaign-plan/readiness`
- `GET /api/strategist/actions`

## Adds

- Campaign Health
- Campaign Readiness
- Data Readiness
- Operational Readiness
- Phone Coverage
- Support Classification
- Open Threats
- Urgent Strategist Actions
- Executive Alert Wall
- Priority Ward Watchlist
- Live Operations Summary
- Direct module navigation

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase10B-Zip-A-Executive-Operations-Dashboard.zip \
  -d phase10b-a

node \
  phase10b-a/phase10b-zip-a-executive-operations-dashboard/install-phase10b-a.mjs
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

Log in and open `/executive-command`.
