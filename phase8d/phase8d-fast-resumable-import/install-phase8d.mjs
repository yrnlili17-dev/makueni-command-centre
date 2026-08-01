#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));

const routePath = path.join(
  cwd,
  "artifacts/api-server/src/routes/data-import.ts",
);

const workerTarget = path.join(
  cwd,
  "artifacts/api-server/src/services/data-import-worker.ts",
);

const workerSource = path.join(
  packageDir,
  "files/data-import-worker.ts",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase8d-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [routePath, workerSource]) {
  if (!fs.existsSync(file)) fail(`Required file not found: ${file}`);
}

let route = fs.readFileSync(routePath, "utf8");

if (route.includes("queueImportWorker")) {
  fail("Phase 8D is already installed.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(routePath, path.join(backupDir, "data-import.ts"));

if (fs.existsSync(workerTarget)) {
  fs.copyFileSync(
    workerTarget,
    path.join(backupDir, "data-import-worker.ts"),
  );
}

fs.copyFileSync(workerSource, workerTarget);

const engineImportEnd = '} from "../services/data-import-engine";';

if (!route.includes(engineImportEnd)) {
  fail("Could not locate data-import-engine import.");
}

route = route.replace(
  engineImportEnd,
  `${engineImportEnd}
import {
  cancelImportWorker,
  importWorkerState,
  pauseImportWorker,
  queueImportWorker,
  resumeImportWorker,
} from "../services/data-import-worker";`,
);

const startPattern =
  /router\.post\("\/jobs\/:id\/start", async \(req, res\) => \{[\s\S]*?\n\}\);\n\nrouter\.get\("\/jobs\/:id\/status"/;

if (!startPattern.test(route)) {
  fail("Could not locate the existing start-import route.");
}

const replacement = `router.post("/jobs/:id/start", async (req, res) => {
  try {
    const job = await queueImportWorker(String(req.params.id), {
      duplicatePolicy:
        req.body?.duplicatePolicy === "skip" ? "skip" : "update",
      importWarnings: req.body?.importWarnings !== false,
      batchSize: Number(req.body?.batchSize ?? 1000),
    });

    res.status(202).json(job);
  } catch (error) {
    res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to start import",
    });
  }
});

router.post("/jobs/:id/pause", async (req, res) => {
  try {
    res.json(await pauseImportWorker(String(req.params.id)));
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Unable to pause import",
    });
  }
});

router.post("/jobs/:id/resume", async (req, res) => {
  try {
    const job = await resumeImportWorker(String(req.params.id), {
      duplicatePolicy:
        req.body?.duplicatePolicy === "skip" ? "skip" : "update",
      importWarnings: req.body?.importWarnings !== false,
      batchSize: Number(req.body?.batchSize ?? 1000),
    });

    res.status(202).json(job);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Unable to resume import",
    });
  }
});

router.post("/jobs/:id/cancel", async (req, res) => {
  try {
    res.json(await cancelImportWorker(String(req.params.id)));
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Unable to cancel import",
    });
  }
});

router.get("/jobs/:id/worker", async (req, res) => {
  res.json(importWorkerState(String(req.params.id)));
});

router.get("/jobs/:id/status"`;

route = route.replace(startPattern, replacement);
fs.writeFileSync(routePath, route);

console.log(`
[OK] Phase 8D Fast Resumable Import Worker installed.

Backup:
  ${backupDir}

Added:
  ${workerTarget}

Modified:
  ${routePath}

New behaviour:
  POST /api/data-import/jobs/:id/start returns immediately.
  Import continues in background batches.
  Existing completed rows are skipped on resume.

New endpoints:
  POST /api/data-import/jobs/:id/pause
  POST /api/data-import/jobs/:id/resume
  POST /api/data-import/jobs/:id/cancel
  GET  /api/data-import/jobs/:id/worker

Next:
  pnpm --filter @workspace/api-server build
`);
