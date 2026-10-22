# IEBC historical evidence (reviewed 2026-10-22)

The read-only `/api/analytics/iebc-history` endpoint serves the curated source registry in `artifacts/api-server/src/data/iebc-history.ts`. Analytics and Turnout display it. No migration, contact overwrite or manual SQL is needed.

## Verification boundary

Direct downloads from IEBC returned HTTP 503 and browser retrieval timed out. Numerical rows were reviewed through indexed text from official IEBC PDFs, not a visual inspection of original pages. The UI/API explicitly retain `indexed-extract` status. Do not change that status until original documents are downloaded and checked; record a checksum and page reference then. Report cover discovery is not full report ingestion.

Included: the user-supplied 2022 post-election evaluation report's national turnout passage; the 2022 GE in Perspective factsheet; Makueni's county register row; the presidential declaration's Makueni row and candidate column headings. The 2017 evaluation report and 2022 forms portal are discovery references, without imported local results. The 2017 report covers August and October separately.

Makueni's presidential declaration reports 479,516 registered, 290,819 valid votes and 1,908 rejected ballots. Derived ballots cast are 292,727 and turnout is 61.05%. The separate county register lists 479,401: preserve the unresolved 115 discrepancy. Never silently substitute that denominator. These are presidential historical references, not governor results or current support.

## AI and SWOT

Election-related free-mode answers use the curated evidence instead of generic service templates. Provider-assisted module answers receive the same context. SWOT generation is an operational evidence review with provenance, gaps and verification actions; it does not fabricate candidate strengths or a win probability. Historical evidence is not a calibrated prediction model.

Legacy tally rows have no election date or office. Their sum previously became both all-candidate votes and one candidate's votes and omitted rejected ballots. Until election/office metadata, candidate selection, original forms and verification exist, the turnout API returns null actual metrics with an explicit unavailability reason. Existing tally rows remain intact.

## Extending the dataset

Review original forms before adding constituency/ward/station results. Store election date, office, geographic codes, source URL, document page, revision, extraction method and verification status. Reconcile candidate sum to valid votes, valid plus rejected to ballots cast, and ballots cast to the same source's registered denominator. Keep source discrepancies for review rather than rewriting prior records. Do not use contact counts as registration totals or social mentions as representative opinion.

## Validation

`node --experimental-strip-types --test artifacts/api-server/tests/iebc-history.test.mjs`

Tests cover candidate reconciliation, rejected-ballot arithmetic, invalid denominators, scope/date separation and preservation of verification limitations. GitHub Validate also performs the monorepo typecheck and build.
