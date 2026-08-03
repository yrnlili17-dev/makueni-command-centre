# Phase 9C ZIP C.2 — Trend & Performance Analytics

This package activates the existing `GROWTH` tab in Analytics Hub.

## Adds

- 7-day, 30-day, 90-day and all-time filters
- import growth trend
- cumulative constituent growth
- phone-coverage KPI
- support-classification KPI
- campaign-readiness KPI
- ward performance comparison
- constituency performance comparison
- live refresh

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase9C-Zip-C2-Trend-Performance-Analytics.zip \
  -d phase9c-c2

node \
  phase9c-c2/phase9c-zip-c2-trend-performance-analytics/install-phase9c-c2.mjs
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

Open Analytics Hub → Growth.
