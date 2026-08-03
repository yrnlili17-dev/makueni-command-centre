# Phase 11A ZIP C — Live Election Command Board

This package adds a live command layer above the working Phase 11A Election Operations Centre.

## Adds

- 30-second automatic refresh
- automatic refresh pause and resume
- operations health score
- station readiness
- polling-station opening rate
- agent coverage
- vehicle readiness
- observer coverage
- incident health
- executive alert banner
- missing-agent detection
- unopened-station detection
- low-readiness ward alerts
- vehicle and observer warnings
- ward readiness heat table
- live operations timeline

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase11A-Zip-C-Live-Election-Command-Board.zip \
  -d phase11a-c

node \
  phase11a-c/phase11a-zip-c-live-election-command-board/install-phase11a-c.mjs
```

## Build

```bash
PORT=5173 BASE_PATH=/ \
pnpm --filter @workspace/commandcentre build
```

Restart the frontend, log in, and open `/election-war-room`.
