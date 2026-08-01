# Phase 6 — ZIP C: Local Intelligence Engine

This package provides a no-API-key intelligence engine for the Makueni Command Centre.

## Capabilities

- Local sentiment scoring.
- Threat classification.
- Confidence scoring.
- Topic detection.
- Recommended action:
  - ignore
  - monitor
  - respond
  - escalate
- Risk flags:
  - legal review
  - security escalation
  - hate-speech risk
  - unverified claim
  - minor safety
- Key phrase extraction.
- Three response options:
  - factual
  - community
  - firm
- Platform-aware character limits.
- Batch analysis of existing narrative mentions.
- Local narrative brief.

## Endpoints

```text
POST /api/local-intelligence/analyse
POST /api/local-intelligence/mentions/:id/analyse
GET  /api/local-intelligence/brief
POST /api/local-intelligence/batch-analyse
```

## Install

From the repository root:

```bash
unzip Phase6-Zip-C-Local-Intelligence-Engine.zip -d phase6-zip-c
node phase6-zip-c/phase6-zip-c-local-ai/install-phase6-zip-c.mjs
```

## Build

```bash
pnpm --filter @workspace/api-server build
```

## Restart backend

```bash
fuser -k 3001/tcp 2>/dev/null || true

set -a
source .env
set +a

export PORT=3001

pnpm --filter @workspace/api-server dev
```

## Test one analysis

```bash
curl -s -X POST \
  http://localhost:3001/api/local-intelligence/analyse \
  -H 'Content-Type: application/json' \
  -d '{
    "content":"Unverified corruption claims are circulating about a county roads project.",
    "platform":"Twitter/X",
    "engagementCount":1200,
    "duplicateCount":4
  }' | python -m json.tool
```

## Generate a brief

```bash
curl -s http://localhost:3001/api/local-intelligence/brief \
  | python -m json.tool
```

## Analyse existing mentions

```bash
curl -s -X POST \
  http://localhost:3001/api/local-intelligence/batch-analyse \
  -H 'Content-Type: application/json' \
  -d '{"limit":50}' \
  | python -m json.tool
```

No OpenAI, Gemini, Claude or other model key is required.
