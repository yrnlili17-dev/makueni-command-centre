# Phase 10A ZIP C — Resource Allocation & Ward Opportunity

This automatic package extends the working Chief Strategist with ward-level deployment intelligence.

## Backend

Adds:

- `GET /api/strategist/resource-allocation`
- `POST /api/strategist/resource-allocation/:ward/action`

The engine calculates:

- opportunity score
- risk score
- recommended volunteers
- recommended field visits
- messaging priority
- contact recovery priority
- support classification priority

## Frontend

Adds:

- ranked ward allocation cards
- live deployment recommendations
- Ask Strategist button
- Add to Action Queue button

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase10A-Zip-C-Resource-Allocation-Ward-Opportunity.zip \
  -d phase10a-c

node \
  phase10a-c/phase10a-zip-c-resource-allocation-ward-opportunity/install-phase10a-c.mjs
```

## Build

```bash
pnpm --filter @workspace/api-server build

PORT=5173 BASE_PATH=/ \
pnpm --filter @workspace/commandcentre build
```

## Restart

Restart backend on port 3001 and frontend on port 5173, log in, and open `/strategist`.
