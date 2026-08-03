# Phase 9C ZIP C.3 — Executive Decision Centre

This package activates the existing `INTELLIGENCE` tab in Analytics Hub.

## Adds

- prioritized executive decisions
- risk-ranked campaign actions
- weakest ward ranking
- high-opportunity ward ranking
- resource deployment guidance
- campaign-plan escalation
- CRM recovery priorities
- support-classification priorities
- volunteer and messaging alerts
- one-click operational navigation

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase9C-Zip-C3-Executive-Decision-Centre.zip \
  -d phase9c-c3

node \
  phase9c-c3/phase9c-zip-c3-executive-decision-centre/install-phase9c-c3.mjs
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

Open Analytics Hub → Intelligence.
