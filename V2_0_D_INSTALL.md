# Makueni Command Centre V2.0-D

## Production Hardening and Final Responsive Polish

This is the fourth controlled Version 2.0 package.

### Included

- Production readiness dashboard
- Live environment diagnostics API
- Database, port and production-mode checks
- Application-wide reusable error boundary component
- Automated frontend and backend verification script
- Deployment rules and security checklist
- Responsive readiness guidance
- No database schema changes
- No fragile database imports

## Install

```bash
cd /workspaces/makueni-command-centre

unzip -o Makueni_Command_Centre_V2_0_D_Production_Hardening.zip

node install-v2-0-d.mjs
```

## Verify before committing

```bash
node scripts/verify-production.mjs
```

This command builds both workspaces and stops if either one fails.

## Manual build alternative

```bash
pnpm --filter @workspace/api-server build
```

```bash
PORT=5174 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
```

## Commit only after successful verification

```bash
git add artifacts scripts install-v2-0-d.mjs V2_0_D_INSTALL.md

git commit -m "V2.0-D production hardening"

git push origin makueni-v1
```

Do not commit:

- `.env`
- `api-build-error.txt`
- credentials
- database exports
- generated build output

## New route

`/production-readiness`

## New API endpoint

`/api/production-readiness`

## Final deployment test

1. Wait for Render to finish deploying.
2. Refresh using `Ctrl + Shift + R`.
3. Open `/production-readiness`.
4. Confirm the environment checks.
5. Test Smart Assist, GIS Intelligence and Election War Room.
6. Test navigation and forms on a phone.
7. From this point forward, use small stabilization and bug-fix releases.
