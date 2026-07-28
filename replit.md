# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

- **Contact Extractor** (`contact-extractor` artifact, served at `/extractor/`): standalone Streamlit (Python) tool. Upload raw polling CSV/Excel sheets; it auto-detects columns + scans free text to mine names (title-cased), Kenyan mobile numbers (normalized to `+254#########`), emails, age, and location; validates with regex; and exports a cleaned contacts CSV. Pure mining logic lives in `extractor.py` (Streamlit-free, unit-testable); `app.py` is the UI. Runs streamlit under `--server.baseUrlPath extractor` behind the shared proxy. This is the only Python artifact — it is NOT part of the pnpm/TS build.
- **Speech & Manifesto Generator** (commandcentre `/speeches`, API `/api/speeches`): AI drafting of campaign speeches (by occasion/audience/ward/language/tone/length) and the full official manifesto (vision preamble + 4 campaign pillars + closing pledge). Because the prod AI proxy caps non-streaming output ~350 tokens, both are generated **section-by-section via parallel `chat.completions` calls** (the `generate-swot` pattern) then assembled server-side — a speech is 3 sections, a manifesto 6. Endpoints enforce completeness (any empty section → 502) and carry an in-flight lock + 12s per-IP cooldown to prevent AI credit-burn (public routes, matching the rest of the API). Generated docs save to `generated_documents` (library tab: view/copy/download-.txt/delete). `CAMPAIGN_CONTEXT` is exported from `routes/ai.ts` and reused. Table self-heals at boot via `ensureGeneratedDocsTable()`.
- **Turnout Forecast** (commandcentre `/turnout`, API `/api/turnout`): ward-by-ward voter turnout prediction anchored on real `polling_stations` registered-voter counts (27,950 across 5 wards). Per-ward adjustable assumptions (expected turnout %, Mule support %) persist in `turnout_assumptions` (unique per ward, defaults 65%/50%); a non-persisted constituency-wide turnout-shift slider (`turnoutDelta`) models what-if scenarios. Computes predicted votes, predicted Mule votes/share, and GOTV upside (`registered × support × (1 − turnout)`) with ranking to prioritize mobilization. Shows actual turnout from `tally_results` for prediction-vs-actual once stations report. `turnout_assumptions` is created idempotently at boot via `ensureTurnoutTable()` (autoscale prod has no Drizzle migrations — same self-healing pattern as auth). Uses plain fetch, not OpenAPI codegen.
- **Social Listening** (commandcentre `/social-listening`): on-demand AI web scan finds recent public mentions of Hon. Stephen Mule, trending Makueni/Machakos issues, and opponent activity; stores them in `social_mentions` and shows sentiment cards + a filterable mentions feed. Scans use the OpenAI Responses API `web_search` tool via the Replit proxy and cost AI credits; the `/api/social/scan` endpoint is guarded by an in-flight mutex + 15s cooldown.

- **AI Chief Strategist** (commandcentre `/strategist`, API `/api/strategist`): senior-strategic-advisor chat grounded in live campaign data. `buildLiveDigest()` computes a deterministic digest via raw SQL (members/supporters, support by ward, volunteers, doors knocked, messages, fundraising, turnout forecast, threats, sentiment, milestone readiness, days-to-election) and injects it into the system prompt each turn — the AI cites real numbers, never computes them. POST `/chat` streams via SSE (first event `{conversationId}`, then `{content}` token deltas); conversations + messages persist in `strategist_conversations`/`strategist_messages` (self-healed at boot via `ensureStrategistTables()`); assistant messages saved only when non-empty. Guards: `requireAuth` on the whole router (persisted strategy is sensitive — unlike the rest of the public API), plus in-flight mutex + 8s per-IP cooldown. Frontend: conversation sidebar, streaming render, starter prompts; plain fetch + react-query.
- **ACL AI DI OS** (`di` artifact, served at `/di/`, API `/api/di`): generic multi-sector decision-intelligence platform. **Datasets are first-class** (`di_datasets` + `di_dataset_rows` jsonb rows): users upload CSV/Excel (multer memory + xlsx, limits 5MB/5000 rows/40 cols, column type inference) and the built-in "Makueni Campaign" dataset (sourceType `builtin`, undeletable) sits alongside uploads. All features are dataset-scoped via `?datasetId` / body `datasetId`: **Ask** — builtin dataset uses the fixed 10-intent pipeline; uploaded datasets use plan-and-execute: gpt-5.1 emits a JSON aggregation plan ({groupBy, metric, agg, chartType}) → `normalizePlan` validates against real columns → `executePlan` computes deterministically (AI never computes numbers; avg uses numeric-only denominator) → second AI call narrates (empty → 502). **Briefings** — builtin: 5 campaign sections; uploads: generic sections off deterministic dataset digests; parallel ≤350-token calls. **What Changed** — per-dataset snapshots into `di_snapshots`, diffed with heuristic severity + AI one-liners (deterministic fallback). All AI endpoints share one in-flight lock + 12s per-IP cooldown (429), cooldown set in `finally`. Tables self-heal at boot via `ensureDiTables()` in seed.ts, which also backfills null `dataset_id` rows to the builtin dataset every boot (idempotent). Frontend: global dataset selector (React context), `/datasets` page (upload/preview/delete), plain fetch + react-query (no OpenAPI codegen), root-relative `/api/di/...` URLs.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Super-admin lockout protection**: the system must always have ≥1 active super-admin. Admin API blocks suspending/demoting/deleting the last active super-admin (400), and `ensureBootstrapAdmin()` self-heals at boot by reactivating the bootstrap `demo` account if zero active super-admins exist. Prod once locked itself out by suspending `demo` (the only super-admin) — a republish (which reboots the server) applies the self-heal.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
