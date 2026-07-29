# Combined Phase 8–10 — Data, Smart Assist and GIS

## Included
- Robust quoted-CSV parser fix for Constituent Database uploads.
- Data Management Centre with import preview, header normalization and row-level error report.
- Smart Assist Level 2: public Google News RSS listening, search launchers for Google/X/Facebook/TikTok/YouTube, repeated-topic counts.
- Campaign Workspaces stored in PostgreSQL with saved sources.
- Responsive GIS & Coverage Centre using wards and shared geographic keys; no paid maps API required.

## Honest capability boundary
Without official social platform APIs, Smart Assist cannot continuously scrape private or restricted social-network data. It searches public news automatically and launches public searches on social platforms. Sources can be saved into Campaign Workspaces. This architecture is ready for official APIs or an AI model later.

## Install
```bash
cd /workspaces/makueni-command-centre
unzip -o Makueni_Command_Centre_Phase8_9_10.zip
node install-phase8910.mjs
source .env
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server build
PORT=5174 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
```

## Commit
Never commit `.env`.
```bash
git add artifacts lib migrations PHASE8_9_10_INSTALL.md install-phase8910.mjs
git commit -m "Complete Phase 8-10 data Smart Assist and GIS"
git push origin makueni-v1
```

## New routes
- `/smart-assist`
- `/data-centre`
- `/gis-centre`
