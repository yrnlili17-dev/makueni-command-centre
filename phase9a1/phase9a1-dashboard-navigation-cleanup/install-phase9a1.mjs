#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));

const target = path.join(
  cwd,
  "artifacts/commandcentre/src/components/dashboard/LiveDashboardV9A.tsx",
);

const source = path.join(
  packageDir,
  "files/LiveDashboardV9A.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase9a1-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

if (!fs.existsSync(source)) {
  fail(`Package file is missing: ${source}`);
}

if (!fs.existsSync(target)) {
  fail(
    "Phase 9A dashboard component was not found. Install Phase 9A before Phase 9A.1.",
  );
}

const current = fs.readFileSync(target, "utf8");

if (current.includes("Select a category to open its filtered constituent")) {
  fail("Phase 9A.1 is already installed.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(target, path.join(backupDir, "LiveDashboardV9A.tsx"));

fs.copyFileSync(source, target);

console.log(`
[OK] Phase 9A.1 Dashboard Navigation & Production Cleanup installed.

Backup:
  ${backupDir}

Modified:
  ${target}

Production cleanup:
  - Removed the development phase label.
  - Retained the Command Overview title.
  - Added keyboard-accessible clickable cards.
  - Added hover, focus and navigation indicators.
  - Kept unavailable modules visible and clickable.

Navigation:
  Total Constituents -> /voters-db
  Phone Ready -> /voters-db?contact=phone
  Wards Covered -> /segments?category=geographic
  Open Threats -> /intelligence?tab=incidents
  Active Volunteers -> /volunteers
  Messages Sent -> /messaging
  Doors Knocked -> /field-ops
  Upcoming Events -> /events

Next:
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
