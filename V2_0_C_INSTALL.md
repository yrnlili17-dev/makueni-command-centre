# Makueni Command Centre V2.0-C

## Election War Room

This package installs the Election War Room foundation without adding fragile
database imports. It is designed to build safely on the current repository.

### Included

- Election-day command dashboard
- Turnout overview
- Polling-station reporting table
- Agent assignment and check-in status
- Incident monitoring and escalation view
- Parallel tally and verification view
- Result status: submitted, verified or disputed
- Opening checklist
- Tally control rules
- Incident escalation rules
- Responsive phone, tablet and desktop interface
- Secure JSON API route
- Foundation-mode notice until production tables are activated

### Important

V2.0-C intentionally does not create or import new database tables. This avoids
the export mismatch that affected the first V2.0-B build. The interface and API
foundation are installed now; live persistence will be connected during V2.0-D
after the production schema is verified.

## Installation

Upload the ZIP into:

`/workspaces/makueni-command-centre`

Run:

```bash
cd /workspaces/makueni-command-centre

unzip -o Makueni_Command_Centre_V2_0_C_Election_War_Room.zip

node install-v2-0-c.mjs
```

## Build

```bash
pnpm --filter @workspace/api-server build
```

```bash
PORT=5174 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
```

Do not commit until both builds succeed.

## Commit

```bash
git add artifacts install-v2-0-c.mjs V2_0_C_INSTALL.md

git commit -m "V2.0-C Election War Room"

git push origin makueni-v1
```

Do not commit `.env`, `api-build-error.txt` or build output.

## New route

`/election-war-room`

## New API route

`/api/election-war-room`

## Test

1. Wait for Render deployment.
2. Refresh with `Ctrl + Shift + R`.
3. Open `/election-war-room`.
4. Confirm the summary cards and three operational views load.
5. Test the page on a phone.
