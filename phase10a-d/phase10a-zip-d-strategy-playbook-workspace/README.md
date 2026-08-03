# Phase 10A ZIP D — Strategy Playbook Workspace

This package completes the main Phase 10A Chief Strategist workspace.

## Playbook templates

- 30-Day Campaign Strategy
- 7-Day Ward Plan
- Rally Mobilisation Plan
- Volunteer Deployment Plan
- Messaging & Narrative Plan
- Threat Response Playbook

## Backend endpoints

- `GET /api/strategist/playbooks`
- `POST /api/strategist/playbooks/generate`
- `PATCH /api/strategist/playbooks/:id`
- `DELETE /api/strategist/playbooks/:id`
- `POST /api/strategist/playbooks/:id/actions`

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase10A-Zip-D-Strategy-Playbook-Workspace.zip \
  -d phase10a-d

node \
  phase10a-d/phase10a-zip-d-strategy-playbook-workspace/install-phase10a-d.mjs
```

## Build

```bash
pnpm --filter @workspace/api-server build

PORT=5173 BASE_PATH=/ \
pnpm --filter @workspace/commandcentre build
```

Restart the backend and frontend, log in, and open `/strategist`.
