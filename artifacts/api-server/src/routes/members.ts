import { Router } from "express";
import { db, membersTable } from "@workspace/db";
import { eq, ilike, and, sql, inArray } from "drizzle-orm";
import { MAKUENI_WARDS } from "../data/makueni-geography";

const ALLOWED_WARDS = MAKUENI_WARDS.map(({ ward }) => ward);
const allowedWardSet = new Set<string>(ALLOWED_WARDS);
const isMakueniWard = (ward: unknown): ward is string => typeof ward === "string" && allowedWardSet.has(ward);

const router = Router();

router.get("/", async (req, res) => {
  const { search, ward, status, page = "1", limit = "50" } = req.query as Record<string, string>;
  // The active workspace is Makueni only. Legacy records with other or
  // unassigned wards are excluded from lists and totals, not deleted.
  const conditions = [inArray(membersTable.ward, ALLOWED_WARDS)];
  if (search) conditions.push(sql`(${membersTable.firstName} ilike ${`%${search}%`} OR ${membersTable.lastName} ilike ${`%${search}%`} OR ${membersTable.email} ilike ${`%${search}%`})`);
  if (ward) {
    if (!isMakueniWard(ward)) { res.status(400).json({ error: "Select a valid Makueni County ward" }); return; }
    conditions.push(eq(membersTable.ward, ward));
  }
  if (status) conditions.push(eq(membersTable.status, status));
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where = conditions.length ? and(...conditions) : undefined;
  const [data, countResult] = await Promise.all([
    db.select().from(membersTable).where(where).limit(parseInt(limit)).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(membersTable).where(where),
  ]);
  res.json({ data, total: Number(countResult[0]?.count ?? 0), page: parseInt(page), limit: parseInt(limit) });
});

router.post("/", async (req, res) => {
  const { firstName, lastName, email, phone, ward, status = "active", supportLevel, smsConsent = false, whatsappConsent = false, emailConsent = false, notes } = req.body;
  if (!firstName || !lastName) { res.status(400).json({ error: "firstName and lastName required" }); return; }
  if (!isMakueniWard(ward)) { res.status(400).json({ error: "A valid Makueni County ward is required" }); return; }
  const [member] = await db.insert(membersTable).values({ firstName, lastName, email, phone, ward, status, supportLevel, smsConsent, whatsappConsent, emailConsent, notes }).returning();
  res.status(201).json(member);
});

router.get("/stats", async (req, res) => {
  const makueniOnly = inArray(membersTable.ward, ALLOWED_WARDS);
  const [total, byWardRaw, bySupportRaw, consented] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(membersTable).where(makueniOnly),
    db.select({ ward: membersTable.ward, count: sql<number>`count(*)` }).from(membersTable).where(makueniOnly).groupBy(membersTable.ward),
    db.select({ label: membersTable.supportLevel, count: sql<number>`count(*)` }).from(membersTable).where(and(makueniOnly, sql`${membersTable.supportLevel} is not null`)).groupBy(membersTable.supportLevel),
    db.select({
      sms: sql<number>`sum(case when ${membersTable.smsConsent} then 1 else 0 end)`,
      wa: sql<number>`sum(case when ${membersTable.whatsappConsent} then 1 else 0 end)`,
      email: sql<number>`sum(case when ${membersTable.emailConsent} then 1 else 0 end)`,
    }).from(membersTable).where(makueniOnly),
  ]);
  res.json({
    total: Number(total[0]?.count ?? 0),
    byWard: byWardRaw.filter(r => r.ward).map(r => ({ ward: r.ward!, count: Number(r.count) })),
    bySupportLevel: bySupportRaw.filter(r => r.label).map(r => ({ label: r.label!, count: Number(r.count) })),
    consentedSms: Number(consented[0]?.sms ?? 0),
    consentedWhatsapp: Number(consented[0]?.wa ?? 0),
    consentedEmail: Number(consented[0]?.email ?? 0),
  });
});

router.get("/:id", async (req, res) => {
  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, parseInt(req.params.id)));
  if (!member) { res.status(404).json({ error: "Not found" }); return; }
  res.json(member);
});

router.patch("/:id", async (req, res) => {
  const updates: any = {};
  const fields = ["firstName","lastName","email","phone","ward","status","supportLevel","smsConsent","whatsappConsent","emailConsent","notes"];
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (updates.ward !== undefined && !isMakueniWard(updates.ward)) { res.status(400).json({ error: "Select a valid Makueni County ward" }); return; }
  updates.updatedAt = new Date();
  const [member] = await db.update(membersTable).set(updates).where(eq(membersTable.id, parseInt(req.params.id))).returning();
  if (!member) { res.status(404).json({ error: "Not found" }); return; }
  res.json(member);
});

router.delete("/:id", async (req, res) => {
  await db.delete(membersTable).where(eq(membersTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

export default router;
