# Phase 9C ZIP C.1 — Executive Campaign Scorecard

This automatic installer adds an Executive Scorecard tab to Analytics Hub.

## Live inputs

- `/api/dashboard-intelligence/overview`
- `/api/campaign-plan/readiness`

## Adds

- weighted campaign health score
- campaign readiness
- CRM quality
- contact coverage
- geographic coverage
- support intelligence
- field operations
- campaign momentum
- executive summary
- prioritized rule-based recommendations
- one-click navigation to key campaign modules

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase9C-Zip-C1-Executive-Campaign-Scorecard.zip \
  -d phase9c-c1

node \
  phase9c-c1/phase9c-zip-c1-executive-campaign-scorecard/install-phase9c-c1.mjs
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

Open Analytics Hub and select `EXECUTIVE SCORECARD`.
