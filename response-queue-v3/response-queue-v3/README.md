# Response Queue v3 — Local Campaign Engine

## Install

```bash
cd ~/Projects/makueni-command-centre
unzip Response-Queue-v3-Local-Engine.zip -d response-queue-v3
node response-queue-v3/install-response-queue-v3.mjs
```

## Verify

```bash
pnpm --filter @workspace/api-server build
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
```

## What it changes

- Prevents future duplicate pending responses for the same mention.
- Generates three local response options without API keys.
- Shows original post text, author and source link when available.
- Adds Select Option, Copy Response, Open Original Post and Mark Responded.
- Creates timestamped backups before editing.

## Existing duplicate cards

Delete existing duplicate cards manually after testing, keeping the newest card. The installer does not automatically delete campaign data.
