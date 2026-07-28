import { Router } from "express";
import { db, segmentsTable, membersTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";

const router = Router();

async function computeMemberCount(criteria: Record<string, any>) {
  if (criteria.manualSize !== undefined) return Number(criteria.manualSize);
  const conditions = [];
  if (criteria.ward) conditions.push(eq(membersTable.ward, criteria.ward));
  if (criteria.supportLevel) conditions.push(eq(membersTable.supportLevel, criteria.supportLevel));
  if (criteria.smsConsent) conditions.push(eq(membersTable.smsConsent, true));
  if (criteria.whatsappConsent) conditions.push(eq(membersTable.whatsappConsent, true));
  if (criteria.emailConsent) conditions.push(eq(membersTable.emailConsent, true));
  const where = conditions.length ? and(...conditions) : undefined;
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(membersTable).where(where);
  return Number(result?.count ?? 0);
}

router.get("/", async (req, res) => {
  const segs = await db.select().from(segmentsTable).orderBy(segmentsTable.createdAt);
  res.json(segs);
});

router.post("/", async (req, res) => {
  const { name, description, criteria = {}, isLocked = false } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const memberCount = await computeMemberCount(criteria);
  const [seg] = await db.insert(segmentsTable).values({ name, description, criteria, memberCount, isLocked }).returning();
  res.status(201).json(seg);
});

router.get("/:id", async (req, res) => {
  const [seg] = await db.select().from(segmentsTable).where(eq(segmentsTable.id, parseInt(req.params.id)));
  if (!seg) { res.status(404).json({ error: "Not found" }); return; }
  const memberCount = await computeMemberCount(seg.criteria as any);
  res.json({ ...seg, memberCount });
});

router.patch("/:id", async (req, res) => {
  const updates: any = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.criteria !== undefined) {
    updates.criteria = req.body.criteria;
    updates.memberCount = await computeMemberCount(req.body.criteria);
  }
  if (req.body.isLocked !== undefined) updates.isLocked = req.body.isLocked;
  const [seg] = await db.update(segmentsTable).set(updates).where(eq(segmentsTable.id, parseInt(req.params.id))).returning();
  if (!seg) { res.status(404).json({ error: "Not found" }); return; }
  res.json(seg);
});

router.delete("/:id", async (req, res) => {
  await db.delete(segmentsTable).where(eq(segmentsTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

export default router;
