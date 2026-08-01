# Phase 6 — ZIP B: Frontend Incident Operations UI

Requires Phase 6 ZIP A backend.

## Adds

- New `INCIDENT OPS` tab in Narrative Command.
- Live incident metrics.
- Incident table with:
  - incident ID
  - source
  - threat level
  - recommended action
  - confidence
  - duplicate count
  - estimated reach
  - assignment
  - status
- Incident detail drawer.
- Original post context.
- Assignment and due date.
- Operational status updates.
- Multi-channel response generation without API keys.
- Copy buttons for Twitter/X, Facebook, WhatsApp, SMS, press statements and rally talking points.
- Full incident timeline.

## Install

From the repository root:

```bash
unzip Phase6-Zip-B-Frontend-Incident-Ops.zip -d phase6-zip-b
node phase6-zip-b/phase6-zip-b-frontend/install-phase6-zip-b.mjs
```

## Build

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
```

## Restart frontend

```bash
fuser -k 5173/tcp 2>/dev/null || true
export PORT=5173
export BASE_PATH=/
pnpm --filter @workspace/commandcentre dev
```

Keep the Phase 6 backend running on port 3001.

Open:

```text
http://localhost:5173/intelligence
```

Then select `INCIDENT OPS`.
