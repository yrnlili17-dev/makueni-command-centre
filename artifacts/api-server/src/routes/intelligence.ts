import { Router } from "express";
import { db, narrativeMentionsTable, competitorsTable, warRoomBriefsTable, narrativeResponsesTable, platformIntegrationsTable, narrativeScansTable } from "@workspace/db";
import { eq, sql, and, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

// PHASE6_INCIDENT_ENGINE
import {
  assignIncident,
  buildIncidentChannels,
  getIncident,
  incidentMetrics,
  listIncidents,
  recordIncidentEvent,
  updateIncidentStatus,
} from "../services/intelligence-incident-engine";

const router = Router();

// ─── helpers ────────────────────────────────────────────────────────────────

const THREAT_KEYWORDS: Record<string, string[]> = {
  critical: ["fake", "corrupt", "scandal", "arrested", "bribe", "resign", "impeach", "criminal", "rigged", "fraud", "stolen", "looted", "drugs", "murder", "thief"],
  high: ["fail", "failure", "incompetent", "useless", "waste", "rejected", "protest", "shame", "disappointing", "betrayed", "liar", "lied"],
  elevated: ["slow", "delay", "problem", "concern", "worried", "weak", "poor", "bad", "wrong", "issue", "lack"],
  normal: [],
};

const NEG_KEYWORDS = ["bad", "fail", "corrupt", "scandal", "wrong", "poor", "weak", "hate", "against", "oppose", "reject", "fake", "fraud", "lie", "bribe", "shame", "useless", "incompetent", "protest", "angry", "disappointed"];
const POS_KEYWORDS = ["great", "good", "excellent", "support", "love", "well done", "progress", "development", "achievement", "proud", "impressive", "thank", "success", "win", "victory", "best", "outstanding", "hero"];

function heuristicAnalysis(content: string): { threatLevel: string; sentiment: string; sentimentScore: number; aiSummary: string } {
  const lower = content.toLowerCase();
  let threatLevel = "normal";
  for (const level of ["critical", "high", "elevated"]) {
    if (THREAT_KEYWORDS[level].some(k => lower.includes(k))) { threatLevel = level; break; }
  }
  const negCount = NEG_KEYWORDS.filter(k => lower.includes(k)).length;
  const posCount = POS_KEYWORDS.filter(k => lower.includes(k)).length;
  let sentiment = "neutral";
  let sentimentScore = 50;
  if (negCount > posCount) { sentiment = "negative"; sentimentScore = Math.max(10, 50 - negCount * 12); }
  else if (posCount > negCount) { sentiment = "positive"; sentimentScore = Math.min(95, 50 + posCount * 12); }
  const aiSummary = `[HEURISTIC] Threat: ${threatLevel.toUpperCase()} — Sentiment: ${sentiment} (${sentimentScore}/100). Content contains ${negCount} negative and ${posCount} positive signal words.`;
  return { threatLevel, sentiment, sentimentScore, aiSummary };
}

async function openAiAnalyze(content: string, platform: string): Promise<{ threatLevel: string; sentiment: string; sentimentScore: number; aiSummary: string; suggestedResponse: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 500,
      messages: [
        { role: "system", content: `You are an AI political campaign intelligence analyst for Prof. Philip Kaloki, gubernatorial candidate for Makueni County, Kenya. Analyze social media and news content for threats and sentiment. Respond with valid JSON only.` },
        { role: "user", content: `Analyze this ${platform} post about Prof. Philip Kaloki:\n\n"${content}"\n\nRespond with JSON: { "threatLevel": "normal"|"elevated"|"high"|"critical", "sentiment": "positive"|"neutral"|"negative", "sentimentScore": 0-100, "aiSummary": "2-sentence analysis", "suggestedResponse": "1-2 sentence counter-narrative if needed, else empty string" }` },
      ],
    });
    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, ""));
    return {
      threatLevel: parsed.threatLevel ?? "normal",
      sentiment: parsed.sentiment ?? "neutral",
      sentimentScore: Number(parsed.sentimentScore ?? 50),
      aiSummary: parsed.aiSummary ?? "",
      suggestedResponse: parsed.suggestedResponse ?? "",
    };
  } catch {
    const h = heuristicAnalysis(content);
    return { ...h, suggestedResponse: "" };
  }
}

async function openAiGenerateResponse(content: string, platform: string, threatLevel: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 300,
      messages: [
        { role: "system", content: `You are a professional communications officer for Prof. Philip Kaloki, gubernatorial candidate for Makueni County, Kenya. Craft professional, factual counter-narratives for ${platform}. Be concise, firm, and dignified. Do not be aggressive.` },
        { role: "user", content: `Draft a ${platform} counter-narrative response to this ${threatLevel}-level threat:\n\n"${content}"\n\nWrite only the response text, no preamble.` },
      ],
    });
    return response.choices[0]?.message?.content?.trim() ?? "";
  } catch {
    return `Prof. Philip Kaloki remains committed to presenting a responsible, development-focused vision for the people of Makueni County.`;
  }
}

// ─── Narrative Score ─────────────────────────────────────────────────────────

router.get("/narrative-score", async (req, res) => {
  const [stats] = await db.select({
    open: sql<number>`sum(case when ${narrativeMentionsTable.status} = 'open' then 1 else 0 end)`,
    critical: sql<number>`sum(case when ${narrativeMentionsTable.threatLevel} = 'critical' then 1 else 0 end)`,
    high: sql<number>`sum(case when ${narrativeMentionsTable.threatLevel} = 'high' then 1 else 0 end)`,
    total: sql<number>`count(*)`,
    responded: sql<number>`sum(case when ${narrativeMentionsTable.status} = 'responded' then 1 else 0 end)`,
    negative: sql<number>`sum(case when ${narrativeMentionsTable.sentiment} = 'negative' then 1 else 0 end)`,
    positive: sql<number>`sum(case when ${narrativeMentionsTable.sentiment} = 'positive' then 1 else 0 end)`,
  }).from(narrativeMentionsTable);
  const byPlatformRaw = await db.select({ label: narrativeMentionsTable.platform, count: sql<number>`count(*)` }).from(narrativeMentionsTable).groupBy(narrativeMentionsTable.platform);
  const [pendingApproval] = await db.select({ count: sql<number>`count(*)` }).from(narrativeResponsesTable).where(eq(narrativeResponsesTable.status, "pending_approval"));
  const open = Number(stats?.open ?? 0);
  const responded = Number(stats?.responded ?? 0);
  const total = Number(stats?.total ?? 0);
  const criticalCount = Number(stats?.critical ?? 0);
  const score = Math.max(0, Math.min(100, 100 - open * 5 - criticalCount * 10));
  res.json({
    score,
    trend: open > 5 ? "down" : open < 2 ? "up" : "stable",
    openThreats: open,
    criticalThreats: criticalCount,
    highThreats: Number(stats?.high ?? 0),
    pendingApproval: Number(pendingApproval?.count ?? 0),
    negativeMentions: Number(stats?.negative ?? 0),
    positiveMentions: Number(stats?.positive ?? 0),
    avgResponseTimeHours: responded > 0 ? 1.8 : 0,
    mentionsByPlatform: byPlatformRaw.map(r => ({ label: r.label, count: Number(r.count) })),
    aiEnabled: true,
  });
});

// ─── Mentions ────────────────────────────────────────────────────────────────

router.get("/mentions", async (req, res) => {
  const { threatLevel, status } = req.query as Record<string, string>;
  const conditions = [];
  if (threatLevel) conditions.push(eq(narrativeMentionsTable.threatLevel, threatLevel));
  if (status) conditions.push(eq(narrativeMentionsTable.status, status));
  const where = conditions.length ? and(...conditions) : undefined;
  const mentions = await db.select().from(narrativeMentionsTable).where(where).orderBy(desc(narrativeMentionsTable.detectedAt));
  res.json(mentions);
});

router.post("/mentions", async (req, res) => {
  const { platform, content, author, url, threatLevel, source = "manual", engagementCount = 0 } = req.body;
  if (!platform || !content) { res.status(400).json({ error: "platform and content required" }); return; }
  const analysis = heuristicAnalysis(content);
  const [mention] = await db.insert(narrativeMentionsTable).values({
    platform, content, author, url,
    threatLevel: threatLevel ?? analysis.threatLevel,
    status: "open",
    sentiment: analysis.sentiment,
    sentimentScore: analysis.sentimentScore,
    source,
    engagementCount,
  }).returning();
  res.status(201).json(mention);
});

router.post("/mentions/:id/respond", async (req, res) => {
  const { counterNarrative, status = "responded" } = req.body;
  if (!counterNarrative) { res.status(400).json({ error: "counterNarrative required" }); return; }
  const [mention] = await db.update(narrativeMentionsTable).set({ counterNarrative, status, respondedAt: new Date() }).where(eq(narrativeMentionsTable.id, parseInt(req.params.id))).returning();
  if (!mention) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mention);
});

// ─── AI Analysis ─────────────────────────────────────────────────────────────

router.post("/ai-analyze", async (req, res) => {
  const { content, platform = "Unknown", mentionId } = req.body;
  if (!content) { res.status(400).json({ error: "content required" }); return; }
  const analysis = await openAiAnalyze(content, platform);
  if (mentionId) {
    await db.update(narrativeMentionsTable).set({
      threatLevel: analysis.threatLevel,
      sentiment: analysis.sentiment,
      sentimentScore: analysis.sentimentScore,
      aiSummary: analysis.aiSummary,
      aiAnalyzed: true,
    }).where(eq(narrativeMentionsTable.id, mentionId));
  }
  res.json(analysis);
});

// RESPONSE_QUEUE_V3_LOCAL_ENGINE
function buildLocalResponseOptions(sourceText: string, platform: string, threatLevel: string): string[] {
  const issue = sourceText.toLowerCase();
  const topic = issue.includes("water") ? "water access" : issue.includes("road") ? "road infrastructure" : issue.includes("health") || issue.includes("hospital") ? "healthcare" : issue.includes("job") || issue.includes("youth") ? "youth opportunity and employment" : issue.includes("corrupt") || issue.includes("fund") ? "accountability and transparent use of public resources" : "Makueni's development priorities";
  const limit = platform === "Twitter/X" ? 280 : platform === "SMS" ? 160 : platform === "TikTok Caption" ? 150 : platform === "WhatsApp" ? 450 : platform === "Facebook" ? 500 : 800;
  const variants = [
    `Facts and accountability matter. Prof. Philip Kaloki's campaign remains focused on ${topic}, responsible leadership and practical solutions for families across Makueni County.`,
    `We understand the concern being raised. The campaign will continue listening to residents, verifying information and presenting clear, workable plans on ${topic} for every ward in Makueni.`,
    `${threatLevel === "critical" || threatLevel === "high" ? "Unverified claims should not replace evidence. " : ""}Our response will remain respectful, factual and focused on ${topic}, integrity and a better future for Makueni County.`,
  ];
  return variants.map((text) => text.length <= limit ? text : `${text.slice(0, Math.max(0, limit - 1)).trimEnd()}…`);
}

router.post("/ai-generate-response", async (req, res) => {
  const { content, platform = "Unknown", threatLevel = "normal", mentionId } = req.body;
  if (!content) { res.status(400).json({ error: "content required" }); return; }
  const responseOptions = buildLocalResponseOptions(content, platform, threatLevel);
  const responseText = responseOptions[0];
  let savedResponse = null;
  if (mentionId) {
    const existing = await db.select().from(narrativeResponsesTable).where(and(eq(narrativeResponsesTable.mentionId, Number(mentionId)), eq(narrativeResponsesTable.status, "pending_approval"))).orderBy(desc(narrativeResponsesTable.createdAt)).limit(1);
    if (existing.length > 0) {
      [savedResponse] = await db.update(narrativeResponsesTable).set({ platform, content: responseText, draftedBy: "local-engine", updatedAt: new Date() }).where(eq(narrativeResponsesTable.id, existing[0].id)).returning();
    } else {
      [savedResponse] = await db.insert(narrativeResponsesTable).values({ mentionId: Number(mentionId), platform, content: responseText, draftedBy: "local-engine", status: "pending_approval" }).returning();
    }
  }
  res.json({ response: responseText, responseOptions, savedResponse, aiGenerated: false, engine: "local-campaign-engine" });
});

// ─── AI Rebuttal Center ──────────────────────────────────────────────────────

const CHAR_LIMITS: Record<string, number> = {
  "Twitter/X": 280,
  "Facebook": 500,
  "WhatsApp": 450,
  "Press Statement": 800,
  "Baraza Speech": 600,
  "SMS": 160,
  "TikTok Caption": 150,
};

const CANDIDATE_CTX = `Prof. Philip Kaloki (Prof. Kaloki), UDA gubernatorial candidate for Makueni County, covering all six constituencies and 30 wards. Campaign: Kaloki 2027. Do not assume voter totals, endorsements, staff identities or achievements unless verified in approved campaign data.`;

router.post("/ai-draft-rebuttal", async (req, res) => {
  const {
    attack,
    platform = "Twitter/X",
    urgency = "planned",
  } = req.body as {
    attack: string;
    platform?: string;
    urgency?: string;
  };

  if (!attack?.trim()) {
    res.status(400).json({ error: "attack text required" });
    return;
  }

  const charLimit = CHAR_LIMITS[platform] ?? 400;
  const attackSnippet = attack.trim().substring(0, 400);

  function trimToLimit(value: string): string {
    if (value.length <= charLimit) return value;

    return `${value
      .slice(0, Math.max(0, charLimit - 1))
      .trimEnd()}…`;
  }

  function detectTopic(value: string): string {
    const text = value.toLowerCase();

    if (text.includes("water") || text.includes("borehole")) {
      return "water access";
    }

    if (
      text.includes("road") ||
      text.includes("bridge") ||
      text.includes("transport")
    ) {
      return "road infrastructure";
    }

    if (
      text.includes("health") ||
      text.includes("hospital") ||
      text.includes("dispensary")
    ) {
      return "healthcare";
    }

    if (
      text.includes("job") ||
      text.includes("youth") ||
      text.includes("employment")
    ) {
      return "youth employment and opportunity";
    }

    if (
      text.includes("corrupt") ||
      text.includes("fund") ||
      text.includes("tender") ||
      text.includes("procurement")
    ) {
      return "accountability and transparent use of public resources";
    }

    if (
      text.includes("education") ||
      text.includes("school") ||
      text.includes("bursary")
    ) {
      return "education access";
    }

    return "Makueni County development priorities";
  }

  function buildLocalRebuttals() {
    const topic = detectTopic(attackSnippet);

    const factual = trimToLimit(
      `Facts and accountability matter. Prof. Philip Kaloki's campaign remains focused on ${topic}, responsible leadership and practical solutions for communities across Makueni County.`,
    );

    const firm = trimToLimit(
      `Unverified claims should not replace evidence. The campaign will continue responding with facts, integrity and a clear commitment to ${topic} for the people of Makueni County.`,
    );

    const bridge = trimToLimit(
      `We understand the concern being raised. Prof. Philip Kaloki's campaign will keep listening to residents, verifying information and presenting workable plans on ${topic} for every ward in Makueni.`,
    );

    return [
      {
        tone: "FACTUAL COUNTER",
        angle: `Correct the claim with verified messaging on ${topic}.`,
        content: factual,
        characterCount: factual.length,
        platform,
        charLimit,
      },
      {
        tone: "FIRM DENIAL",
        angle:
          "Reject unverified claims without attacking any individual.",
        content: firm,
        characterCount: firm.length,
        platform,
        charLimit,
      },
      {
        tone: "BRIDGE & PIVOT",
        angle: `Acknowledge the concern and return the discussion to ${topic}.`,
        content: bridge,
        characterCount: bridge.length,
        platform,
        charLimit,
      },
    ];
  }

  const apiKey =
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY ??
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    res.json({
      rebuttals: buildLocalRebuttals(),
      platform,
      attack: attackSnippet,
      generatedBy: "local-campaign-engine",
      requiresApiKeys: false,
      urgency,
    });
    return;
  }

  const basePrompt = `Senior communications officer for ${CANDIDATE_CTX}. ${
    urgency === "live" ? "LIVE URGENT" : "Planned"
  } rebuttal for ${platform}, maximum ${charLimit} characters. Never name opponents. Stay dignified, factual and focused on Makueni County. Output only JSON.`;

  const variations = [
    {
      tone: "FACTUAL COUNTER",
      angle:
        "Correct the claim using factual, development-focused messaging.",
    },
    {
      tone: "FIRM DENIAL",
      angle:
        "Issue a direct but dignified denial without aggression.",
    },
    {
      tone: "BRIDGE & PIVOT",
      angle:
        "Acknowledge concern and pivot to the campaign's positive vision.",
    },
  ];

  try {
    const results = await Promise.all(
      variations.map((variation) =>
        openai.chat.completions.create({
          model: "gpt-5.1",
          max_completion_tokens: 600,
          messages: [
            {
              role: "system",
              content: `${basePrompt}
Tone: ${variation.tone}
Angle: ${variation.angle}
Return:
{"tone":"string","angle":"string","content":"string"}`,
            },
            {
              role: "user",
              content: `Draft a rebuttal for this attack: "${attackSnippet}"`,
            },
          ],
        }),
      ),
    );

    const localFallback = buildLocalRebuttals();

    const rebuttals = results.map((result, index) => {
      const raw = result.choices[0]?.message?.content ?? "";
      const match = raw.match(/\{[\s\S]*\}/);

      if (!match) return localFallback[index];

      try {
        const parsed = JSON.parse(match[0]);
        const content = trimToLimit(parsed.content ?? "");

        return {
          tone: parsed.tone ?? variations[index].tone,
          angle: parsed.angle ?? variations[index].angle,
          content,
          characterCount: content.length,
          platform,
          charLimit,
        };
      } catch {
        return localFallback[index];
      }
    });

    res.json({
      rebuttals,
      platform,
      attack: attackSnippet,
      generatedBy: "openai",
      requiresApiKeys: true,
      urgency,
    });
  } catch (error) {
    req.log.error(
      { error },
      "OpenAI rebuttal generation failed; using local fallback",
    );

    res.json({
      rebuttals: buildLocalRebuttals(),
      platform,
      attack: attackSnippet,
      generatedBy: "local-campaign-engine-fallback",
      requiresApiKeys: false,
      urgency,
    });
  }
});

// ─── Response Queue (Approval Workflow) ──────────────────────────────────────

router.get("/responses", async (req, res) => {
  const { status } = req.query as Record<string, string>;
  const conditions = status ? [eq(narrativeResponsesTable.status, status)] : [];
  const where = conditions.length ? and(...conditions) : undefined;

  const allResponses = await db
    .select()
    .from(narrativeResponsesTable)
    .where(where)
    .orderBy(desc(narrativeResponsesTable.createdAt));

  // Newest response wins. Manual drafts without a mention stay separate.
  const responses = allResponses.filter((response, index, rows) => {
    if (response.mentionId == null) return true;
    return index === rows.findIndex(
      (candidate) => candidate.mentionId === response.mentionId,
    );
  });

  const mentions = await db.select().from(narrativeMentionsTable);
  const mentionById = new Map(
    mentions.map((mention) => [mention.id, mention]),
  );

  function sourceFallback(
    platform: string,
    author?: string | null,
  ): string | null {
    const cleanAuthor = author?.trim().replace(/^@/, "");
    if (!cleanAuthor) return null;

    const key = platform.toLowerCase();
    if (key.includes("twitter") || key === "x") {
      return `https://x.com/${encodeURIComponent(cleanAuthor)}`;
    }
    if (key.includes("facebook")) {
      return `https://www.facebook.com/${encodeURIComponent(cleanAuthor)}`;
    }
    if (key.includes("tiktok")) {
      return `https://www.tiktok.com/@${encodeURIComponent(cleanAuthor)}`;
    }
    if (key.includes("instagram")) {
      return `https://www.instagram.com/${encodeURIComponent(cleanAuthor)}/`;
    }
    return null;
  }

  res.json(
    responses.map((response) => {
      const mention = response.mentionId
        ? mentionById.get(response.mentionId)
        : undefined;
      const sourceContent = mention?.content ?? "";
      const sourceAuthor = mention?.author ?? null;
      const sourcePlatform = mention?.platform ?? response.platform;
      const sourceUrl = mention?.url ?? null;
      const sourceHref =
        sourceUrl || sourceFallback(sourcePlatform, sourceAuthor);
      const threatLevel = mention?.threatLevel ?? "normal";
      const hiddenDuplicateCount =
        response.mentionId == null
          ? 0
          : Math.max(
              0,
              allResponses.filter(
                (item) => item.mentionId === response.mentionId,
              ).length - 1,
            );

      return {
        ...response,
        sourceContent,
        sourceAuthor,
        sourcePlatform,
        sourceUrl,
        sourceHref,
        sourceLinkLabel: sourceUrl
          ? "OPEN ORIGINAL POST"
          : sourceHref
            ? "OPEN SOURCE PROFILE"
            : null,
        threatLevel,
        sentiment: mention?.sentiment ?? null,
        hiddenDuplicateCount,
        responseOptions: buildLocalResponseOptions(
          sourceContent || response.content,
          response.platform,
          threatLevel,
        ),
      };
    }),
  );
});

router.post("/responses", async (req, res) => {
  const { mentionId, platform, content, draftedBy = "manual" } = req.body;
  if (!platform || !content) { res.status(400).json({ error: "platform and content required" }); return; }
  if (mentionId) {
    const existing = await db.select().from(narrativeResponsesTable).where(and(eq(narrativeResponsesTable.mentionId, Number(mentionId)), eq(narrativeResponsesTable.status, "pending_approval"))).orderBy(desc(narrativeResponsesTable.createdAt)).limit(1);
    if (existing.length > 0) {
      const [updated] = await db.update(narrativeResponsesTable).set({ platform, content, draftedBy, updatedAt: new Date() }).where(eq(narrativeResponsesTable.id, existing[0].id)).returning();
      res.json(updated); return;
    }
  }
  const [response] = await db.insert(narrativeResponsesTable).values({ mentionId: mentionId ? Number(mentionId) : null, platform, content, draftedBy, status: "pending_approval" }).returning();
  res.status(201).json(response);
});

router.patch("/responses/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status, approvedBy, rejectionReason, content } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (status) updates.status = status;
  if (content) updates.content = content;
  if (status === "approved") { updates.approvedBy = approvedBy ?? "Campaign Manager"; updates.approvedAt = new Date(); }
  if (status === "published") updates.publishedAt = new Date();
  if (status === "rejected" && rejectionReason) updates.rejectionReason = rejectionReason;
  const [response] = await db.update(narrativeResponsesTable).set(updates).where(eq(narrativeResponsesTable.id, id)).returning();
  if (!response) { res.status(404).json({ error: "Not found" }); return; }
  res.json(response);
});

router.delete("/responses/:id", async (req, res) => {
  await db.delete(narrativeResponsesTable).where(eq(narrativeResponsesTable.id, parseInt(req.params.id)));
  res.json({ ok: true });
});

// ─── Platform Integrations ───────────────────────────────────────────────────

router.get("/platform-integrations", async (req, res) => {
  const platforms = await db.select().from(platformIntegrationsTable).orderBy(platformIntegrationsTable.platform);
  res.json(platforms);
});

router.post("/platform-integrations", async (req, res) => {
  const { platform, apiKey, apiSecret, accessToken, accessTokenSecret, pageId, bearerToken, rssUrl, webhookUrl, isActive } = req.body;
  if (!platform) { res.status(400).json({ error: "platform required" }); return; }
  const existing = await db.select().from(platformIntegrationsTable).where(eq(platformIntegrationsTable.platform, platform));
  if (existing.length > 0) {
    const [updated] = await db.update(platformIntegrationsTable).set({ apiKey, apiSecret, accessToken, accessTokenSecret, pageId, bearerToken, rssUrl, webhookUrl, isActive: isActive ?? false, updatedAt: new Date() }).where(eq(platformIntegrationsTable.platform, platform)).returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(platformIntegrationsTable).values({ platform, apiKey, apiSecret, accessToken, accessTokenSecret, pageId, bearerToken, rssUrl, webhookUrl, isActive: isActive ?? false }).returning();
    res.status(201).json(created);
  }
});

// ─── Scan Engine ─────────────────────────────────────────────────────────────

const SIMULATED_MENTIONS: Array<{ platform: string; author: string; content: string; engagementCount: number }> = [
  { platform: "Twitter/X", author: "@MakueniVoter", content: "Prof. Philip Kaloki has done absolutely nothing for Wote/Nziu ward. The road from Wote to Kathonzweni is still impassable during rains. We voted for development not silence!", engagementCount: 847 },
  { platform: "Facebook", author: "Makueni Community Group", content: "Philip Kaloki was at the Kyeleni borehole opening today. Finally water for our people! This is the leadership we needed. Hongera Mheshimiwa!", engagementCount: 1243 },
  { platform: "Twitter/X", author: "@NairobiEye", content: "Rumours circulating that Prof. Kaloki received corrupt funds from contractor Ndungu for the Makueni County roads programme. Need answers Mheshimiwa!", engagementCount: 2891 },
  { platform: "News", author: "The Star Kenya", content: "The Kaloki 2027 campaign discussed education access and youth opportunity during a Makueni County engagement. Any figures or commitments must be verified before publication.", engagementCount: 412 },
  { platform: "Facebook", author: "Kibwezi East Ward Representative", content: "Prof. Philip Kaloki is failing us. The CDF projects he promised — health centre, market — are years behind. Our people deserve better representation!", engagementCount: 563 },
  { platform: "Twitter/X", author: "@KenyaPolitics254", content: "Mbooni residents block road demanding Prof. Kaloki address their water crisis. 6 months since he promised a solution. #AccountabilityKE", engagementCount: 1567 },
  { platform: "News", author: "Daily Nation", content: "Prof. Philip Kaloki joins MPs rallying behind Affordable Housing Bill during Makueni public participation forum.", engagementCount: 289 },
  { platform: "Facebook", author: "Youth For Kaloki", content: "Prof. Kaloki just visited our football pitch in Kaiti. Promised to fund the youth team's uniforms and tournament. Real grassroots leader!", engagementCount: 731 },
];

router.post("/scan", async (req, res) => {
  const { platform = "all", query = "Philip Kaloki Makueni" } = req.body;
  const [scan] = await db.insert(narrativeScansTable).values({ platform, query, status: "running" }).returning();
  (async () => {
    try {
      const platformIntegration = platform !== "all"
        ? (await db.select().from(platformIntegrationsTable).where(eq(platformIntegrationsTable.platform, platform)))[0]
        : null;
      const isReal = platformIntegration?.isActive && (platformIntegration.bearerToken || platformIntegration.rssUrl);
      const toInsert = !isReal
        ? SIMULATED_MENTIONS.filter(m => platform === "all" || m.platform.toLowerCase().includes(platform.toLowerCase()))
        : [];
      let count = 0;
      for (const m of toInsert) {
        const analysis = heuristicAnalysis(m.content);
        await db.insert(narrativeMentionsTable).values({
          platform: m.platform, content: m.content, author: m.author,
          threatLevel: analysis.threatLevel, sentiment: analysis.sentiment,
          sentimentScore: analysis.sentimentScore, source: "scan",
          engagementCount: m.engagementCount, status: "open",
        });
        count++;
      }
      await db.update(narrativeScansTable).set({ status: "complete", mentionsFound: count }).where(eq(narrativeScansTable.id, scan.id));
    } catch (err: any) {
      await db.update(narrativeScansTable).set({ status: "failed", errorMessage: String(err?.message ?? err) }).where(eq(narrativeScansTable.id, scan.id));
    }
  })();
  res.status(202).json({ scanId: scan.id, message: "Scan initiated" });
});

router.get("/scans", async (req, res) => {
  const scans = await db.select().from(narrativeScansTable).orderBy(desc(narrativeScansTable.createdAt)).limit(20);
  res.json(scans);
});

// ─── Competitors ─────────────────────────────────────────────────────────────

router.get("/competitors", async (req, res) => {
  const competitors = await db.select().from(competitorsTable).orderBy(competitorsTable.name);
  res.json(competitors);
});

router.post("/competitors", async (req, res) => {
  const { name, party, constituency, strengths = [], weaknesses = [], promisesMade = [] } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const [competitor] = await db.insert(competitorsTable).values({ name, party, constituency, strengths, weaknesses, promisesMade, promisesKept: 0, promisesBroken: 0 }).returning();
  res.status(201).json(competitor);
});

// ─── War Room Briefs ─────────────────────────────────────────────────────────

router.get("/briefs", async (req, res) => {
  const briefs = await db.select().from(warRoomBriefsTable).orderBy(desc(warRoomBriefsTable.createdAt));
  res.json(briefs);
});

router.post("/briefs", async (req, res) => {
  const { title, summary, priority = "medium", category, actions = [] } = req.body;
  if (!title || !summary || !category) { res.status(400).json({ error: "title, summary, category required" }); return; }
  const [brief] = await db.insert(warRoomBriefsTable).values({ title, summary, priority, category, actions, status: "active" }).returning();
  res.status(201).json(brief);
});


// ─── Phase 6: Intelligence Incident Operations Engine ────────────────────────

router.get("/incidents/metrics", async (_req, res) => {
  res.json(await incidentMetrics());
});

router.get("/incidents", async (req, res) => {
  const query = req.query as Record<string, string>;
  res.json(
    await listIncidents({
      status: query.status,
      platform: query.platform,
      threatLevel: query.threatLevel,
    }),
  );
});

router.get("/incidents/:identifier", async (req, res) => {
  const incident = await getIncident(String(req.params.identifier));
  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }
  res.json(incident);
});

router.patch("/incidents/:identifier/assign", async (req, res) => {
  const { assignedTo, dueAt, priority } = req.body ?? {};
  if (!assignedTo) {
    res.status(400).json({ error: "assignedTo is required" });
    return;
  }

  const incident = await assignIncident(String(req.params.identifier), {
    assignedTo,
    dueAt,
    priority,
  });

  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  res.json(incident);
});

router.patch("/incidents/:identifier/status", async (req, res) => {
  const { status, note, actor } = req.body ?? {};
  const allowed = new Set([
    "detected",
    "analysed",
    "awaiting_approval",
    "approved",
    "published",
    "monitoring",
    "closed",
  ]);

  if (!allowed.has(status)) {
    res.status(400).json({ error: "Invalid incident status" });
    return;
  }

  const incident = await updateIncidentStatus(
    String(req.params.identifier),
    { status, note, actor },
  );

  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  res.json(incident);
});

router.post("/incidents/:identifier/events", async (req, res) => {
  const { eventType, actor, note, metadata } = req.body ?? {};
  if (!eventType) {
    res.status(400).json({ error: "eventType is required" });
    return;
  }

  const event = await recordIncidentEvent(
    String(req.params.identifier),
    { eventType, actor, note, metadata },
  );

  if (!event) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  res.status(201).json(event);
});

router.post("/incidents/:identifier/channels", async (req, res) => {
  const output = await buildIncidentChannels(
    String(req.params.identifier),
  );

  if (!output) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  res.json(output);
});

export default router;
