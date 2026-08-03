#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const target = path.join(
  cwd,
  "artifacts/commandcentre/src/pages/analytics.tsx",
);
const source = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "files/analytics.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase9c-zip-a-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

if (!fs.existsSync(source)) {
  fail(`Package source file is missing: ${source}`);
}

if (!fs.existsSync(target)) {
  fail(
    "Analytics page was not found at artifacts/commandcentre/src/pages/analytics.tsx. No files were changed.",
  );
}

const current = fs.readFileSync(target, "utf8");

if (
  current.includes("Live constituent, geographic, demographic and campaign intelligence")
) {
  fail("Phase 9C ZIP A is already installed.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(target, path.join(backupDir, "analytics.tsx"));
fs.copyFileSync(source, target);

const installed = fs.readFileSync(target, "utf8");

if (!installed.includes("RECENT DATABASE GROWTH")) {
  fs.copyFileSync(path.join(backupDir, "analytics.tsx"), target);
  fail("Installation verification failed. The original page was restored.");
}

console.log(`
[OK] Phase 9C ZIP A installed.

Modified:
  ${target}

Backup:
  ${backupDir}

Live source:
  /api/dashboard-intelligence/overview

Included:
  - Executive KPI cards
  - Support classification
  - Demographic distribution
  - Geographic coverage
  - Top ward analytics
  - Data-quality analytics
  - Recent database growth
  - Existing future tabs kept visible

Next:
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
