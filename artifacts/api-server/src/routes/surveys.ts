import { Router } from "express";
import { db, surveysTable, surveyResponsesTable, opinionPollsTable, pollVotesTable, topicalIssuesTable } from "@workspace/db";
import { eq, sql, desc, and } from "drizzle-orm";

const router = Router();

// ─── Opinion Polls ────────────────────────────────────────────────────────────

router.get("/polls", async (req, res) => {
  const polls = await db.select().from(opinionPollsTable).orderBy(desc(opinionPollsTable.createdAt));
  res.json(polls);
});

router.post("/polls", async (req, res) => {
  const { title, description, category = "general", ward = "all", options = [], deadline, createdBy = "Campaign Manager" } = req.body;
  if (!title || !options.length) { res.status(400).json({ error: "title and options required" }); return; }
  const opts = (options as string[]).map((label: string) => ({ label, votes: 0 }));
  const [poll] = await db.insert(opinionPollsTable).values({ title, description, category, ward, options: opts, deadline, createdBy, status: "active", totalVotes: 0 }).returning();
  res.status(201).json(poll);
});

router.patch("/polls/:id", async (req, res) => {
  const { status } = req.body;
  const [poll] = await db.update(opinionPollsTable).set({ status }).where(eq(opinionPollsTable.id, parseInt(req.params.id))).returning();
  if (!poll) { res.status(404).json({ error: "Not found" }); return; }
  res.json(poll);
});

router.delete("/polls/:id", async (req, res) => {
  await db.delete(pollVotesTable).where(eq(pollVotesTable.pollId, parseInt(req.params.id)));
  await db.delete(opinionPollsTable).where(eq(opinionPollsTable.id, parseInt(req.params.id)));
  res.json({ ok: true });
});

router.post("/polls/:id/vote", async (req, res) => {
  const pollId = parseInt(req.params.id);
  const { optionIndex, respondentName, ward, ageGroup, gender } = req.body;
  if (optionIndex === undefined) { res.status(400).json({ error: "optionIndex required" }); return; }
  const [poll] = await db.select().from(opinionPollsTable).where(eq(opinionPollsTable.id, pollId));
  if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }
  if (poll.status !== "active") { res.status(400).json({ error: "Poll is not active" }); return; }

  const [vote] = await db.insert(pollVotesTable).values({ pollId, optionIndex, respondentName, ward, ageGroup, gender }).returning();

  const opts = poll.options as Array<{ label: string; votes: number }>;
  opts[optionIndex].votes = (opts[optionIndex].votes ?? 0) + 1;
  await db.update(opinionPollsTable).set({ options: opts, totalVotes: sql`${opinionPollsTable.totalVotes} + 1` }).where(eq(opinionPollsTable.id, pollId));

  res.status(201).json(vote);
});

router.get("/polls/:id/results", async (req, res) => {
  const pollId = parseInt(req.params.id);
  const [poll] = await db.select().from(opinionPollsTable).where(eq(opinionPollsTable.id, pollId));
  if (!poll) { res.status(404).json({ error: "Not found" }); return; }
  const votes = await db.select().from(pollVotesTable).where(eq(pollVotesTable.pollId, pollId));

  const opts = poll.options as Array<{ label: string; votes: number }>;
  const total = poll.totalVotes;

  const wards = ["Tala", "Matungulu North", "Matungulu West", "Matungulu East", "Kyeleni"];
  const wardBreakdown = wards.map(ward => {
    const wardVotes = votes.filter(v => v.ward === ward);
    const optCounts = opts.map((_, idx) => wardVotes.filter(v => v.optionIndex === idx).length);
    return { ward, total: wardVotes.length, optCounts };
  });

  const ageGroups = ["18-25", "26-35", "36-45", "46-55", "56+"];
  const ageBreakdown = ageGroups.map(ag => {
    const agVotes = votes.filter(v => v.ageGroup === ag);
    return { ageGroup: ag, total: agVotes.length };
  });

  const genderBreakdown = [
    { gender: "Male", count: votes.filter(v => v.gender === "male").length },
    { gender: "Female", count: votes.filter(v => v.gender === "female").length },
    { gender: "Other", count: votes.filter(v => v.gender === "other").length },
  ];

  res.json({
    poll, total,
    options: opts.map((o, i) => ({ ...o, pct: total > 0 ? Math.round((o.votes / total) * 100) : 0, index: i })),
    wardBreakdown, ageBreakdown, genderBreakdown,
    recentVotes: votes.slice(-10).reverse(),
  });
});

// ─── Topical Issues ───────────────────────────────────────────────────────────

router.get("/issues", async (req, res) => {
  const { ward, urgency, status, category } = req.query as Record<string, string>;
  const conditions = [];
  if (ward && ward !== "all") conditions.push(eq(topicalIssuesTable.ward, ward));
  if (urgency) conditions.push(eq(topicalIssuesTable.urgency, urgency));
  if (status) conditions.push(eq(topicalIssuesTable.status, status));
  if (category) conditions.push(eq(topicalIssuesTable.category, category));
  const where = conditions.length ? and(...conditions) : undefined;
  const issues = await db.select().from(topicalIssuesTable).where(where).orderBy(desc(topicalIssuesTable.createdAt));
  res.json(issues);
});

router.post("/issues", async (req, res) => {
  const { title, description, category = "infrastructure", urgency = "medium", ward = "all", reportedBy, affectedPopulation, tags = [] } = req.body;
  if (!title || !description) { res.status(400).json({ error: "title and description required" }); return; }
  const [issue] = await db.insert(topicalIssuesTable).values({ title, description, category, urgency, ward, reportedBy, affectedPopulation: affectedPopulation ? parseInt(affectedPopulation) : undefined, tags, fieldReports: [], status: "open" }).returning();
  res.status(201).json(issue);
});

router.patch("/issues/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const fields = ["title","description","category","urgency","ward","status","reportedBy","affectedPopulation","tags","resolution"];
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (req.body.status === "resolved") updates.resolvedAt = new Date();
  const [issue] = await db.update(topicalIssuesTable).set(updates).where(eq(topicalIssuesTable.id, id)).returning();
  if (!issue) { res.status(404).json({ error: "Not found" }); return; }
  res.json(issue);
});

router.post("/issues/:id/report", async (req, res) => {
  const id = parseInt(req.params.id);
  const { reportedBy, notes, location, date } = req.body;
  if (!notes) { res.status(400).json({ error: "notes required" }); return; }
  const [issue] = await db.select().from(topicalIssuesTable).where(eq(topicalIssuesTable.id, id));
  if (!issue) { res.status(404).json({ error: "Not found" }); return; }
  const reports = (issue.fieldReports as any[]) ?? [];
  reports.push({ id: Date.now(), reportedBy, notes, location, date: date ?? new Date().toISOString().slice(0, 10), addedAt: new Date().toISOString() });
  const [updated] = await db.update(topicalIssuesTable).set({ fieldReports: reports, updatedAt: new Date() }).where(eq(topicalIssuesTable.id, id)).returning();
  res.json(updated);
});

router.delete("/issues/:id", async (req, res) => {
  await db.delete(topicalIssuesTable).where(eq(topicalIssuesTable.id, parseInt(req.params.id)));
  res.json({ ok: true });
});

// ─── Analytics ────────────────────────────────────────────────────────────────

router.get("/analytics", async (req, res) => {
  const [pollStats] = await db.select({
    total: sql<number>`count(*)`,
    active: sql<number>`sum(case when ${opinionPollsTable.status} = 'active' then 1 else 0 end)`,
    totalVotes: sql<number>`sum(${opinionPollsTable.totalVotes})`,
  }).from(opinionPollsTable);

  const [issueStats] = await db.select({
    total: sql<number>`count(*)`,
    open: sql<number>`sum(case when ${topicalIssuesTable.status} = 'open' then 1 else 0 end)`,
    critical: sql<number>`sum(case when ${topicalIssuesTable.urgency} = 'critical' then 1 else 0 end)`,
    resolved: sql<number>`sum(case when ${topicalIssuesTable.status} = 'resolved' then 1 else 0 end)`,
  }).from(topicalIssuesTable);

  const [surveyStats] = await db.select({
    total: sql<number>`count(*)`,
    totalResponses: sql<number>`sum(${surveysTable.responseCount})`,
  }).from(surveysTable);

  const byCategory = await db.select({
    category: topicalIssuesTable.category,
    count: sql<number>`count(*)`,
  }).from(topicalIssuesTable).where(eq(topicalIssuesTable.status, "open")).groupBy(topicalIssuesTable.category).orderBy(desc(sql`count(*)`));

  const byWard = await db.select({
    ward: topicalIssuesTable.ward,
    count: sql<number>`count(*)`,
    critical: sql<number>`sum(case when ${topicalIssuesTable.urgency} = 'critical' then 1 else 0 end)`,
  }).from(topicalIssuesTable).groupBy(topicalIssuesTable.ward).orderBy(desc(sql`count(*)`));

  const topPolls = await db.select().from(opinionPollsTable).orderBy(desc(opinionPollsTable.totalVotes)).limit(5);
  const recentIssues = await db.select().from(topicalIssuesTable).orderBy(desc(topicalIssuesTable.createdAt)).limit(5);

  res.json({
    polls: { total: Number(pollStats?.total ?? 0), active: Number(pollStats?.active ?? 0), totalVotes: Number(pollStats?.totalVotes ?? 0) },
    issues: { total: Number(issueStats?.total ?? 0), open: Number(issueStats?.open ?? 0), critical: Number(issueStats?.critical ?? 0), resolved: Number(issueStats?.resolved ?? 0) },
    surveys: { total: Number(surveyStats?.total ?? 0), totalResponses: Number(surveyStats?.totalResponses ?? 0) },
    byCategory: byCategory.map(r => ({ category: r.category, count: Number(r.count) })),
    byWard: byWard.map(r => ({ ward: r.ward ?? "All", count: Number(r.count), critical: Number(r.critical) })),
    topPolls,
    recentIssues,
  });
});

// ─── Field Surveys ────────────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  const surveys = await db.select().from(surveysTable).orderBy(desc(surveysTable.createdAt));
  res.json(surveys);
});

router.post("/", async (req, res) => {
  const { title, description, questions = [] } = req.body;
  if (!title) { res.status(400).json({ error: "title required" }); return; }
  const [survey] = await db.insert(surveysTable).values({ title, description, questions, status: "active", responseCount: 0 }).returning();
  res.status(201).json(survey);
});

router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;
  const [survey] = await db.update(surveysTable).set({ status }).where(eq(surveysTable.id, parseInt(req.params.id))).returning();
  if (!survey) { res.status(404).json({ error: "Not found" }); return; }
  res.json(survey);
});

router.get("/:id", async (req, res) => {
  const [survey] = await db.select().from(surveysTable).where(eq(surveysTable.id, parseInt(req.params.id)));
  if (!survey) { res.status(404).json({ error: "Not found" }); return; }
  res.json(survey);
});

router.get("/:id/responses", async (req, res) => {
  const responses = await db.select().from(surveyResponsesTable).where(eq(surveyResponsesTable.surveyId, parseInt(req.params.id))).orderBy(desc(surveyResponsesTable.submittedAt));
  res.json(responses);
});

router.post("/:id/responses", async (req, res) => {
  const surveyId = parseInt(req.params.id);
  const { memberId, answers } = req.body;
  if (!answers) { res.status(400).json({ error: "answers required" }); return; }
  const [response] = await db.insert(surveyResponsesTable).values({ surveyId, memberId, answers }).returning();
  await db.update(surveysTable).set({ responseCount: sql`${surveysTable.responseCount} + 1` }).where(eq(surveysTable.id, surveyId));
  res.status(201).json(response);
});

export default router;
