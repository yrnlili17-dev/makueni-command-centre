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
  "files/ElectionReadinessSitrep.tsx",
);
const componentTarget = path.join(
  cwd,
  "artifacts/commandcentre/src/components/election/ElectionReadinessSitrep.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase11a-zip-d-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [pagePath, componentSource]) {
  if (!fs.existsSync(file)) fail(`Required file missing: ${file}`);
}

let page = fs.readFileSync(pagePath, "utf8");

if (page.includes("ElectionReadinessSitrep")) {
  fail("Phase 11A ZIP D is already installed.");
}

const importAnchor =
  'import LiveElectionCommandBoard from "@/components/election/LiveElectionCommandBoard";';
const usageAnchor = `      <LiveElectionCommandBoard />`;

if (!page.includes(importAnchor)) {
  fail("Phase 11A ZIP C import anchor not found.");
}

if (!page.includes(usageAnchor)) {
  fail("Live Election Command Board usage anchor not found.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(pagePath, path.join(backupDir, "election-war-room.tsx"));

fs.mkdirSync(path.dirname(componentTarget), { recursive: true });
fs.copyFileSync(componentSource, componentTarget);

page = page.replace(
  importAnchor,
  `${importAnchor}
import ElectionReadinessSitrep from "@/components/election/ElectionReadinessSitrep";`,
  1,
);

page = page.replace(
  usageAnchor,
  `${usageAnchor}

      <ElectionReadinessSitrep />`,
  1,
);

fs.writeFileSync(pagePath, page);

const verify = fs.readFileSync(pagePath, "utf8");
const checks = [
  verify.includes("ElectionReadinessSitrep"),
  verify.includes("<ElectionReadinessSitrep />"),
  verify.includes("<LiveElectionCommandBoard />"),
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
[OK] Phase 11A ZIP D installed.

Modified:
  ${pagePath}

Added:
  ${componentTarget}

Backup:
  ${backupDir}

Features:
  - Election Readiness SITREP
  - Executive findings
  - Command recommendations
  - Ward readiness annex
  - Downloadable report
  - Print support

Next:
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
