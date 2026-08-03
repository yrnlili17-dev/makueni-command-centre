#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));

const targetPath = path.join(
  cwd,
  "artifacts/commandcentre/src/components/election/ElectionOperationsCentre.tsx",
);
const sourcePath = path.join(
  packageDir,
  "files/ElectionOperationsCentre.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase11a-zip-b-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [targetPath, sourcePath]) {
  if (!fs.existsSync(file)) fail(`Required file missing: ${file}`);
}

const current = fs.readFileSync(targetPath, "utf8");

if (current.includes("POLLING-STATION OPENING CHECKLIST")) {
  fail("Phase 11A ZIP B is already installed.");
}

if (!current.includes("PHASE 11A · ELECTION OPERATIONS CENTRE")) {
  fail("Phase 11A ZIP A component anchor not found.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(targetPath, path.join(backupDir, "ElectionOperationsCentre.tsx"));

fs.copyFileSync(sourcePath, targetPath);

const verify = fs.readFileSync(targetPath, "utf8");
const checks = [
  verify.includes("POLLING-STATION OPENING CHECKLIST"),
  verify.includes("ADD AGENT ASSIGNMENT"),
  verify.includes("ADD VEHICLE DEPLOYMENT"),
  verify.includes("ADD OBSERVER"),
  verify.includes("CREATE INCIDENT ESCALATION"),
  verify.includes("/operations-centre/stations/"),
  verify.includes("/operations-centre/agents"),
  verify.includes("/operations-centre/vehicles"),
  verify.includes("/operations-centre/observers"),
  verify.includes("/operations-centre/escalations"),
];

if (checks.some((check) => !check)) {
  fs.copyFileSync(
    path.join(backupDir, "ElectionOperationsCentre.tsx"),
    targetPath,
  );
  fail("Verification failed. Original component restored.");
}

console.log(`
[OK] Phase 11A ZIP B installed.

Modified:
  ${targetPath}

Backup:
  ${backupDir}

Features:
  - Polling-station readiness controls
  - Agent assignment form
  - Vehicle deployment form
  - Observer assignment form
  - Incident escalation form
  - Live refresh after every operation

Next:
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
