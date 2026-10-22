# Social scan storage recovery

The screenshot's HTTP 500 is the generic processing/storage error from `/api/social/scan`; production logs are still needed to prove its original cause. A confirmed failure path is that optional `social_source_health` writes rejected the entire response after mention saves, or even when no search results were found.

The scan now inspects the connected database for the two feature tables before querying providers. It creates absent tables using fixed, additive SQL. Existing tables, contacts, saved documents and records are not altered or dropped. Setup is single-flight and successful initialization is cached; failed initialization can retry. A missing column in an existing table is not silently repaired with guessed types.

Optional health setup and writes cannot invalidate successful mention storage. The API returns warnings when logging fails, and the Social Listening page displays those warnings. Permission, missing-relation and missing-column errors receive `SOCIAL_STORAGE_NOT_READY` with an actionable message. Reading an unavailable feed is no longer presented solely as an empty feed. A failed scan no longer claims that no partial writes occurred.

If the runtime database role cannot create missing tables, an administrator can apply `lib/db/migrations/20261022_social_listening_storage.sql` to the database connected to the app. The migration is additive and idempotent for absent tables; existing schema drift needs review.

The exact user-supplied Facebook URL was already in the scan's indexed search queries. It now appears visibly as a public reference. This does not authenticate to Facebook, prove account ownership or enable direct Facebook API collection.

The speech form now identifies Prof. Philip Kaloki as a Makueni Governor Aspirant for 2027 and uses discussion/interview labels instead of official government announcements. Existing backend candidate-status instructions and generated/saved document text were not changed. No campaign speech content was generated in this fix.

Validation covers existing and missing tables, concurrent setup, retries, optional health failures and wrapped PostgreSQL errors. The UI pages bundle locally; full monorepo typecheck/build runs in GitHub Validate. No production database mutation or live scan has been independently verified by the assistant.
