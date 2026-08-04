# Phase 11B ZIP B — Household Canvassing & Contact Centre

This package makes the Phase 11B GOTV Operations Centre interactive.

## Adds

- household visit capture
- support status capture
- follow-up flagging
- call, SMS and WhatsApp queue creation
- voter transport request capture
- ward GOTV target configuration
- live household, contact and transport tables
- automatic refresh after every saved operation

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase11B-Zip-B-Household-Canvassing-Contact-Centre.zip \
  -d phase11b-b

node \
  phase11b-b/phase11b-zip-b-household-canvassing-contact-centre/install-phase11b-b.mjs
```

## Build

```bash
PORT=5173 BASE_PATH=/ \
pnpm --filter @workspace/commandcentre build
```

Restart the frontend, log in, and open `/turnout`.
