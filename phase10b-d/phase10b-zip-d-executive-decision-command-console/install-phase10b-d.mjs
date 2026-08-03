#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));

const routePath = path.join(
  cwd,
  "artifacts/api-server/src/routes/command-centre.ts",
);
const pagePath = path.join(
  cwd,
  "artifacts/commandcentre/src/pages/war-room.tsx",
);
const patchPath = path.join(
  packageDir,
  "files/command-centre-executive-decisions.patch.txt",
);
const componentSource = path.join(
  packageDir,
  "files/ExecutiveDecisionConsole.tsx",
);
const componentTarget = path.join(
  cwd,
  "artifacts/commandcentre/src/components/war-room/ExecutiveDecisionConsole.tsx",
);
const pageSource = path.join(packageDir, "files/war-room.tsx");

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase10b-zip-d-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [
  routePath,
  pagePath,
  patchPath,
  componentSource,
  pageSource,
]) {
  if (!fs.existsSync(file)) fail(`Required file missing: ${file}`);
}

let route = fs.readFileSync(routePath, "utf8");
const currentPage = fs.readFileSync(pagePath, "utf8");

if (
  route.includes('router.get("/executive-decisions"') &&
  currentPage.includes("ExecutiveDecisionConsole")
) {
  fail("Phase 10B ZIP D is already installed.");
}

const routeAnchor = 'router.get("/incidents", async (_req, res) =>';

if (!route.includes(routeAnchor)) {
  fail("Command Centre route anchor not found.");
}

if (!currentPage.includes("CountySituationRoom")) {
  fail("Phase 10B ZIP C War Room anchor not found.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(routePath, path.join(backupDir, "command-centre.ts"));
fs.copyFileSync(pagePath, path.join(backupDir, "war-room.tsx"));

fs.mkdirSync(path.dirname(componentTarget), { recursive: true });
fs.copyFileSync(componentSource, componentTarget);
fs.copyFileSync(pageSource, pagePath);

const patch = fs.readFileSync(patchPath, "utf8");
route = route.replace(routeAnchor, patch + routeAnchor, 1);
fs.writeFileSync(routePath, route);

const routeVerify = fs.readFileSync(routePath, "utf8");
const pageVerify = fs.readFileSync(pagePath, "utf8");

const checks = [
  routeVerify.includes("executive_decisions"),
  routeVerify.includes("executive_audit_log"),
  routeVerify.includes('router.get("/executive-decisions"'),
  routeVerify.includes('router.post("/executive-decisions/generate"'),
  routeVerify.includes('router.get("/executive-audit"'),
  pageVerify.includes("ExecutiveDecisionConsole"),
  pageVerify.includes("DECISION CONSOLE"),
  fs.existsSync(componentTarget),
];

if (checks.some((check) => !check)) {
  fs.copyFileSync(path.join(backupDir, "command-centre.ts"), routePath);
  fs.copyFileSync(path.join(backupDir, "war-room.tsx"), pagePath);
  fs.rmSync(componentTarget, { force: true });
  fail("Verification failed. Original files restored.");
}

console.log(`
[OK] Phase 10B ZIP D installed.

Modified:
  ${routePath}
  ${pagePath}

Added:
  ${componentTarget}

Backup:
  ${backupDir}

Features:
  - Executive Decision Console
  - Automatic decision generation
  - Decision approval and tracking
  - Executive audit trail
  - Owner and priority assignment
  - Persistent command records

Next:
  pnpm --filter @workspace/api-server build
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
