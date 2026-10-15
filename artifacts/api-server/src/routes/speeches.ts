import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, generatedDocumentsTable, insertGeneratedDocumentSchema } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { CAMPAIGN_CONTEXT } from "./ai";
import { requireAuth } from "../lib/auth";
import { buildFreeMakueniSpeech, searchFreeMakueniWeb } from "./makueni-free-ai";

const router = Router();
// Generated speeches and their source material are internal-only.
router.use(requireAuth);

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
  ward: z.string().max(60).optional().default("county-wide"),
  language: z.string().max(40).optional().default("English"),
  tone: z.string().max(40).optional().default("Inspirational"),
  keyPoints: z.string().max(1200).optional().default(""),
  currentGaps: z.string().max(1600).optional().default(""),
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
  const { occasion, audience, ward, language, tone, keyPoints, currentGaps, length } = parsed.data;
  if (ward !== "county-wide" && !["Tulimani","Mbooni","Kithungo/Kitundu","Kiteta/Kisau","Kako/Waia","Kalawa","Kiima Kiu/Kalanzoni","Mukaa","Kasikeu","Kee","Kilungu","Ilima","Ukia","Nzaui/Kilili/Kalamba","Muvau/Kikumini","Kathonzweni","Mavindini","Kitise/Kithuki","Wote","Mbitini","Makindu","Kikumbulyu North","Kikumbulyu South","Nguumo","Nguu/Masumba","Emali/Mulala","Masongaleni","Mtito Andei","Thange","Ivingoni/Nzambani"].includes(ward)) { res.status(400).json({ error: "Select a valid Makueni County ward" }); return; }
  const words = LENGTH_WORDS[length] ?? 170;

  // Set MAKUENI_AI_MODE=free on Render to avoid all paid model calls.
  if (process.env.MAKUENI_AI_MODE === "free") {
    const area = ward === "county-wide" ? "Makueni County" : ward;
    const freeDraft = buildFreeMakueniSpeech({
      area,
      occasion,
      topic: keyPoints || occasion,
      currentGaps,
      language,
      minutes: length === "short" ? 1 : length === "long" ? 5 : 3,
    });
    const query = [area, occasion, keyPoints || "water roads health agriculture county projects", "Makueni County"].join(" ");
    const webResults = await searchFreeMakueniWeb(query);
    const researchNotes = [
      "",
      "LOCAL RESEARCH LEADS — VERIFY BEFORE DELIVERY",
      ...(webResults.length
        ? webResults.slice(0, 5).map((item) => `- ${item.title} (${item.source}${item.publishedAt ? `, ${item.publishedAt}` : ""}) — ${item.url}`)
        : ["- No matching public-news results were reachable for this query. Check the official Makueni County PMTS and ward profile sources manually."]),
      "These headlines are leads, not confirmed facts. Open the original dated source and include only details verified for this ward.",
    ].join("\n");
    const fullBody = freeDraft.speech + researchNotes;
    const [saved] = await db.insert(generatedDocumentsTable).values({
      docType: "speech", title: freeDraft.title, occasion, audience, ward, language, tone, body: fullBody,
    }).returning();
    res.json({
      title: freeDraft.title,
      body: fullBody,
      mode: "free-template-with-public-research",
      notes: [...freeDraft.notes, "Public-web headlines are research leads only; verify the original dated source before using any claim."],
      research: { query, webResults },
      documentId: saved?.id,
    });
    return;
  }

  const base = `${CAMPAIGN_CONTEXT}

You are drafting a policy-focused public address for Prof. Philip Kaloki, a 2027 Makueni governor CANDIDATE, not an incumbent governor. Use a ${tone.toLowerCase()} tone.
Language: ${language} (if "Swahili" write in Swahili; if a mix, blend naturally as Kenyan politicians do).
Occasion: ${occasion}. Audience: ${audience || "the people of Makueni"}. Ward focus: ${ward}.
Write only the public information text for the requested part. The speech is in Prof. Philip Kaloki's voice as a candidate explaining his proposed plan if elected. Describe intended actions as future commitments, not completed achievements. If currentGaps are supplied, present them as documented service-delivery gaps only when the user provides a credible source/date; attribute claims and avoid unsupported accusations. If no evidence is supplied, discuss the need for public performance reporting without asserting specific government failures.
Do not use incumbent-government phrasing such as "my administration has delivered", "we have launched", "our county government implemented", or "as your governor" as a present fact. Use prospective wording such as "my proposal", "if elected", "I intend to", and "I would seek to", without implying guaranteed funding or delivery. Historical positions must be explicitly identified as past roles. Ground it in the manifesto themes and Makueni County services. Do not invent statistics, project failures, motives or outcomes.`;

  const pointsLine = keyPoints ? `\nCandidate's proposed commitments to explain as actions if elected: ${keyPoints}` : "";
  const gapsLine = currentGaps ? `\nCurrent administration service gaps supplied for evidence-led discussion: ${currentGaps}. Treat as claims to verify; attribute them to the supplied source/date and do not embellish. If the source/date is absent, phrase them as concerns requiring verification.` : "\nNo specific evidence about current administration failures was supplied. Do not invent failures; instead say the candidate will publish baselines, budgets, milestones and progress reports so residents can assess performance.";

  genInFlight = true;
  let opening = "", body = "", close = "";
  try {
    [opening, body, close] = await Promise.all([
      generateSection(
        base,
        `Write the OPENING of the speech (~${Math.round(words * 0.35)} words): introduce Prof. Philip Kaloki as Makueni County Governor Candidate for 2027, greet leaders and residents, and state that he is outlining what he aims to accomplish if elected. Do not claim the plan is already delivered.`,
        480,
      ),
      generateSection(
        base,
        `Write the MAIN BODY of the speech (~${words} words): explain the candidate's future commitments from the five manifesto pillars, with practical delivery steps and accountability. Where relevant, contrast these plans with current service-delivery gaps only on the basis of the evidence supplied. Do not invent or overstate failures.${pointsLine}${gapsLine}`,
        700,
      ),
      generateSection(
        base,
        `Write the CLOSING of the speech (~${Math.round(words * 0.4)} words): restate what the candidate aims to accomplish if elected, how delivery should be measured, and how residents can track budgets, milestones and verified updates. Do not claim proposed actions are already completed.${gapsLine}`,
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
    const freeDraft = buildFreeMakueniSpeech({
      area: ward === "county-wide" ? "Makueni County" : ward,
      occasion, topic: keyPoints || occasion, language,
      minutes: length === "short" ? 1 : length === "long" ? 5 : 3,
    });
    const [saved] = await db.insert(generatedDocumentsTable).values({
      docType: "speech", title: freeDraft.title, occasion, audience, ward, language, tone, body: freeDraft.speech,
    }).returning();
    res.json({ title: freeDraft.title, body: freeDraft.speech, mode: "free-fallback", notes: freeDraft.notes, documentId: saved?.id });
    return;
  }

  const title = `${occasion}${ward && ward !== "county-wide" ? ` — ${ward}` : ""}`;
  res.json({ title, body: [opening, body, close].join("\n\n"), mode: "ai" });
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
    hint: "roads, clean water, schools, health facilities and public infrastructure across the 30 official wards.",
  },
  {
    key: "Constitutional Mandate",
    hint: "county plans, approved budgets, public reporting and accountability for devolved functions.",
  },
  {
    key: "Local Patronage & Accessibility",
    hint: "public participation forums, accessible county service information and documented follow-up actions.",
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

  if (process.env.MAKUENI_AI_MODE === "free") {
    const body = [
      "# Makueni County Development & Service Brief",
      "",
      "## Vision and public accountability",
      `This brief sets out an evidence-led approach to county service delivery in Makueni County. Language: ${language}. Tone: ${tone}. Verify all current project status, budgets and statistics against dated official records before publication.`,
      "",
      ...PILLARS.map((p, i) => `## PILLAR ${i + 1}: ${p.key.toUpperCase()}\n\nPriority areas: ${p.hint} Record each proposed action with a responsible department, baseline, measurable milestone, due date and public reporting source.`),
      "",
      "## County service commitments",
      "Publish progress using verified records, explain delays honestly, invite public participation across all 30 wards, protect personal data and provide a clear channel for follow-up.",
      priorityIssues ? `\nPriority issues supplied: ${priorityIssues}\n` : "",
      "\nVerification note: this no-token template does not establish that any project or allocation is approved, funded or completed.",
    ].join("\n\n");
    res.json({ title: "Makueni County Development & Service Brief", body, mode: "free-template" });
    return;
  }

  const base = `${CAMPAIGN_CONTEXT}

You are drafting a prospective county development policy platform for Prof. Philip Kaloki, a candidate seeking election as Makueni Governor in 2027, not an incumbent official. Tone: ${tone.toLowerCase()}, factual and specific.
Language: ${language}. Write ONLY the prose for the requested section — no headings, no markdown, no labels, no bullet symbols other than plain lines.
Describe only county-government responsibilities and documented Makueni County needs. Distinguish proposed actions from approved or completed work. Describe the candidate\'s priorities as proposals conditional on election, budgeting, public participation and lawful county approvals. Never write as if the candidate currently controls county budgets, staff, or projects.`;

  const issuesLine = priorityIssues ? ` Emphasize these priority issues: ${priorityIssues}.` : "";

  const sectionCalls: Promise<{ heading: string; text: string }>[] = [];

  sectionCalls.push(
    generateSection(
      base,
      `Write the PREAMBLE / VISION (~180 words): the current county service context, the evidence base, and priorities for public accountability.${issuesLine}`,
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
      `Write the CLOSING PLEDGE (~140 words): a summary of transparent service commitments, public reporting and follow-up across all 30 official wards.`,
      460,
    ).then((text) => ({ heading: "COUNTY SERVICE COMMITMENTS", text })),
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
  res.json({ title: "Makueni County Development & Service Brief", body });
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
