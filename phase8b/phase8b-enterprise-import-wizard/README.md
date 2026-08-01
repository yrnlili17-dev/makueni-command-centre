# Phase 8B — Enterprise Import Wizard

This package replaces the current Data Management upload screen with a complete six-step import wizard.

## Requires

Phase 8A ZIP A backend must already be installed and working.

Validate first:

```bash
curl -s http://localhost:3001/api/data-import/health | python -m json.tool
```

## Features

1. Drag-and-drop CSV/XLSX/XLS upload.
2. Automatic file and worksheet detection.
3. Automatic column mapping.
4. Editable campaign-field mappings.
5. Validation summary:
   - valid
   - warnings
   - invalid
   - duplicates
6. Searchable preview table.
7. Update-or-skip duplicate policy.
8. Option to include or exclude warning rows.
9. Import completion report.
10. Recent import history.
11. Live constituent total.

## Install

```bash
unzip Phase8B-Enterprise-Import-Wizard.zip -d phase8b
node phase8b/phase8b-enterprise-import-wizard/install-phase8b.mjs
```

## Build

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
```

## Restart

Backend terminal:

```bash
fuser -k 3001/tcp 2>/dev/null || true
set -a
source .env
set +a
export PORT=3001
pnpm --filter @workspace/api-server dev
```

Frontend terminal:

```bash
fuser -k 5173/tcp 2>/dev/null || true
export PORT=5173
export BASE_PATH=/
pnpm --filter @workspace/commandcentre dev
```

Open the Data Management Centre from the sidebar.

## Recommended first test

Use `MAKUENI.xlsx`.

The existing detected job may already appear in Recent Imports. You can open it and continue from mapping or validation instead of uploading the file again.
