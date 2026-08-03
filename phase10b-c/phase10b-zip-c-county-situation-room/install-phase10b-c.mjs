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
  "files/command-centre-situation-room.patch.txt",
);
const componentSource = path.join(
  packageDir,
  "files/CountySituationRoom.tsx",
);
const componentTarget = path.join(
  cwd,
  "artifacts/commandcentre/src/components/war-room/CountySituationRoom.tsx",
);
const pageSource = path.join(packageDir, "files/war-room.tsx");

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase10b-zip-c-backup-${stamp}`);

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
  route.includes('router.get("/situation-room"') &&
  currentPage.includes("CountySituationRoom")
) {
  fail("Phase 10B ZIP C is already installed.");
}

const routeAnchor = 'router.get("/incidents", async (_req, res) =>';
if (!route.includes(routeAnchor)) {
  fail("Command Centre route anchor not found.");
}

if (!currentPage.includes("LiveOperationsWall")) {
  fail("Phase 10B ZIP B War Room anchor not found.");
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
  routeVerify.includes('router.get("/situation-room"'),
  pageVerify.includes("CountySituationRoom"),
  pageVerify.includes("SITUATION ROOM"),
  fs.existsSync(componentTarget),
];

if (checks.some((check) => !check)) {
  fs.copyFileSync(path.join(backupDir, "command-centre.ts"), routePath);
  fs.copyFileSync(path.join(backupDir, "war-room.tsx"), pagePath);
  fs.rmSync(componentTarget, { force: true });
  fail("Verification failed. Original files restored.");
}

console.log(`
[OK] Phase 10B ZIP C installed.

Modified:
  ${routePath}
  ${pagePath}

Added:
  ${componentTarget}

Backup:
  ${backupDir}

Next:
  pnpm --filter @workspace/api-server build
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
