# Phase 8A ZIP A — Enterprise Import Backend

This package adds the backend foundation for the Campaign Data Intelligence pipeline.

## Built for the supplied datasets

The field detector includes mappings for files shaped like:

### MAKUENI.xlsx / Final Data.csv

```text
first_name
last_name
phone
email
ward
constituency
county
national_id
dob
gender
```

### DATA BANK.xlsx

It detects headers even when they begin on row 4 and recognises variations such as:

```text
S/NO
ID/NO
ID NO.
IDNO
NAME
FULL NAME
TRIBE
GENDER
DATE OF BIRTH
EDUC.
EDU
L.O.E
COUNTY
```

## Features

- CSV, XLSX and XLS parsing.
- Multi-sheet Excel support.
- Automatic header-row detection.
- Automatic column mapping.
- Duplicate detection by National ID and phone.
- Kenyan phone normalisation.
- National ID validation.
- DOB conversion, including Excel date serials.
- Staging tables.
- Validation errors and warnings.
- Preview endpoint.
- Import with update-or-skip duplicate policy.
- Master `campaign_constituents` table.
- Import jobs, progress and reports.
- Automatic database table creation.

## Important privacy note

These files contain personal information. Keep the repository private, do not commit source data, and restrict access to the imported database.

## Installation

```bash
unzip Phase8A-Zip-A-Enterprise-Import-Backend.zip -d phase8a-zip-a
node phase8a-zip-a/phase8a-zip-a-backend/install-phase8a-zip-a.mjs
```

Install the new dependency:

```bash
pnpm install
```

Build:

```bash
pnpm --filter @workspace/api-server build
```

Restart the backend on port 3001.

## Validate health

```bash
curl -s http://localhost:3001/api/data-import/health \
  | python -m json.tool
```

Expected:

```json
{
  "status": "ok",
  "engine": "phase8a-enterprise-import",
  "supportedFiles": ["csv", "xlsx", "xls"]
}
```

## Upload using curl

The endpoint uses a raw binary body so no multipart dependency is required.

### CSV

```bash
curl -s -X POST \
  http://localhost:3001/api/data-import/upload \
  -H 'Content-Type: text/csv' \
  -H 'x-file-name: Final Data(2).csv' \
  --data-binary '@/path/to/Final Data(2).csv' \
  | python -m json.tool
```

### Excel

```bash
curl -s -X POST \
  http://localhost:3001/api/data-import/upload \
  -H 'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' \
  -H 'x-file-name: MAKUENI.xlsx' \
  --data-binary '@/path/to/MAKUENI.xlsx' \
  | python -m json.tool
```

The upload response returns one import job per non-empty worksheet.

## Workflow

```text
Upload
  ↓
Detect headers and worksheets
  ↓
Map columns
  ↓
Validate
  ↓
Preview
  ↓
Start import
  ↓
Constituent master database
```

## API workflow example

After upload, copy the returned job ID.

### Apply suggested mapping

The upload response includes `suggested_mapping`. Submit it as:

```bash
curl -s -X PUT \
  http://localhost:3001/api/data-import/jobs/JOB_ID/map \
  -H 'Content-Type: application/json' \
  -d '{"mapping":{"first_name":"first_name","last_name":"last_name"}}'
```

The Phase 8A frontend wizard will automate this in ZIP B.

### Validate

```bash
curl -s -X POST \
  http://localhost:3001/api/data-import/jobs/JOB_ID/validate \
  -H 'Content-Type: application/json' \
  -d '{}' | python -m json.tool
```

### Preview

```bash
curl -s \
  'http://localhost:3001/api/data-import/jobs/JOB_ID/preview?limit=20' \
  | python -m json.tool
```

### Import

```bash
curl -s -X POST \
  http://localhost:3001/api/data-import/jobs/JOB_ID/start \
  -H 'Content-Type: application/json' \
  -d '{"duplicatePolicy":"update","importWarnings":true}' \
  | python -m json.tool
```
