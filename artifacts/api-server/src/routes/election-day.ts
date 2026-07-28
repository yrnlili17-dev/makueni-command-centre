import { Router } from "express";
import { db, pollingStationsTable, tallyResultsTable, electionEventsTable } from "@workspace/db";
import { eq, sql, desc, and, inArray } from "drizzle-orm";

const router = Router();

const CANDIDATES = [
  { name: "Hon. Stephen Mule", party: "ODM" },
  { name: "Hon. Julius Malombe", party: "UDA" },
  { name: "George Mutisya Mwangi", party: "Independent" },
  { name: "Lucy Ndunda Muema", party: "Wiper" },
];

// ── Summary / HQ Tally ─────────────────────────────────────────────────────
router.get("/summary", async (req, res) => {
  const totalStations = await db.select({ count: sql<number>`count(*)` }).from(pollingStationsTable);
  const submittedStations = await db.select({ count: sql<number>`count(distinct station_code)` }).from(tallyResultsTable);
  const verifiedStations = await db.select({ count: sql<number>`count(distinct station_code)` }).from(tallyResultsTable).where(eq(tallyResultsTable.status, "verified"));

  const tallyByCandidate = await db
    .select({
      candidateName: tallyResultsTable.candidateName,
      party: tallyResultsTable.party,
      totalVotes: sql<number>`coalesce(sum(votes), 0)`,
      verifiedVotes: sql<number>`coalesce(sum(case when status = 'verified' then votes else 0 end), 0)`,
    })
    .from(tallyResultsTable)
    .groupBy(tallyResultsTable.candidateName, tallyResultsTable.party)
    .orderBy(sql`sum(votes) desc`);

  const wardBreakdown = await db
    .select({
      ward: pollingStationsTable.ward,
      totalStations: sql<number>`count(distinct ${pollingStationsTable.id})`,
      submittedStations: sql<number>`count(distinct ${tallyResultsTable.stationCode})`,
    })
    .from(pollingStationsTable)
    .leftJoin(tallyResultsTable, eq(pollingStationsTable.code, tallyResultsTable.stationCode))
    .groupBy(pollingStationsTable.ward);

  const totalRegistered = await db.select({ total: sql<number>`coalesce(sum(registered_voters), 0)` }).from(pollingStationsTable);
  const totalVotesCast = await db.select({ total: sql<number>`coalesce(sum(votes), 0)` }).from(tallyResultsTable).where(eq(tallyResultsTable.candidateName, CANDIDATES[0]!.name));

  res.json({
    totalStations: Number(totalStations[0]?.count ?? 0),
    submittedStations: Number(submittedStations[0]?.count ?? 0),
    verifiedStations: Number(verifiedStations[0]?.count ?? 0),
    totalRegisteredVoters: Number(totalRegistered[0]?.total ?? 0),
    tallyByCandidate,
    wardBreakdown,
  });
});

// ── Stations ───────────────────────────────────────────────────────────────
router.get("/stations", async (req, res) => {
  const { ward, status } = req.query as Record<string, string>;
  let query = db.select().from(pollingStationsTable).orderBy(pollingStationsTable.ward, pollingStationsTable.code);
  const rows = await query;
  let filtered = rows;
  if (ward) filtered = filtered.filter(r => r.ward === ward);
  if (status) filtered = filtered.filter(r => r.status === status);
  res.json(filtered);
});

router.post("/stations", async (req, res) => {
  const { code, name, ward, registeredVoters, streamCount, agentName, agentPhone } = req.body;
  if (!code || !name || !ward) { res.status(400).json({ error: "code, name, ward required" }); return; }
  const [station] = await db.insert(pollingStationsTable).values({ code, name, ward, registeredVoters: registeredVoters ?? 0, streamCount: streamCount ?? 1, agentName, agentPhone, status: "pending" }).returning();
  res.status(201).json(station);
});

router.patch("/stations/:id", async (req, res) => {
  const updates: Record<string, unknown> = {};
  ["code", "name", "ward", "registeredVoters", "streamCount", "agentName", "agentPhone", "status", "notes"].forEach(f => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });
  const [station] = await db.update(pollingStationsTable).set(updates).where(eq(pollingStationsTable.id, parseInt(req.params.id))).returning();
  if (!station) { res.status(404).json({ error: "Not found" }); return; }
  res.json(station);
});

// ── Tally Results ──────────────────────────────────────────────────────────
router.get("/results", async (req, res) => {
  const { stationCode, status } = req.query as Record<string, string>;
  let rows = await db.select().from(tallyResultsTable).orderBy(desc(tallyResultsTable.submittedAt));
  if (stationCode) rows = rows.filter(r => r.stationCode === stationCode);
  if (status) rows = rows.filter(r => r.status === status);
  res.json(rows);
});

router.post("/results", async (req, res) => {
  const { stationCode, results, totalValidVotes, rejectedVotes, submittedBy } = req.body;
  if (!stationCode || !results || !Array.isArray(results)) {
    res.status(400).json({ error: "stationCode and results[] required" }); return;
  }

  const [station] = await db.select().from(pollingStationsTable).where(eq(pollingStationsTable.code, stationCode));
  if (!station) { res.status(404).json({ error: "Station not found" }); return; }

  await db.delete(tallyResultsTable).where(eq(tallyResultsTable.stationCode, stationCode));

  const rows = await db.insert(tallyResultsTable).values(
    results.map((r: { candidateName: string; party: string; votes: number }) => ({
      stationId: station.id,
      stationCode,
      candidateName: r.candidateName,
      party: r.party,
      votes: parseInt(r.votes as unknown as string),
      totalValidVotes: totalValidVotes ?? null,
      rejectedVotes: rejectedVotes ?? 0,
      registeredVoters: station.registeredVoters,
      status: "submitted",
      submittedBy: submittedBy ?? "Agent",
      submittedAt: new Date(),
    }))
  ).returning();

  await db.update(pollingStationsTable).set({ status: "submitted" }).where(eq(pollingStationsTable.code, stationCode));
  res.status(201).json(rows);
});

router.patch("/results/:id/verify", async (req, res) => {
  const { verifiedBy } = req.body;
  const [result] = await db.select().from(tallyResultsTable).where(eq(tallyResultsTable.id, parseInt(req.params.id)));
  if (!result) { res.status(404).json({ error: "Not found" }); return; }
  const [updated] = await db.update(tallyResultsTable).set({ status: "verified", verifiedBy: verifiedBy ?? "HQ", verifiedAt: new Date() }).where(eq(tallyResultsTable.stationCode, result.stationCode)).returning();
  await db.update(pollingStationsTable).set({ status: "verified" }).where(eq(pollingStationsTable.code, result.stationCode));
  res.json(updated);
});

router.patch("/results/:id/dispute", async (req, res) => {
  const [updated] = await db.update(tallyResultsTable).set({ status: "disputed", notes: req.body.notes ?? "Flagged for review" }).where(eq(tallyResultsTable.id, parseInt(req.params.id))).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/results/:id", async (req, res) => {
  await db.delete(tallyResultsTable).where(eq(tallyResultsTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

// ── Election Events ────────────────────────────────────────────────────────
router.get("/events", async (req, res) => {
  const rows = await db.select().from(electionEventsTable).orderBy(desc(electionEventsTable.createdAt));
  res.json(rows);
});

router.post("/events", async (req, res) => {
  const { type, title, description, ward, stationCode, priority } = req.body;
  if (!title || !description) { res.status(400).json({ error: "title and description required" }); return; }
  const [event] = await db.insert(electionEventsTable).values({ type: type ?? "info", title, description, ward, stationCode, priority: priority ?? "normal", status: "open" }).returning();
  res.status(201).json(event);
});

router.patch("/events/:id", async (req, res) => {
  const updates: Record<string, unknown> = {};
  ["status", "notes"].forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const [event] = await db.update(electionEventsTable).set(updates).where(eq(electionEventsTable.id, parseInt(req.params.id))).returning();
  if (!event) { res.status(404).json({ error: "Not found" }); return; }
  res.json(event);
});

// ── Workqueue ──────────────────────────────────────────────────────────────
router.get("/workqueue", async (req, res) => {
  const submittedCodes = (await db.select({ code: tallyResultsTable.stationCode }).from(tallyResultsTable).groupBy(tallyResultsTable.stationCode)).map(r => r.code);

  const unsubmittedStations = await db.select().from(pollingStationsTable).where(inArray(pollingStationsTable.status, ["pending", "open"]));

  const pendingVerification = await db.select().from(tallyResultsTable).where(eq(tallyResultsTable.status, "submitted")).orderBy(tallyResultsTable.stationCode, desc(tallyResultsTable.submittedAt));

  const uniquePending = Object.values(
    pendingVerification.reduce((acc, r) => { if (!acc[r.stationCode]) acc[r.stationCode] = r; return acc; }, {} as Record<string, typeof pendingVerification[0]>)
  );

  res.json({ unsubmittedStations, pendingVerification: uniquePending, submittedCodes });
});

// ── Published Results ──────────────────────────────────────────────────────
router.get("/published", async (req, res) => {
  const verified = await db.select().from(tallyResultsTable).where(eq(tallyResultsTable.status, "verified")).orderBy(tallyResultsTable.candidateName);
  const byCandidate: Record<string, { candidateName: string; party: string; totalVotes: number; stationCount: number }> = {};
  for (const r of verified) {
    if (!byCandidate[r.candidateName]) {
      byCandidate[r.candidateName] = { candidateName: r.candidateName, party: r.party ?? "", totalVotes: 0, stationCount: 0 };
    }
    byCandidate[r.candidateName]!.totalVotes += r.votes;
    byCandidate[r.candidateName]!.stationCount += 1;
  }
  const totals = Object.values(byCandidate).sort((a, b) => b.totalVotes - a.totalVotes);
  res.json({ totals, breakdown: verified });
});

export default router;
