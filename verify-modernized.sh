#!/usr/bin/env bash
set -euo pipefail
FILE_ROOT="artifacts/commandcentre/src"

echo "[1/5] Checking required files"
test -f "$FILE_ROOT/App.tsx"
test -f "$FILE_ROOT/components/layout.tsx"
test -f "$FILE_ROOT/components/permission-gate.tsx"
test -f "$FILE_ROOT/pages/admin.tsx"

echo "[2/5] Checking enterprise permission modules"
grep -Fq '"analytics"' "$FILE_ROOT/pages/admin.tsx"
grep -Fq '"social-listening"' "$FILE_ROOT/pages/admin.tsx"
grep -Fq '"speeches"' "$FILE_ROOT/pages/admin.tsx"

echo "[3/5] Checking route guards"
grep -Fq 'Guarded module="analytics"' "$FILE_ROOT/App.tsx"
grep -Fq 'Guarded module="social-listening"' "$FILE_ROOT/App.tsx"
grep -Fq 'Guarded module="admin"' "$FILE_ROOT/App.tsx"

echo "[4/5] Checking Makueni source audit"
if grep -RniE 'Matungulu|Machakos|Kitui|Kangundo|Mwala|Kathiani|Yatta|Masinga|Mavoko|Mwingi' "$FILE_ROOT" --include='*.tsx' --include='*.ts'; then
  echo "Unexpected non-Makueni reference found"
  exit 1
fi

echo "[5/5] Running production build"
PORT=5174 BASE_PATH=/ pnpm --filter @workspace/commandcentre build

echo "Verification passed."
