# Phase 9C ZIP B — Step 1 Geographic Intelligence Shell

This automatic patch extends the working Analytics Hub without replacing it.

## Adds

- `GEOGRAPHIC INTELLIGENCE` tab
- Constituency Intelligence shell
- Ward Intelligence shell
- Polling Station Intelligence shell
- Backup, verification and automatic rollback

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase9C-Zip-B-Step1-Geographic-Intelligence-Shell.zip \
  -d phase9c-b-step1

node \
  phase9c-b-step1/phase9c-b-step1-geographic-shell/install-phase9c-b-step1.mjs
```

## Build

```bash
PORT=5173 BASE_PATH=/ \
pnpm --filter @workspace/commandcentre build
```

## Run

```bash
fuser -k 5173/tcp 2>/dev/null || true

export PORT=5173
export BASE_PATH=/

pnpm --filter @workspace/commandcentre dev
```

Open Analytics Hub and select `GEOGRAPHIC INTELLIGENCE`.

The three geographic sections are intentionally shells in Step 1. Live constituency data is connected in Step 2.
