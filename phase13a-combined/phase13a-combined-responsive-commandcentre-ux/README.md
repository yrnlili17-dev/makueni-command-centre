# Phase 13A — Combined Responsive Command Centre UX

## Installs

- mobile accordion sidebar
- one expanded navigation section at a time
- active route auto-expansion
- remembered open section
- compact mobile bottom navigation
- Menu button opening grouped navigation
- Smart Assist safe positioning
- Results Command Centre navigation entry
- responsive content safeguards
- ultrawide and command-centre width support
- automatic backup and rollback

## Install

```bash
cd ~/Projects/makueni-command-centre

unzip Phase13A-Combined-Responsive-CommandCentre-UX.zip \
  -d phase13a-combined

node \
  phase13a-combined/phase13a-combined-responsive-commandcentre-ux/install-phase13a-combined.mjs
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

Test at 360px, 390px, 768px, 1366px, 1920px and 2560px widths.
