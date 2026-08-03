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
  "files/strategist-playbooks.patch.txt",
);
const sourceComponent = path.join(
  packageDir,
  "files/StrategyPlaybookWorkspace.tsx",
);
const targetComponent = path.join(
  cwd,
  "artifacts/commandcentre/src/components/strategist/StrategyPlaybookWorkspace.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase10a-zip-d-backup-${stamp}`);

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
  route.includes("strategist_playbooks") &&
  page.includes("StrategyPlaybookWorkspace")
) {
  fail("Phase 10A ZIP D is already installed.");
}

const routeAnchor = 'router.get("/conversations", async (req, res) => {';
const importAnchor =
  'import WardOpportunityEngine from "@/components/strategist/WardOpportunityEngine";';
const wardAnchor = `        <WardOpportunityEngine
          onPrompt={(prompt) => void sendMessage(prompt)}
        />`;

if (!route.includes(routeAnchor)) {
  fail("Strategist route anchor not found.");
}
if (!page.includes(importAnchor)) {
  fail("Ward Opportunity import anchor not found.");
}
if (!page.includes(wardAnchor)) {
  fail("Ward Opportunity usage anchor not found.");
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
import StrategyPlaybookWorkspace from "@/components/strategist/StrategyPlaybookWorkspace";`,
  1,
);

page = page.replace(
  wardAnchor,
  `${wardAnchor}
        <StrategyPlaybookWorkspace
          onPrompt={(prompt) => void sendMessage(prompt)}
        />`,
  1,
);

fs.writeFileSync(routePath, route);
fs.writeFileSync(pagePath, page);

const routeVerify = fs.readFileSync(routePath, "utf8");
const pageVerify = fs.readFileSync(pagePath, "utf8");

const checks = [
  routeVerify.includes("strategist_playbooks"),
  routeVerify.includes('router.get("/playbooks"'),
  routeVerify.includes('router.post("/playbooks/generate"'),
  routeVerify.includes('router.post("/playbooks/:id/actions"'),
  pageVerify.includes("StrategyPlaybookWorkspace"),
  fs.existsSync(targetComponent),
];

if (checks.some((check) => !check)) {
  fs.copyFileSync(path.join(backupDir, "strategist.ts"), routePath);
  fs.copyFileSync(path.join(backupDir, "strategist.tsx"), pagePath);
  fs.rmSync(targetComponent, { force: true });
  fail("Verification failed. Original files restored.");
}

console.log(`
[OK] Phase 10A ZIP D installed.

Modified:
  ${routePath}
  ${pagePath}

Added:
  ${targetComponent}

Backup:
  ${backupDir}

Features:
  - Persistent strategy playbooks
  - Six playbook templates
  - Live database-grounded generation
  - Draft, active, completed and archived states
  - Downloadable playbooks
  - Chief Strategist review
  - Convert playbook actions into the Action Queue

Next:
  pnpm --filter @workspace/api-server build
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
