#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();
const routePath = path.join(
  cwd,
  "artifacts/api-server/src/routes/intelligence.ts",
);
const serviceDir = path.join(cwd, "artifacts/api-server/src/services");
const servicePath = path.join(
  serviceDir,
  "intelligence-incident-engine.ts",
);
const packageDir = path.dirname(fileURLToPath(import.meta.url));
const sourceService = path.join(
  packageDir,
  "files/intelligence-incident-engine.ts",
);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase6-zip-a-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [routePath, sourceService]) {
  if (!fs.existsSync(file)) fail(`Required file not found: ${file}`);
}

let route = fs.readFileSync(routePath, "utf8");

if (route.includes("PHASE6_INCIDENT_ENGINE")) {
  fail("Phase 6 ZIP A is already installed.");
}

const exportAnchor = "export default router;";
if (!route.includes(exportAnchor)) {
  fail('Could not locate "export default router;" in intelligence.ts.');
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(routePath, path.join(backupDir, "intelligence.ts"));
if (fs.existsSync(servicePath)) {
  fs.copyFileSync(
    servicePath,
    path.join(backupDir, "intelligence-incident-engine.ts"),
  );
}

fs.mkdirSync(serviceDir, { recursive: true });
fs.copyFileSync(sourceService, servicePath);

const importBlock = `
// PHASE6_INCIDENT_ENGINE
import {
  assignIncident,
  buildIncidentChannels,
  getIncident,
  incidentMetrics,
  listIncidents,
  recordIncidentEvent,
  updateIncidentStatus,
} from "../services/intelligence-incident-engine";
`;

const importInsertAt = route.lastIndexOf("\nimport ");
if (importInsertAt === -1) {
  route = importBlock.trimStart() + "\n" + route;
} else {
  const lineEnd = route.indexOf("\n", importInsertAt + 1);
  route =
    route.slice(0, lineEnd + 1) +
    importBlock +
    route.slice(lineEnd + 1);
}

const endpoints = `
// ─── Phase 6: Intelligence Incident Operations Engine ────────────────────────

router.get("/incidents/metrics", async (_req, res) => {
  res.json(await incidentMetrics());
});

router.get("/incidents", async (req, res) => {
  const query = req.query as Record<string, string>;
  res.json(
    await listIncidents({
      status: query.status,
      platform: query.platform,
      threatLevel: query.threatLevel,
    }),
  );
});

router.get("/incidents/:identifier", async (req, res) => {
  const incident = await getIncident(String(req.params.identifier));
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  res.json(incident);
});

router.patch("/incidents/:identifier/assign", async (req, res) => {
  const { assignedTo, dueAt, priority } = req.body ?? {};
  if (!assignedTo) {
    res.status(400).json({ error: "assignedTo is required" });
    return;
  }

  const incident = await assignIncident(String(req.params.identifier), {
    assignedTo,
    dueAt,
    priority,
  });

  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  res.json(incident);
});

router.patch("/incidents/:identifier/status", async (req, res) => {
  const { status, note, actor } = req.body ?? {};
  const allowed = new Set([
    "detected",
    "analysed",
    "awaiting_approval",
    "approved",
    "published",
    "monitoring",
    "closed",
  ]);

  if (!allowed.has(status)) {
    res.status(400).json({ error: "Invalid incident status" });
    return;
  }

  const incident = await updateIncidentStatus(
    String(req.params.identifier),
    { status, note, actor },
  );

  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  res.json(incident);
});

router.post("/incidents/:identifier/events", async (req, res) => {
  const { eventType, actor, note, metadata } = req.body ?? {};
  if (!eventType) {
    res.status(400).json({ error: "eventType is required" });
    return;
  }

  const event = await recordIncidentEvent(
    String(req.params.identifier),
    { eventType, actor, note, metadata },
  );

  if (!event) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  res.status(201).json(event);
});

router.post("/incidents/:identifier/channels", async (req, res) => {
  const output = await buildIncidentChannels(
    String(req.params.identifier),
  );

  if (!output) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  res.json(output);
});

`;

route = route.replace(exportAnchor, endpoints + exportAnchor);
fs.writeFileSync(routePath, route);

console.log(`
[OK] Phase 6 ZIP A installed.

Backup:
  ${backupDir}

Added:
  ${servicePath}

Modified:
  ${routePath}

New API endpoints:
  GET   /api/intelligence/incidents
  GET   /api/intelligence/incidents/metrics
  GET   /api/intelligence/incidents/:identifier
  PATCH /api/intelligence/incidents/:identifier/assign
  PATCH /api/intelligence/incidents/:identifier/status
  POST  /api/intelligence/incidents/:identifier/events
  POST  /api/intelligence/incidents/:identifier/channels

Next:
  pnpm --filter @workspace/api-server build
`);
