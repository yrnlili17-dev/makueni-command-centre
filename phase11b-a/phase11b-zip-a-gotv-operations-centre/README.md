# Phase 11B ZIP A — GOTV Operations Centre

Adds a GOTV command layer to the existing turnout and volunteer systems.

## Install

```bash
cd ~/Projects/makueni-command-centre
unzip Phase11B-Zip-A-GOTV-Operations-Centre.zip -d phase11b-a
node phase11b-a/phase11b-zip-a-gotv-operations-centre/install-phase11b-a.mjs
```

## Build

```bash
pnpm --filter @workspace/api-server build
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
```

Restart backend and frontend, log in, then open `/turnout`.
