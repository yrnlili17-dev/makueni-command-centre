# Makueni Command Centre — Frontend Modernization

## Completed in this package

- Standardized Makueni County branding across the command-centre shell.
- Added permission-aware route guards for every frontend module.
- Added permission-aware sidebar navigation so restricted modules are hidden.
- Extended role configuration to cover Analytics, Social Listening, and Speech & Manifesto as independent permissions.
- Added reusable `PermissionGate` and `WriteRestrictedNotice` components for action-level read/write controls.
- Added a shared enterprise visual layer for panels, statistics, headings, focus states, responsive spacing, and command-centre backgrounds.
- Updated the main layout for improved readability, responsive spacing, and secure-session status.
- Audited frontend source for non-Makueni county references. No Matungulu, Machakos, Kitui, Kangundo, Mavoko, Mwala, Kathiani, Yatta, Masinga, or Mwingi references remain in frontend TypeScript source.
- Preserved API routes, database schemas, authentication, existing business logic, and integrations.

## Modernized/updated frontend modules

Dashboard, Analytics, Campaign Plan, Credentials, Election Day, Field Operations, Intelligence, Segmentation, Social Listening, Surveys, SWOT, Turnout, Volunteers, Voter Database, navigation shell, route protection, role management, and shared design styles.

## RBAC behavior

Permission levels are `none`, `read`, and `write`.

- `none`: route and navigation item are unavailable.
- `read`: user can view the module.
- `write`: user can view and perform permitted editing actions.
- Super Admin protection and administrative audit behavior remain controlled by the existing backend.

The reusable permission components are located at:

`artifacts/commandcentre/src/components/permission-gate.tsx`
