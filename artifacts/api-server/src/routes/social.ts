import { Router } from "express";
import { z } from "zod/v4";
import { db, socialMentionsTable, socialSourceHealthTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth, requirePermission } from "../lib/auth";
import { searchFreeMakueniWeb } from "./makueni-free-ai";

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
    prompt: "public mentions, interviews, official notices, community forums and news about Prof. Philip Kyalo Kaloki (also written Philip Kaloki, Prof Kaloki or Pro Kaloki) in Makueni County, Kenya",
  },
  {
    key: "issues",
    prompt: "publicly reported Makueni County ward-level service issues and projects, including water, roads, health facilities, ECDE and schools, agriculture, markets, bursaries, budgets and development works",
  },
  {
    key: "opponent",
    prompt: "public Makueni County news, official county notices, public participation, audit and budget documents, project delivery updates and documented service-delivery concerns",
  },
] as const;

function queriesForCategory(key: (typeof SCAN_CATEGORIES)[number]["key"]): string[] {
  if (key === "candidate") {
    return [
      '"Prof. Philip Kyalo Kaloki" Makueni',
      '"Philip Kaloki" Makueni',
      '"Pro Kaloki" Makueni',
      '"Pro. Kaloki" Makueni',
      '"Prof Philip Kaloki" Makueni',
      '"Philip Kyalo Kaloki" Makueni County',
      '"Kaloki" Makueni County',
      'site:facebook.com/prof.philipkaloki',
      'site:x.com/ProfKaloki',
      'site:tiktok.com/@profkaloki1',
      'site:facebook.com "Prof Philip Kaloki" Makueni',
      'site:x.com "ProfKaloki" Makueni',
      'site:tiktok.com "profkaloki1" Makueni',
    ];
  }
  if (key === "issues") {
    return [
      'Makueni County ward water roads health education agriculture projects',
      'Makueni County development budget public participation ward news',
      'Makueni County roads water borehole hospital market ECDE project',
    ];
  }
  return [
    'Makueni County official news budget audit project implementation',
    'Makueni County public participation service delivery ward report',
  ];
}

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
        if (process.env.MAKUENI_AI_MODE === "free") {
          // A single search-provider failure must not cancel every query in this
          // category. Keep successful results and mark the category failed only
          // when every query failed, so partial scans can still be useful.
          const queryResults = await Promise.allSettled(
            queriesForCategory(cat.key).map((query) => searchFreeMakueniWeb(query))
          );
          const successfulResults = queryResults
            .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof searchFreeMakueniWeb>>> => result.status === "fulfilled")
            .map((result) => result.value);
          if (successfulResults.length === 0 && queryResults.length > 0) {
            const failures = queryResults.filter((result) => result.status === "rejected");
            if (failures.length === queryResults.length) {
              failedCategories.add(cat.key);
              req.log.error({ category: cat.key, failedQueries: failures.length }, "all free social search queries failed");
              return [];
            }
          }
          const seenForCategory = new Set<string>();
          return successfulResults.flat().filter((item) => {
            const key = (item.url || item.title).toLowerCase();
            if (seenForCategory.has(key)) return false;
            seenForCategory.add(key);
            return true;
          }).slice(0, 12).map((item) => ({
            raw: {
              summary: item.title + (item.snippet ? " — " + item.snippet.slice(0, 180) : ""),
              source: item.source,
              url: item.url,
              // Search-result sentiment is not reliably classifiable without review.
              sentiment: "neutral",
              topic: cat.key === "candidate" ? "Pro Kaloki / Philip Kaloki" : cat.key === "issues" ? "Makueni service delivery" : "County public accountability",
              date: item.publishedAt ?? "",
            } as RawMention,
            category: cat.key,
          }));
        }
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
      sourceType: process.env.MAKUENI_AI_MODE === "free" ? "google_news_rss" : "openai_web_search",
      status: failed ? "error" : "healthy",
      lastAttemptAt: now,
      lastSuccessAt: failed ? undefined : now,
      lastItemCount: count,
      lastError: failed ? "Public-source scan failed for this category; inspect API logs and source availability." : null,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: socialSourceHealthTable.sourceKey,
      set: {
        sourceType: process.env.MAKUENI_AI_MODE === "free" ? "google_news_rss" : "openai_web_search",
        status: failed ? "error" : "healthy",
        lastAttemptAt: now,
        ...(failed ? {} : { lastSuccessAt: now }),
        lastItemCount: count,
        lastError: failed ? "Public-source scan failed for this category; inspect API logs and source availability." : null,
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
