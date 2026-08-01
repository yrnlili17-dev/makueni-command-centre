#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();
const routesIndex = path.join(cwd, "artifacts/api-server/src/routes/index.ts");
const routeTarget = path.join(cwd, "artifacts/api-server/src/routes/local-intelligence.ts");
const serviceTarget = path.join(cwd, "artifacts/api-server/src/services/local-intelligence-engine.ts");
const packageDir = path.dirname(fileURLToPath(import.meta.url));
const routeSource = path.join(packageDir, "files/local-intelligence.ts");
const serviceSource = path.join(packageDir, "files/local-intelligence-engine.ts");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase6-zip-c-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [routesIndex, routeSource, serviceSource]) {
  if (!fs.existsSync(file)) fail(`Required file not found: ${file}`);
}

let index = fs.readFileSync(routesIndex, "utf8");

if (index.includes('from "./local-intelligence"')) {
  fail("Phase 6 ZIP C is already installed.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(routesIndex, path.join(backupDir, "routes-index.ts"));
if (fs.existsSync(routeTarget)) {
  fs.copyFileSync(routeTarget, path.join(backupDir, "local-intelligence.ts"));
}
if (fs.existsSync(serviceTarget)) {
  fs.copyFileSync(serviceTarget, path.join(backupDir, "local-intelligence-engine.ts"));
}

fs.copyFileSync(routeSource, routeTarget);
fs.copyFileSync(serviceSource, serviceTarget);

const importAnchor = 'import commandCentreRouter from "./command-centre";';
if (!index.includes(importAnchor)) {
  fail("Could not locate the command-centre router import.");
}

index = index.replace(
  importAnchor,
  `${importAnchor}\nimport localIntelligenceRouter from "./local-intelligence";`,
);

const mountAnchor = 'router.use("/command-centre", commandCentreRouter);';
if (!index.includes(mountAnchor)) {
  fail("Could not locate the command-centre router mount.");
}

index = index.replace(
  mountAnchor,
  `${mountAnchor}\nrouter.use("/local-intelligence", localIntelligenceRouter);`,
);

fs.writeFileSync(routesIndex, index);

console.log(`
[OK] Phase 6 ZIP C installed.

Backup:
  ${backupDir}

Added:
  ${routeTarget}
  ${serviceTarget}

Modified:
  ${routesIndex}

New endpoints:
  POST /api/local-intelligence/analyse
  POST /api/local-intelligence/mentions/:id/analyse
  GET  /api/local-intelligence/brief
  POST /api/local-intelligence/batch-analyse

Next:
  pnpm --filter @workspace/api-server build
`);
