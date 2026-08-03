# Phase 9B.2 — Campaign Countdown Executive Operations

This package is additive. It does not replace the existing Campaign Countdown Overview.

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase9B2-Campaign-Countdown-Executive-Operations.zip -d phase9b2

node phase9b2/phase9b2-executive-operations/install-phase9b2.mjs
```

## Build

```bash
PORT=5173 BASE_PATH=/ \
pnpm --filter @workspace/commandcentre build
```

## Run

Backend:

```bash
set -a
source .env
set +a
export PORT=3001
pnpm --filter @workspace/api-server dev
```

Frontend:

```bash
fuser -k 5173/tcp 2>/dev/null || true
export PORT=5173
export BASE_PATH=/
pnpm --filter @workspace/commandcentre dev
```

## Test

Open:

```text
http://localhost:5173/campaign-plan
```

Verify:

- Executive Operations Snapshot appears above the existing countdown.
- KPI totals match the milestone database.
- Category health matches the readiness endpoint.
- Risks reflect overdue, critical, due-soon and unassigned milestones.
- Clicking a Critical Timeline card opens that milestone in the Milestones tab.
