import { Router } from "express";
import { db, membersTable, volunteersTable, messageCampaignsTable, canvassVisitsTable, canvassSessionsTable, narrativeMentionsTable, milestonesTable, campaignEventsTable, campaignSettingsTable, warRoomBriefsTable, messagingProvidersTable, pollingStationsTable, volunteerTasksTable } from "@workspace/db";
import { sql, eq, gte, inArray, and, or, isNull } from "drizzle-orm";
import { MAKUENI_WARDS } from "../data/makueni-geography";
const WARDS = MAKUENI_WARDS.map(({ ward }) => ward);

const router = Router();
router.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.get("/operations", async (_req, res) => {
  const [volunteers] = await db.select({
    registered: sql<number>`count(*)`,
    pending: sql<number>`count(*) filter (where ${volunteersTable.status} = 'pending')`,
  }).from(volunteersTable).where(inArray(volunteersTable.ward, WARDS));
  const [tasks] = await db.select({
    open: sql<number>`count(*) filter (where ${volunteerTasksTable.status} not in ('completed', 'cancelled'))`,
    completed: sql<number>`count(*) filter (where ${volunteerTasksTable.status} = 'completed')`,
  }).from(volunteerTasksTable).innerJoin(volunteersTable, eq(volunteersTable.id, volunteerTasksTable.volunteerId)).where(inArray(volunteersTable.ward, WARDS));
  res.json({ registeredVolunteers: Number(volunteers?.registered ?? 0), pendingVolunteers: Number(volunteers?.pending ?? 0), openVolunteerTasks: Number(tasks?.open ?? 0), completedVolunteerTasks: Number(tasks?.completed ?? 0), updatedAt: new Date().toISOString() });
});

router.get("/summary", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const [members, volunteers, messages, doors, wards, threats, milestones, events, settings] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(membersTable).where(inArray(membersTable.ward, WARDS)),
    db.select({ count: sql<number>`count(*)` }).from(volunteersTable).where(and(eq(volunteersTable.status, "active"), inArray(volunteersTable.ward, WARDS))),
    db.select({ total: sql<number>`sum(${messageCampaignsTable.recipientCount})` }).from(messageCampaignsTable),
    db.select({ total: sql<number>`count(*)` }).from(canvassVisitsTable).innerJoin(canvassSessionsTable, eq(canvassVisitsTable.sessionId, canvassSessionsTable.id)).where(inArray(canvassSessionsTable.ward, WARDS)),
    db.select({ ward: canvassSessionsTable.ward }).from(canvassSessionsTable).where(inArray(canvassSessionsTable.ward, WARDS)).groupBy(canvassSessionsTable.ward),
    db.select({ count: sql<number>`count(*)` }).from(narrativeMentionsTable).where(eq(narrativeMentionsTable.status, "open")),
    db.select({ total: sql<number>`count(*)`, completed: sql<number>`sum(case when ${milestonesTable.status} = 'completed' then 1 else 0 end)` }).from(milestonesTable),
    db.select({ count: sql<number>`count(*)` }).from(campaignEventsTable).where(and(gte(campaignEventsTable.startDate, today), or(isNull(campaignEventsTable.ward), inArray(campaignEventsTable.ward, WARDS)))),
    db.select().from(campaignSettingsTable).where(eq(campaignSettingsTable.key, "election_date")),
  ]);

  const total = Number(milestones[0]?.total ?? 0);
  const completed = Number(milestones[0]?.completed ?? 0);
  const readiness = total > 0 ? Math.round((completed / total) * 100) : 0;

  let daysToElection: number | null = null;
  if (settings[0]) {
    const diff = Math.ceil((new Date(settings[0].value).getTime() - new Date().getTime()) / 86400000);
    daysToElection = diff;
  }

  res.json({
    totalMembers: Number(members[0]?.count ?? 0),
    activeVolunteers: Number(volunteers[0]?.count ?? 0),
    messagesSent: Number(messages[0]?.total ?? 0),
    doorsKnocked: Number(doors[0]?.total ?? 0),
    wardsCovered: wards.length,
    openThreats: Number(threats[0]?.count ?? 0),
    campaignReadiness: readiness,
    daysToElection,
    recentMilestones: completed,
    upcomingEvents: Number(events[0]?.count ?? 0),
  });
});

router.get("/activity", async (req, res) => {
  const activity: Array<{ id: number; type: string; description: string; timestamp: string; module: string }> = [];

  const [members, visits, campaigns, events, mentions, briefs, volunteers, tasks] = await Promise.all([
    db.select({ id: membersTable.id, firstName: membersTable.firstName, lastName: membersTable.lastName, createdAt: membersTable.createdAt }).from(membersTable).orderBy(sql`${membersTable.createdAt} desc`).limit(3),
    db.select({ id: canvassVisitsTable.id, address: canvassVisitsTable.address, outcome: canvassVisitsTable.outcome, visitedAt: canvassVisitsTable.visitedAt }).from(canvassVisitsTable).orderBy(sql`${canvassVisitsTable.visitedAt} desc`).limit(3),
    db.select({ id: messageCampaignsTable.id, name: messageCampaignsTable.name, channel: messageCampaignsTable.channel, sentAt: messageCampaignsTable.sentAt }).from(messageCampaignsTable).where(sql`${messageCampaignsTable.sentAt} is not null`).orderBy(sql`${messageCampaignsTable.sentAt} desc`).limit(3),
    db.select({ id: campaignEventsTable.id, title: campaignEventsTable.title, createdAt: campaignEventsTable.createdAt }).from(campaignEventsTable).orderBy(sql`${campaignEventsTable.createdAt} desc`).limit(2),
    db.select({ id: narrativeMentionsTable.id, platform: narrativeMentionsTable.platform, threatLevel: narrativeMentionsTable.threatLevel, detectedAt: narrativeMentionsTable.detectedAt }).from(narrativeMentionsTable).orderBy(sql`${narrativeMentionsTable.detectedAt} desc`).limit(2),
    db.select({ id: warRoomBriefsTable.id, title: warRoomBriefsTable.title, createdAt: warRoomBriefsTable.createdAt }).from(warRoomBriefsTable).orderBy(sql`${warRoomBriefsTable.createdAt} desc`).limit(2),
    db.select().from(volunteersTable).where(inArray(volunteersTable.ward, WARDS)).orderBy(sql`${volunteersTable.joinedAt} desc`).limit(3),
    db.select({ id: volunteerTasksTable.id, title: volunteerTasksTable.title, status: volunteerTasksTable.status, updatedAt: volunteerTasksTable.updatedAt }).from(volunteerTasksTable).innerJoin(volunteersTable, eq(volunteersTable.id, volunteerTasksTable.volunteerId)).where(inArray(volunteersTable.ward, WARDS)).orderBy(sql`${volunteerTasksTable.updatedAt} desc`).limit(3),
  ]);

  volunteers.forEach(v => activity.push({ id: 1000000 + v.id, type: "volunteer_registered", description: `Volunteer registration: ${v.firstName} ${v.lastName} (${v.status})`, timestamp: v.joinedAt.toISOString(), module: "volunteers" }));
  tasks.forEach(t => activity.push({ id: 2000000 + t.id, type: "volunteer_task_updated", description: `Volunteer task: ${t.title} — ${t.status}`, timestamp: t.updatedAt.toISOString(), module: "volunteers" }));
  members.forEach((m, i) => activity.push({ id: i * 100 + 1, type: "member_added", description: `New contact registered: ${m.firstName} ${m.lastName}`, timestamp: m.createdAt.toISOString(), module: "members" }));
  visits.forEach((v, i) => activity.push({ id: i * 100 + 2, type: "visit_logged", description: `Door knock logged at ${v.address} — ${v.outcome}`, timestamp: v.visitedAt.toISOString(), module: "field-ops" }));
  campaigns.forEach((c, i) => activity.push({ id: i * 100 + 3, type: "campaign_sent", description: `${c.channel.toUpperCase()} campaign dispatched: ${c.name}`, timestamp: (c.sentAt ?? new Date()).toISOString(), module: "messaging" }));
  events.forEach((e, i) => activity.push({ id: i * 100 + 4, type: "event_created", description: `Event scheduled: ${e.title}`, timestamp: e.createdAt.toISOString(), module: "events" }));
  mentions.forEach((m, i) => activity.push({ id: i * 100 + 5, type: "threat_detected", description: `[ ${m.threatLevel.toUpperCase()} ] Narrative threat on ${m.platform}`, timestamp: m.detectedAt.toISOString(), module: "intelligence" }));
  briefs.forEach((b, i) => activity.push({ id: i * 100 + 6, type: "brief_filed", description: `Intel brief filed: ${b.title}`, timestamp: b.createdAt.toISOString(), module: "intelligence" }));

  activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(activity.slice(0, 15));
});

// Growth: members joined this month vs last month, weekly acquisition for 12
// weeks, open tasks and messages sent this calendar month.
router.get("/growth", async (_req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 86400000);
  const [thisMonth, lastMonth, weekly, openTasks, msgs, volunteerTasks] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(membersTable)
      .where(and(inArray(membersTable.ward, WARDS), gte(membersTable.createdAt, monthStart))),
    db.select({ n: sql<number>`count(*)` }).from(membersTable)
      .where(and(inArray(membersTable.ward, WARDS), gte(membersTable.createdAt, lastMonthStart), sql`${membersTable.createdAt} < ${monthStart}`)),
    db.select({
      week: sql<string>`to_char(date_trunc('week', ${membersTable.createdAt}), 'YYYY-MM-DD')`,
      n: sql<number>`count(*)`,
    }).from(membersTable)
      .where(and(inArray(membersTable.ward, WARDS), gte(membersTable.createdAt, twelveWeeksAgo)))
      .groupBy(sql`1`).orderBy(sql`1`),
    db.select({ n: sql<number>`count(*)` }).from(milestonesTable).where(sql`${milestonesTable.status} <> 'completed'`),
    db.select({ n: sql<number>`coalesce(sum(${messageCampaignsTable.recipientCount}), 0)` }).from(messageCampaignsTable)
      .where(gte(messageCampaignsTable.sentAt, monthStart)),
    db.select({ n: sql<number>`count(*)` }).from(volunteerTasksTable)
      .innerJoin(volunteersTable, eq(volunteersTable.id, volunteerTasksTable.volunteerId))
      .where(and(inArray(volunteersTable.ward, WARDS), sql`${volunteerTasksTable.status} not in ('completed', 'cancelled')`)),
  ]);
  // Fill missing weeks with zero so the chart has a continuous axis.
  const byWeek = new Map(weekly.map(w => [w.week, Number(w.n)]));
  const monday = new Date(now); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(monday.getTime() - (11 - i) * 7 * 86400000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { week: key, joined: byWeek.get(key) ?? 0 };
  });
  const cur = Number(thisMonth[0]?.n ?? 0);
  const prev = Number(lastMonth[0]?.n ?? 0);
  res.json({
    joinedThisMonth: cur,
    joinedLastMonth: prev,
    // null when last month had no sign-ups: a percentage would be meaningless.
    growthRate: prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null,
    weeks,
    openTasks: Number(openTasks[0]?.n ?? 0) + Number(volunteerTasks[0]?.n ?? 0),
    messagesThisMonth: Number(msgs[0]?.n ?? 0),
  });
});

// Campaign health: concrete checks, each with a fix pointer, plus a 0-100 score.
router.get("/health", async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const [providers, electionDate, stations, volWards, overdue, threats, consented] = await Promise.all([
    db.select({ channel: messagingProvidersTable.channel }).from(messagingProvidersTable).where(eq(messagingProvidersTable.isActive, true)),
    db.select().from(campaignSettingsTable).where(eq(campaignSettingsTable.key, "election_date")),
    db.select({ total: sql<number>`count(*)`, withAgent: sql<number>`count(${pollingStationsTable.agentName})` }).from(pollingStationsTable),
    db.select({ ward: volunteersTable.ward }).from(volunteersTable)
      .where(and(eq(volunteersTable.status, "active"), inArray(volunteersTable.ward, WARDS))).groupBy(volunteersTable.ward),
    db.select({ n: sql<number>`count(*)` }).from(milestonesTable)
      .where(and(sql`${milestonesTable.status} <> 'completed'`, sql`${milestonesTable.dueDate} < ${today}`)),
    db.select({ n: sql<number>`count(*)` }).from(narrativeMentionsTable)
      .where(and(eq(narrativeMentionsTable.status, "open"), inArray(narrativeMentionsTable.threatLevel, ["high", "critical"]))),
    db.select({ total: sql<number>`count(*)`, sms: sql<number>`sum(case when ${membersTable.smsConsent} then 1 else 0 end)` })
      .from(membersTable).where(and(inArray(membersTable.ward, WARDS), eq(membersTable.status, "active"))),
  ]);
  const channels = new Set(providers.map(p => p.channel));
  const stationTotal = Number(stations[0]?.total ?? 0);
  const agentPct = stationTotal ? Math.round((Number(stations[0]?.withAgent ?? 0) / stationTotal) * 100) : 0;
  const wardPct = Math.round((volWards.length / WARDS.length) * 100);
  const memberTotal = Number(consented[0]?.total ?? 0);
  const smsPct = memberTotal ? Math.round((Number(consented[0]?.sms ?? 0) / memberTotal) * 100) : 0;
  type Check = { id: string; label: string; status: "ok" | "warn" | "fail"; detail: string; href: string };
  const checks: Check[] = [
    { id: "sms", label: "SMS provider", status: channels.has("sms") ? "ok" : "fail",
      detail: channels.has("sms") ? "An SMS provider is active." : "No SMS provider is active, so SMS campaigns cannot send.", href: "/messaging" },
    { id: "whatsapp", label: "WhatsApp provider", status: channels.has("whatsapp") ? "ok" : "warn",
      detail: channels.has("whatsapp") ? "A WhatsApp provider is active." : "No WhatsApp provider is active.", href: "/messaging" },
    { id: "election-date", label: "Election date", status: electionDate[0] ? "ok" : "fail",
      detail: electionDate[0] ? `Set to ${electionDate[0].value}.` : "Not set, so countdown and turnout planning are off.", href: "/campaign-plan" },
    { id: "volunteer-coverage", label: "Volunteer coverage", status: wardPct >= 80 ? "ok" : wardPct >= 40 ? "warn" : "fail",
      detail: `${volWards.length} of ${WARDS.length} wards have at least one active volunteer.`, href: "/volunteers" },
    { id: "agents", label: "Polling agents", status: agentPct >= 90 ? "ok" : agentPct >= 30 ? "warn" : "fail",
      detail: `${agentPct}% of ${stationTotal.toLocaleString()} polling stations have an agent assigned.`, href: "/election-day" },
    { id: "milestones", label: "Overdue milestones", status: Number(overdue[0]?.n ?? 0) === 0 ? "ok" : "warn",
      detail: `${Number(overdue[0]?.n ?? 0)} milestone(s) are past their due date.`, href: "/campaign-plan" },
    { id: "threats", label: "Open high-level threats", status: Number(threats[0]?.n ?? 0) === 0 ? "ok" : "fail",
      detail: `${Number(threats[0]?.n ?? 0)} high or critical narrative threat(s) are still open.`, href: "/narrative-response" },
    { id: "consent", label: "SMS reach", status: smsPct >= 50 ? "ok" : smsPct >= 20 ? "warn" : "fail",
      detail: `${smsPct}% of active voters have given SMS consent.`, href: "/members" },
  ];
  const points = checks.reduce((s, c) => s + (c.status === "ok" ? 2 : c.status === "warn" ? 1 : 0), 0);
  const score = Math.round((points / (checks.length * 2)) * 100);
  res.json({ score, status: score >= 80 ? "healthy" : score >= 50 ? "needs_attention" : "at_risk", checks, generatedAt: new Date().toISOString() });
});

export default router;
