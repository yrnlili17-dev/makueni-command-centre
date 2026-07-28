---
name: Drizzle push is interactive — don't rely on it
description: Why `db run push` blocks in this env and the self-healing table pattern to use instead
---

`pnpm --filter @workspace/db run push` frequently blocks on drizzle-kit's
interactive prompts (e.g. `promptNamedWithSchemasConflict` — "is this table new
or renamed?") and errors out because the environment can't feed it stdin. This
has bitten multiple tasks. Do NOT retry it hoping for a different result.

**How to apply — adding a new table:**
1. Add the Drizzle schema as normal.
2. For dev: create the table directly with `psql "$DATABASE_URL" -c 'CREATE TABLE IF NOT EXISTS ...'` using DDL that matches the schema exactly.
3. For prod: add an idempotent `ensureXTable()` DDL helper and call it from the boot-time `ensureSeeded()` path in `artifacts/api-server/src/lib/seed.ts`.

**Why:** Production is autoscale with no Drizzle migration files, so schema must
be self-healing at boot. The same pattern was used for the auth tables. This
sidesteps the interactive push entirely and keeps dev + prod in sync.
