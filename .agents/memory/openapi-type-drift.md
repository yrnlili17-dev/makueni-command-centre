---
name: Generated OpenAPI type drift
description: Commandcentre pages use API fields missing from generated types; fix pattern and incremental-tsc gotcha.
---

**Rule:** Several API endpoints return fields never added to the OpenAPI spec, so Orval-generated types lag the real responses. Fix at the page level with a local extension type (`type XEx = Generated & { extraField?: ... }`) and one cast at the data source — don't sprinkle `as any`.

**Why:** Regenerating the spec is the real fix but touches the shared contract; local Ex-types keep artifacts green without runtime changes. Root cause is routes returning extra fields (e.g. narrative score aggregates, milestone priority) that were never specced.

**How to apply:** If commandcentre typecheck shows `Property 'x' does not exist on type '<Generated>'`, first confirm the API actually returns it (grep the route), then extend locally. Beware: incremental `tsc` can surface cached errors one file at a time across successive runs — always rerun until fully clean, and count errors with `| grep "error TS"` for the true list.
