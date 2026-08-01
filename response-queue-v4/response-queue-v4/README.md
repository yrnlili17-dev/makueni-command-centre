# Response Queue v4 — Deduped Operational View

This package is installed **after Response Queue v3**.

## Changes

- Displays only one queue card per social-media mention.
- Keeps the newest response when old duplicate database rows exist.
- Does not delete historical rows from the database.
- Shows how many older duplicate rows were hidden.
- Uses the exact original-post URL when available.
- Falls back to the originating account/profile when only an author handle is available.
- Clearly displays `SOURCE LINK UNAVAILABLE` when no safe destination exists.
- Creates a timestamped backup before changing files.

## Important

This package does **not** publish automatically to X, Facebook, TikTok or other networks. That requires platform credentials.

The safe no-API-key workflow remains:

1. Choose a response option.
2. Approve it.
3. Copy the response.
4. Open the original post or source profile.
5. Reply manually.
6. Return and mark the response as responded.

## Install

The ZIP normally extracts into a nested folder. From the repository root:

```bash
unzip Response-Queue-v4-Operational-View.zip -d response-queue-v4
node response-queue-v4/response-queue-v4/install-response-queue-v4.mjs
```

## Build verification

```bash
pnpm --filter @workspace/api-server build
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
```

## Restart locally

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

## Git hygiene

Do not commit installer folders or backup folders. After testing:

```bash
rm -rf response-queue-v3 response-queue-v4
rm -f Response-Queue-v3-Local-Engine.zip Response-Queue-v4-Operational-View.zip
```

Keep the backup until the feature is confirmed stable, then remove it before committing:

```bash
rm -rf .response-queue-v3-backup-* .response-queue-v4-backup-*
```
