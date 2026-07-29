# Makueni Command Centre — Phase 3

This package integrates Phase 3 into the existing `makueni-v1` codebase.

## Included
- Existing User Admin and Super Admin management
- Role-based access control and permission matrix
- Geographic user scope controls
- Two-person token approval workflow with self-approval prevention
- Approval event history and audit logging
- Document folders, uploads, checksums, search, download and archive controls
- Optional document publication approval
- Responsive Governance page
- Production self-healing table creation plus SQL migration

## Upload and push
Extract this ZIP over the repository root, then run:

```bash
pnpm install
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server typecheck
PORT=5174 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
git add .
git commit -m "Complete Phase 3 governance, approvals and document control"
git push origin makueni-v1
```

## Render note
Local file uploads on Render's ephemeral disk can disappear after a redeploy. The metadata, audit trail and approval records remain in PostgreSQL. For permanent production files, connect an object-storage provider later and set `storageType/storageUrl` accordingly.

## AI
No AI code was changed. AI remains optional and can be re-enabled after API billing is configured.
