# Phase 11A ZIP B — Election Operations Control Forms

This package makes the Phase 11A Election Operations Centre fully interactive.

## Adds

- polling-station opening checklist
- materials confirmation
- device readiness
- connectivity readiness
- presiding officer confirmation
- agent assignment form
- vehicle deployment form
- observer assignment form
- incident escalation form
- automatic refresh after each operation

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase11A-Zip-B-Election-Operations-Control-Forms.zip \
  -d phase11a-b

node \
  phase11a-b/phase11a-zip-b-election-operations-control-forms/install-phase11a-b.mjs
```

## Build

```bash
PORT=5173 BASE_PATH=/ \
pnpm --filter @workspace/commandcentre build
```

Restart the frontend and open `/election-war-room`.
