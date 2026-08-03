import { Router } from "express";
import { db, commandTasksTable, fieldIncidentsTable, volunteerCheckinsTable, intelligenceBriefsTable, commandNotificationsTable, executiveReportsTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";

const router = Router();
const id = (value: string) => Number.parseInt(value, 10);

router.get("/summary", async (_req, res) => {
  const [tasks, incidents, checkins, briefs, notifications, reports] = await Promise.all([
    db.select({ total: sql<number>`count(*)`, pending: sql<number>`count(*) filter (where ${commandTasksTable.status} <> 'completed')`, completed: sql<number>`count(*) filter (where ${commandTasksTable.status} = 'completed')` }).from(commandTasksTable),
    db.select({ total: sql<number>`count(*)`, open: sql<number>`count(*) filter (where ${fieldIncidentsTable.status} <> 'resolved')`, critical: sql<number>`count(*) filter (where ${fieldIncidentsTable.severity} = 'critical' and ${fieldIncidentsTable.status} <> 'resolved')` }).from(fieldIncidentsTable),
    db.select({ total: sql<number>`count(*)`, doors: sql<number>`coalesce(sum(${volunteerCheckinsTable.doorsKnocked}), 0)`, households: sql<number>`coalesce(sum(${volunteerCheckinsTable.householdsReached}), 0)` }).from(volunteerCheckinsTable),
    db.select({ total: sql<number>`count(*)`, published: sql<number>`count(*) filter (where ${intelligenceBriefsTable.published} = true)` }).from(intelligenceBriefsTable),
    db.select({ total: sql<number>`count(*)`, unread: sql<number>`count(*) filter (where ${commandNotificationsTable.isRead} = false)` }).from(commandNotificationsTable),
    db.select({ total: sql<number>`count(*)`, ready: sql<number>`count(*) filter (where ${executiveReportsTable.status} = 'ready')` }).from(executiveReportsTable),
  ]);
  res.json({ tasks: tasks[0], incidents: incidents[0], field: checkins[0], briefs: briefs[0], notifications: notifications[0], reports: reports[0] });
});

router.get("/tasks", async (_req, res) => res.json(await db.select().from(commandTasksTable).orderBy(desc(commandTasksTable.createdAt)).limit(200)));
router.post("/tasks", async (req, res) => { const [row] = await db.insert(commandTasksTable).values(req.body).returning(); res.status(201).json(row); });
router.patch("/tasks/:id", async (req, res) => { const [row] = await db.update(commandTasksTable).set(req.body).where(eq(commandTasksTable.id, id(req.params.id))).returning(); res.json(row); });

async function ensureWarRoomFeedTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS war_room_feed (
      id bigserial PRIMARY KEY,
      event_type text NOT NULL,
      title text NOT NULL,
      description text,
      module text,
      severity text NOT NULL DEFAULT 'info',
      status text NOT NULL DEFAULT 'open',
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

router.get("/operations-wall", async (_req, res) => {
  try {
    await ensureWarRoomFeedTable();

    const [customFeed, incidents, events, actions] = await Promise.all([
      db.execute(sql`
        SELECT
          id,
          event_type AS "eventType",
          title,
          description,
          module,
          severity,
          status,
          metadata,
          created_at AS "createdAt"
        FROM war_room_feed
        ORDER BY created_at DESC
        LIMIT 100
      `),
      db.execute(sql`
        SELECT
          id,
          coalesce(title, 'Field incident') AS title,
          coalesce(description, summary, '') AS description,
          coalesce(priority, severity, 'medium') AS severity,
          coalesce(status, 'open') AS status,
          created_at AS "createdAt"
        FROM field_incidents
        ORDER BY created_at DESC
        LIMIT 40
      `).catch(() => ({ rows: [] } as any)),
      db.execute(sql`
        SELECT
          id,
          title,
          coalesce(description, '') AS description,
          'medium'::text AS severity,
          'scheduled'::text AS status,
          coalesce(created_at, start_date::timestamptz) AS "createdAt"
        FROM campaign_events
        ORDER BY coalesce(created_at, start_date::timestamptz) DESC
        LIMIT 40
      `).catch(() => ({ rows: [] } as any)),
      db.execute(sql`
        SELECT
          id,
          title,
          coalesce(description, '') AS description,
          priority AS severity,
          status,
          created_at AS "createdAt"
        FROM strategist_action_queue
        ORDER BY updated_at DESC
        LIMIT 40
      `).catch(() => ({ rows: [] } as any)),
    ]);

    const feed = [
      ...((customFeed as any).rows ?? []).map((row: any) => ({
        ...row,
        source: "war-room",
      })),
      ...((incidents as any).rows ?? []).map((row: any) => ({
        id: `incident-${row.id}`,
        eventType: "incident",
        title: row.title,
        description: row.description,
        module: "field-ops",
        severity: row.severity,
        status: row.status,
        createdAt: row.createdAt,
        source: "incidents",
      })),
      ...((events as any).rows ?? []).map((row: any) => ({
        id: `event-${row.id}`,
        eventType: "event",
        title: row.title,
        description: row.description,
        module: "events",
        severity: row.severity,
        status: row.status,
        createdAt: row.createdAt,
        source: "events",
      })),
      ...((actions as any).rows ?? []).map((row: any) => ({
        id: `action-${row.id}`,
        eventType: "strategic-action",
        title: row.title,
        description: row.description,
        module: "strategist",
        severity: row.severity,
        status: row.status,
        createdAt: row.createdAt,
        source: "strategist",
      })),
    ]
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      )
      .slice(0, 150);

    res.json(feed);
  } catch (err) {
    console.error("war room operations wall failed", err);
    res.status(500).json({
      error: "Failed to load operations wall",
      detail: err instanceof Error ? err.message : "Unknown operations-wall error",
    });
  }
});

router.post("/operations-wall", async (req, res) => {
  try {
    await ensureWarRoomFeedTable();

    const body = req.body as any;
    const title = String(body?.title ?? "").trim();

    if (!title) {
      res.status(400).json({ error: "title required" });
      return;
    }

    const result = await db.execute(sql`
      INSERT INTO war_room_feed (
        event_type,
        title,
        description,
        module,
        severity,
        status,
        metadata
      )
      VALUES (
        ${body?.eventType ?? "command-update"},
        ${title},
        ${body?.description ?? null},
        ${body?.module ?? "war-room"},
        ${body?.severity ?? "info"},
        ${body?.status ?? "open"},
        ${JSON.stringify(body?.metadata ?? {})}::jsonb
      )
      RETURNING
        id,
        event_type AS "eventType",
        title,
        description,
        module,
        severity,
        status,
        metadata,
        created_at AS "createdAt"
    `);

    res.status(201).json((result as any).rows?.[0]);
  } catch (err) {
    console.error("war room feed create failed", err);
    res.status(500).json({
      error: "Failed to create war-room update",
      detail: err instanceof Error ? err.message : "Unknown feed error",
    });
  }
});

router.get("/incidents", async (_req, res) => res.json(await db.select().from(fieldIncidentsTable).orderBy(desc(fieldIncidentsTable.createdAt)).limit(200)));
router.post("/incidents", async (req, res) => { const [row] = await db.insert(fieldIncidentsTable).values(req.body).returning(); res.status(201).json(row); });
router.patch("/incidents/:id", async (req, res) => { const [row] = await db.update(fieldIncidentsTable).set(req.body).where(eq(fieldIncidentsTable.id, id(req.params.id))).returning(); res.json(row); });

router.get("/checkins", async (_req, res) => res.json(await db.select().from(volunteerCheckinsTable).orderBy(desc(volunteerCheckinsTable.checkedInAt)).limit(200)));
router.post("/checkins", async (req, res) => { const [row] = await db.insert(volunteerCheckinsTable).values(req.body).returning(); res.status(201).json(row); });

router.get("/briefs", async (_req, res) => res.json(await db.select().from(intelligenceBriefsTable).orderBy(desc(intelligenceBriefsTable.createdAt)).limit(100)));
router.post("/briefs", async (req, res) => { const [row] = await db.insert(intelligenceBriefsTable).values(req.body).returning(); res.status(201).json(row); });

router.get("/notifications", async (_req, res) => res.json(await db.select().from(commandNotificationsTable).orderBy(desc(commandNotificationsTable.createdAt)).limit(100)));
router.post("/notifications", async (req, res) => { const [row] = await db.insert(commandNotificationsTable).values(req.body).returning(); res.status(201).json(row); });
router.patch("/notifications/:id/read", async (req, res) => { const [row] = await db.update(commandNotificationsTable).set({ isRead: true }).where(eq(commandNotificationsTable.id, id(req.params.id))).returning(); res.json(row); });

router.get("/reports", async (_req, res) => res.json(await db.select().from(executiveReportsTable).orderBy(desc(executiveReportsTable.createdAt)).limit(100)));
router.post("/reports", async (req, res) => { const [row] = await db.insert(executiveReportsTable).values(req.body).returning(); res.status(201).json(row); });

export default router;
