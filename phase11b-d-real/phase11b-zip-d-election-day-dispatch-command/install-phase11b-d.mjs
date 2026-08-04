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
  "files/turnout-election-dispatch.patch.txt",
);
const componentSource = path.join(
  packageDir,
  "files/ElectionDayDispatchCommand.tsx",
);
const componentTarget = path.join(
  cwd,
  "artifacts/commandcentre/src/components/gotv/ElectionDayDispatchCommand.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase11b-zip-d-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [routePath, pagePath, patchPath, componentSource]) {
  if (!fs.existsSync(file)) fail(`Required file missing: ${file}`);
}

let route = fs.readFileSync(routePath, "utf8");
let page = fs.readFileSync(pagePath, "utf8");

if (
  route.includes('router.get("/operations-centre/election-dispatch"') &&
  page.includes("ElectionDayDispatchCommand")
) {
  fail("Phase 11B ZIP D is already installed.");
}

const routeAnchor = "export default router;";
const importAnchor =
  'import GotvLiveCommandBoard from "@/components/gotv/GotvLiveCommandBoard";';
const usageAnchor = `      <GotvLiveCommandBoard />`;

if (!route.includes(routeAnchor)) {
  fail("Turnout route export anchor not found.");
}
if (!page.includes(importAnchor)) {
  fail("Phase 11B ZIP C import anchor not found.");
}
if (!page.includes(usageAnchor)) {
  fail("GOTV Live Command Board usage anchor not found.");
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
import ElectionDayDispatchCommand from "@/components/gotv/ElectionDayDispatchCommand";`,
  1,
);

page = page.replace(
  usageAnchor,
  `${usageAnchor}

      <ElectionDayDispatchCommand />`,
  1,
);

fs.writeFileSync(routePath, route);
fs.writeFileSync(pagePath, page);

const routeVerify = fs.readFileSync(routePath, "utf8");
const pageVerify = fs.readFileSync(pagePath, "utf8");

const checks = [
  routeVerify.includes("gotv_polling_dispatch"),
  routeVerify.includes("gotv_dispatch_incidents"),
  routeVerify.includes('router.get("/operations-centre/election-dispatch"'),
  routeVerify.includes(
    'router.patch("/operations-centre/election-dispatch/stations/:code"',
  ),
  routeVerify.includes(
    'router.post("/operations-centre/election-dispatch/incidents"',
  ),
  pageVerify.includes("ElectionDayDispatchCommand"),
  pageVerify.includes("<ElectionDayDispatchCommand />"),
  fs.existsSync(componentTarget),
];

if (checks.some((check) => !check)) {
  fs.copyFileSync(path.join(backupDir, "turnout.ts"), routePath);
  fs.copyFileSync(path.join(backupDir, "turnout.tsx"), pagePath);
  fs.rmSync(componentTarget, { force: true });
  fail("Verification failed. Original files restored.");
}

console.log(`
[OK] Phase 11B ZIP D installed.

Modified:
  ${routePath}
  ${pagePath}

Added:
  ${componentTarget}

Backup:
  ${backupDir}

Features:
  - Election Day Dispatch Command
  - Polling station opening status
  - Agent presence monitoring
  - Device and materials status
  - Queue monitoring
  - Hourly turnout capture
  - Election incident command

Next:
  pnpm --filter @workspace/api-server build
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
