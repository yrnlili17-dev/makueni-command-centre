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
const sourceComponent = path.join(
  packageDir,
  "files/DailyBriefingActionQueue.tsx",
);
const targetComponent = path.join(
  cwd,
  "artifacts/commandcentre/src/components/strategist/DailyBriefingActionQueue.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase10a-zip-b-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [routePath, pagePath, sourceComponent]) {
  if (!fs.existsSync(file)) fail(`Required file missing: ${file}`);
}

let route = fs.readFileSync(routePath, "utf8");
let page = fs.readFileSync(pagePath, "utf8");

if (
  route.includes("strategist_action_queue") &&
  page.includes("DailyBriefingActionQueue")
) {
  fail("Phase 10A ZIP B is already installed.");
}

const routeAnchor = `router.get("/conversations", async (req, res) => {`;
const importAnchor =
  'import ExecutiveStrategistBriefing from "@/components/strategist/ExecutiveStrategistBriefing";';
const briefingAnchor = `        <ExecutiveStrategistBriefing
          overview={dashboardOverview}
          readiness={campaignReadiness}
          onPrompt={(prompt) => void sendMessage(prompt)}
        />`;

if (!route.includes(routeAnchor)) {
  fail("Strategist route insertion anchor not found.");
}
if (!page.includes(importAnchor)) {
  fail("Phase 10A ZIP A import anchor not found.");
}
if (!page.includes(briefingAnchor)) {
  fail("Executive briefing usage anchor not found.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(routePath, path.join(backupDir, "strategist.ts"));
fs.copyFileSync(pagePath, path.join(backupDir, "strategist.tsx"));
fs.mkdirSync(path.dirname(targetComponent), { recursive: true });
fs.copyFileSync(sourceComponent, targetComponent);

const backendPatch = String.raw`
async function ensureStrategistOperationsTables() {
  await db.execute(sql.raw(\`
    CREATE TABLE IF NOT EXISTS strategist_daily_briefings (
      id bigserial PRIMARY KEY,
      briefing_date date NOT NULL DEFAULT current_date,
      title text NOT NULL,
      summary text NOT NULL,
      priorities jsonb NOT NULL DEFAULT '[]'::jsonb,
      risks jsonb NOT NULL DEFAULT '[]'::jsonb,
      opportunities jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS strategist_action_queue (
      id bigserial PRIMARY KEY,
      title text NOT NULL,
      description text,
      category text NOT NULL DEFAULT 'executive',
      priority text NOT NULL DEFAULT 'high',
      status text NOT NULL DEFAULT 'pending',
      owner text,
      due_date date,
      source text DEFAULT 'manual',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  \`));
}

router.get("/briefings", async (req, res) => {
  try {
    await ensureStrategistOperationsTables();
    const result = await db.execute(sql.raw(\`
      SELECT
        id,
        briefing_date AS "briefingDate",
        title,
        summary,
        priorities,
        risks,
        opportunities,
        created_at AS "createdAt"
      FROM strategist_daily_briefings
      ORDER BY briefing_date DESC, id DESC
      LIMIT 30
    \`));
    res.json(result.rows);
  } catch (err) {
    req.log.error({ err }, "strategist briefings list failed");
    res.status(500).json({ error: "Failed to load strategist briefings" });
  }
});

router.post("/briefings/generate", async (req, res) => {
  try {
    await ensureStrategistOperationsTables();
    const digest = await buildLiveDigest();

    const metrics = await db.execute(sql.raw(\`
      SELECT
        (SELECT count(*) FROM campaign_constituents)::integer AS constituents,
        (SELECT count(*) FROM campaign_constituents
          WHERE phone IS NULL OR btrim(phone) = '')::integer AS missing_phone,
        (SELECT count(DISTINCT ward) FROM campaign_constituents
          WHERE ward IS NOT NULL AND btrim(ward) <> '')::integer AS wards,
        (SELECT count(*) FROM narrative_mentions
          WHERE status = 'open')::integer AS threats,
        (SELECT count(*) FROM milestones
          WHERE status <> 'completed')::integer AS pending_milestones
    \`));

    const row = metrics.rows[0] as any;
    const constituents = Number(row?.constituents ?? 0);
    const missingPhone = Number(row?.missing_phone ?? 0);
    const phoneCoverage = constituents > 0
      ? Math.round(((constituents - missingPhone) / constituents) * 100)
      : 0;
    const threats = Number(row?.threats ?? 0);
    const pendingMilestones = Number(row?.pending_milestones ?? 0);
    const wards = Number(row?.wards ?? 0);

    const priorities = [
      pendingMilestones > 0
        ? \`Close or assign the \${pendingMilestones} incomplete campaign milestones.\`
        : "Protect completed campaign milestones and prepare the next delivery cycle.",
      phoneCoverage < 70
        ? \`Recover missing contacts; phone coverage is currently \${phoneCoverage}%.\`
        : \`Maintain phone coverage at \${phoneCoverage}% and improve secondary contact channels.\`,
      threats > 0
        ? \`Review and assign owners to \${threats} open narrative threats.\`
        : "Continue proactive narrative monitoring.",
      \`Expand field and volunteer activity across the \${wards} imported wards.\`,
      "Begin measurable support classification and persuasion tracking.",
    ];

    const risks = [
      phoneCoverage < 70
        ? "Low phone coverage limits direct voter contact."
        : "Contact coverage requires continued maintenance.",
      threats > 0
        ? \`\${threats} open narrative threats may affect campaign confidence.\`
        : "No open narrative threats detected.",
      pendingMilestones > 0
        ? \`\${pendingMilestones} incomplete milestones may delay readiness.\`
        : "No incomplete milestone risk detected.",
    ];

    const opportunities = [
      \`\${constituents.toLocaleString()} constituent records are available for structured outreach.\`,
      \`\${wards} imported wards can support targeted field deployment.\`,
      "Daily strategist briefings can now convert live data into assigned action.",
    ];

    const summary =
      \`The live campaign database contains \${constituents.toLocaleString()} constituents across \${wards} imported wards. \` +
      \`Phone coverage is \${phoneCoverage}%. There are \${pendingMilestones} incomplete milestones and \${threats} open narrative threats. \` +
      "Immediate emphasis should be placed on execution discipline, voter contact recovery, field activation and measurable support classification.";

    const title = \`Daily Executive Briefing — \${new Date().toISOString().slice(0, 10)}\`;

    const inserted = await db.execute(sql.raw(\`
      INSERT INTO strategist_daily_briefings (
        briefing_date,
        title,
        summary,
        priorities,
        risks,
        opportunities
      )
      VALUES (
        current_date,
        $1,
        $2,
        $3::jsonb,
        $4::jsonb,
        $5::jsonb
      )
      RETURNING
        id,
        briefing_date AS "briefingDate",
        title,
        summary,
        priorities,
        risks,
        opportunities,
        created_at AS "createdAt"
    \`, [
      title,
      summary,
      JSON.stringify(priorities),
      JSON.stringify(risks),
      JSON.stringify(opportunities),
    ]));

    res.status(201).json({
      ...(inserted.rows[0] as any),
      liveDigest: digest,
    });
  } catch (err) {
    req.log.error({ err }, "strategist briefing generate failed");
    res.status(500).json({ error: "Failed to generate executive briefing" });
  }
});

router.get("/actions", async (req, res) => {
  try {
    await ensureStrategistOperationsTables();
    const result = await db.execute(sql.raw(\`
      SELECT
        id,
        title,
        description,
        category,
        priority,
        status,
        owner,
        due_date AS "dueDate",
        source,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM strategist_action_queue
      ORDER BY
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        CASE status
          WHEN 'pending' THEN 1
          WHEN 'in_progress' THEN 2
          WHEN 'deferred' THEN 3
          ELSE 4
        END,
        id DESC
    \`));
    res.json(result.rows);
  } catch (err) {
    req.log.error({ err }, "strategist actions list failed");
    res.status(500).json({ error: "Failed to load strategist actions" });
  }
});

router.post("/actions", async (req, res) => {
  try {
    await ensureStrategistOperationsTables();
    const body = req.body as any;
    const title = String(body?.title ?? "").trim();

    if (!title) {
      res.status(400).json({ error: "title required" });
      return;
    }

    const allowedPriorities = new Set(["critical", "high", "medium", "low"]);
    const allowedStatuses = new Set([
      "pending",
      "in_progress",
      "completed",
      "deferred",
    ]);

    const priority = allowedPriorities.has(body?.priority)
      ? body.priority
      : "high";
    const status = allowedStatuses.has(body?.status)
      ? body.status
      : "pending";

    const result = await db.execute(sql.raw(\`
      INSERT INTO strategist_action_queue (
        title,
        description,
        category,
        priority,
        status,
        owner,
        due_date,
        source
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    \`, [
      title,
      body?.description ?? null,
      body?.category ?? "executive",
      priority,
      status,
      body?.owner ?? null,
      body?.dueDate ?? null,
      body?.source ?? "manual",
    ]));

    res.status(201).json(result.rows[0]);
  } catch (err) {
    req.log.error({ err }, "strategist action create failed");
    res.status(500).json({ error: "Failed to create strategist action" });
  }
});

router.patch("/actions/:id", async (req, res) => {
  try {
    await ensureStrategistOperationsTables();
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid action id" });
      return;
    }

    const body = req.body as any;
    const result = await db.execute(sql.raw(\`
      UPDATE strategist_action_queue
      SET
        title = coalesce($2, title),
        description = coalesce($3, description),
        category = coalesce($4, category),
        priority = coalesce($5, priority),
        status = coalesce($6, status),
        owner = coalesce($7, owner),
        due_date = coalesce($8, due_date),
        updated_at = now()
      WHERE id = $1
      RETURNING *
    \`, [
      id,
      body?.title ?? null,
      body?.description ?? null,
      body?.category ?? null,
      body?.priority ?? null,
      body?.status ?? null,
      body?.owner ?? null,
      body?.dueDate ?? null,
    ]));

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Action not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    req.log.error({ err }, "strategist action update failed");
    res.status(500).json({ error: "Failed to update strategist action" });
  }
});

router.delete("/actions/:id", async (req, res) => {
  try {
    await ensureStrategistOperationsTables();
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid action id" });
      return;
    }

    await db.execute(sql.raw(
      \`DELETE FROM strategist_action_queue WHERE id = \${id}\`,
    ));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "strategist action delete failed");
    res.status(500).json({ error: "Failed to delete strategist action" });
  }
});

`;

route = route.replace(routeAnchor, backendPatch + routeAnchor, 1);

page = page.replace(
  importAnchor,
  `${importAnchor}
import DailyBriefingActionQueue from "@/components/strategist/DailyBriefingActionQueue";`,
  1,
);

page = page.replace(
  briefingAnchor,
  `${briefingAnchor}
        <DailyBriefingActionQueue
          onPrompt={(prompt) => void sendMessage(prompt)}
        />`,
  1,
);

fs.writeFileSync(routePath, route);
fs.writeFileSync(pagePath, page);

const routeVerify = fs.readFileSync(routePath, "utf8");
const pageVerify = fs.readFileSync(pagePath, "utf8");
const checks = [
  routeVerify.includes("strategist_daily_briefings"),
  routeVerify.includes("strategist_action_queue"),
  routeVerify.includes('router.post("/briefings/generate"'),
  routeVerify.includes('router.patch("/actions/:id"'),
  pageVerify.includes("DailyBriefingActionQueue"),
  fs.existsSync(targetComponent),
];

if (checks.some((check) => !check)) {
  fs.copyFileSync(path.join(backupDir, "strategist.ts"), routePath);
  fs.copyFileSync(path.join(backupDir, "strategist.tsx"), pagePath);
  fs.rmSync(targetComponent, { force: true });
  fail("Verification failed. Original files restored.");
}

console.log(`
[OK] Phase 10A ZIP B installed.

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
