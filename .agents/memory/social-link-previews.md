---
name: Per-poll social link previews for static SPA
description: How dynamic OG/social link previews are served when the frontend is a static Vite SPA with no server process in production.
---

## Rule
The `insights` artifact is served as STATIC files in production (`serve = "static"` in artifact.toml) — there is NO server process for it. So it cannot inject dynamic per-page Open Graph tags. The `index.html` meta tags are fixed at build time and identical for every route.

To give each shared poll its own link preview (WhatsApp/Facebook/Twitter), the share link points at an **API server route** (`GET /api/insights/share/:shareToken`) instead of the SPA route. That route:
- Returns server-rendered HTML with per-poll OG tags (crawlers read these from the first response and ignore JS).
- Redirects real browsers to the SPA poll page (`/insights/p/:token`) via meta-refresh + `window.location.replace`. No User-Agent sniffing needed.

**Why:** WhatsApp/FB crawlers don't execute JavaScript, so client-side meta updates never appear in previews. Only the API server is dynamic in prod.

**How to apply:**
- Any new "shareable link with preview" must route through the API server, not the static SPA.
- Escape user-controlled fields (title/description) with HTML-entity escaping before injecting into HTML attribute/text contexts. Use `JSON.stringify()` for values placed in `<script>` JS-string contexts. Build redirect URLs same-origin-relative with `encodeURIComponent()` on the token to avoid open-redirect/injection.
