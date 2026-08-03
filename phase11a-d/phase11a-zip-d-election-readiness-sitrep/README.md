# Phase 11A ZIP D — Election Readiness SITREP

This package completes the Phase 11A Election Operations Centre.

## Adds

- overall election-readiness score
- station readiness
- poll-opening rate
- agent coverage
- vehicle readiness
- observer coverage
- incident health
- executive findings
- command recommendations
- ward readiness annex
- downloadable text report
- print support

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase11A-Zip-D-Election-Readiness-SITREP.zip \
  -d phase11a-d

node \
  phase11a-d/phase11a-zip-d-election-readiness-sitrep/install-phase11a-d.mjs
```

## Build

```bash
PORT=5173 BASE_PATH=/ \
pnpm --filter @workspace/commandcentre build
```

Restart the frontend, log in, and open `/election-war-room`.
