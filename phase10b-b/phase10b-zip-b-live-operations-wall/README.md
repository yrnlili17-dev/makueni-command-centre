# Phase 10B ZIP B — Live Operations Wall

This package upgrades the War Room with a real-time operational feed.

## Backend

Adds:

- `GET /api/command-centre/operations-wall`
- `POST /api/command-centre/operations-wall`
- automatic `war_room_feed` table

The feed combines:

- field incidents
- campaign events
- Chief Strategist actions
- manual war-room updates

## Frontend

Adds:

- live operations wall
- incident filter
- event filter
- strategist-action filter
- severity and status indicators
- automatic refresh every 30 seconds
- legacy Election War Room shortcut

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase10B-Zip-B-Live-Operations-Wall.zip -d phase10b-b

node \
  phase10b-b/phase10b-zip-b-live-operations-wall/install-phase10b-b.mjs
```

## Build

```bash
pnpm --filter @workspace/api-server build

PORT=5173 BASE_PATH=/ \
pnpm --filter @workspace/commandcentre build
```

Restart backend and frontend, log in, then open `/war-room`.
