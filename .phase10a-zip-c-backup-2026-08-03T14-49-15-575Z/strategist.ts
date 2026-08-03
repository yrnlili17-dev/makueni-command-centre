import { Router } from "express";
import { db, strategistConversations, strategistMessages } from "@workspace/db";
import { sql, eq, desc, asc } from "drizzle-orm";
import { buildSmartAssistResponse } from "./ai";
import { requireAuth } from "../lib/auth";

const router = Router();

// Persisted strategist conversations contain sensitive strategy — require a logged-in session.
router.use(requireAuth);

const STRATEGIST_ROLE = `
ROLE: CHIEF STRATEGIST
You are the campaign's most senior strategic advisor — the Chief Strategist sitting at the right hand of the candidate and campaign manager. You see the whole board: voters, field operations, money, message, threats and the calendar.

How you operate:
- Think like a seasoned Kenyan political strategist. Be direct, decisive and honest — including about weaknesses.
- Ground every recommendation in the LIVE CAMPAIGN DATA digest provided. Cite the actual numbers when they matter. Never invent figures.
- Prioritize ruthlessly: say what matters most NOW given days-to-election and current gaps.
- Structure longer answers with short headers or numbered actions. Every answer must end with clear next actions (who does what, where, by when).
- Where relevant, tie advice to the campaign pillars and narrative playbook, and localize by ward.
- If the data digest shows a gap (e.g. zero canvass visits, low fundraising), call it out proactively even if not asked.
`.trim();

async function num(query: string): Promise<number> {
  try {
    const r = await db.execute(sql.raw(query));
    const row = r.rows[0] as Record<string, unknown> | undefined;
    const v = row ? Object.values(row)[0] : 0;
    return Number(v ?? 0) || 0;
  } catch {
    return 0;
  }
}

async function buildLiveDigest(): Promise<string> {
  const [
    membersTotal,
    supporters,
    activeVolunteers,
    doorsKnocked,
    messagesSent,
    openThreats,
    registeredVoters,
    upcomingEvents,
    milestonesTotal,
    milestonesDone,
    donationsTotal,
    pledgesPending,
    negMentions,
    posMentions,
  ] = await Promise.all([
    num(`SELECT count(*) FROM members`),
    num(`SELECT count(*) FROM members WHERE support_level IN ('strong_supporter','supporter')`),
    num(`SELECT count(*) FROM volunteers WHERE status = 'active'`),
    num(`SELECT count(*) FROM canvass_visits`),
    num(`SELECT coalesce(sum(recipient_count),0) FROM message_campaigns`),
    num(`SELECT count(*) FROM narrative_mentions WHERE status = 'open'`),
    num(`SELECT coalesce(sum(registered_voters),0) FROM polling_stations`),
    num(`SELECT count(*) FROM campaign_events WHERE start_date >= '${new Date().toISOString().slice(0, 10)}'`),
    num(`SELECT count(*) FROM milestones`),
    num(`SELECT count(*) FROM milestones WHERE status = 'completed'`),
    num(`SELECT coalesce(sum(amount),0) FROM donations`),
    num(`SELECT coalesce(sum(amount),0) FROM pledges WHERE status = 'pending'`),
    num(`SELECT count(*) FROM social_mentions WHERE sentiment = 'negative'`),
    num(`SELECT count(*) FROM social_mentions WHERE sentiment = 'positive'`),
  ]);

  let supportByWard: string = "no ward-level support data yet";
  try {
    const wards = await db.execute(sql.raw(
      `SELECT ward, count(*) AS contacts,
              sum(CASE WHEN support_level IN ('strong_supporter','supporter') THEN 1 ELSE 0 END) AS supporters
       FROM members WHERE ward IS NOT NULL AND ward <> '' GROUP BY ward ORDER BY ward`
    ));
    if (wards.rows.length > 0) {
      supportByWard = wards.rows
        .map((r) => {
          const row = r as { ward: string; contacts: string | number; supporters: string | number };
          return `${row.ward}: ${row.contacts} contacts, ${row.supporters} supporters`;
        })
        .join(" | ");
    }
  } catch {
    /* keep fallback */
  }

  let turnout = "assumptions not set";
  try {
    const t = await db.execute(sql.raw(
      `SELECT ta.ward, ta.expected_turnout_rate, ta.mule_support_share, coalesce(ps.reg,0) AS reg
       FROM turnout_assumptions ta
       LEFT JOIN (SELECT ward, sum(registered_voters) AS reg FROM polling_stations GROUP BY ward) ps ON ps.ward = ta.ward
       ORDER BY ta.ward`
    ));
    if (t.rows.length > 0) {
      turnout = t.rows
        .map((r) => {
          const row = r as { ward: string; expected_turnout_rate: number; mule_support_share: number; reg: string | number };
          const reg = Number(row.reg);
          const predicted = Math.round((reg * row.expected_turnout_rate * row.mule_support_share) / 10000);
          return `${row.ward}: ${reg.toLocaleString()} reg, ${row.expected_turnout_rate}% turnout, ${row.mule_support_share}% support → ~${predicted.toLocaleString()} Kaloki votes`;
        })
        .join(" | ");
    }
  } catch {
    /* keep fallback */
  }

  const electionDate = new Date("2027-08-09");
  const daysToElection = Math.ceil((electionDate.getTime() - Date.now()) / 86400000);
  const readiness = milestonesTotal > 0 ? Math.round((milestonesDone / milestonesTotal) * 100) : 0;

  return `
LIVE CAMPAIGN DATA (deterministic, pulled from the campaign database right now — cite these numbers, never invent others):
- Days to election (9 Aug 2027): ${daysToElection}
- Registered voters (polling station roll): ${registeredVoters.toLocaleString()}
- Voter contacts in database: ${membersTotal.toLocaleString()} (${supporters.toLocaleString()} identified supporters)
- Support by ward: ${supportByWard}
- Turnout forecast: ${turnout}
- Field: ${doorsKnocked.toLocaleString()} doors knocked | Volunteers active: ${activeVolunteers.toLocaleString()}
- Messaging: ${messagesSent.toLocaleString()} messages sent
- Finance: KES ${donationsTotal.toLocaleString()} raised | KES ${pledgesPending.toLocaleString()} in pending pledges
- Narrative: ${openThreats} open narrative threats | Social sentiment: ${posMentions} positive vs ${negMentions} negative mentions
- Campaign plan readiness: ${readiness}% (${milestonesDone}/${milestonesTotal} milestones) | Upcoming events: ${upcomingEvents}
`.trim();
}

// ---- guards (same pattern as other AI endpoints) ----
let strategistInFlight = false;
const lastCallByIp = new Map<string, number>();
const COOLDOWN_MS = 8000;


async function ensureStrategistOperationsTables() {
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS strategist_daily_briefings (
      id bigserial PRIMARY KEY,
      briefing_date date NOT NULL DEFAULT current_date,
      title text NOT NULL,
      summary text NOT NULL,
      priorities jsonb NOT NULL DEFAULT '[]'::jsonb,
      risks jsonb NOT NULL DEFAULT '[]'::jsonb,
      opportunities jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS strategist_action_queue (
      id bigserial PRIMARY KEY,
      title text NOT NULL,
      description text,
      category text NOT NULL DEFAULT 'executive',
      priority text NOT NULL DEFAULT 'high',
      status text NOT NULL DEFAULT 'pending',
      owner text,
      due_date date,
      source text DEFAULT 'manual',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `));
}

router.get("/briefings", async (req, res) => {
  try {
    await ensureStrategistOperationsTables();
    const result = await db.execute(sql.raw(`
      SELECT
        id,
        briefing_date AS "briefingDate",
        title,
        summary,
        priorities,
        risks,
        opportunities,
        created_at AS "createdAt"
      FROM strategist_daily_briefings
      ORDER BY briefing_date DESC, id DESC
      LIMIT 30
    `));
    res.json(result.rows);
  } catch (err) {
    req.log.error({ err }, "strategist briefings list failed");
    res.status(500).json({ error: "Failed to load strategist briefings" });
  }
});

router.post("/briefings/generate", async (req, res) => {
  try {
    await ensureStrategistOperationsTables();

    const safeCount = async (query: string): Promise<number> => {
      try {
        const result = await db.execute(sql.raw(query));
        const row = result.rows?.[0] as Record<string, unknown> | undefined;
        return Number(row ? Object.values(row)[0] : 0) || 0;
      } catch {
        return 0;
      }
    };

    const [
      constituents,
      missingPhone,
      wards,
      threats,
      pendingMilestones,
    ] = await Promise.all([
      safeCount(`SELECT count(*) FROM campaign_constituents`),

      safeCount(`
        SELECT count(*)
        FROM campaign_constituents
        WHERE phone IS NULL OR btrim(phone) = ''
      `),

      safeCount(`
        SELECT count(DISTINCT ward)
        FROM campaign_constituents
        WHERE ward IS NOT NULL AND btrim(ward) <> ''
      `),

      safeCount(`
        SELECT count(*)
        FROM narrative_mentions
        WHERE status = 'open'
      `),

      safeCount(`
        SELECT count(*)
        FROM milestones
        WHERE status <> 'completed'
      `),
    ]);

    const phoneCoverage =
      constituents > 0
        ? Math.round(
            ((constituents - missingPhone) / constituents) * 100,
          )
        : 0;

    const priorities = [
      pendingMilestones > 0
        ? `Close or assign the ${pendingMilestones} incomplete campaign milestones.`
        : "Protect completed campaign milestones and prepare the next delivery cycle.",

      phoneCoverage < 70
        ? `Recover missing contacts; phone coverage is currently ${phoneCoverage}%.`
        : `Maintain phone coverage at ${phoneCoverage}% and improve secondary contact channels.`,

      threats > 0
        ? `Review and assign owners to ${threats} open narrative threats.`
        : "Continue proactive narrative monitoring.",

      `Expand field and volunteer activity across the ${wards} imported wards.`,

      "Begin measurable support classification and persuasion tracking.",
    ];

    const risks = [
      phoneCoverage < 70
        ? "Low phone coverage limits direct voter contact."
        : "Contact coverage requires continued maintenance.",

      threats > 0
        ? `${threats} open narrative threats may affect campaign confidence.`
        : "No open narrative threats detected.",

      pendingMilestones > 0
        ? `${pendingMilestones} incomplete milestones may delay readiness.`
        : "No incomplete milestone risk detected.",
    ];

    const opportunities = [
      `${constituents.toLocaleString()} constituent records are available for structured outreach.`,

      `${wards} imported wards can support targeted field deployment.`,

      "Daily strategist briefings can now convert live data into assigned action.",
    ];

    const summary =
      `The live campaign database contains ${constituents.toLocaleString()} constituents across ${wards} imported wards. ` +
      `Phone coverage is ${phoneCoverage}%. There are ${pendingMilestones} incomplete milestones and ${threats} open narrative threats. ` +
      "Immediate emphasis should be placed on execution discipline, voter contact recovery, field activation and measurable support classification.";

    const today = new Date().toISOString().slice(0, 10);
    const title = `Daily Executive Briefing — ${today}`;

    const inserted = await db.execute(sql`
      INSERT INTO strategist_daily_briefings (
        briefing_date,
        title,
        summary,
        priorities,
        risks,
        opportunities
      )
      VALUES (
        current_date,
        ${title},
        ${summary},
        ${JSON.stringify(priorities)}::jsonb,
        ${JSON.stringify(risks)}::jsonb,
        ${JSON.stringify(opportunities)}::jsonb
      )
      RETURNING
        id,
        briefing_date AS "briefingDate",
        title,
        summary,
        priorities,
        risks,
        opportunities,
        created_at AS "createdAt"
    `);

    res.status(201).json(inserted.rows?.[0]);
  } catch (err) {
    req.log.error(
      { err },
      "strategist briefing generate failed",
    );

    res.status(500).json({
      error: "Failed to generate executive briefing",
      detail:
        err instanceof Error
          ? err.message
          : "Unknown briefing generation error",
    });
  }
});

router.get("/actions", async (req, res) => {
  try {
    await ensureStrategistOperationsTables();
    const result = await db.execute(sql.raw(`
      SELECT
        id,
        title,
        description,
        category,
        priority,
        status,
        owner,
        due_date AS "dueDate",
        source,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM strategist_action_queue
      ORDER BY
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        CASE status
          WHEN 'pending' THEN 1
          WHEN 'in_progress' THEN 2
          WHEN 'deferred' THEN 3
          ELSE 4
        END,
        id DESC
    `));
    res.json(result.rows);
  } catch (err) {
    req.log.error({ err }, "strategist actions list failed");
    res.status(500).json({ error: "Failed to load strategist actions" });
  }
});

router.post("/actions", async (req, res) => {
  try {
    await ensureStrategistOperationsTables();
    const body = req.body as any;
    const title = String(body?.title ?? "").trim();

    if (!title) {
      res.status(400).json({ error: "title required" });
      return;
    }

    const allowedPriorities = new Set(["critical", "high", "medium", "low"]);
    const allowedStatuses = new Set([
      "pending",
      "in_progress",
      "completed",
      "deferred",
    ]);

    const priority = allowedPriorities.has(body?.priority)
      ? body.priority
      : "high";
    const status = allowedStatuses.has(body?.status)
      ? body.status
      : "pending";

    const result = await db.execute(sql.raw(`
      INSERT INTO strategist_action_queue (
        title,
        description,
        category,
        priority,
        status,
        owner,
        due_date,
        source
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      title,
      body?.description ?? null,
      body?.category ?? "executive",
      priority,
      status,
      body?.owner ?? null,
      body?.dueDate ?? null,
      body?.source ?? "manual",
    ]));

    res.status(201).json(result.rows[0]);
  } catch (err) {
    req.log.error({ err }, "strategist action create failed");
    res.status(500).json({ error: "Failed to create strategist action" });
  }
});

router.patch("/actions/:id", async (req, res) => {
  try {
    await ensureStrategistOperationsTables();
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid action id" });
      return;
    }

    const body = req.body as any;
    const result = await db.execute(sql.raw(`
      UPDATE strategist_action_queue
      SET
        title = coalesce($2, title),
        description = coalesce($3, description),
        category = coalesce($4, category),
        priority = coalesce($5, priority),
        status = coalesce($6, status),
        owner = coalesce($7, owner),
        due_date = coalesce($8, due_date),
        updated_at = now()
      WHERE id = $1
      RETURNING *
    `, [
      id,
      body?.title ?? null,
      body?.description ?? null,
      body?.category ?? null,
      body?.priority ?? null,
      body?.status ?? null,
      body?.owner ?? null,
      body?.dueDate ?? null,
    ]));

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Action not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    req.log.error({ err }, "strategist action update failed");
    res.status(500).json({ error: "Failed to update strategist action" });
  }
});

router.delete("/actions/:id", async (req, res) => {
  try {
    await ensureStrategistOperationsTables();
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid action id" });
      return;
    }

    await db.execute(sql.raw(
      `DELETE FROM strategist_action_queue WHERE id = ${id}`,
    ));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "strategist action delete failed");
    res.status(500).json({ error: "Failed to delete strategist action" });
  }
});

router.get("/conversations", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(strategistConversations)
      .orderBy(desc(strategistConversations.updatedAt))
      .limit(50);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "strategist list conversations failed");
    res.status(500).json({ error: "Failed to load conversations" });
  }
});

router.get("/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid conversation id" });
    return;
  }
  try {
    const [conv] = await db
      .select()
      .from(strategistConversations)
      .where(eq(strategistConversations.id, id));
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const msgs = await db
      .select()
      .from(strategistMessages)
      .where(eq(strategistMessages.conversationId, id))
      .orderBy(asc(strategistMessages.createdAt), asc(strategistMessages.id));
    res.json({ ...conv, messages: msgs });
  } catch (err) {
    req.log.error({ err }, "strategist get conversation failed");
    res.status(500).json({ error: "Failed to load conversation" });
  }
});

router.delete("/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid conversation id" });
    return;
  }
  try {
    await db.delete(strategistMessages).where(eq(strategistMessages.conversationId, id));
    await db.delete(strategistConversations).where(eq(strategistConversations.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "strategist delete conversation failed");
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

router.post("/chat", async (req, res) => {
  const { message, conversationId } = req.body as { message?: string; conversationId?: number };
  const text = message?.trim();
  if (!text) {
    res.status(400).json({ error: "message required" });
    return;
  }
  if (text.length > 2000) {
    res.status(400).json({ error: "Message too long (max 2000 characters)" });
    return;
  }

  const ip = req.ip ?? "unknown";
  const last = lastCallByIp.get(ip) ?? 0;
  if (Date.now() - last < COOLDOWN_MS) {
    res.status(429).json({ error: "Please wait a few seconds between messages." });
    return;
  }
  if (strategistInFlight) {
    res.status(429).json({ error: "The strategist is already responding. Please wait." });
    return;
  }
  strategistInFlight = true;

  try {
    // Resolve or create conversation before streaming
    let convId: number;
    if (conversationId !== undefined && conversationId !== null) {
      if (!Number.isInteger(conversationId)) {
        res.status(400).json({ error: "Invalid conversation id" });
        return;
      }
      const [conv] = await db
        .select()
        .from(strategistConversations)
        .where(eq(strategistConversations.id, conversationId));
      if (!conv) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }
      convId = conv.id;
    } else {
      const title = text.length > 80 ? `${text.slice(0, 77)}...` : text;
      const [created] = await db
        .insert(strategistConversations)
        .values({ title })
        .returning();
      convId = created.id;
    }

    // Prior turns for context (last 12)
    const prior = await db
      .select()
      .from(strategistMessages)
      .where(eq(strategistMessages.conversationId, convId))
      .orderBy(desc(strategistMessages.createdAt), desc(strategistMessages.id))
      .limit(12);
    prior.reverse();

    const digest = await buildLiveDigest();

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write(`data: ${JSON.stringify({ conversationId: convId })}\n\n`);

    const assistantText = buildSmartAssistResponse({
      message: text,
      module: "chief-strategist",
      liveDigest: digest,
    });
    res.write(`data: ${JSON.stringify({ content: assistantText })}\n\n`);

    if (assistantText.trim()) {
      await db.insert(strategistMessages).values([
        { conversationId: convId, role: "user", content: text },
        { conversationId: convId, role: "assistant", content: assistantText },
      ]);
      await db
        .update(strategistConversations)
        .set({ updatedAt: new Date() })
        .where(eq(strategistConversations.id, convId));
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ error: "Smart Assist returned an empty response. Please retry." })}\n\n`);
    }
    res.end();
  } catch (err) {
    req.log.error({ err }, "strategist chat failed");
    if (!res.headersSent) {
      res.status(500).json({ error: "Chief Strategist is unavailable. Please retry." });
    } else {
      res.end();
    }
  } finally {
    strategistInFlight = false;
    lastCallByIp.set(ip, Date.now());
  }
});

export default router;
