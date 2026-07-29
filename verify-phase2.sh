#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
echo "Checking legacy geography/branding..."
! grep -RInE 'Stephen Mule|Hon\. Mule|Mwanamule|Matungulu|Tala' artifacts/api-server/src artifacts/commandcentre/src --exclude='*.map'
echo "Checking Phase 2 files..."
test -f artifacts/api-server/src/routes/approvals.ts
test -f artifacts/api-server/src/routes/contacts.ts
test -f artifacts/api-server/src/routes/integrations.ts
test -f lib/db/migrations/0002_phase2_governance_rbac_contacts.sql
echo "Phase 2 static checks passed."
