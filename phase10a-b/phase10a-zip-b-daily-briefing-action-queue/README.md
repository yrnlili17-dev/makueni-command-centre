# Phase 10A ZIP B — Daily Briefing & Action Queue

This automatic package adds persistent executive briefings and strategic action tracking to the existing Chief Strategist.

## Backend

Adds protected strategist endpoints:

- `GET /api/strategist/briefings`
- `POST /api/strategist/briefings/generate`
- `GET /api/strategist/actions`
- `POST /api/strategist/actions`
- `PATCH /api/strategist/actions/:id`
- `DELETE /api/strategist/actions/:id`

Tables are created automatically:

- `strategist_daily_briefings`
- `strategist_action_queue`

## Frontend

Adds:

- daily situation briefing
- top priorities
- risks and opportunities
- briefing history storage
- download and print
- trackable action queue
- owner and priority
- pending, in-progress, completed and deferred states
- send any priority or action into the existing strategist chat

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase10A-Zip-B-Daily-Briefing-Action-Queue.zip \
  -d phase10a-b

node \
  phase10a-b/phase10a-zip-b-daily-briefing-action-queue/install-phase10a-b.mjs
```

## Build

```bash
pnpm --filter @workspace/api-server build

PORT=5173 BASE_PATH=/ \
pnpm --filter @workspace/commandcentre build
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

Log in, then open `/strategist`.
