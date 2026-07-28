import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, generatedDocumentsTable, insertGeneratedDocumentSchema } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { CAMPAIGN_CONTEXT } from "./ai";

const router = Router();

// Guard the expensive AI generation endpoints against credit-burn abuse: one
// generation at a time globally, plus a short per-IP cooldown between requests.
const GEN_COOLDOWN_MS = 12_000;
let genInFlight = false;
const lastGenByIp = new Map<string, number>();

function checkGenRateLimit(ip: string): { ok: true } | { ok: false; retryAfter: number } {
  if (genInFlight) return { ok: false, retryAfter: 8 };
  const now = Date.now();
  const last = lastGenByIp.get(ip) ?? 0;
  const elapsed = now - last;
  if (elapsed < GEN_COOLDOWN_MS) return { ok: false, retryAfter: Math.ceil((GEN_COOLDOWN_MS - elapsed) / 1000) };
  // Opportunistically prune stale entries to bound memory.
  if (lastGenByIp.size > 500) {
    for (const [k, t] of lastGenByIp) if (now - t > GEN_COOLDOWN_MS) lastGenByIp.delete(k);
  }
  return { ok: true };
}

// One OpenAI call per section keeps each response small (~300-400 tokens) so the
// production AI proxy output ceiling never truncates a document. Sections are
// generated in parallel and assembled server-side.
async function generateSection(system: string, user: string, maxTokens: number): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return (completion.choices[0]?.message?.content ?? "").trim();
  } catch {
    return "";
  }
}

const LENGTH_WORDS: Record<string, number> = {
  short: 90,
  medium: 170,
  long: 260,
};

const speechSchema = z.object({
  occasion: z.string().min(1).max(120),
  audience: z.string().max(200).optional().default(""),
  ward: z.string().max(60).optional().default("Makueni"),
  language: z.string().max(40).optional().default("English"),
  tone: z.string().max(40).optional().default("Inspirational"),
  keyPoints: z.string().max(1200).optional().default(""),
  length: z.enum(["short", "medium", "long"]).optional().default("medium"),
});

router.post("/generate", async (req, res) => {
  const parsed = speechSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid speech request", details: parsed.error.issues });
    return;
  }
  const limit = checkGenRateLimit(req.ip ?? "unknown");
  if (!limit.ok) {
    res.setHeader("Retry-After", String(limit.retryAfter));
    res.status(429).json({ error: `Please wait ${limit.retryAfter}s before generating again.` });
    return;
  }
  const { occasion, audience, ward, language, tone, keyPoints, length } = parsed.data;
  const words = LENGTH_WORDS[length] ?? 170;

  const base = `${CAMPAIGN_CONTEXT}

You are the head speechwriter for Hon. Stephen Mule. Write in a ${tone.toLowerCase()} tone.
Language: ${language} (if "Swahili" write in Swahili; if a mix, blend naturally as Kenyan politicians do).
Occasion: ${occasion}. Audience: ${audience || "the people of Makueni"}. Ward focus: ${ward}.
Write ONLY the speech prose for the requested part — no headings, no stage directions, no markdown, no labels.
Keep it authentic to Kenyan / Ukambani political rhetoric and grounded in Makueni realities.`;

  const pointsLine = keyPoints ? `\nWeave in these key points where relevant: ${keyPoints}` : "";

  genInFlight = true;
  let opening = "", body = "", close = "";
  try {
    [opening, body, close] = await Promise.all([
      generateSection(
        base,
        `Write the OPENING of the speech (~${Math.round(words * 0.35)} words): a warm, culturally appropriate greeting acknowledging leaders, elders and the audience for this ${occasion}. End by setting up the main message.`,
        480,
      ),
      generateSection(
        base,
        `Write the MAIN BODY of the speech (~${words} words): the core message and vision, drawing on the campaign pillars and Makueni's real issues (water, roads, youth jobs, security).${pointsLine}`,
        700,
      ),
      generateSection(
        base,
        `Write the CLOSING of the speech (~${Math.round(words * 0.4)} words): a rousing call to action, unity, and a strong appeal to vote for Hon. Stephen Mule under the Wiper "Komboa Kenya" banner. End with an uplifting rallying line.`,
        480,
      ),
    ]);
  } finally {
    genInFlight = false;
    lastGenByIp.set(req.ip ?? "unknown", Date.now());
  }

  // A speech is only useful whole — fail loudly if any part is missing rather
  // than returning a broken document as success.
  if (!opening || !body || !close) {
    res.status(502).json({ error: "AI generation was incomplete. Please retry." });
    return;
  }

  const title = `${occasion}${ward && ward !== "Makueni" ? ` — ${ward}` : ""}`;
  res.json({ title, body: [opening, body, close].join("\n\n") });
});

const manifestoSchema = z.object({
  language: z.string().max(40).optional().default("English"),
  tone: z.string().max(40).optional().default("Statesmanlike"),
  priorityIssues: z.string().max(1200).optional().default(""),
});

const PILLARS = [
  {
    key: "Grassroots Socioeconomic Empowerment",
    hint: "youth employment, women's groups, bursaries, bodaboda support, table-banking, coffee/maize/horticulture value addition, quarry & ballast enterprise.",
  },
  {
    key: "Infrastructural Development",
    hint: "roads, clean water, rural electrification, schools, health facilities across all 5 wards.",
  },
  {
    key: "Constitutional Mandate",
    hint: "legislation, parliamentary oversight, faithful representation, maximizing CDF/NG-CDF for Makueni.",
  },
  {
    key: "Local Patronage & Accessibility",
    hint: "regular barazas, market visits, an accessible MP present in every ward, responsive constituency office.",
  },
];

router.post("/manifesto", async (req, res) => {
  const parsed = manifestoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid manifesto request", details: parsed.error.issues });
    return;
  }
  const limit = checkGenRateLimit(req.ip ?? "unknown");
  if (!limit.ok) {
    res.setHeader("Retry-After", String(limit.retryAfter));
    res.status(429).json({ error: `Please wait ${limit.retryAfter}s before generating again.` });
    return;
  }
  const { language, tone, priorityIssues } = parsed.data;

  const base = `${CAMPAIGN_CONTEXT}

You are drafting the official manifesto for Hon. Stephen Mule. Tone: ${tone.toLowerCase()}, credible and specific.
Language: ${language}. Write ONLY the prose for the requested section — no headings, no markdown, no labels, no bullet symbols other than plain lines.
Make commitments concrete and grounded in Makueni Constituency realities.`;

  const issuesLine = priorityIssues ? ` Emphasize these priority issues: ${priorityIssues}.` : "";

  const sectionCalls: Promise<{ heading: string; text: string }>[] = [];

  sectionCalls.push(
    generateSection(
      base,
      `Write the PREAMBLE / VISION (~180 words): who Hon. Stephen Mule is, his covenant with the people of Makueni, and the vision for the constituency toward the August 2027 election.${issuesLine}`,
      520,
    ).then((text) => ({ heading: "PREAMBLE & VISION", text })),
  );

  PILLARS.forEach((p, i) => {
    sectionCalls.push(
      generateSection(
        base,
        `Write the manifesto section for PILLAR ${i + 1}: "${p.key}" (~170 words). Cover concrete commitments on: ${p.hint} Make it specific and measurable where possible.`,
        520,
      ).then((text) => ({ heading: `PILLAR ${i + 1}: ${p.key.toUpperCase()}`, text })),
    );
  });

  sectionCalls.push(
    generateSection(
      base,
      `Write the CLOSING PLEDGE (~140 words): a personal pledge of accountability and service, a unifying message across all 5 wards, and a call to vote under the Wiper "Komboa Kenya" banner (symbol: Umbrella).`,
      460,
    ).then((text) => ({ heading: "OUR PLEDGE TO MATUNGULU", text })),
  );

  genInFlight = true;
  let sections: { heading: string; text: string }[] = [];
  try {
    sections = await Promise.all(sectionCalls);
  } finally {
    genInFlight = false;
    lastGenByIp.set(req.ip ?? "unknown", Date.now());
  }

  // The manifesto must be complete (preamble + 4 pillars + pledge). If any
  // section came back empty, fail rather than publish a manifesto with holes.
  if (sections.some((s) => !s.text)) {
    res.status(502).json({ error: "AI generation was incomplete. Please retry." });
    return;
  }

  const body = sections.map((s) => `## ${s.heading}\n\n${s.text}`).join("\n\n");
  res.json({ title: "Manifesto — Hon. Stephen Mule (Makueni 2027)", body });
});

// ---- Saved document library (CRUD) ----

router.get("/documents", async (req, res) => {
  const { type } = req.query as { type?: string };
  try {
    const rows =
      type === "speech" || type === "manifesto"
        ? await db
            .select()
            .from(generatedDocumentsTable)
            .where(eq(generatedDocumentsTable.docType, type))
            .orderBy(desc(generatedDocumentsTable.createdAt))
        : await db.select().from(generatedDocumentsTable).orderBy(desc(generatedDocumentsTable.createdAt));
    res.json({ documents: rows });
  } catch (err) {
    req.log.error({ err }, "list generated documents failed");
    res.status(500).json({ error: "Failed to load documents" });
  }
});

const saveDocumentSchema = insertGeneratedDocumentSchema.extend({
  docType: z.enum(["speech", "manifesto"]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(40_000),
});

router.post("/documents", async (req, res) => {
  const parsed = saveDocumentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid document", details: parsed.error.issues });
    return;
  }
  try {
    const [row] = await db.insert(generatedDocumentsTable).values(parsed.data).returning();
    res.status(201).json({ document: row });
  } catch (err) {
    req.log.error({ err }, "save generated document failed");
    res.status(500).json({ error: "Failed to save document" });
  }
});

router.delete("/documents/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.delete(generatedDocumentsTable).where(eq(generatedDocumentsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "delete generated document failed");
    res.status(500).json({ error: "Failed to delete document" });
  }
});

export default router;
