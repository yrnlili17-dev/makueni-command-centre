# Version 2.1.0 — Batch A

## Campaign Foundation

Version 2.1.0 Batch A introduces the central campaign
configuration foundation for the Kaloki 2027 gubernatorial
campaign.

## Campaign identity

- Candidate: Prof. Philip Kaloki
- Campaign: Kaloki 2027
- Party: UDA
- Position: Governor
- Jurisdiction: Makueni County
- Slogan: Not configured
- Campaign colours: Not configured

## Configuration files

- config/campaign.json
- config/branding.json
- config/election.json
- config/geography.json
- config/ai.json

## Generated application configuration

The sync script generates typed configuration modules for:

- API server
- Command Centre frontend

Generated files must not be edited manually. Update the JSON
configuration files and run:

    node scripts/sync-campaign-config.mjs

## County structure

The configuration introduces:

- 6 constituencies
- 30 wards
- County-level gubernatorial campaign context

## Safety

Batch A does not change:

- Authentication
- Supabase integration
- Database schemas
- Existing API routes
- Role permissions
- Deployment settings

Those integrations will be updated incrementally in later batches.
