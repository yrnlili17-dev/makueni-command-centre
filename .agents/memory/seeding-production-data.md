---
name: Seeding production data
description: How to get data into the production database when agent tooling is read-only for prod.
---

# Seeding production data

Production uses a **separate database** from development. Publishing copies the app + schema to prod, but **not** dev data/rows. So dev seed data never appears on the live site automatically.

`executeSql({ environment: "production" })` is **READ-ONLY** (SELECT only) — you cannot INSERT/UPDATE prod with it. The replica it queries can also be a stale snapshot, so trust the **live published API** (`https://<app>.replit.app/api/...`) over the read replica for the real prod state. Note `$REPLIT_DOMAINS` is the **dev** `.replit.dev` domain, not the published `.replit.app` domain.

**The only way to write prod data is through the deployed app's own write API endpoints.** Steps used to seed messaging:
1. Read dev rows via `executeSql` (use `json_agg(json_build_object(...))`; output is CSV-escaped — strip header `j\n`, unwrap outer quotes, replace `""`→`"`, then JSON.parse).
2. POST each segment to `/api/segments`, building a dev→prod id map (prod gives new ids).
3. POST each campaign to `/api/messages` (creates a **draft** only — limited fields, no stats), mapping `segmentId`.
4. Set final state per campaign: `POST /api/messages/:id/send` (sent), or `PATCH /api/messages/:id {status}` (scheduled/failed). Draft = leave.

**Why stats work despite the limited create API:** `/api/messages/:id/send` computes `recipientCount` from the segment's `memberCount` (×0.92 delivered, ×0.35 opened, ×0.20 clicked). And segment create honors `criteria.manualSize` (checked first in `computeMemberCount`). Since prod `members` table is empty, **always set `criteria.manualSize = devMemberCount`** so counts/stats are non-zero and coherent. Caveat: `/send` sets `sentAt`/`createdAt` to now — you cannot backdate via API.

**When to do this:** user wants the *published* site populated (e.g. a pitch/demo on the live URL). Otherwise prefer leaving prod to fill with real data.
