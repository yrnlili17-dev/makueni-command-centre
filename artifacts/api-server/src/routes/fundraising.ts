import { Router } from "express";
import { db, fundraisingCampaignsTable, donationsTable, donorsTable, pledgesTable } from "@workspace/db";
import { eq, sql, desc, ilike, or } from "drizzle-orm";

const router = Router();

// ── Summary ────────────────────────────────────────────────────────────────
router.get("/summary", async (req, res) => {
  const [totals] = await db
    .select({
      totalRaised: sql<number>`coalesce(sum(amount), 0)`,
      donorCount: sql<number>`count(*)`,
    })
    .from(donationsTable);

  const [goalTotals] = await db
    .select({
      totalGoal: sql<number>`coalesce(sum(goal_amount), 0)`,
      activeCampaigns: sql<number>`count(*) filter (where status = 'active')`,
    })
    .from(fundraisingCampaignsTable);

  const channelBreakdown = await db
    .select({
      channel: donationsTable.channel,
      total: sql<number>`coalesce(sum(amount), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(donationsTable)
    .groupBy(donationsTable.channel);

  const [pledgeTotals] = await db
    .select({
      totalPledged: sql<number>`coalesce(sum(amount), 0)`,
      pendingPledges: sql<number>`count(*) filter (where status = 'pending')`,
      fulfilledPledges: sql<number>`count(*) filter (where status = 'fulfilled')`,
    })
    .from(pledgesTable);

  const [donorStats] = await db
    .select({ total: sql<number>`count(*)` })
    .from(donorsTable);

  res.json({
    totalRaised: Number(totals?.totalRaised ?? 0),
    donorCount: Number(totals?.donorCount ?? 0),
    totalDonors: Number(donorStats?.total ?? 0),
    totalGoal: Number(goalTotals?.totalGoal ?? 0),
    activeCampaigns: Number(goalTotals?.activeCampaigns ?? 0),
    channelBreakdown,
    totalPledged: Number(pledgeTotals?.totalPledged ?? 0),
    pendingPledges: Number(pledgeTotals?.pendingPledges ?? 0),
    fulfilledPledges: Number(pledgeTotals?.fulfilledPledges ?? 0),
  });
});

// ── Campaigns ──────────────────────────────────────────────────────────────
router.get("/campaigns", async (req, res) => {
  const campaigns = await db.select().from(fundraisingCampaignsTable).orderBy(desc(fundraisingCampaignsTable.createdAt));
  res.json(campaigns);
});

router.post("/campaigns", async (req, res) => {
  const { name, description, goalAmount, startDate, endDate } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const [campaign] = await db.insert(fundraisingCampaignsTable)
    .values({ name, description, goalAmount: goalAmount ?? 0, startDate, endDate, status: "active", raisedAmount: 0 })
    .returning();
  res.status(201).json(campaign);
});

router.get("/campaigns/:id", async (req, res) => {
  const [campaign] = await db.select().from(fundraisingCampaignsTable).where(eq(fundraisingCampaignsTable.id, parseInt(req.params.id)));
  if (!campaign) { res.status(404).json({ error: "Not found" }); return; }
  res.json(campaign);
});

router.patch("/campaigns/:id", async (req, res) => {
  const updates: Record<string, unknown> = {};
  ["name", "description", "goalAmount", "status", "startDate", "endDate"].forEach(f => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });
  const [campaign] = await db.update(fundraisingCampaignsTable).set(updates).where(eq(fundraisingCampaignsTable.id, parseInt(req.params.id))).returning();
  if (!campaign) { res.status(404).json({ error: "Not found" }); return; }
  res.json(campaign);
});

router.delete("/campaigns/:id", async (req, res) => {
  await db.delete(fundraisingCampaignsTable).where(eq(fundraisingCampaignsTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

// ── Donors ─────────────────────────────────────────────────────────────────
router.get("/donors", async (req, res) => {
  const { search, ward, tier, type } = req.query as Record<string, string>;
  let rows = await db.select().from(donorsTable).orderBy(desc(donorsTable.totalGiven));
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(d => d.name.toLowerCase().includes(s) || (d.phone ?? "").includes(s) || (d.email ?? "").toLowerCase().includes(s));
  }
  if (ward) rows = rows.filter(d => d.ward === ward);
  if (tier) rows = rows.filter(d => d.tier === tier);
  if (type) rows = rows.filter(d => d.type === type);
  res.json(rows);
});

router.post("/donors", async (req, res) => {
  const { name, phone, email, ward, type, tier, notes, tags } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const [donor] = await db.insert(donorsTable)
    .values({ name, phone, email, ward, type: type ?? "individual", tier: tier ?? "regular", notes, tags, totalGiven: 0 })
    .returning();
  res.status(201).json(donor);
});

router.patch("/donors/:id", async (req, res) => {
  const updates: Record<string, unknown> = {};
  ["name", "phone", "email", "ward", "type", "tier", "notes", "tags"].forEach(f => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });
  const [donor] = await db.update(donorsTable).set(updates).where(eq(donorsTable.id, parseInt(req.params.id))).returning();
  if (!donor) { res.status(404).json({ error: "Not found" }); return; }
  res.json(donor);
});

router.delete("/donors/:id", async (req, res) => {
  await db.delete(donorsTable).where(eq(donorsTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

// ── Donations ──────────────────────────────────────────────────────────────
router.get("/donations", async (req, res) => {
  const { campaignId, donorId } = req.query as Record<string, string>;
  let rows = await db.select().from(donationsTable).orderBy(desc(donationsTable.receivedAt));
  if (campaignId) rows = rows.filter(r => r.campaignId === parseInt(campaignId));
  if (donorId) rows = rows.filter(r => r.donorId === parseInt(donorId));
  res.json(rows);
});

router.post("/donations", async (req, res) => {
  const { campaignId, donorId, donorName, amount, channel, reference, ward, notes } = req.body;
  if (!donorName || !amount) { res.status(400).json({ error: "donorName and amount required" }); return; }

  const [donation] = await db.insert(donationsTable)
    .values({ campaignId: campaignId ?? null, donorId: donorId ?? null, donorName, amount: parseInt(amount), channel: channel ?? "cash", reference, ward, notes })
    .returning();

  if (campaignId) {
    await db.update(fundraisingCampaignsTable)
      .set({ raisedAmount: sql`raised_amount + ${parseInt(amount)}` })
      .where(eq(fundraisingCampaignsTable.id, parseInt(campaignId)));
  }
  if (donorId) {
    await db.update(donorsTable)
      .set({ totalGiven: sql`total_given + ${parseInt(amount)}` })
      .where(eq(donorsTable.id, parseInt(donorId)));
  }

  res.status(201).json(donation);
});

router.patch("/donations/:id/reconcile", async (req, res) => {
  const [donation] = await db.update(donationsTable)
    .set({ reconciled: 1 })
    .where(eq(donationsTable.id, parseInt(req.params.id)))
    .returning();
  if (!donation) { res.status(404).json({ error: "Not found" }); return; }
  res.json(donation);
});

router.delete("/donations/:id", async (req, res) => {
  const [donation] = await db.select().from(donationsTable).where(eq(donationsTable.id, parseInt(req.params.id)));
  if (donation?.campaignId && donation?.amount) {
    await db.update(fundraisingCampaignsTable)
      .set({ raisedAmount: sql`greatest(0, raised_amount - ${donation.amount})` })
      .where(eq(fundraisingCampaignsTable.id, donation.campaignId));
  }
  if (donation?.donorId && donation?.amount) {
    await db.update(donorsTable)
      .set({ totalGiven: sql`greatest(0, total_given - ${donation.amount})` })
      .where(eq(donorsTable.id, donation.donorId));
  }
  await db.delete(donationsTable).where(eq(donationsTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

// ── Pledges ────────────────────────────────────────────────────────────────
router.get("/pledges", async (req, res) => {
  const { status, campaignId } = req.query as Record<string, string>;
  let rows = await db.select().from(pledgesTable).orderBy(desc(pledgesTable.createdAt));
  if (status) rows = rows.filter(r => r.status === status);
  if (campaignId) rows = rows.filter(r => r.campaignId === parseInt(campaignId));
  res.json(rows);
});

router.post("/pledges", async (req, res) => {
  const { donorName, donorId, campaignId, amount, promisedDate, channel, notes } = req.body;
  if (!donorName || !amount) { res.status(400).json({ error: "donorName and amount required" }); return; }
  const [pledge] = await db.insert(pledgesTable)
    .values({ donorName, donorId: donorId ?? null, campaignId: campaignId ?? null, amount: parseInt(amount), promisedDate, channel, notes, status: "pending" })
    .returning();
  res.status(201).json(pledge);
});

router.patch("/pledges/:id", async (req, res) => {
  const updates: Record<string, unknown> = {};
  ["status", "fulfilledDate", "notes", "channel", "promisedDate"].forEach(f => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });
  const [pledge] = await db.update(pledgesTable).set(updates).where(eq(pledgesTable.id, parseInt(req.params.id))).returning();
  if (!pledge) { res.status(404).json({ error: "Not found" }); return; }
  res.json(pledge);
});

router.delete("/pledges/:id", async (req, res) => {
  await db.delete(pledgesTable).where(eq(pledgesTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

// ── Pipeline ───────────────────────────────────────────────────────────────
router.get("/pipeline", async (req, res) => {
  const [donorBreakdown] = await db
    .select({
      major: sql<number>`count(*) filter (where tier = 'major')`,
      regular: sql<number>`count(*) filter (where tier = 'regular')`,
      grassroots: sql<number>`count(*) filter (where tier = 'grassroots')`,
    })
    .from(donorsTable);

  const wardBreakdown = await db
    .select({
      ward: donorsTable.ward,
      count: sql<number>`count(*)`,
      total: sql<number>`coalesce(sum(total_given), 0)`,
    })
    .from(donorsTable)
    .where(sql`ward is not null`)
    .groupBy(donorsTable.ward)
    .orderBy(sql`sum(total_given) desc`);

  const typeBreakdown = await db
    .select({
      type: donorsTable.type,
      count: sql<number>`count(*)`,
      total: sql<number>`coalesce(sum(total_given), 0)`,
    })
    .from(donorsTable)
    .groupBy(donorsTable.type);

  const pendingPledges = await db.select().from(pledgesTable).where(eq(pledgesTable.status, "pending")).orderBy(desc(pledgesTable.amount));
  const topDonors = await db.select().from(donorsTable).orderBy(desc(donorsTable.totalGiven)).limit(10);

  const monthlyTrend = await db
    .select({
      month: sql<string>`to_char(received_at, 'YYYY-MM')`,
      total: sql<number>`coalesce(sum(amount), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(donationsTable)
    .groupBy(sql`to_char(received_at, 'YYYY-MM')`)
    .orderBy(sql`to_char(received_at, 'YYYY-MM')`);

  res.json({ donorBreakdown, wardBreakdown, typeBreakdown, pendingPledges, topDonors, monthlyTrend });
});

// ── Reconciliation ─────────────────────────────────────────────────────────
router.get("/reconciliation", async (req, res) => {
  const all = await db.select().from(donationsTable).orderBy(desc(donationsTable.receivedAt));
  const reconciled = all.filter(d => d.reconciled === 1);
  const unreconciled = all.filter(d => d.reconciled !== 1);

  const byChannel = await db
    .select({
      channel: donationsTable.channel,
      total: sql<number>`coalesce(sum(amount), 0)`,
      reconciled: sql<number>`coalesce(sum(case when reconciled = 1 then amount else 0 end), 0)`,
      unreconciled: sql<number>`coalesce(sum(case when reconciled != 1 or reconciled is null then amount else 0 end), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(donationsTable)
    .groupBy(donationsTable.channel);

  res.json({
    total: all.length,
    reconciled: reconciled.length,
    unreconciled: unreconciled.length,
    totalAmount: all.reduce((s, d) => s + d.amount, 0),
    reconciledAmount: reconciled.reduce((s, d) => s + d.amount, 0),
    unreconciledAmount: unreconciled.reduce((s, d) => s + d.amount, 0),
    byChannel,
    unreconciledDonations: unreconciled,
  });
});

// ── Insights (computed) ─────────────────────────────────────────────────────
router.get("/insights", async (req, res) => {
  const [totals] = await db.select({ raised: sql<number>`coalesce(sum(amount), 0)`, count: sql<number>`count(*)` }).from(donationsTable);
  const [goalTotals] = await db.select({ goal: sql<number>`coalesce(sum(goal_amount), 0)` }).from(fundraisingCampaignsTable).where(eq(fundraisingCampaignsTable.status, "active"));
  const [pledgeTotals] = await db.select({ pending: sql<number>`coalesce(sum(amount), 0)`, count: sql<number>`count(*)` }).from(pledgesTable).where(eq(pledgesTable.status, "pending"));
  const [donorCount] = await db.select({ count: sql<number>`count(*)` }).from(donorsTable);
  const [majorDonors] = await db.select({ count: sql<number>`count(*)`, total: sql<number>`coalesce(sum(total_given), 0)` }).from(donorsTable).where(eq(donorsTable.tier, "major"));

  const raised = Number(totals?.raised ?? 0);
  const goal = Number(goalTotals?.goal ?? 0);
  const pledgePending = Number(pledgeTotals?.pending ?? 0);
  const gap = Math.max(0, goal - raised);
  const pct = goal > 0 ? Math.round((raised / goal) * 100) : 0;

  const insights = [
    {
      type: pct >= 80 ? "success" : pct >= 50 ? "info" : "warning",
      title: `${pct}% of active campaign goals reached`,
      body: `KES ${raised.toLocaleString()} raised of KES ${goal.toLocaleString()} target. Gap: KES ${gap.toLocaleString()}`,
      action: pct < 80 ? "Accelerate outreach to major donors" : "On track — maintain momentum",
    },
    {
      type: "info",
      title: `${Number(pledgeTotals?.count ?? 0)} pending pledges totalling KES ${pledgePending.toLocaleString()}`,
      body: "Follow up on outstanding pledges to convert to confirmed donations",
      action: "Run pledge conversion call — target highest value pledges first",
    },
    {
      type: Number(majorDonors?.count ?? 0) < 5 ? "warning" : "success",
      title: `${Number(majorDonors?.count ?? 0)} major donors — KES ${Number(majorDonors?.total ?? 0).toLocaleString()} contributed`,
      body: `Major donors contribute ${raised > 0 ? Math.round((Number(majorDonors?.total ?? 0) / raised) * 100) : 0}% of total raised`,
      action: "Identify and cultivate 3 more major donor prospects from KOL network",
    },
    {
      type: "info",
      title: `${Number(donorCount?.count ?? 0)} registered donors across 5 wards`,
      body: "Donor registry enables repeat-giving and targeted outreach",
      action: "Map donors by ward — identify coverage gaps and grassroots opportunities",
    },
  ];

  res.json({ insights, raised, goal, pct, gap, pledgePending, donorCount: Number(donorCount?.count ?? 0) });
});

export default router;
