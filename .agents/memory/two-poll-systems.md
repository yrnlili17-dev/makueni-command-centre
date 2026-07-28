---
name: Two parallel poll systems
description: MATUNGULU COMMAND CENTRE has two unrelated poll datastores that do not sync; how to bridge them
---

# Two separate poll systems

MATUNGULU COMMAND CENTRE stores polls in **two independent table groups** that are NOT linked and do NOT sync:

1. **commandcentre "Opinion Polls"** — `opinion_polls` + `poll_votes` (schema in `lib/db/src/schema/intel-ops.ts`), served by `artifacts/api-server/src/routes/surveys.ts` at `/api/surveys/polls`. These are the "Makueni polls". `options` is jsonb `[{label, votes}]`; each vote row has `option_index`, ward/age_group/gender.

2. **insights app** — `insight_polls` + `insight_questions` + `insight_responses` + `insight_answers` (schema in `lib/db/src/schema/insights.ts`), served by `artifacts/api-server/src/routes/insights.ts`. Question `type` values: `"n"` (single choice), `"multi_choice"`, `"open_ended"`. Question `options` is a `string[]` of labels; an answer's `value` is the chosen option label string. Poll `status` must be `"published"` to show with results.

**Why this matters:** "show the Makueni polls in Insights" requires *importing/converting* group 1 into group 2 — they are not the same data. Mapping: one opinion poll → one published insight poll with a single `"n"` question whose options are the labels; each `poll_vote` → one `insight_response` + one `insight_answer` (value = label at `option_index`), preserving ward/age/gender/submittedAt.

**How to apply:** A reusable one-time import lives at `scripts/src/import-makueni-insights.ts` (`pnpm --filter @workspace/scripts run import-makueni-insights`). It is idempotent (skips by matching poll title). It only mutates the DB it's pointed at via `DATABASE_URL`; it does NOT auto-sync future opinion-poll changes.
