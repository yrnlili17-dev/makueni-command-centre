# Combined Phase 11–13 — Election War Room, Public Campaign Portal and Production Centre

## Included

### Phase 11 — Election War Room
- County election overview
- Polling-station agent reports
- Turnout and incident reporting
- Result capture and verification status
- Form/reference document tracking
- Responsive phone, tablet and desktop screens

### Phase 12 — Public Campaign Portal
- Public candidate/campaign landing page
- Manifesto priorities
- Campaign updates
- Events and volunteer call-to-action
- Public API endpoints for published content
- Public route: `/campaign`

### Phase 13 — Production & Enterprise Centre
- Deployment health checklist
- Security and backup register
- Operational incident register
- Environment readiness dashboard
- API health checks and production status

## Installation

```bash
cd /workspaces/makueni-command-centre
unzip -o Makueni_Command_Centre_Phase11_12_13.zip
node install-phase111213.mjs

source .env
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server build
PORT=5174 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
```

## Commit

Do not commit `.env`.

```bash
git add artifacts lib migrations PHASE11_12_13_INSTALL.md install-phase111213.mjs
git commit -m "Complete Phase 11-13 election public portal and production"
git push origin makueni-v1
```

## New routes

- `/war-room`
- `/production-centre`
- `/campaign` — public campaign portal

## New API routes

- `/api/final-release/war-room/*`
- `/api/final-release/public/*`
- `/api/final-release/production/*`
