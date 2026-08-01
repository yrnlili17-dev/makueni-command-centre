#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));

const routesIndex = path.join(
  cwd,
  "artifacts/api-server/src/routes/index.ts",
);
const packageJson = path.join(
  cwd,
  "artifacts/api-server/package.json",
);
const serviceTarget = path.join(
  cwd,
  "artifacts/api-server/src/services/data-import-engine.ts",
);
const routeTarget = path.join(
  cwd,
  "artifacts/api-server/src/routes/data-import.ts",
);

const serviceSource = path.join(
  packageDir,
  "files/data-import-engine.ts",
);
const routeSource = path.join(
  packageDir,
  "files/data-import.ts",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase8a-zip-a-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [
  routesIndex,
  packageJson,
  serviceSource,
  routeSource,
]) {
  if (!fs.existsSync(file)) {
    fail(`Required file not found: ${file}`);
  }
}

let index = fs.readFileSync(routesIndex, "utf8");
const packageData = JSON.parse(fs.readFileSync(packageJson, "utf8"));

if (index.includes('from "./data-import"')) {
  fail("Phase 8A ZIP A is already installed.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(routesIndex, path.join(backupDir, "routes-index.ts"));
fs.copyFileSync(packageJson, path.join(backupDir, "api-server-package.json"));

if (fs.existsSync(serviceTarget)) {
  fs.copyFileSync(
    serviceTarget,
    path.join(backupDir, "data-import-engine.ts"),
  );
}

if (fs.existsSync(routeTarget)) {
  fs.copyFileSync(
    routeTarget,
    path.join(backupDir, "data-import.ts"),
  );
}

fs.copyFileSync(serviceSource, serviceTarget);
fs.copyFileSync(routeSource, routeTarget);

const importAnchor =
  'import commandCentreRouter from "./command-centre";';

if (!index.includes(importAnchor)) {
  fail("Could not locate command-centre router import.");
}

index = index.replace(
  importAnchor,
  `${importAnchor}\nimport dataImportRouter from "./data-import";`,
);

const mountAnchor =
  'router.use("/command-centre", commandCentreRouter);';

if (!index.includes(mountAnchor)) {
  fail("Could not locate command-centre router mount.");
}

index = index.replace(
  mountAnchor,
  `${mountAnchor}\nrouter.use("/data-import", dataImportRouter);`,
);

fs.writeFileSync(routesIndex, index);

packageData.dependencies ??= {};
if (!packageData.dependencies.xlsx) {
  packageData.dependencies.xlsx = "^0.18.5";
}
fs.writeFileSync(packageJson, `${JSON.stringify(packageData, null, 2)}\n`);

console.log(`
[OK] Phase 8A ZIP A installed.

Backup:
  ${backupDir}

Added:
  ${serviceTarget}
  ${routeTarget}

Modified:
  ${routesIndex}
  ${packageJson}

New API:
  GET  /api/data-import/health
  GET  /api/data-import/jobs
  POST /api/data-import/upload
  GET  /api/data-import/jobs/:id
  PUT  /api/data-import/jobs/:id/map
  POST /api/data-import/jobs/:id/validate
  GET  /api/data-import/jobs/:id/preview
  POST /api/data-import/jobs/:id/start
  GET  /api/data-import/jobs/:id/status
  GET  /api/data-import/jobs/:id/report

Required next steps:
  pnpm install
  pnpm --filter @workspace/api-server build
`);
