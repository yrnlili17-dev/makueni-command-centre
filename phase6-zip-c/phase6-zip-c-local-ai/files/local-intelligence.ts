import { Router, type IRouter } from "express";
import { db, narrativeMentionsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import {
  analyseLocally,
  buildLocalBrief,
} from "../services/local-intelligence-engine";

const router: IRouter = Router();

router.post("/analyse", async (req, res) => {
  const {
    content,
    platform = "Unknown",
    engagementCount = 0,
    duplicateCount = 0,
  } = req.body ?? {};

  if (!content?.trim()) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  res.json(
    analyseLocally({
      content,
      platform,
      engagementCount,
      duplicateCount,
    }),
  );
});

router.post("/mentions/:id/analyse", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid mention id" });
    return;
  }

  const [mention] = await db
    .select()
    .from(narrativeMentionsTable)
    .where(eq(narrativeMentionsTable.id, id))
    .limit(1);

  if (!mention) {
    res.status(404).json({ error: "Mention not found" });
    return;
  }

  const analysis = analyseLocally({
    content: mention.content,
    platform: mention.platform,
    engagementCount: mention.engagementCount ?? 0,
    duplicateCount: Number(req.body?.duplicateCount ?? 0),
  });

  const [updated] = await db
    .update(narrativeMentionsTable)
    .set({
      sentiment: analysis.sentiment,
      sentimentScore: analysis.sentimentScore,
      threatLevel: analysis.threatLevel,
      aiSummary: `${analysis.topic}: ${analysis.rationale}`,
      suggestedResponse: analysis.responseOptions[0]?.content ?? null,
      aiAnalyzed: true,
    })
    .where(eq(narrativeMentionsTable.id, id))
    .returning();

  res.json({
    mention: updated,
    analysis,
    engine: "local-intelligence-engine",
    requiresApiKeys: false,
  });
});

router.get("/brief", async (_req, res) => {
  const mentions = await db
    .select()
    .from(narrativeMentionsTable)
    .orderBy(desc(narrativeMentionsTable.detectedAt))
    .limit(100);

  const analyses = mentions.map((mention) =>
    analyseLocally({
      content: mention.content,
      platform: mention.platform,
      engagementCount: mention.engagementCount ?? 0,
    }),
  );

  res.json({
    ...buildLocalBrief(analyses),
    mentionsAnalysed: mentions.length,
  });
});

router.post("/batch-analyse", async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.body?.limit ?? 50)));

  const mentions = await db
    .select()
    .from(narrativeMentionsTable)
    .orderBy(desc(narrativeMentionsTable.detectedAt))
    .limit(limit);

  const results = [];

  for (const mention of mentions) {
    const analysis = analyseLocally({
      content: mention.content,
      platform: mention.platform,
      engagementCount: mention.engagementCount ?? 0,
    });

    const [updated] = await db
      .update(narrativeMentionsTable)
      .set({
        sentiment: analysis.sentiment,
        sentimentScore: analysis.sentimentScore,
        threatLevel: analysis.threatLevel,
        aiSummary: `${analysis.topic}: ${analysis.rationale}`,
        suggestedResponse: analysis.responseOptions[0]?.content ?? null,
        aiAnalyzed: true,
      })
      .where(eq(narrativeMentionsTable.id, mention.id))
      .returning();

    results.push({
      mention: updated,
      analysis,
    });
  }

  res.json({
    processed: results.length,
    engine: "local-intelligence-engine",
    requiresApiKeys: false,
    results,
  });
});

export default router;
