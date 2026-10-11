import { Router } from "express";
import { db, campaignEventsTable } from "@workspace/db";
import { eq, gte, sql, inArray } from "drizzle-orm";
import { MAKUENI_WARDS } from "../data/makueni-geography";

const WARDS: string[] = MAKUENI_WARDS.map(({ ward }) => ward);
const isMakueniWard = (ward: unknown): ward is string => typeof ward === "string" && WARDS.includes(ward);

const router = Router();

router.get("/", async (req, res) => {
  const { upcoming } = req.query as Record<string, string>;
  let events;
  if (upcoming === "true") {
    const today = new Date().toISOString().slice(0, 10);
    events = await db.select().from(campaignEventsTable).where(sql`(${campaignEventsTable.ward} IS NULL OR ${campaignEventsTable.ward} = ANY(${WARDS})) AND ${campaignEventsTable.startDate} >= ${today}`).orderBy(campaignEventsTable.startDate);
  } else {
    events = await db.select().from(campaignEventsTable).where(sql`${campaignEventsTable.ward} IS NULL OR ${campaignEventsTable.ward} = ANY(${WARDS})`).orderBy(campaignEventsTable.startDate);
  }
  res.json(events);
});

router.post("/", async (req, res) => {
  const { title, description, type, location, ward, startDate, endDate, maxAttendees } = req.body;
  if (!title || !type || !startDate) { res.status(400).json({ error: "title, type, startDate required" }); return; }
  if (ward != null && ward !== "" && !isMakueniWard(ward)) { res.status(400).json({ error: "Select a valid Makueni County ward" }); return; }
  const [event] = await db.insert(campaignEventsTable).values({ title, description, type, location, ward, startDate, endDate, maxAttendees, status: "scheduled", attendeeCount: 0 }).returning();
  res.status(201).json(event);
});

router.get("/:id", async (req, res) => {
  const [event] = await db.select().from(campaignEventsTable).where(eq(campaignEventsTable.id, parseInt(req.params.id)));
  if (!event) { res.status(404).json({ error: "Not found" }); return; }
  res.json(event);
});

router.patch("/:id", async (req, res) => {
  const updates: any = {};
  const fields = ["title","description","type","location","ward","startDate","endDate","status","maxAttendees"];
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (updates.ward != null && updates.ward !== "" && !isMakueniWard(updates.ward)) { res.status(400).json({ error: "Select a valid Makueni County ward" }); return; }
  const [event] = await db.update(campaignEventsTable).set(updates).where(eq(campaignEventsTable.id, parseInt(req.params.id))).returning();
  if (!event) { res.status(404).json({ error: "Not found" }); return; }
  res.json(event);
});

router.delete("/:id", async (req, res) => {
  await db.delete(campaignEventsTable).where(eq(campaignEventsTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

export default router;
