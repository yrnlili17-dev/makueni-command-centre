# Makueni Command Centre — Combined Phase 4, 5 & 6

This package extends Phase 3 without replacing authentication, Supabase, approvals, documents or existing campaign modules.

## Added
- Executive Command Centre with live summaries
- Operations Hub for field tasks and incidents
- Communications & Intelligence Hub for verified briefs
- Executive Reporting register
- Notification, volunteer check-in and reporting database foundations
- `/api/command-centre/*` API routes
- Drizzle schema and SQL migration

## Install in Codespaces
```bash
cd /workspaces/makueni-command-centre
unzip -o Makueni_Command_Centre_Phase4_5_6_Combined.zip -d .
source .env
pnpm install
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server build
PORT=5174 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
git add .
git commit -m "Integrate combined Phase 4 5 and 6 command centre"
git push origin makueni-v1
```

## Render
Deploy the latest commit on the existing Render services. Render supplies `PORT` automatically. Keep `DATABASE_URL` in Render Environment and do not commit `.env`.

## New pages
- `/executive-command`
- `/operations-hub`
- `/communications-hub`
- `/reports-hub`

The final UDA-inspired colour modernization is intentionally deferred until functional verification is complete.
