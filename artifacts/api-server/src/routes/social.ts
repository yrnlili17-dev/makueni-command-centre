import { Router } from "express";
import { z } from "zod/v4";
import { db, socialMentionsTable, socialSourceHealthTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, requirePermission } from "../lib/auth";

const router = Router();
router.use(requireAuth);

const SENTIMENTS = new Set(["positive", "negative", "neutral"]);

// Guard the expensive AI/web-search scan: only one runs at a time, with a
// short cooldown afterwards to prevent accidental or abusive credit burn.
const SCAN_COOLDOWN_MS = 15_000;
let scanInFlight = false;
let lastScanAt = 0;

const mentionsQuerySchema = z.object({
  category: z.enum(["candidate", "issues", "opponent"]).optional(),
  sentiment: z.enum(["positive", "negative", "neutral"]).optional(),
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

const SCAN_CATEGORIES = [
  {
    key: "candidate",
    prompt: `recent official public notices, county assembly updates, and service-delivery information from Makueni County, Kenya`,
  },
  {
    key: "issues",
    prompt: `recent public concerns about water, roads, health, education, agriculture, budgets, and other county services within Makueni County, Kenya`,
  },
  {
    key: "opponent",
    prompt: `recent public accountability reports, audit findings, official project updates, and documented service-delivery issues within Makueni County, Kenya`,
  },
] as const;

function buildInput(prompt: string): string {
  return `Use web search to find the most recent and relevant items about: ${prompt}.

Return ONLY a JSON array (no prose, no markdown code fences) of up to 3 objects. Each object must have exactly these keys:
- "summary": a concise one-line summary, max 90 characters
- "source": the publication or platform name (e.g. "People Daily", "X/Twitter", "Facebook")
- "url": the direct source URL
- "sentiment": one of "positive", "negative", or "neutral" — judged from the perspective of public-service impact and factual accuracy's campaign
- "topic": a short 2-4 word topic tag
- "date": the publication date if known (e.g. "2026-05-26"), otherwise an empty string

Prefer items from the last few months. If nothing relevant is found, return [].`;
}

type RawMention = {
  summary?: unknown;
  source?: unknown;
  url?: unknown;
  sentiment?: unknown;
  topic?: unknown;
  date?: unknown;
};

function asStr(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

router.post("/scan", requirePermission("social", "write"), async (req, res) => {
  if (scanInFlight) {
    return res.status(429).json({ error: "A scan is already in progress. Please wait." });
  }
  const sinceLast = Date.now() - lastScanAt;
  if (sinceLast < SCAN_COOLDOWN_MS) {
    return res.status(429).json({
      error: `Please wait ${Math.ceil((SCAN_COOLDOWN_MS - sinceLast) / 1000)}s before scanning again.`,
    });
  }
  scanInFlight = true;
  const failedCategories = new Set<string>();
  try {
  const perCategory = await Promise.all(
    SCAN_CATEGORIES.map(async (cat) => {
      try {
        const response = await openai.responses.create({
          model: "gpt-5.1",
          tools: [{ type: "web_search" }],
          input: buildInput(cat.prompt),
        });
        const text = response.output_text ?? "";
        const match = text.match(/\[[\s\S]*\]/);
        if (!match) return [];
        const arr = JSON.parse(match[0]) as unknown;
        if (!Array.isArray(arr)) return [];
        return (arr as RawMention[]).map((raw) => ({ raw, category: cat.key }));
      } catch (err) {
        failedCategories.add(cat.key);
        req.log.error({ err, category: cat.key }, "social scan category failed");
        return [];
      }
    }),
  );

  const normalized = perCategory
    .flat()
    .map(({ raw, category }) => {
      const summary = asStr(raw.summary);
      if (!summary) return null;
      const sentiment = (asStr(raw.sentiment) ?? "neutral").toLowerCase();
      return {
        summary: summary.slice(0, 280),
        source: asStr(raw.source)?.slice(0, 120) ?? null,
        url: asStr(raw.url)?.slice(0, 600) ?? null,
        sentiment: SENTIMENTS.has(sentiment) ? sentiment : "neutral",
        category,
        topic: asStr(raw.topic)?.slice(0, 80) ?? null,
        publishedAt: asStr(raw.date)?.slice(0, 40) ?? null,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  // Dedupe within this batch (by url, else summary).
  const seen = new Set<string>();
  const deduped = normalized.filter((m) => {
    const key = (m.url ?? m.summary).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Dedupe against already-stored mentions by url.
  const urls = deduped.map((m) => m.url).filter((u): u is string => !!u);
  let existingUrls = new Set<string>();
  if (urls.length > 0) {
    const rows = await db
      .select({ url: socialMentionsTable.url })
      .from(socialMentionsTable)
      .where(inArray(socialMentionsTable.url, urls));
    existingUrls = new Set(rows.map((r) => r.url).filter((u): u is string => !!u));
  }
  const toInsert = deduped.filter((m) => !(m.url && existingUrls.has(m.url)));

  let inserted: (typeof socialMentionsTable.$inferSelect)[] = [];
  if (toInsert.length > 0) {
    inserted = await db.insert(socialMentionsTable).values(toInsert).returning();
  }

  const now = new Date();
  await Promise.all(SCAN_CATEGORIES.map(async (cat) => {
    const failed = failedCategories.has(cat.key);
    const count = deduped.filter((mention) => mention.category === cat.key).length;
    await db.insert(socialSourceHealthTable).values({
      sourceKey: cat.key,
      sourceType: "openai_web_search",
      status: failed ? "error" : "healthy",
      lastAttemptAt: now,
      lastSuccessAt: failed ? undefined : now,
      lastItemCount: count,
      lastError: failed ? "Web search scan failed for this category; inspect API logs and credentials." : null,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: socialSourceHealthTable.sourceKey,
      set: {
        sourceType: "openai_web_search",
        status: failed ? "error" : "healthy",
        lastAttemptAt: now,
        ...(failed ? {} : { lastSuccessAt: now }),
        lastItemCount: count,
        lastError: failed ? "Web search scan failed for this category; inspect API logs and credentials." : null,
        updatedAt: now,
      },
    });
  }));

  req.log.info({ scanned: deduped.length, inserted: inserted.length }, "social scan complete");
  return res.json({ scanned: deduped.length, inserted: inserted.length, mentions: inserted });
  } finally {
    scanInFlight = false;
    lastScanAt = Date.now();
  }
});

router.get("/source-health", requirePermission("social", "read"), async (_req, res) => {
  const rows = await db.select().from(socialSourceHealthTable).orderBy(socialSourceHealthTable.sourceKey);
  res.json(rows);
});

router.get("/mentions", requirePermission("social", "read"), async (req, res) => {
  const parsed = mentionsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query parameters" });
  }
  const { category, sentiment } = parsed.data;
  const conditions = [];
  if (category) conditions.push(eq(socialMentionsTable.category, category));
  if (sentiment) conditions.push(eq(socialMentionsTable.sentiment, sentiment));
  const where = conditions.length ? and(...conditions) : undefined;
  const mentions = await db
    .select()
    .from(socialMentionsTable)
    .where(where)
    .orderBy(desc(socialMentionsTable.scannedAt))
    .limit(300);
  return res.json(mentions);
});

router.delete("/mentions/:id", requirePermission("social", "write"), async (req, res) => {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid mention id" });
  }
  await db.delete(socialMentionsTable).where(eq(socialMentionsTable.id, parsed.data.id));
  return res.json({ ok: true });
});

export default router;
