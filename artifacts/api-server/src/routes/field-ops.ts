import { isCalendarDate, isNonNegativeInteger } from "../lib/operational-validation";
import { Router } from "express";
import { db, canvassSessionsTable, canvassVisitsTable } from "@workspace/db";
import { eq, sql, inArray } from "drizzle-orm";
import { MAKUENI_WARDS } from "../data/makueni-geography";

const WARDS: string[] = MAKUENI_WARDS.map(({ ward }) => ward);
const isMakueniWard = (ward: unknown): ward is string => typeof ward === "string" && WARDS.includes(ward);

const router = Router();

router.get("/sessions", async (req, res) => {
  const { type, ward, status } = req.query as Record<string, string>;
  let sessions = await db.select().from(canvassSessionsTable).where(inArray(canvassSessionsTable.ward, WARDS)).orderBy(canvassSessionsTable.date);
  if (type) sessions = sessions.filter(s => s.type === type);
  if (ward) { if (!isMakueniWard(ward)) { res.status(400).json({ error: "Select a valid Makueni County ward" }); return; } sessions = sessions.filter(s => s.ward === ward); }
  if (status) sessions = sessions.filter(s => s.status === status);
  res.json(sessions);
});

router.post("/sessions", async (req, res) => {
  const { name, type = "door-to-door", ward, date, doorsTarget = 0, assignedVolunteers = 0, notes } = req.body;
  if (!name || !ward || !date) { res.status(400).json({ error: "name, ward, date required" }); return; }
  if (!isMakueniWard(ward)) { res.status(400).json({ error: "A valid Makueni County ward is required" }); return; }
  if (!isCalendarDate(date) || !isNonNegativeInteger(doorsTarget) || !isNonNegativeInteger(assignedVolunteers)) { res.status(400).json({ error: "Enter a valid date and non-negative whole-number targets" }); return; }
  const [session] = await db.insert(canvassSessionsTable).values({
    name, type, ward, date, doorsTarget, assignedVolunteers, notes,
    status: "planned", doorsCompleted: 0
  }).returning();
  res.status(201).json(session);
});

router.get("/sessions/:id", async (req, res) => {
  const [session] = await db.select().from(canvassSessionsTable).where(eq(canvassSessionsTable.id, parseInt(req.params.id)));
  if (session && !isMakueniWard(session.ward)) { res.status(404).json({ error: "Not found in Makueni workspace" }); return; }
  if (!session) { res.status(404).json({ error: "Not found" }); return; }
  res.json(session);
});

router.patch("/sessions/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status, assignedVolunteers, doorsTarget, doorsCompleted, notes, ward } = req.body;
  if (status !== undefined && !["planned", "active", "completed", "cancelled"].includes(status)) { res.status(400).json({ error: "Invalid session status" }); return; }
  if ([assignedVolunteers, doorsTarget, doorsCompleted].some(value => value !== undefined && !isNonNegativeInteger(value))) { res.status(400).json({ error: "Session counts must be non-negative integers" }); return; }
  const [current] = await db.select().from(canvassSessionsTable).where(eq(canvassSessionsTable.id, id));
  if (!current || !isMakueniWard(current.ward)) { res.status(404).json({ error: "Makueni session not found" }); return; }
  const updates: Record<string, unknown> = {};
  if (ward !== undefined) { if (!isMakueniWard(ward)) { res.status(400).json({ error: "Select a valid Makueni County ward" }); return; } updates.ward = ward; }
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
  const id = Number(req.params.id);
  const [session] = await db.select().from(canvassSessionsTable).where(eq(canvassSessionsTable.id, id));
  if (!session || !isMakueniWard(session.ward)) { res.status(404).json({ error: "Makueni session not found" }); return; }
  await db.transaction(async tx => {
    await tx.delete(canvassVisitsTable).where(eq(canvassVisitsTable.sessionId, id));
    await tx.delete(canvassSessionsTable).where(eq(canvassSessionsTable.id, id));
  });
  res.status(204).send();
});

router.get("/visits", async (req, res) => {
  const { sessionId } = req.query as Record<string, string>;
  const validSessions = await db.select({ id: canvassSessionsTable.id }).from(canvassSessionsTable).where(inArray(canvassSessionsTable.ward, WARDS));
  const validSessionIds = validSessions.map(s => s.id);
  const visits = sessionId
    ? (validSessionIds.includes(parseInt(sessionId)) ? await db.select().from(canvassVisitsTable).where(eq(canvassVisitsTable.sessionId, parseInt(sessionId))).orderBy(canvassVisitsTable.visitedAt) : [])
    : validSessionIds.length ? await db.select().from(canvassVisitsTable).where(inArray(canvassVisitsTable.sessionId, validSessionIds)).orderBy(canvassVisitsTable.visitedAt) : [];
  res.json(visits);
});

router.post("/visits", async (req, res) => {
  const { sessionId, memberId, address, outcome, supportLevel, notes } = req.body;
  if (!sessionId || !address || !outcome) { res.status(400).json({ error: "sessionId, address, outcome required" }); return; }
  if (!isNonNegativeInteger(Number(sessionId)) || !["support", "oppose", "undecided", "not_home", "refused"].includes(outcome)) { res.status(400).json({ error: "Invalid field session or visit outcome" }); return; }
  const visit = await db.transaction(async tx => {
    const [parentSession] = await tx.select().from(canvassSessionsTable).where(eq(canvassSessionsTable.id, Number(sessionId))).for("update");
    if (!parentSession || !isMakueniWard(parentSession.ward) || ["completed", "cancelled"].includes(parentSession.status)) return null;
    const [saved] = await tx.insert(canvassVisitsTable).values({ sessionId: Number(sessionId), memberId, address, outcome, supportLevel, notes }).returning();
    await tx.update(canvassSessionsTable).set({ doorsCompleted: sql`${canvassSessionsTable.doorsCompleted} + 1` }).where(eq(canvassSessionsTable.id, Number(sessionId)));
    return saved;
  });
  if (!visit) { res.status(400).json({ error: "Select an open Makueni field session" }); return; }
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
    .where(inArray(canvassSessionsTable.ward, WARDS))
    .groupBy(canvassSessionsTable.ward);

  const rowsByWard = new Map(rows.map(r => [r.ward, r]));
  // Include every official ward, but never invent electorate denominators.
  res.json(MAKUENI_WARDS.map(({ ward }) => {
    const r = rowsByWard.get(ward);
    return {
      ward,
      doorsKnocked: Number(r?.total ?? 0),
      doorsTotal: 0,
      coveragePercent: 0,
      supportCount: Number(r?.support ?? 0),
      opposeCount: Number(r?.oppose ?? 0),
      undecidedCount: Number(r?.undecided ?? 0),
      notHomeCount: Number(r?.notHome ?? 0),
      sessions: Number(r?.sessions ?? 0),
      denominatorStatus: "not_loaded",
    };
  }));
});

router.get("/stats", async (req, res) => {
  const sessions = await db.select().from(canvassSessionsTable).where(inArray(canvassSessionsTable.ward, WARDS));
  const validSessions = await db.select({ id: canvassSessionsTable.id }).from(canvassSessionsTable).where(inArray(canvassSessionsTable.ward, WARDS));
  const validSessionIds = validSessions.map(s => s.id);
  const visits = validSessionIds.length ? await db.select().from(canvassVisitsTable).where(inArray(canvassVisitsTable.sessionId, validSessionIds)) : [];
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
