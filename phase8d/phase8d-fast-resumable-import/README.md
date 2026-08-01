# Phase 8D — Fast Resumable Import Worker

This package replaces the slow row-by-row synchronous import request with a background batch worker.

## Improvements

- Imports up to 1,000 records per database batch by default.
- Start endpoint returns immediately.
- Live counters update after every batch.
- Pause.
- Resume.
- Cancel.
- Continues from unprocessed staging rows.
- Already imported rows are not processed again.
- Safe after a backend restart: call `resume`.
- Supports update or skip policy.
- Supports importing or excluding warning rows.

## Important: current import

Your current Phase 8A import must be stopped before installing this package because installation requires rebuilding and restarting the backend.

Stopping the backend does not delete the records already imported. Phase 8D resumes from rows whose `import_action` is still empty.

## Install

```bash
unzip Phase8D-Fast-Resumable-Import.zip -d phase8d
node phase8d/phase8d-fast-resumable-import/install-phase8d.mjs
```

Build:

```bash
pnpm --filter @workspace/api-server build
```

Restart backend:

```bash
fuser -k 3001/tcp 2>/dev/null || true
set -a
source .env
set +a
export PORT=3001
pnpm --filter @workspace/api-server dev
```

## Resume the current job

```bash
curl -s -X POST \
  http://localhost:3001/api/data-import/jobs/f33879ea-ab9e-4706-aaf7-6c873c517c30/resume \
  -H 'Content-Type: application/json' \
  -d '{
    "duplicatePolicy": "update",
    "importWarnings": true,
    "batchSize": 1000
  }' | python -m json.tool
```

## Watch progress

```bash
watch -n 5 "curl -s http://localhost:3001/api/data-import/jobs/f33879ea-ab9e-4706-aaf7-6c873c517c30/status | python -c 'import sys,json; d=json.load(sys.stdin); print(\"status:\",d[\"status\"],\"imported:\",d[\"imported_rows\"],\"updated:\",d[\"updated_rows\"],\"skipped:\",d[\"skipped_rows\"],\"error:\",d[\"error_message\"])'"
```

## Pause

```bash
curl -s -X POST \
  http://localhost:3001/api/data-import/jobs/JOB_ID/pause \
  | python -m json.tool
```

## Resume

```bash
curl -s -X POST \
  http://localhost:3001/api/data-import/jobs/JOB_ID/resume \
  -H 'Content-Type: application/json' \
  -d '{"batchSize":1000}' \
  | python -m json.tool
```

## Cancel

```bash
curl -s -X POST \
  http://localhost:3001/api/data-import/jobs/JOB_ID/cancel \
  | python -m json.tool
```

## Phase 8C

Phase 8C can be installed after Phase 8D. It reads the same `campaign_constituents` table and will show whatever has already been imported. Counts increase as the worker progresses.
