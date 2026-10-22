# Makueni public-source policy research

Reviewed 2026-10-22. This change adds a read-only, county-017 evidence library and factual source answers. It does not rewrite the confidential manifesto or develop electoral strategy. Existing contact, tally and operational records are unchanged; no database migration is required.

## Access

Open Analytics → Makueni policy research → Open library. Search or filter dated records by sector. Every card preserves its observation period, evidence type, indicator unit/denominator, source URL, PDF page and caution. Expand sources for document hashes and reviewed pages.

Authenticated API: `GET /api/analytics/county-research?county=017&topic=water&q=water`. The existing Analytics module permission applies. Only county 017 is accepted; queries are bounded to 400 characters and topics use an allowlist. Queries never cause arbitrary URLs to be fetched.

`GET /api/ai/county-knowledge` also exposes this research. Factual source questions in AI Assist and analyst chat use deterministic source answers in both free and provider modes. Research answers bypass the campaign digest and never turn old figures into current conditions. Chat persistence and existing permissions remain in place. Operational SWOT combines the county evidence review with the previous IEBC reference data.

## Reviewed sources

- First Makueni CIDP 2013–2017, hosted by the Council of Governors: downloaded, text extracted, selected baseline passages reviewed.
- Makueni CIDP 2018–2022, Devolution-hosted 59-page copy: downloaded; selected water, service access, planning and sector-priority passages reviewed. Water PDF page 17 visually inspected.
- Makueni Countywide Inclusive Sanitation Strategy, November 2019, World Bank-hosted: downloaded; sanitation access PDF page 11 visually inspected.
- Makueni CIDP 2023–2027, county-hosted: downloaded; geography, census/projection and water tables reviewed. Table 37 on PDF page 200 visually inspected.
- Devolution county information page: only the Makueni row and its 2009 population column heading used.

SHA-256 hashes and exact official URLs are recorded in `artifacts/api-server/src/data/makueni-research.ts`. Status `document-reviewed` means selected passages, not full-document ingestion or validation of every table.

## Discovery and exclusions

The three requested IEBC index pages timed out. Existing individually sourced IEBC historical data remains available; no new numbers were inferred from inaccessible pages.

The GitHub counties topic was checked for technical references, but community geography was not imported. The Debunk profile is editorial/biographical context, excluded from quantitative evidence and candidate comparisons.

Web research also located the official 2025 Makueni Statistical Abstract. The direct KNBS PDF returned HTTP 503, so it is a discovery reference with no imported figures. County project and finance portals are verification paths, not proof that a specific project was delivered. No claim of a comprehensive web scan or live monitoring is made.

## Interpretation safeguards

- Preserve 8,008.7, 8,008.9 and 8,176.7 km² as distinct source values pending boundary/definition review.
- Keep 2019 census population separate from 2012 and 2027 projections. CIDP Table 4 gives 1,087,776 for 2027 while Table 10(b) gives 1,087,775; the one-person difference is retained in the note.
- Do not compare population potable-water coverage directly to household safe-water access. The 2021 baseline and 2027 target are different record types.
- Sanitation categories are published as approximately 33%, 46%, 19% and 2.4%, totalling 100.4% at source precision. Values are not silently rescaled.
- County averages cannot establish ward conditions. Listed priorities, targets and historical problems cannot establish current achievement, failure, cause or political support.

## Validation

`node --experimental-strip-types --test artifacts/api-server/tests/makueni-research.test.mjs`

Tests verify county scope, official reviewed-source provenance, reviewed page references and hashes, bounded/topic retrieval, preserved discrepancies, evidence-type separation and source-linked answer limitations. GitHub Validate runs these alongside the existing tests and full monorepo typecheck/build.
