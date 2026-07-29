import { Router } from "express";
import { db, canvassSessionsTable, canvassVisitsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/sessions", async (req, res) => {
  const { type, ward, status } = req.query as Record<string, string>;
  let sessions = await db.select().from(canvassSessionsTable).orderBy(canvassSessionsTable.date);
  if (type) sessions = sessions.filter(s => s.type === type);
  if (ward) sessions = sessions.filter(s => s.ward === ward);
  if (status) sessions = sessions.filter(s => s.status === status);
  res.json(sessions);
});

router.post("/sessions", async (req, res) => {
  const { name, type = "door-to-door", ward, date, doorsTarget = 0, assignedVolunteers = 0, notes } = req.body;
  if (!name || !ward || !date) { res.status(400).json({ error: "name, ward, date required" }); return; }
  const [session] = await db.insert(canvassSessionsTable).values({
    name, type, ward, date, doorsTarget, assignedVolunteers, notes,
    status: "planned", doorsCompleted: 0
  }).returning();
  res.status(201).json(session);
});

router.get("/sessions/:id", async (req, res) => {
  const [session] = await db.select().from(canvassSessionsTable).where(eq(canvassSessionsTable.id, parseInt(req.params.id)));
  if (!session) { res.status(404).json({ error: "Not found" }); return; }
  res.json(session);
});

router.patch("/sessions/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status, assignedVolunteers, doorsTarget, doorsCompleted, notes } = req.body;
  const updates: Record<string, unknown> = {};
  if (status !== undefined) updates.status = status;
  if (assignedVolunteers !== undefined) updates.assignedVolunteers = assignedVolunteers;
  if (doorsTarget !== undefined) updates.doorsTarget = doorsTarget;
  if (doorsCompleted !== undefined) updates.doorsCompleted = doorsCompleted;
  if (notes !== undefined) updates.notes = notes;
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "no fields to update" }); return; }
  const [updated] = await db.update(canvassSessionsTable).set(updates).where(eq(canvassSessionsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/sessions/:id", async (req, res) => {
  await db.delete(canvassVisitsTable).where(eq(canvassVisitsTable.sessionId, parseInt(req.params.id)));
  await db.delete(canvassSessionsTable).where(eq(canvassSessionsTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

router.get("/visits", async (req, res) => {
  const { sessionId } = req.query as Record<string, string>;
  const visits = sessionId
    ? await db.select().from(canvassVisitsTable).where(eq(canvassVisitsTable.sessionId, parseInt(sessionId))).orderBy(canvassVisitsTable.visitedAt)
    : await db.select().from(canvassVisitsTable).orderBy(canvassVisitsTable.visitedAt);
  res.json(visits);
});

router.post("/visits", async (req, res) => {
  const { sessionId, memberId, address, outcome, supportLevel, notes } = req.body;
  if (!sessionId || !address || !outcome) { res.status(400).json({ error: "sessionId, address, outcome required" }); return; }
  const [visit] = await db.insert(canvassVisitsTable).values({ sessionId, memberId, address, outcome, supportLevel, notes }).returning();
  await db.update(canvassSessionsTable).set({ doorsCompleted: sql`${canvassSessionsTable.doorsCompleted} + 1` }).where(eq(canvassSessionsTable.id, sessionId));
  res.status(201).json(visit);
});

router.get("/coverage", async (req, res) => {
  const rows = await db.select({
    ward: canvassSessionsTable.ward,
    total: sql<number>`count(${canvassVisitsTable.id})`,
    support: sql<number>`sum(case when ${canvassVisitsTable.outcome} = 'support' then 1 else 0 end)`,
    oppose: sql<number>`sum(case when ${canvassVisitsTable.outcome} = 'oppose' then 1 else 0 end)`,
    undecided: sql<number>`sum(case when ${canvassVisitsTable.outcome} = 'undecided' then 1 else 0 end)`,
    notHome: sql<number>`sum(case when ${canvassVisitsTable.outcome} = 'not_home' then 1 else 0 end)`,
    sessions: sql<number>`count(distinct ${canvassSessionsTable.id})`,
  })
    .from(canvassSessionsTable)
    .leftJoin(canvassVisitsTable, eq(canvassVisitsTable.sessionId, canvassSessionsTable.id))
    .groupBy(canvassSessionsTable.ward);

  const WARD_VOTERS: Record<string, number> = {
    "Wote/Nziu": 19000, "Kaiti": 26000,
    "Makueni North": 15000, "Makueni East": 12000, "Kyeleni": 10000,
  };

  res.json(rows.map(r => {
    const knocked = Number(r.total);
    const voters = WARD_VOTERS[r.ward] ?? 10000;
    return {
      ward: r.ward,
      doorsKnocked: knocked,
      doorsTotal: voters,
      coveragePercent: Math.min((knocked / voters) * 100, 100),
      supportCount: Number(r.support ?? 0),
      opposeCount: Number(r.oppose ?? 0),
      undecidedCount: Number(r.undecided ?? 0),
      notHomeCount: Number(r.notHome ?? 0),
      sessions: Number(r.sessions),
    };
  }));
});

router.get("/stats", async (req, res) => {
  const sessions = await db.select().from(canvassSessionsTable);
  const visits = await db.select().from(canvassVisitsTable);
  const supporters = visits.filter(v => v.outcome === "support").length;
  const undecided = visits.filter(v => v.outcome === "undecided").length;
  const oppose = visits.filter(v => v.outcome === "oppose").length;
  const active = sessions.filter(s => s.status === "active").length;
  const completed = sessions.filter(s => s.status === "completed").length;
  const planned = sessions.filter(s => s.status === "planned").length;
  const wards = [...new Set(sessions.map(s => s.ward))].length;
  res.json({
    totalSessions: sessions.length, active, completed, planned,
    totalContacts: visits.length, supporters, undecided, oppose, wards,
  });
});

export default router;
