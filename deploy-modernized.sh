#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

corepack enable
pnpm install --frozen-lockfile
PORT="${PORT:-5174}" BASE_PATH="${BASE_PATH:-/}" pnpm --filter @workspace/commandcentre build

echo "Build passed. Commit and push this project to the branch used by Render."
