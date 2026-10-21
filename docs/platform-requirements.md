# Platform requirements and implementation status

Reviewed: 21 October 2026. Scope: categories A–D and the twelve requested modules.
Evidence is source-code inspection on main at 6357fe4c9ddb70a788e894bada9b907116336b2a; a page or route is not proof of a working production feature.
"Partial" means code exists for some requirements, with the remaining work listed below. No module is certified complete by this review.

| Module | Existing source evidence | Status | Remaining acceptance work |
| --- | --- | --- | --- |
| 1. Executive command centre | dashboard, analytics, campaign-plan routes and dashboard page | Partial | Consolidated outstanding tasks, approved budget vs expenditure, reporting completeness and leadership decision queue; verify role-specific views against actual records. |
| 2. GIS and electoral data | election-day station routes, voter-registry import/sync, Makueni geography | Partial | Verified election dataset ingestion with provenance, historical results/turnout, GIS layers, validated station coordinates and travel times. Do not treat contact imports as election datasets. |
| 3. Ground operations | field-ops sessions/visits/coverage; volunteer tasks/issues/daily-report | Partial | Durable offline queue, idempotent server sync, conflict handling, photos/location controls, attendance and completion verification. Device offline/reconnect test required. |
| 4. Polling and research | surveys and insights questionnaire/response/results routes | Partial | Sampling metadata, field dates, response-rate denominators, valid uncertainty calculations and cross-period comparisons. Existing browser-session vote restriction is not one-person identity verification. |
| 5. Planning and itinerary | events CRUD; campaign-plan milestones/readiness/alerts | Partial | Candidate/staff/vehicle conflict checks, routes and travel times, briefing contacts, reminders and post-event reporting. |
| 6. Finance and resources | fundraising campaigns/donors/donations/pledges/reconciliation; M-Pesa routes | Partial | Department/activity/location budgets, expense requests and approvals, receipts, suppliers/payments, allocation ledger and actual expenditure. Fundraising totals are not expenditure accounting. |
| 7. Communications studio | messaging providers/send/webhooks; speeches; social routes | Partial | Verify real SMS delivery and receipts with configured credentials, approved email/messaging integrations, creative approval and publishing, content calendar and communication logs. |
| 8. AI assistant | ai, strategist, di, speeches routes | Partial | Evidence-linked report summaries, approved-work-plan comparison, deterministic missing-report and spending anomaly checks, scheduled briefings and human review. |
| 9. Volunteer organisation | registration, assignments, tasks, issues, daily reports | Partial | Hierarchy and scoped responsibilities, consent lifecycle, training attendance, shifts/deployment and verified coordinator coverage. |
| 10. Media monitoring | social scan/search-feed/source-health/mentions | Partial | Authorized provider ingestion, scheduled collection, verified facts/source library, escalation workflow and approval of responses; validate provider health and freshness. |
| 11. Election-day operations | stations, results, verify/dispute, events, workqueue, published routes | Partial | Readiness checklist, assignment/escalation contacts, source attachments/provenance and comparison to official published results. Verify supplied figures before publishing. |
| 12. Security and governance | sessions/password hashing, roles/admin audit/config; access-control batch | Partial | MFA, organisation/campaign isolation, comprehensive audit coverage, encrypted backup/restore drill, retention/deletion and incident response. Access-control tests do not establish tenant isolation. |

## Categories A–D

A maps to modules 1, 2, 3, 5, 6 and 9. B maps to modules 2, 4 and 8 plus shared data-quality controls. C maps to modules 7 and 10 plus provider health and notification infrastructure. D maps to module 12 and applies to every module.

## First implementation batch: API authorization

- Central API guard requires authentication and module permissions for operational endpoints.
- GET/HEAD/OPTIONS require read permission; mutations require write permission.
- Existing authentication endpoints retain their own login/session behavior.
- Public access is restricted to listed participation, health and callback method/path pairs. Provider handlers still own callback authenticity checks.
- Super-admin permissions include the existing route aliases. Standalone permission checks reject non-active accounts.
- Source tests exercise public-route boundaries, sensitive endpoints, every module's read/write mapping and unknown module handling.

## Delivery sequence and acceptance gates

1. Validate and deploy authorization; exercise candidate, manager, coordinator, analyst, officer and viewer accounts. Confirm explicit denies, disabled users, public forms and provider callbacks. Audit existing role definitions before rollout.
2. Complete shared foundations: organisation/campaign scope, audit events and API failure monitoring, verified data imports with quality reports, backups and restore.
3. Implement expense accounting and itinerary conflicts; connect executive metrics to those records.
4. Implement offline field sync and attendance, volunteer organisation and research metadata.
5. Verify approved provider integrations and receipts; complete publishing approvals and media source monitoring.
6. Complete GIS/historical datasets, source-backed results and evidence-grounded AI briefings.

Each batch needs schema migration/recovery instructions where applicable, server-side authorization and validation, usable frontend workflows, meaningful automated checks and an end-to-end acceptance record. Integration credentials and official datasets are deployment inputs; simulated responses must not be labelled successful delivery.

## Validation limits

This review did not access the production database, hosting configuration, provider accounts or official electoral datasets. Production readiness, delivery, backups, MFA and cross-device operation remain unverified.
