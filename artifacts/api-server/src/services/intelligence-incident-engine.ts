import { createHash } from "node:crypto";
import {
  db,
  narrativeMentionsTable,
  narrativeResponsesTable,
} from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";

export type IncidentAction = "ignore" | "monitor" | "respond" | "escalate";
export type IncidentStatus =
  | "detected"
  | "analysed"
  | "awaiting_approval"
  | "approved"
  | "published"
  | "monitoring"
  | "closed";

type AssignmentInput = {
  assignedTo: string;
  dueAt?: string | null;
  priority?: string | null;
};

type StatusInput = {
  status: IncidentStatus;
  note?: string | null;
  actor?: string | null;
};

function normalizeContent(value: string): string {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/@\w+/g, " ")
    .replace(/#\w+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fingerprint(value: string): string {
  return createHash("sha256")
    .update(normalizeContent(value))
    .digest("hex")
    .slice(0, 20);
}

function incidentCode(id: number): string {
  return `INT-2027-${String(id).padStart(6, "0")}`;
}

function confidenceFor(mention: any, duplicateCount: number): number {
  const base =
    mention.aiAnalyzed ? 72 :
    mention.sentimentScore != null ? 66 :
    58;

  const threatBoost =
    mention.threatLevel === "critical" ? 18 :
    mention.threatLevel === "high" ? 12 :
    mention.threatLevel === "elevated" ? 7 : 2;

  const duplicateBoost = Math.min(8, duplicateCount);
  return Math.max(35, Math.min(98, base + threatBoost + duplicateBoost));
}

function recommendedAction(mention: any, duplicateCount: number): IncidentAction {
  const engagement = Number(mention.engagementCount ?? 0);
  const threat = String(mention.threatLevel ?? "normal").toLowerCase();
  const sentiment = String(mention.sentiment ?? "neutral").toLowerCase();

  if (threat === "critical") return "escalate";
  if (threat === "high" && (engagement > 1000 || duplicateCount > 4)) {
    return "respond";
  }
  if (sentiment === "negative" && engagement > 300) return "respond";
  if (threat === "elevated" || duplicateCount > 2) return "monitor";
  if (sentiment === "positive") return "ignore";
  return "monitor";
}

function buildStrategyReason(
  mention: any,
  duplicateCount: number,
  action: IncidentAction,
): string {
  const engagement = Number(mention.engagementCount ?? 0);
  const threat = String(mention.threatLevel ?? "normal").toUpperCase();

  if (action === "escalate") {
    return `Critical allegation requires legal and campaign leadership review before publication. Current engagement: ${engagement.toLocaleString("en-KE")}.`;
  }
  if (action === "respond") {
    return `${threat} threat with material reach or repetition. A factual, approved response is recommended.`;
  }
  if (action === "monitor") {
    return `Current reach is limited or evidence is incomplete. Continue monitoring ${duplicateCount + 1} related mention(s).`;
  }
  return "The mention is positive, low-risk or unlikely to benefit from direct engagement.";
}

function localMultichannel(
  source: string,
  topic: string,
): Record<string, string> {
  const cleanTopic = topic || "Makueni development priorities";
  const base =
    `Facts and accountability matter. Prof. Philip Kaloki's campaign remains focused on ${cleanTopic}, responsible leadership and practical solutions for communities across Makueni County.`;

  const trim = (value: string, limit: number) =>
    value.length <= limit
      ? value
      : `${value.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;

  return {
    twitter: trim(base, 280),
    facebook:
      `${base} We welcome constructive engagement and will continue sharing verified information with residents.`,
    whatsapp:
      trim(`Makueni update: ${base}`, 450),
    sms:
      trim(`Kaloki 2027: ${base}`, 160),
    pressStatement:
      `The Kaloki 2027 campaign has noted the claim currently circulating. We urge the public to rely on verified information. ${base} Further clarification will be issued after the relevant facts are confirmed.`,
    rallyTalkingPoints: [
      "Acknowledge the concern without repeating unverified claims.",
      `Return the discussion to ${cleanTopic}.`,
      "Commit to verified facts, integrity and practical county-wide solutions.",
      "Invite residents to use official campaign channels for clarification.",
    ].join("\n"),
  };
}

function inferTopic(content: string): string {
  const text = content.toLowerCase();
  if (text.includes("water")) return "water access";
  if (text.includes("road")) return "road infrastructure";
  if (text.includes("health") || text.includes("hospital")) return "healthcare";
  if (text.includes("job") || text.includes("youth")) return "youth employment";
  if (text.includes("corrupt") || text.includes("fund")) {
    return "accountability and transparent use of public resources";
  }
  if (text.includes("education") || text.includes("school")) {
    return "education access";
  }
  return "Makueni development priorities";
}

async function ensureIncidentTables(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS narrative_incidents (
      id serial PRIMARY KEY,
      mention_id integer NOT NULL UNIQUE,
      incident_code text NOT NULL UNIQUE,
      fingerprint text NOT NULL,
      status text NOT NULL DEFAULT 'detected',
      assigned_to text,
      due_at timestamptz,
      priority text NOT NULL DEFAULT 'normal',
      recommended_action text,
      strategy_reason text,
      confidence integer NOT NULL DEFAULT 50,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      closed_at timestamptz
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS narrative_incidents_fingerprint_idx
    ON narrative_incidents (fingerprint)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS narrative_incident_events (
      id serial PRIMARY KEY,
      incident_id integer NOT NULL REFERENCES narrative_incidents(id) ON DELETE CASCADE,
      event_type text NOT NULL,
      actor text,
      note text,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function upsertIncidentForMention(mention: any, duplicateCount: number) {
  const action = recommendedAction(mention, duplicateCount);
  const reason = buildStrategyReason(mention, duplicateCount, action);
  const confidence = confidenceFor(mention, duplicateCount);
  const fp = fingerprint(mention.content ?? "");

  const result = await db.execute(sql`
    INSERT INTO narrative_incidents (
      mention_id,
      incident_code,
      fingerprint,
      status,
      priority,
      recommended_action,
      strategy_reason,
      confidence
    )
    VALUES (
      ${mention.id},
      ${incidentCode(mention.id)},
      ${fp},
      ${mention.aiAnalyzed ? "analysed" : "detected"},
      ${mention.threatLevel ?? "normal"},
      ${action},
      ${reason},
      ${confidence}
    )
    ON CONFLICT (mention_id)
    DO UPDATE SET
      fingerprint = EXCLUDED.fingerprint,
      priority = EXCLUDED.priority,
      recommended_action = EXCLUDED.recommended_action,
      strategy_reason = EXCLUDED.strategy_reason,
      confidence = EXCLUDED.confidence,
      updated_at = now()
    RETURNING *
  `);

  return (result as any).rows?.[0] ?? null;
}

export async function listIncidents(filters?: {
  status?: string;
  platform?: string;
  threatLevel?: string;
}) {
  await ensureIncidentTables();

  const mentions = await db
    .select()
    .from(narrativeMentionsTable)
    .orderBy(desc(narrativeMentionsTable.detectedAt));

  const groups = new Map<string, any[]>();
  for (const mention of mentions) {
    const key = fingerprint(mention.content ?? "");
    const group = groups.get(key) ?? [];
    group.push(mention);
    groups.set(key, group);
  }

  const responseRows = await db
    .select()
    .from(narrativeResponsesTable)
    .orderBy(desc(narrativeResponsesTable.createdAt));

  const responseByMention = new Map<number, any>();
  for (const response of responseRows) {
    if (
      response.mentionId != null &&
      !responseByMention.has(response.mentionId)
    ) {
      responseByMention.set(response.mentionId, response);
    }
  }

  const incidents = [];
  for (const mention of mentions) {
    const duplicateGroup = groups.get(fingerprint(mention.content ?? "")) ?? [];
    const duplicateCount = Math.max(0, duplicateGroup.length - 1);
    const stored = await upsertIncidentForMention(mention, duplicateCount);
    const response = responseByMention.get(mention.id);

    const item = {
      ...stored,
      mention,
      response: response ?? null,
      duplicateCount,
      relatedMentionIds: duplicateGroup
        .filter((item) => item.id !== mention.id)
        .map((item) => item.id),
      estimatedReach: duplicateGroup.reduce(
        (sum, item) => sum + Number(item.engagementCount ?? 0),
        0,
      ),
      topic: inferTopic(mention.content ?? ""),
      sourceUrl: mention.url ?? null,
    };

    if (filters?.status && filters.status !== "all" && item.status !== filters.status) {
      continue;
    }
    if (
      filters?.platform &&
      filters.platform !== "all" &&
      mention.platform !== filters.platform
    ) {
      continue;
    }
    if (
      filters?.threatLevel &&
      filters.threatLevel !== "all" &&
      mention.threatLevel !== filters.threatLevel
    ) {
      continue;
    }

    incidents.push(item);
  }

  return incidents;
}

export async function getIncident(identifier: string) {
  await ensureIncidentTables();

  const numericId = Number(identifier.replace(/^INT-2027-/, ""));
  if (!Number.isFinite(numericId)) return null;

  const incidents = await listIncidents();
  const incident = incidents.find(
    (item: any) =>
      item.mention?.id === numericId ||
      item.incident_code === identifier ||
      item.id === numericId,
  );

  if (!incident) return null;

  const eventsResult = await db.execute(sql`
    SELECT *
    FROM narrative_incident_events
    WHERE incident_id = ${incident.id}
    ORDER BY created_at ASC
  `);

  const syntheticTimeline = [
    {
      event_type: "detected",
      actor: "system",
      note: "Threat detected from monitored source",
      created_at: incident.mention.detectedAt,
    },
    incident.mention.aiAnalyzed
      ? {
          event_type: "analysed",
          actor: "local-engine",
          note: "Local intelligence analysis completed",
          created_at: incident.mention.detectedAt,
        }
      : null,
    incident.response
      ? {
          event_type: "response_drafted",
          actor: incident.response.draftedBy ?? "local-engine",
          note: "Counter-narrative drafted",
          created_at: incident.response.createdAt,
        }
      : null,
    incident.response?.approvedAt
      ? {
          event_type: "approved",
          actor: incident.response.approvedBy ?? "Campaign Manager",
          note: "Response approved",
          created_at: incident.response.approvedAt,
        }
      : null,
    incident.response?.publishedAt
      ? {
          event_type: "responded",
          actor: incident.response.approvedBy ?? "Communications Team",
          note: "Response marked as published/responded",
          created_at: incident.response.publishedAt,
        }
      : null,
  ].filter(Boolean);

  return {
    ...incident,
    timeline: [
      ...syntheticTimeline,
      ...(((eventsResult as any).rows ?? []) as any[]),
    ].sort(
      (a: any, b: any) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime(),
    ),
  };
}

export async function assignIncident(
  identifier: string,
  input: AssignmentInput,
) {
  const incident = await getIncident(identifier);
  if (!incident) return null;

  const result = await db.execute(sql`
    UPDATE narrative_incidents
    SET
      assigned_to = ${input.assignedTo},
      due_at = ${input.dueAt ? new Date(input.dueAt) : null},
      priority = ${input.priority ?? incident.priority ?? "normal"},
      updated_at = now()
    WHERE id = ${incident.id}
    RETURNING *
  `);

  await db.execute(sql`
    INSERT INTO narrative_incident_events (
      incident_id,
      event_type,
      actor,
      note,
      metadata
    )
    VALUES (
      ${incident.id},
      'assigned',
      ${input.assignedTo},
      ${`Incident assigned to ${input.assignedTo}`},
      ${JSON.stringify({
        dueAt: input.dueAt ?? null,
        priority: input.priority ?? null,
      })}::jsonb
    )
  `);

  return (result as any).rows?.[0] ?? null;
}

export async function updateIncidentStatus(
  identifier: string,
  input: StatusInput,
) {
  const incident = await getIncident(identifier);
  if (!incident) return null;

  const result = await db.execute(sql`
    UPDATE narrative_incidents
    SET
      status = ${input.status},
      updated_at = now(),
      closed_at = ${input.status === "closed" ? new Date() : null}
    WHERE id = ${incident.id}
    RETURNING *
  `);

  await db.execute(sql`
    INSERT INTO narrative_incident_events (
      incident_id,
      event_type,
      actor,
      note
    )
    VALUES (
      ${incident.id},
      ${input.status},
      ${input.actor ?? "Campaign Operations"},
      ${input.note ?? `Incident status changed to ${input.status}`}
    )
  `);

  return (result as any).rows?.[0] ?? null;
}

export async function recordIncidentEvent(
  identifier: string,
  event: {
    eventType: string;
    actor?: string | null;
    note?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const incident = await getIncident(identifier);
  if (!incident) return null;

  const result = await db.execute(sql`
    INSERT INTO narrative_incident_events (
      incident_id,
      event_type,
      actor,
      note,
      metadata
    )
    VALUES (
      ${incident.id},
      ${event.eventType},
      ${event.actor ?? "Campaign Operations"},
      ${event.note ?? null},
      ${JSON.stringify(event.metadata ?? {})}::jsonb
    )
    RETURNING *
  `);

  return (result as any).rows?.[0] ?? null;
}

export async function buildIncidentChannels(identifier: string) {
  const incident = await getIncident(identifier);
  if (!incident) return null;

  return {
    incidentCode: incident.incident_code,
    topic: incident.topic,
    channels: localMultichannel(
      incident.mention.content ?? "",
      incident.topic,
    ),
    generatedBy: "local-campaign-engine",
    requiresApiKeys: false,
  };
}

export async function incidentMetrics() {
  const incidents = await listIncidents();
  const now = Date.now();

  const publishedToday = incidents.filter((item: any) => {
    const value = item.response?.publishedAt;
    if (!value) return false;
    const date = new Date(value);
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }).length;

  const responseTimes = incidents
    .filter((item: any) => item.response?.createdAt && item.mention?.detectedAt)
    .map(
      (item: any) =>
        new Date(item.response.createdAt).getTime() -
        new Date(item.mention.detectedAt).getTime(),
    )
    .filter((value: number) => value >= 0);

  return {
    activeIncidents: incidents.filter(
      (item: any) => !["closed", "published"].includes(item.status),
    ).length,
    highPriority: incidents.filter((item: any) =>
      ["critical", "high"].includes(
        String(item.priority ?? "").toLowerCase(),
      ),
    ).length,
    awaitingApproval: incidents.filter(
      (item: any) => item.response?.status === "pending_approval",
    ).length,
    publishedToday,
    duplicateAttacks: incidents.reduce(
      (sum: number, item: any) => sum + Number(item.duplicateCount ?? 0),
      0,
    ),
    estimatedReach: incidents.reduce(
      (sum: number, item: any) => sum + Number(item.estimatedReach ?? 0),
      0,
    ),
    averageResponseMinutes:
      responseTimes.length === 0
        ? 0
        : Math.round(
            responseTimes.reduce((sum: number, value: number) => sum + value, 0) /
              responseTimes.length /
              60000,
          ),
  };
}
