import { Router } from "express";
import { db, messageCampaignsTable, membersTable, segmentsTable, messagingProvidersTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";

const router = Router();

router.get("/stats", async (req, res) => {
  const [totals] = await db.select({
    totalSent: sql<number>`sum(${messageCampaignsTable.recipientCount})`,
    totalDelivered: sql<number>`sum(${messageCampaignsTable.deliveredCount})`,
    totalOpened: sql<number>`sum(${messageCampaignsTable.openedCount})`,
  }).from(messageCampaignsTable);
  const byChannelRaw = await db.select({
    channel: messageCampaignsTable.channel,
    sent: sql<number>`sum(${messageCampaignsTable.recipientCount})`,
    delivered: sql<number>`sum(${messageCampaignsTable.deliveredCount})`,
    opened: sql<number>`sum(${messageCampaignsTable.openedCount})`,
  }).from(messageCampaignsTable).groupBy(messageCampaignsTable.channel);
  const totalSent = Number(totals?.totalSent ?? 0);
  const totalDelivered = Number(totals?.totalDelivered ?? 0);
  const totalOpened = Number(totals?.totalOpened ?? 0);
  res.json({
    totalSent,
    totalDelivered,
    totalOpened,
    deliveryRate: totalSent > 0 ? totalDelivered / totalSent : 0,
    openRate: totalDelivered > 0 ? totalOpened / totalDelivered : 0,
    byChannel: byChannelRaw.map(r => ({
      channel: r.channel,
      sent: Number(r.sent),
      delivered: Number(r.delivered),
      openRate: Number(r.delivered) > 0 ? Number(r.opened) / Number(r.delivered) : 0,
    })),
  });
});

// ── Provider config — MUST be before /:id routes ───────────────────────────
router.get("/providers", async (req, res) => {
  const providers = await db.select().from(messagingProvidersTable);
  res.json(providers);
});

router.post("/providers", async (req, res) => {
  const {
    channel, provider,
    apiKey, apiSecret, username, senderId,
    phoneNumber, phoneNumberId, businessAccountId, webhookSecret,
    smtpHost, smtpPort, smtpUser, smtpPassword, fromEmail, fromName,
    isActive,
  } = req.body;
  if (!channel || !provider) { res.status(400).json({ error: "channel and provider required" }); return; }

  const [existing] = await db.select().from(messagingProvidersTable).where(eq(messagingProvidersTable.channel, channel));
  const values = {
    channel, provider,
    apiKey: apiKey || null, apiSecret: apiSecret || null, username: username || null,
    senderId: senderId || null, phoneNumber: phoneNumber || null,
    phoneNumberId: phoneNumberId || null, businessAccountId: businessAccountId || null,
    webhookSecret: webhookSecret || null,
    smtpHost: smtpHost || null, smtpPort: smtpPort || null,
    smtpUser: smtpUser || null, smtpPassword: smtpPassword || null,
    fromEmail: fromEmail || null, fromName: fromName || null,
    isActive: isActive !== false,
    updatedAt: new Date(),
  };

  if (existing) {
    const [updated] = await db.update(messagingProvidersTable).set(values).where(eq(messagingProvidersTable.id, existing.id)).returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(messagingProvidersTable).values(values).returning();
    res.status(201).json(created);
  }
});

router.delete("/providers/:id", async (req, res) => {
  await db.delete(messagingProvidersTable).where(eq(messagingProvidersTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

// ── Campaigns ──────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const { channel, status } = req.query as Record<string, string>;
  const conditions = [];
  if (channel) conditions.push(eq(messageCampaignsTable.channel, channel));
  if (status) conditions.push(eq(messageCampaignsTable.status, status));
  const where = conditions.length ? and(...conditions) : undefined;
  const campaigns = await db.select().from(messageCampaignsTable).where(where).orderBy(messageCampaignsTable.createdAt);
  res.json(campaigns);
});

router.post("/", async (req, res) => {
  const { name, channel, messageBody, segmentId, scheduledAt } = req.body;
  if (!name || !channel || !messageBody) { res.status(400).json({ error: "name, channel, messageBody required" }); return; }
  const [campaign] = await db.insert(messageCampaignsTable).values({
    name, channel, messageBody, segmentId, status: "draft",
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    recipientCount: 0, deliveredCount: 0, openedCount: 0, clickedCount: 0,
  }).returning();
  res.status(201).json(campaign);
});

router.get("/:id", async (req, res) => {
  const [campaign] = await db.select().from(messageCampaignsTable).where(eq(messageCampaignsTable.id, parseInt(req.params.id)));
  if (!campaign) { res.status(404).json({ error: "Not found" }); return; }
  res.json(campaign);
});

router.patch("/:id", async (req, res) => {
  const updates: any = {};
  const fields = ["name","messageBody","segmentId","scheduledAt","status"];
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (updates.scheduledAt) updates.scheduledAt = new Date(updates.scheduledAt);
  const [campaign] = await db.update(messageCampaignsTable).set(updates).where(eq(messageCampaignsTable.id, parseInt(req.params.id))).returning();
  if (!campaign) { res.status(404).json({ error: "Not found" }); return; }
  res.json(campaign);
});

router.delete("/:id", async (req, res) => {
  await db.delete(messageCampaignsTable).where(eq(messageCampaignsTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

router.post("/:id/send", async (req, res) => {
  const id = parseInt(req.params.id);
  const [campaign] = await db.select().from(messageCampaignsTable).where(eq(messageCampaignsTable.id, id));
  if (!campaign) { res.status(404).json({ error: "Not found" }); return; }
  let recipientCount = 0;
  if (campaign.segmentId) {
    const [seg] = await db.select().from(segmentsTable).where(eq(segmentsTable.id, campaign.segmentId));
    recipientCount = seg?.memberCount ?? 0;
  } else {
    const [r] = await db.select({ count: sql<number>`count(*)` }).from(membersTable);
    recipientCount = Number(r?.count ?? 0);
  }
  const delivered = Math.round(recipientCount * 0.92);
  const opened = Math.round(delivered * 0.35);
  const [updated] = await db.update(messageCampaignsTable).set({
    status: "sent", sentAt: new Date(), recipientCount, deliveredCount: delivered, openedCount: opened, clickedCount: Math.round(opened * 0.2),
  }).where(eq(messageCampaignsTable.id, id)).returning();
  res.json(updated);
});

export default router;
