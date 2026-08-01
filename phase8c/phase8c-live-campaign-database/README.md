# Phase 8C — Live Campaign Database

Connects Phase 8A/8B imported records to the campaign application.

## What it changes

### Identity Graph
- Live imported constituent total.
- Search by name, phone, National ID, village and polling station.
- Ward, constituency, gender and support filters.
- Constituent profile drawer.
- Consent controls.
- Support classification.
- Notes.
- Interaction timeline.

### Constituent Database
- Uses the same master `campaign_constituents` table.
- Pagination.
- Live filters.
- Full constituent details.

### Audience Segmentation
Automatically calculates:

- Women
- Men
- Youth 18–35
- Phone Ready
- Email Ready
- SMS Consented
- WhatsApp Consented
- Strong Supporters
- Undecided
- Missing Phone
- Missing Ward
- One segment for every imported ward

## Installation

```bash
unzip Phase8C-Live-Campaign-Database.zip -d phase8c
node phase8c/phase8c-live-campaign-database/install-phase8c.mjs
```

## Build

```bash
pnpm --filter @workspace/api-server build
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
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

## Restart frontend

```bash
fuser -k 5173/tcp 2>/dev/null || true
export PORT=5173
export BASE_PATH=/
pnpm --filter @workspace/commandcentre dev
```

## Health test

```bash
curl -s http://localhost:3001/api/campaign-database/health \
  | python -m json.tool
```

## Important

The Phase 8B import must finish successfully before these pages can display imported records.

Check the import job:

```bash
curl -s \
  http://localhost:3001/api/data-import/jobs/JOB_ID/status \
  | python -m json.tool
```

The status should be `completed`.
