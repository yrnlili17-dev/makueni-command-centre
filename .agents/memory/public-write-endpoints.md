---
name: Public write endpoints need self-contained abuse controls
description: Why public unauthenticated POST endpoints in this API must carry their own rate-limit/dedupe
---

Only the `/api/admin` router is auth-protected (session + `requireAuth`/`requirePermission`). The other module APIs (`/api/volunteers`, `/api/surveys`, `/api/insights` mutations, etc.) still have **no authentication** — the campaign team operates the commandcentre admin app directly in production. There is no global auth middleware or rate limiter across those routes.

**Rule:** any endpoint exposed to the public internet that writes to the DB (e.g. the volunteer self-registration `POST /api/volunteers/register`, or public poll submit) must carry its own abuse controls inline — at minimum a per-IP rate limit and a dedupe guard — because nothing upstream protects it. Auth infrastructure now exists (`requireAuth`, `requirePermission` in `api-server/src/lib/auth.ts`), so new sensitive module routes can opt into it, but it is NOT applied globally.

**Why:** without it, a single public write route becomes a direct spam/DB-pollution vector. There is no shared throttle to fall back on.

**How to apply:** when adding a public write route, add a best-effort in-memory per-IP sliding-window limiter and an idempotency/dedupe check (e.g. dedupe on phone/email for registrations). In-memory limiters reset on restart and are per-instance — acceptable for the current single-instance deploy, but revisit if the deployment scales horizontally (move to a shared store).

**Expensive AI endpoints are an extra-sharp case:** routes that call the AI proxy / web_search (e.g. `POST /api/social/scan`) burn the user's AI credits per call, so abuse = real money, not just DB rows. Guard them with an in-flight mutex (reject concurrent runs with 429) plus a short cooldown window, on top of any per-IP limit.
