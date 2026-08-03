#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));

const routePath = path.join(
  cwd,
  "artifacts/api-server/src/routes/election-day.ts",
);
const pagePath = path.join(
  cwd,
  "artifacts/commandcentre/src/pages/election-war-room.tsx",
);
const patchPath = path.join(
  packageDir,
  "files/election-day-operations-centre.patch.txt",
);
const componentSource = path.join(
  packageDir,
  "files/ElectionOperationsCentre.tsx",
);
const componentTarget = path.join(
  cwd,
  "artifacts/commandcentre/src/components/election/ElectionOperationsCentre.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase11a-zip-a-backup-${stamp}`);

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
  route.includes('router.get("/operations-centre"') &&
  page.includes("ElectionOperationsCentre")
) {
  fail("Phase 11A ZIP A is already installed.");
}

const routeAnchor = "export default router;";
const importAnchor =
  'import { CAMPAIGN_OPERATIONS } from "../config/campaign-operations";';
const pageAnchor = `      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">`;

if (!route.includes(routeAnchor)) {
  fail("Election Day route export anchor not found.");
}
if (!page.includes(importAnchor)) {
  fail("Election War Room import anchor not found.");
}
if (!page.includes(pageAnchor)) {
  fail("Election War Room KPI grid anchor not found.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(routePath, path.join(backupDir, "election-day.ts"));
fs.copyFileSync(pagePath, path.join(backupDir, "election-war-room.tsx"));

fs.mkdirSync(path.dirname(componentTarget), { recursive: true });
fs.copyFileSync(componentSource, componentTarget);

const patch = fs.readFileSync(patchPath, "utf8");
route = route.replace(routeAnchor, patch + "\n" + routeAnchor, 1);

page = page.replace(
  importAnchor,
  `${importAnchor}
import ElectionOperationsCentre from "@/components/election/ElectionOperationsCentre";`,
  1,
);

page = page.replace(
  pageAnchor,
  `      <ElectionOperationsCentre />

${pageAnchor}`,
  1,
);

fs.writeFileSync(routePath, route);
fs.writeFileSync(pagePath, page);

const routeVerify = fs.readFileSync(routePath, "utf8");
const pageVerify = fs.readFileSync(pagePath, "utf8");

const checks = [
  routeVerify.includes("election_station_readiness"),
  routeVerify.includes("election_agent_operations"),
  routeVerify.includes("election_vehicle_deployments"),
  routeVerify.includes("election_observer_assignments"),
  routeVerify.includes("election_incident_escalations"),
  routeVerify.includes('router.get("/operations-centre"'),
  pageVerify.includes("ElectionOperationsCentre"),
  fs.existsSync(componentTarget),
];

if (checks.some((check) => !check)) {
  fs.copyFileSync(path.join(backupDir, "election-day.ts"), routePath);
  fs.copyFileSync(
    path.join(backupDir, "election-war-room.tsx"),
    pagePath,
  );
  fs.rmSync(componentTarget, { force: true });
  fail("Verification failed. Original files restored.");
}

console.log(`
[OK] Phase 11A ZIP A installed.

Modified:
  ${routePath}
  ${pagePath}

Added:
  ${componentTarget}

Backup:
  ${backupDir}

Features:
  - Polling-station readiness
  - Agent operations
  - Vehicle deployment
  - Observer management
  - Incident escalation matrix
  - Ward readiness index

Next:
  pnpm --filter @workspace/api-server build
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
