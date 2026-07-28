---
name: Insights sharing & funnel analytics
description: How branded short links, channel attribution, and the views→started→completed funnel fit together for insights polls.
---

# Insights sharing & distribution funnel

Branded short links are served by the **api-server at root `/s/:slug`** (proxy path `/s`), independent of the SPA base path. A scan/click flow is:
`/s/:slug?src=CHANNEL` → records a `view` event + serves OG HTML → redirects to the SPA public poll `/insights/p/:shareToken?src=CHANNEL` → SPA records a `start` event → on submit the server records `complete`.

**Funnel event integrity rule:** the public `POST /insights/p/:shareToken/event` endpoint must only accept top-of-funnel events (`view`, `start`). `complete` is recorded **server-side only** inside the submit handler.
**Why:** the endpoint is unauthenticated; if it accepted `complete`, anyone could inflate completion metrics independent of real submissions. The OpenAPI `InsightShareEventInput.eventType` enum is intentionally `[view, start]` (no `complete`) to match.
**How to apply:** never add `complete` (or other terminal events) to the public event enum/handler; tie any new terminal funnel event to an authenticated or proof-bound server action.

**Channel attribution:** the `?src=` query param is the single source of channel truth. QR codes must encode `?src=qr` (not the channel-less link) or scans get miscounted as `direct`. Social buttons each pass their own `src` (whatsapp/x/facebook/email/copy).
