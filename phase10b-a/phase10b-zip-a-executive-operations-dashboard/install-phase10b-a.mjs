#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));

const targetPath = path.join(
  cwd,
  "artifacts/commandcentre/src/pages/executive-command.tsx",
);
const sourcePath = path.join(
  packageDir,
  "files/executive-command.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase10b-zip-a-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [targetPath, sourcePath]) {
  if (!fs.existsSync(file)) fail(`Required file missing: ${file}`);
}

const current = fs.readFileSync(targetPath, "utf8");

if (current.includes("EXECUTIVE OPERATIONS DASHBOARD")) {
  fail("Phase 10B ZIP A is already installed.");
}

if (!current.includes("EXECUTIVE COMMAND CENTRE")) {
  fail("Executive Command page anchor not found.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(targetPath, path.join(backupDir, "executive-command.tsx"));

fs.copyFileSync(sourcePath, targetPath);

const verify = fs.readFileSync(targetPath, "utf8");
const checks = [
  verify.includes("EXECUTIVE OPERATIONS DASHBOARD"),
  verify.includes("EXECUTIVE ALERT WALL"),
  verify.includes("URGENT STRATEGIC ACTIONS"),
  verify.includes("PRIORITY WARD WATCHLIST"),
  verify.includes("LIVE OPERATIONS SUMMARY"),
  verify.includes("api/dashboard-intelligence/overview"),
  verify.includes("api/campaign-plan/readiness"),
  verify.includes("api/strategist/actions"),
];

if (checks.some((check) => !check)) {
  fs.copyFileSync(
    path.join(backupDir, "executive-command.tsx"),
    targetPath,
  );
  fail("Verification failed. Original Executive Command page restored.");
}

console.log(`
[OK] Phase 10B ZIP A installed.

Modified:
  ${targetPath}

Backup:
  ${backupDir}

Features:
  - Executive Operations Dashboard
  - Campaign Health
  - Executive Alert Wall
  - Urgent Strategist Actions
  - Priority Ward Watchlist
  - Live Operations Summary
  - Direct command shortcuts

Next:
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
