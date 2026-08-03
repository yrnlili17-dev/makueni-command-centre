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
const backendPatchPath = path.join(
  packageDir,
  "files/command-centre-operations-wall.patch.txt",
);
const sourceComponent = path.join(
  packageDir,
  "files/LiveOperationsWall.tsx",
);
const sourcePage = path.join(
  packageDir,
  "files/war-room.tsx",
);
const targetComponent = path.join(
  cwd,
  "artifacts/commandcentre/src/components/war-room/LiveOperationsWall.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase10b-zip-b-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [
  routePath,
  pagePath,
  backendPatchPath,
  sourceComponent,
  sourcePage,
]) {
  if (!fs.existsSync(file)) fail(`Required file missing: ${file}`);
}

let route = fs.readFileSync(routePath, "utf8");

if (
  route.includes('router.get("/operations-wall"') &&
  fs.readFileSync(pagePath, "utf8").includes("LiveOperationsWall")
) {
  fail("Phase 10B ZIP B is already installed.");
}

const routeAnchor = 'router.get("/incidents", async (_req, res) =>';
if (!route.includes(routeAnchor)) {
  fail("Command Centre route anchor not found.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(routePath, path.join(backupDir, "command-centre.ts"));
fs.copyFileSync(pagePath, path.join(backupDir, "war-room.tsx"));

fs.mkdirSync(path.dirname(targetComponent), { recursive: true });
fs.copyFileSync(sourceComponent, targetComponent);
fs.copyFileSync(sourcePage, pagePath);

const patch = fs.readFileSync(backendPatchPath, "utf8");
route = route.replace(routeAnchor, patch + routeAnchor, 1);
fs.writeFileSync(routePath, route);

const routeVerify = fs.readFileSync(routePath, "utf8");
const pageVerify = fs.readFileSync(pagePath, "utf8");

const checks = [
  routeVerify.includes("war_room_feed"),
  routeVerify.includes('router.get("/operations-wall"'),
  routeVerify.includes('router.post("/operations-wall"'),
  pageVerify.includes("LiveOperationsWall"),
  fs.existsSync(targetComponent),
];

if (checks.some((check) => !check)) {
  fs.copyFileSync(path.join(backupDir, "command-centre.ts"), routePath);
  fs.copyFileSync(path.join(backupDir, "war-room.tsx"), pagePath);
  fs.rmSync(targetComponent, { force: true });
  fail("Verification failed. Original files restored.");
}

console.log(`
[OK] Phase 10B ZIP B installed.

Modified:
  ${routePath}
  ${pagePath}

Added:
  ${targetComponent}

Backup:
  ${backupDir}

Next:
  pnpm --filter @workspace/api-server build
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
