# Makueni Command Centre V2.0-B

## GIS and Campaign Intelligence

This is the second controlled Version 2.0 package.

### Included

- Ward-level campaign intelligence dashboard
- Contact concentration by ward
- Constituency and ward search
- Polling-station coverage
- Volunteer and event readiness
- Coverage score for each ward
- Low, medium and high risk classification
- Priority ward list
- Recommended field actions
- Responsive phone, tablet and desktop layout
- JSON-safe API handling
- No paid map API required

The first version uses a responsive ward intelligence grid rather than a paid mapping provider. This keeps the system functional without Google Maps or Mapbox keys. Real geographic boundaries can be added later using local GeoJSON or OpenStreetMap.

## Installation

Upload the ZIP into:

`/workspaces/makueni-command-centre`

Then run:

```bash
cd /workspaces/makueni-command-centre

unzip -o Makueni_Command_Centre_V2_0_B_GIS_Intelligence.zip

node install-v2-0-b.mjs
```

## Build

```bash
pnpm --filter @workspace/api-server build

PORT=5174 BASE_PATH=/ \
pnpm --filter @workspace/commandcentre build
```

## Commit

```bash
git add artifacts install-v2-0-b.mjs V2_0_B_INSTALL.md

git commit -m "V2.0-B GIS and campaign intelligence"

git push origin makueni-v1
```

Do not commit `.env`.

## New route

`/gis-intelligence`

## New API routes

- `/api/gis-intelligence/summary`
- `/api/gis-intelligence/wards`

## Testing

After Render deploys:

1. Refresh using `Ctrl + Shift + R`.
2. Open `/gis-intelligence`.
3. Confirm contacts and wards are populated from the live database.
4. Search for a ward.
5. Check the page on a phone.

## Next packages

- V2.0-C — Election War Room
- V2.0-D — Production hardening and final responsive polish
