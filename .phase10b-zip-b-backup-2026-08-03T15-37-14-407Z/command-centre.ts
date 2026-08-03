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
