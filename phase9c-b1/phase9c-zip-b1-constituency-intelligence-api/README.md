# Phase 9C ZIP B.1 — Constituency Intelligence API

This automatic patch extends:

```text
GET /api/dashboard-intelligence/overview
```

with live constituency-level analytics from `campaign_constituents`.

## Returned constituency fields

- constituency
- constituents
- phone_ready
- email_ready
- women
- men
- youth
- wards
- polling_stations
- strong_support
- leaning_support
- undecided
- opposed
- missing_phone
- missing_ward
- constituency_readiness

The readiness score is calculated from:

- phone completeness: 60%
- ward completeness: 40%

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase9C-Zip-B1-Constituency-Intelligence-API.zip \
  -d phase9c-b1

node \
  phase9c-b1/phase9c-zip-b1-constituency-intelligence-api/install-phase9c-b1.mjs
```

## Build backend

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

## Test

```bash
curl -s \
  http://localhost:3001/api/dashboard-intelligence/overview \
  | python -c '
import json,sys
data=json.load(sys.stdin)
print(json.dumps(data.get("constituencies", []), indent=2))
'
```

You should receive one object per constituency present in the live database.
