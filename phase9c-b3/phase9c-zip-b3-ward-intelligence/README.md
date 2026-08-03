# Phase 9C ZIP B.3 — Ward Intelligence

Automatic installer for live ward analytics.

## Adds

- all imported wards; removes the previous 12-row limit
- constituency per ward
- phone and email readiness
- women, men and youth
- polling-station count
- support classification
- ward readiness score
- ward search and constituency filtering
- filtered Campaign Database navigation
- executive ward rankings
- zero-data labels for unimported constituencies

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase9C-Zip-B3-Ward-Intelligence.zip -d phase9c-b3

node   phase9c-b3/phase9c-zip-b3-ward-intelligence/install-phase9c-b3.mjs
```

## Build

```bash
pnpm --filter @workspace/api-server build

PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
```

## Test API

```bash
curl -s http://localhost:3001/api/dashboard-intelligence/overview   | python -c '
import json,sys
data=json.load(sys.stdin)
print("wards:", len(data.get("wards", [])))
for row in data.get("wards", []):
    print(row.get("ward"), row.get("constituents"), row.get("ward_readiness"))
'
```
