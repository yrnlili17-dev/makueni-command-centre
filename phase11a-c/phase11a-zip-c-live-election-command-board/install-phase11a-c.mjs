#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));

const pagePath = path.join(
  cwd,
  "artifacts/commandcentre/src/pages/election-war-room.tsx",
);
const componentSource = path.join(
  packageDir,
  "files/LiveElectionCommandBoard.tsx",
);
const componentTarget = path.join(
  cwd,
  "artifacts/commandcentre/src/components/election/LiveElectionCommandBoard.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase11a-zip-c-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [pagePath, componentSource]) {
  if (!fs.existsSync(file)) fail(`Required file missing: ${file}`);
}

let page = fs.readFileSync(pagePath, "utf8");

if (page.includes("LiveElectionCommandBoard")) {
  fail("Phase 11A ZIP C is already installed.");
}

const importAnchor =
  'import ElectionOperationsCentre from "@/components/election/ElectionOperationsCentre";';
const usageAnchor = `      <ElectionOperationsCentre />`;

if (!page.includes(importAnchor)) {
  fail("Phase 11A ZIP A import anchor not found.");
}

if (!page.includes(usageAnchor)) {
  fail("Election Operations Centre usage anchor not found.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(pagePath, path.join(backupDir, "election-war-room.tsx"));

fs.mkdirSync(path.dirname(componentTarget), { recursive: true });
fs.copyFileSync(componentSource, componentTarget);

page = page.replace(
  importAnchor,
  `${importAnchor}
import LiveElectionCommandBoard from "@/components/election/LiveElectionCommandBoard";`,
  1,
);

page = page.replace(
  usageAnchor,
  `      <LiveElectionCommandBoard />

${usageAnchor}`,
  1,
);

fs.writeFileSync(pagePath, page);

const verify = fs.readFileSync(pagePath, "utf8");
const checks = [
  verify.includes("LiveElectionCommandBoard"),
  verify.includes("<LiveElectionCommandBoard />"),
  verify.includes("<ElectionOperationsCentre />"),
  fs.existsSync(componentTarget),
];

if (checks.some((check) => !check)) {
  fs.copyFileSync(
    path.join(backupDir, "election-war-room.tsx"),
    pagePath,
  );
  fs.rmSync(componentTarget, { force: true });
  fail("Verification failed. Original Election War Room restored.");
}

console.log(`
[OK] Phase 11A ZIP C installed.

Modified:
  ${pagePath}

Added:
  ${componentTarget}

Backup:
  ${backupDir}

Features:
  - Live Election Command Board
  - 30-second automatic refresh
  - Operations health score
  - Executive alert banner
  - Ward readiness heat table
  - Live operations timeline
  - Auto-refresh pause and resume

Next:
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
