# Phase 9A.1 — Dashboard Navigation & Production Cleanup

This package improves the Phase 9A Command Overview.

## Changes

- Removes `PHASE 9A LIVE DASHBOARD INTELLIGENCE` from the production UI.
- Keeps the clean `Command Overview` heading.
- Makes all primary metric cards clickable.
- Makes constituent intelligence cards clickable.
- Makes top-ward rows clickable.
- Makes support classifications clickable.
- Makes data-quality information clickable.
- Makes recent import records open the Data Management Centre.
- Adds mouse hover, keyboard focus and navigation icons.
- Keeps unavailable modules visible and clickable so they can be developed later.

## Main navigation

- Total Constituents → Constituent Database
- Phone Ready → Constituent Database with phone filter
- Wards Covered → Geographic Segmentation
- Open Threats → Incident Operations
- Active Volunteers → Volunteer Command
- Messages Sent → Messaging
- Doors Knocked → Field Operations
- Upcoming Events → Event Logistics
- Women/Men/Youth/Seniors → matching segments
- Email/SMS/WhatsApp → matching constituent filters
- Support classifications → matching constituent filters

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase9A1-Dashboard-Navigation-Production-Cleanup.zip -d phase9a1

node phase9a1/phase9a1-dashboard-navigation-cleanup/install-phase9a1.mjs
```

## Build

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
```

## Restart frontend

```bash
fuser -k 5173/tcp 2>/dev/null || true

export PORT=5173
export BASE_PATH=/

pnpm --filter @workspace/commandcentre dev
```

Open:

```text
http://localhost:5173/dashboard
```

Test each dashboard card before committing.
