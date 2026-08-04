# Phase 11B ZIP E — Polling Station Command Centre

Completes the Phase 11B polling-station command layer.

## Features

- county polling KPIs
- live station reporting
- hourly turnout reporting
- ward polling risk
- queue monitoring
- incident monitoring
- logistics resources
- 30-second auto-refresh
- responsive layouts for:
  - phones
  - tablets
  - laptops
  - desktop monitors
  - large command-centre screens
  - megascreens

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase11B-Zip-E-Polling-Station-Command-Centre.zip \
  -d phase11b-e

node \
  phase11b-e/phase11b-zip-e-polling-station-command-centre/install-phase11b-e.mjs
```

## Build

```bash
pnpm --filter @workspace/api-server build

PORT=5173 BASE_PATH=/ \
pnpm --filter @workspace/commandcentre build
```

Restart backend and frontend, log in, and open `/turnout`.
