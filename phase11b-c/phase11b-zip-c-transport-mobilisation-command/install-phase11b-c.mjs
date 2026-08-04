#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));

const routePath = path.join(
  cwd,
  "artifacts/api-server/src/routes/turnout.ts",
);
const pagePath = path.join(
  cwd,
  "artifacts/commandcentre/src/pages/turnout.tsx",
);
const patchPath = path.join(
  packageDir,
  "files/turnout-gotv-command.patch.txt",
);
const componentSource = path.join(
  packageDir,
  "files/GotvLiveCommandBoard.tsx",
);
const componentTarget = path.join(
  cwd,
  "artifacts/commandcentre/src/components/gotv/GotvLiveCommandBoard.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase11b-zip-c-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [
  routePath,
  pagePath,
  patchPath,
  componentSource,
]) {
  if (!fs.existsSync(file)) fail(`Required file missing: ${file}`);
}

let route = fs.readFileSync(routePath, "utf8");
let page = fs.readFileSync(pagePath, "utf8");

if (
  route.includes('router.get("/operations-centre/live-command"') &&
  page.includes("GotvLiveCommandBoard")
) {
  fail("Phase 11B ZIP C is already installed.");
}

const routeAnchor = "export default router;";
const importAnchor =
  'import GotvOperationsCentre from "@/components/gotv/GotvOperationsCentre";';
const usageAnchor = `      <GotvOperationsCentre />`;

if (!route.includes(routeAnchor)) {
  fail("Turnout route export anchor not found.");
}
if (!page.includes(importAnchor)) {
  fail("Phase 11B ZIP A import anchor not found.");
}
if (!page.includes(usageAnchor)) {
  fail("GOTV Operations Centre usage anchor not found.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(routePath, path.join(backupDir, "turnout.ts"));
fs.copyFileSync(pagePath, path.join(backupDir, "turnout.tsx"));

fs.mkdirSync(path.dirname(componentTarget), { recursive: true });
fs.copyFileSync(componentSource, componentTarget);

route = route.replace(
  routeAnchor,
  fs.readFileSync(patchPath, "utf8") + "\n" + routeAnchor,
  1,
);

page = page.replace(
  importAnchor,
  `${importAnchor}
import GotvLiveCommandBoard from "@/components/gotv/GotvLiveCommandBoard";`,
  1,
);

page = page.replace(
  usageAnchor,
  `      <GotvLiveCommandBoard />

${usageAnchor}`,
  1,
);

fs.writeFileSync(routePath, route);
fs.writeFileSync(pagePath, page);

const routeVerify = fs.readFileSync(routePath, "utf8");
const pageVerify = fs.readFileSync(pagePath, "utf8");

const checks = [
  routeVerify.includes('router.patch("/operations-centre/households/:id"'),
  routeVerify.includes('router.patch("/operations-centre/contacts/:id"'),
  routeVerify.includes('router.patch("/operations-centre/transport/:id"'),
  routeVerify.includes('router.get("/operations-centre/live-command"'),
  pageVerify.includes("GotvLiveCommandBoard"),
  pageVerify.includes("<GotvLiveCommandBoard />"),
  fs.existsSync(componentTarget),
];

if (checks.some((check) => !check)) {
  fs.copyFileSync(path.join(backupDir, "turnout.ts"), routePath);
  fs.copyFileSync(path.join(backupDir, "turnout.tsx"), pagePath);
  fs.rmSync(componentTarget, { force: true });
  fail("Verification failed. Original files restored.");
}

console.log(`
[OK] Phase 11B ZIP C installed.

Modified:
  ${routePath}
  ${pagePath}

Added:
  ${componentTarget}

Backup:
  ${backupDir}

Features:
  - Live GOTV Command Board
  - Mobilisation risk matrix
  - Executive GOTV alerts
  - Live GOTV operations timeline
  - Household, contact and transport update endpoints
  - 30-second automatic refresh

Next:
  pnpm --filter @workspace/api-server build
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
