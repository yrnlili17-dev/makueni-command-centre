# Makueni Command Centre — Phase 2 Update

Included: backend action permissions, geographic assignments, approval tokens with no self-approval, Makueni geography cleanup, contact normalization/deduplication, integration readiness endpoints, database migration, responsive phone/tablet layout and glow.

## Required deployment actions
1. Set DATABASE_URL and SESSION_SECRET.
2. Run `pnpm --filter @workspace/db run push` (or apply `lib/db/migrations/0002_phase2_governance_rbac_contacts.sql`).
3. Set provider credentials only in Render environment variables.
4. Build and run the app.

Live SMS, email, AI, Meta, X, WhatsApp and M-Pesa calls remain disabled until valid credentials and provider-specific approval are supplied. The `/api/integrations/status` endpoint reports configuration readiness without exposing secrets.
