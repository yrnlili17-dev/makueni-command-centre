#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));

const targetPath = path.join(
  cwd,
  "artifacts/commandcentre/src/components/gotv/GotvOperationsCentre.tsx",
);
const sourcePath = path.join(
  packageDir,
  "files/GotvOperationsCentre.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase11b-zip-b-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [targetPath, sourcePath]) {
  if (!fs.existsSync(file)) fail(`Required file missing: ${file}`);
}

const current = fs.readFileSync(targetPath, "utf8");

if (current.includes("ADD HOUSEHOLD VISIT")) {
  fail("Phase 11B ZIP B is already installed.");
}

if (!current.includes("PHASE 11B · GOTV OPERATIONS CENTRE")) {
  fail("Phase 11B ZIP A component anchor not found.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(targetPath, path.join(backupDir, "GotvOperationsCentre.tsx"));

fs.copyFileSync(sourcePath, targetPath);

const verify = fs.readFileSync(targetPath, "utf8");
const checks = [
  verify.includes("ADD HOUSEHOLD VISIT"),
  verify.includes("ADD CONTACT QUEUE ITEM"),
  verify.includes("ADD VOTER TRANSPORT REQUEST"),
  verify.includes("SET WARD GOTV TARGETS"),
  verify.includes("/operations-centre/households"),
  verify.includes("/operations-centre/contacts"),
  verify.includes("/operations-centre/transport"),
  verify.includes("/operations-centre/targets"),
];

if (checks.some((check) => !check)) {
  fs.copyFileSync(
    path.join(backupDir, "GotvOperationsCentre.tsx"),
    targetPath,
  );
  fail("Verification failed. Original component restored.");
}

console.log(`
[OK] Phase 11B ZIP B installed.

Modified:
  ${targetPath}

Backup:
  ${backupDir}

Features:
  - Household canvassing form
  - Contact-centre queue form
  - Voter transport request form
  - Ward GOTV target form
  - Live tables and refresh after each operation

Next:
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
