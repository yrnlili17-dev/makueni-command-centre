# Phase 9B.3 — Candidate Readiness and Executive Reporting

This package adds a weighted executive readiness centre above the existing Candidate Readiness checklist.

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase9B3-Candidate-Readiness-Executive-Reporting.zip -d phase9b3

node \
  phase9b3/phase9b3-candidate-readiness-reporting/install-phase9b3.mjs
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

## Test

Open Campaign Countdown and select `Candidate Readiness`.

Verify:

- Weighted readiness percentage appears.
- Domain-level scores display.
- Completed, in-progress and assigned counts are correct.
- High and critical incomplete actions appear first.
- Print opens print preview.
- Download Briefing creates a text executive report.
