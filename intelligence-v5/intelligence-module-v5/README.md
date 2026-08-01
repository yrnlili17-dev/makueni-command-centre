# Intelligence Module v5

A modular Narrative Operations Queue for the Makueni Command Centre.

## Features

- Replaces the large inline queue with a dedicated React component.
- Shows one visible card per social-media mention.
- Keeps the newest response and reports hidden historical duplicates.
- Generates three campaign-safe local response options without API keys.
- Supports filtering by status and platform.
- Shows original post text and author.
- Opens the exact original post when a URL exists.
- Falls back to the originating social-media profile when only a handle exists.
- Copy, edit, approve, reject and mark responded controls.
- Creates a timestamped backup before installation.

## Install

From the repository root:

```bash
unzip Intelligence-Module-v5.zip -d intelligence-v5
node intelligence-v5/intelligence-module-v5/install-intelligence-v5.mjs
```

## Verify

```bash
pnpm --filter @workspace/api-server build
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
```

## Restart

Backend:

```bash
fuser -k 3001/tcp 2>/dev/null || true
set -a
source .env
set +a
export PORT=3001
pnpm --filter @workspace/api-server dev
```

Frontend:

```bash
fuser -k 5173/tcp 2>/dev/null || true
export PORT=5173
export BASE_PATH=/
pnpm --filter @workspace/commandcentre dev
```

## Notes

This package does not automatically post to social networks. Direct publication requires valid platform credentials. The no-key workflow is:

1. Select a response.
2. Approve it.
3. Copy it.
4. Open the source post/profile.
5. Reply manually.
6. Mark it responded.
