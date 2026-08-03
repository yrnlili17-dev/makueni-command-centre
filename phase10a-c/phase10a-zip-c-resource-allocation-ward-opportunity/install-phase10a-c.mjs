#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));

const routePath = path.join(
  cwd,
  "artifacts/api-server/src/routes/strategist.ts",
);
const pagePath = path.join(
  cwd,
  "artifacts/commandcentre/src/pages/strategist.tsx",
);
const backendPatchPath = path.join(
  packageDir,
  "files/strategist-resource-allocation.patch.txt",
);
const sourceComponent = path.join(
  packageDir,
  "files/WardOpportunityEngine.tsx",
);
const targetComponent = path.join(
  cwd,
  "artifacts/commandcentre/src/components/strategist/WardOpportunityEngine.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase10a-zip-c-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [
  routePath,
  pagePath,
  backendPatchPath,
  sourceComponent,
]) {
  if (!fs.existsSync(file)) fail(`Required file missing: ${file}`);
}

let route = fs.readFileSync(routePath, "utf8");
let page = fs.readFileSync(pagePath, "utf8");
const backendPatch = fs.readFileSync(backendPatchPath, "utf8");

if (
  route.includes('router.get("/resource-allocation"') &&
  page.includes("WardOpportunityEngine")
) {
  fail("Phase 10A ZIP C is already installed.");
}

const routeAnchor = 'router.get("/conversations", async (req, res) => {';
const importAnchor =
  'import DailyBriefingActionQueue from "@/components/strategist/DailyBriefingActionQueue";';
const queueAnchor = `        <DailyBriefingActionQueue
          onPrompt={(prompt) => void sendMessage(prompt)}
        />`;

if (!route.includes(routeAnchor)) {
  fail("Strategist route anchor not found.");
}
if (!page.includes(importAnchor)) {
  fail("Daily Briefing import anchor not found.");
}
if (!page.includes(queueAnchor)) {
  fail("Daily Briefing usage anchor not found.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(routePath, path.join(backupDir, "strategist.ts"));
fs.copyFileSync(pagePath, path.join(backupDir, "strategist.tsx"));
fs.mkdirSync(path.dirname(targetComponent), { recursive: true });
fs.copyFileSync(sourceComponent, targetComponent);

route = route.replace(routeAnchor, backendPatch + routeAnchor, 1);

page = page.replace(
  importAnchor,
  `${importAnchor}
import WardOpportunityEngine from "@/components/strategist/WardOpportunityEngine";`,
  1,
);

page = page.replace(
  queueAnchor,
  `${queueAnchor}
        <WardOpportunityEngine
          onPrompt={(prompt) => void sendMessage(prompt)}
        />`,
  1,
);

fs.writeFileSync(routePath, route);
fs.writeFileSync(pagePath, page);

const routeVerify = fs.readFileSync(routePath, "utf8");
const pageVerify = fs.readFileSync(pagePath, "utf8");

const checks = [
  routeVerify.includes("strategist_resource_recommendations"),
  routeVerify.includes('router.get("/resource-allocation"'),
  routeVerify.includes('router.post("/resource-allocation/:ward/action"'),
  pageVerify.includes("WardOpportunityEngine"),
  pageVerify.includes("onPrompt={(prompt) => void sendMessage(prompt)}"),
  fs.existsSync(targetComponent),
];

if (checks.some((check) => !check)) {
  fs.copyFileSync(path.join(backupDir, "strategist.ts"), routePath);
  fs.copyFileSync(path.join(backupDir, "strategist.tsx"), pagePath);
  fs.rmSync(targetComponent, { force: true });
  fail("Verification failed. Original files restored.");
}

console.log(`
[OK] Phase 10A ZIP C installed.

Modified:
  ${routePath}
  ${pagePath}

Added:
  ${targetComponent}

Backup:
  ${backupDir}

Features:
  - Ward opportunity score
  - Ward risk score
  - Volunteer allocation
  - Field-visit allocation
  - Messaging priority
  - Contact-recovery priority
  - Support-classification priority
  - Add recommendation to Action Queue
  - Ask Chief Strategist for a ward plan

Next:
  pnpm --filter @workspace/api-server build
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
