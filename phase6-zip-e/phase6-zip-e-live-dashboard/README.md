# Phase 6 ZIP E — Live Executive Dashboard & Validation

Final Phase 6 package before Git commit and push.

## Adds
- Fully live Executive Dashboard
- Real incident metrics
- Platform and threat distribution
- Response SLA monitor
- Top issues and team workload
- Approval backlog
- Phase 6 validation endpoint at `/api/phase6-health`

## Install
```bash
unzip Phase6-Zip-E-Live-Dashboard-Validation.zip -d phase6-zip-e
node phase6-zip-e/phase6-zip-e-live-dashboard/install-phase6-zip-e.mjs
```

## Build
```bash
pnpm --filter @workspace/api-server build
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
```

## Test
```bash
curl -s http://localhost:3001/api/phase6-health | python -m json.tool
```
