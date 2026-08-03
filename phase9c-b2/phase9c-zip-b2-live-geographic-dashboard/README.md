# Phase 9C ZIP B.2 — Live Geographic Dashboard

This automatic patch replaces the Geographic Intelligence shell with live constituency analytics.

It consumes the `constituencies` array added by ZIP B.1 to:

```text
GET /api/dashboard-intelligence/overview
```

## Features

- All six Makueni constituencies
- Constituents
- Phone readiness
- Women, men and youth
- Ward and polling-station coverage
- Strong, leaning, undecided and opposed support
- Constituency readiness
- Executive geographic rankings
- Click-through to the Campaign Database with a constituency filter

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase9C-Zip-B2-Live-Geographic-Dashboard.zip \
  -d phase9c-b2

node \
  phase9c-b2/phase9c-zip-b2-live-geographic-dashboard/install-phase9c-b2.mjs
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

Open Analytics Hub → Geographic Intelligence.

Click a constituency card and confirm the Campaign Database opens with the constituency query parameter.
