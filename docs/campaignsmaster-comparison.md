# Campaigns Master comparison — 21 October 2026

Reference: https://campaignsmaster.com/features, https://campaignsmaster.com/kenya and the public homepage. The /dashboard route was inaccessible through the web lookup; this is a comparison against advertised features, not an authenticated review of its implementation.

Source baseline: be84ba72199c9d2e51f54f031db7104b446edf4e. Existing modules should be extended before introducing duplicate pages.

| Capability | Evidence in this repository | Gap |
| --- | --- | --- |
| Nominations workflow | No dedicated nomination routes, schema or page located | Vetting, nomination stages, ballots, disputes and handover audit trail. |
| Coalition administration | campaign-plan has milestones/readiness; no coalition routes located | Partner register, contacts, commitments and endorsement stages. |
| Email marketing studio | Messaging provider configuration includes SMTP fields | Dedicated template editor, campaign workflow and deliverability/bounce handling are not established by configuration fields alone. |
| Event attendee management | events API provides event CRUD only | RSVP records, check-in, attendance reconciliation and post-event reports. |
| Offline field capture | Field sessions/visits exist; no dedicated offline sync implementation located | Durable device queue, reconnect sync, deduplication and conflict handling; verify on devices. |
| Multiple campaign workspaces | Single Makueni-focused operational model | Organisation/campaign-scoped records and isolation tests before enabling additional campaigns. |
| USSD access | No USSD callback routes located | Provider-backed basic-phone flows; requires provider setup and integration validation. |
| Operational health | Dashboard SYSTEM_STATUS is currently a fixed array | Real API/provider health, last successful sync, errors and retry state instead of static OPERATIONAL labels. |

## Additional gaps from the twelve-module scope

Expense requests and approvals, budgets vs actual expenditure, supplier/payment registers, itinerary travel/conflict checks, verified historical electoral imports, MFA, retention/deletion controls and backup restore verification remain on the platform requirements checklist. These are requirements gaps, not claims about what Campaigns Master actually implements.

## Glass interface batch

Shared frosted cards, dashboard metrics/panels, translucent shell navigation and header, soft background lighting, rounded active navigation and keyboard focus styling. Mobile panels avoid expensive blur; reduced motion/transparency and forced-color preferences receive explicit fallbacks. No data or permission behavior changes.

Validation: run the existing workspace typecheck/build CI. Visual browser verification still required on desktop and mobile before claiming production appearance.
