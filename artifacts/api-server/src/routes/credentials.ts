import { Router } from "express";
import { db, legislativeRecordsTable, achievementsTable, researchSessionsTable } from "@workspace/db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { MAKUENI_WARDS } from "../data/makueni-geography";
const ALLOWED_WARDS = MAKUENI_WARDS.map(({ ward }) => ward);
const isMakueniWard = (ward: unknown) => typeof ward === "string" && (ALLOWED_WARDS.includes(ward) || ward === "county-wide" || ward === "all");
const isOutOfCountyText = (value: unknown) => /\b(matungulu|kangundo|tala|kyeleni|machakos county|makueni north|makueni east|makueni west)\b/i.test(String(value ?? ""));
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

// ─── Legislative Records ──────────────────────────────────────────────────────

router.get("/records", async (req, res) => {
  const { type, category, status, published } = req.query as Record<string, string>;
  const conditions = [];
  if (type) conditions.push(eq(legislativeRecordsTable.type, type));
  if (category) conditions.push(eq(legislativeRecordsTable.category, category));
  if (status) conditions.push(eq(legislativeRecordsTable.status, status));
  if (published === "true") conditions.push(eq(legislativeRecordsTable.published, true));
  const where = conditions.length ? and(...conditions) : undefined;
  const records = await db.select().from(legislativeRecordsTable).where(where).orderBy(desc(legislativeRecordsTable.date));
  res.json(records.filter(r => !isOutOfCountyText([r.title, r.description, r.session, ...(r.tags ?? [])].join(" "))));
});

router.post("/records", async (req, res) => {
  const { title, type = "bill", description, date, session, status = "pending", category = "general", impact, beneficiaries, evidenceLinks = [], tags = [], published = false, featured = false } = req.body;
  if (!title || !description || !date) { res.status(400).json({ error: "title, description, date required" }); return; }
  const [record] = await db.insert(legislativeRecordsTable).values({ title, type, description, date, session, status, category, impact, beneficiaries, evidenceLinks, tags, published, featured }).returning();
  res.status(201).json(record);
});

router.patch("/records/:id", async (req, res) => {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const fields = ["title","type","description","date","session","status","category","impact","beneficiaries","evidenceLinks","tags","published","featured"];
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const [record] = await db.update(legislativeRecordsTable).set(updates).where(eq(legislativeRecordsTable.id, parseInt(req.params.id))).returning();
  if (!record) { res.status(404).json({ error: "Not found" }); return; }
  res.json(record);
});

router.delete("/records/:id", async (req, res) => {
  await db.delete(legislativeRecordsTable).where(eq(legislativeRecordsTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

// ─── Achievements ─────────────────────────────────────────────────────────────

router.get("/achievements", async (req, res) => {
  const { category, ward, published } = req.query as Record<string, string>;
  const conditions = [inArray(achievementsTable.ward, [...ALLOWED_WARDS, "county-wide", "all"])];
  if (category) conditions.push(eq(achievementsTable.category, category));
  if (ward && ward !== "all") { if (!isMakueniWard(ward)) { res.status(400).json({ error: "Select a valid Makueni County ward" }); return; } conditions.push(eq(achievementsTable.ward, ward)); }
  if (published === "true") conditions.push(eq(achievementsTable.published, true));
  const where = conditions.length ? and(...conditions) : undefined;
  const items = await db.select().from(achievementsTable).where(where).orderBy(desc(achievementsTable.year), desc(achievementsTable.createdAt));
  res.json(items.filter(r => !isOutOfCountyText([r.title, r.description, r.fundingSource, ...(r.partnerAgencies ?? [])].join(" "))));
});

router.post("/achievements", async (req, res) => {
  const { title, description, category = "infrastructure", ward = "all", year, status = "completed", impactMetric, impactValue, budget, fundingSource, partnerAgencies = [], published = false, featured = false } = req.body;
  if (!title || !description || !year) { res.status(400).json({ error: "title, description, year required" }); return; }
  if (!isMakueniWard(ward)) { res.status(400).json({ error: "Select a valid Makueni County ward or county-wide" }); return; }
  if (isOutOfCountyText([title, description, fundingSource, ...(partnerAgencies ?? [])].join(" "))) { res.status(400).json({ error: "Only Makueni County records are accepted" }); return; }
  const [item] = await db.insert(achievementsTable).values({ title, description, category, ward, year, status, impactMetric, impactValue, budget, fundingSource, partnerAgencies, photos: [], published, featured }).returning();
  res.status(201).json(item);
});

router.patch("/achievements/:id", async (req, res) => {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const fields = ["title","description","category","ward","year","status","impactMetric","impactValue","budget","fundingSource","partnerAgencies","published","featured"];
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (updates.ward !== undefined && !isMakueniWard(updates.ward)) { res.status(400).json({ error: "Select a valid Makueni County ward or county-wide" }); return; }
  if (isOutOfCountyText([updates.title, updates.description, updates.fundingSource, ...(Array.isArray(updates.partnerAgencies) ? updates.partnerAgencies : [])].join(" "))) { res.status(400).json({ error: "Only Makueni County records are accepted" }); return; }
  const [item] = await db.update(achievementsTable).set(updates).where(eq(achievementsTable.id, parseInt(req.params.id))).returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json(item);
});

router.delete("/achievements/:id", async (req, res) => {
  await db.delete(achievementsTable).where(eq(achievementsTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

// ─── Summary / Overview ───────────────────────────────────────────────────────

router.get("/summary", async (req, res) => {
  const [recStats] = await db.select({
    total: sql<number>`count(*)`,
    published: sql<number>`sum(case when ${legislativeRecordsTable.published} then 1 else 0 end)`,
    passed: sql<number>`sum(case when ${legislativeRecordsTable.status} = 'passed' then 1 else 0 end)`,
    bills: sql<number>`sum(case when ${legislativeRecordsTable.type} = 'bill' then 1 else 0 end)`,
    motions: sql<number>`sum(case when ${legislativeRecordsTable.type} = 'motion' then 1 else 0 end)`,
  }).from(legislativeRecordsTable);

  const [achStats] = await db.select({
    total: sql<number>`count(*)`,
    published: sql<number>`sum(case when ${achievementsTable.published} then 1 else 0 end)`,
    completed: sql<number>`sum(case when ${achievementsTable.status} = 'completed' then 1 else 0 end)`,
  }).from(achievementsTable);

  const byCategory = await db.select({
    category: legislativeRecordsTable.category,
    count: sql<number>`count(*)`,
  }).from(legislativeRecordsTable).groupBy(legislativeRecordsTable.category).orderBy(desc(sql`count(*)`));

  const featuredRecords = await db.select().from(legislativeRecordsTable).where(eq(legislativeRecordsTable.featured, true)).orderBy(desc(legislativeRecordsTable.date)).limit(5);
  const featuredAchievements = await db.select().from(achievementsTable).where(eq(achievementsTable.featured, true)).orderBy(desc(achievementsTable.year)).limit(5);
  const recentSessions = await db.select().from(researchSessionsTable).orderBy(desc(researchSessionsTable.createdAt)).limit(3);

  res.json({
    records: { total: Number(recStats?.total ?? 0), published: Number(recStats?.published ?? 0), passed: Number(recStats?.passed ?? 0), bills: Number(recStats?.bills ?? 0), motions: Number(recStats?.motions ?? 0) },
    achievements: { total: Number(achStats?.total ?? 0), published: Number(achStats?.published ?? 0), completed: Number(achStats?.completed ?? 0) },
    byCategory: byCategory.map(r => ({ category: r.category, count: Number(r.count) })),
    featuredRecords,
    featuredAchievements,
    recentSessions,
  });
});

// ─── AI Auto-Populate ─────────────────────────────────────────────────────────

const COUNTY_BRIEF = "SCOPE: Makueni County, Kenya. Six constituencies: Mbooni, Kilome, Kaiti, Makueni, Kibwezi West and Kibwezi East; 30 county assembly wards. Organise county development records and service delivery. Never invent projects, budgets, dates, statistics or legislative records. Omit claims without primary-source evidence. Prefer official county publications, County Assembly records, Controller of Budget reports and KNBS.";

router.post("/ai-populate", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  try {
    // Run both AI calls in parallel — strict compact schema to stay within token budget
    const RECORDS_PROMPT = `You are a public-records assistant for Makueni County, Kenya.

${COUNTY_BRIEF}

Output ONLY compact raw JSON. No markdown. No extra whitespace. No explanations.
Schema (strict, all fields required, keep ALL text fields under 120 characters):
{"records":[{"title":"string","type":"bill|motion|petition|speech|committee|question|statement|amendment","description":"string max 120 chars","date":"YYYY-MM-DD","session":"string","status":"passed|pending|defeated|withdrawn|in_committee|second_reading|first_reading|responded|answered|completed","category":"agriculture|education|health|infrastructure|security|finance|environment|youth|women|governance|water|housing|general","impact":"string max 80 chars","tags":["tag"],"published":true,"featured":false}]}

Only include records supported by verified official source material and dated on or before ${today}. Do not fabricate bills, motions, dates or outcomes. Return an empty records array if evidence is unavailable.`;

    const ACHIEVEMENTS_PROMPT = `You are a county development records assistant for Makueni County, Kenya.

${COUNTY_BRIEF}

Output ONLY compact raw JSON. No markdown. No extra whitespace. No explanations.
Schema (strict, all fields required, keep ALL text fields under 120 characters):
{"achievements":[{"title":"string","description":"string max 120 chars","category":"infrastructure|education|health|water|security|youth|women|agriculture|environment|governance|economy|housing","ward":"Tulimani|Mbooni|Kithungo/Kitundu|Kiteta/Kisau|Kako/Waia|Kalawa|Kiima Kiu/Kalanzoni|Mukaa|Kasikeu|Kee|Kilungu|Ilima|Ukia|Nzaui/Kilili/Kalamba|Muvau/Kikumini|Kathonzweni|Mavindini|Kitise/Kithuki|Wote|Mbitini|Makindu|Kikumbulyu North|Kikumbulyu South|Nguumo|Nguu/Masumba|Emali/Mulala|Masongaleni|Mtito Andei|Thange|Ivingoni/Nzambani|county-wide","year":"2022|2023|2024|2025|2026","status":"completed|ongoing|planned","impactMetric":"string","impactValue":"string","budget":"number as string","fundingSource":"string","partnerAgencies":["string"],"published":true,"featured":false}]}

Return only documented Makueni County projects supported by primary-source evidence. Do not invent budgets, impact metrics, dates or achievements. Omit unsupported items.`;

    const [recResponse, achResponse] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-5.1",
        max_completion_tokens: 3000,
        messages: [
          { role: "system", content: RECORDS_PROMPT },
          { role: "user", content: "Generate the 8 legislative records JSON now." },
        ],
      }),
      openai.chat.completions.create({
        model: "gpt-5.1",
        max_completion_tokens: 3000,
        messages: [
          { role: "system", content: ACHIEVEMENTS_PROMPT },
          { role: "user", content: "Generate the 8 achievements JSON now." },
        ],
      }),
    ]);

    // Parse AI responses
    const recContent = recResponse.choices[0]?.message?.content ?? "";
    const achContent = achResponse.choices[0]?.message?.content ?? "";

    const recMatch = recContent.match(/\{[\s\S]*\}/);
    const achMatch = achContent.match(/\{[\s\S]*\}/);

    if (!recMatch || !achMatch) {
      req.log.error({ recContent: recContent.slice(0, 200), achContent: achContent.slice(0, 200) }, "ai-populate: JSON extraction failed");
      res.status(500).json({ error: "AI returned unexpected format. Please retry." });
      return;
    }

    const { records: genRecords = [] } = JSON.parse(recMatch[0]);
    const { achievements: genAchs = [] } = JSON.parse(achMatch[0]);

    // Bulk insert — keep existing records, just add new ones
    const insertedRecords = await db
      .insert(legislativeRecordsTable)
      .values(
        genRecords.map((r: any) => ({
          title: r.title,
          type: r.type ?? "bill",
          description: r.description,
          date: r.date,
          session: r.session ?? null,
          status: r.status ?? "pending",
          category: r.category ?? "general",
          impact: r.impact ?? null,
          beneficiaries: r.beneficiaries ?? null,
          evidenceLinks: [],
          tags: r.tags ?? [],
          published: r.published ?? true,
          featured: r.featured ?? false,
        }))
      )
      .returning();

    const insertedAchs = await db
      .insert(achievementsTable)
      .values(
        genAchs.map((a: any) => ({
          title: a.title,
          description: a.description,
          category: a.category ?? "infrastructure",
          ward: a.ward ?? "all",
          year: String(a.year ?? new Date().getFullYear()),
          status: a.status ?? "completed",
          impactMetric: a.impactMetric ?? null,
          impactValue: a.impactValue ?? null,
          budget: a.budget ?? null,
          fundingSource: a.fundingSource ?? null,
          partnerAgencies: a.partnerAgencies ?? [],
          photos: [],
          published: a.published ?? true,
          featured: a.featured ?? false,
        }))
      )
      .returning();

    res.json({
      recordsAdded: insertedRecords.length,
      achievementsAdded: insertedAchs.length,
      records: insertedRecords,
      achievements: insertedAchs,
    });
  } catch (err) {
    req.log.error({ err }, "ai-populate failed");
    res.status(500).json({ error: "AI research failed. Please retry." });
  }
});

// ─── AI Research ─────────────────────────────────────────────────────────────

router.post("/research", async (req, res) => {
  const { topic, query } = req.body;
  if (!topic || !query) { res.status(400).json({ error: "topic and query required" }); return; }

  let response = "";
  let keyPoints: string[] = [];
  let sources: Array<{ title: string; type: string; relevance: string }> = [];
  let aiGenerated = false;

  try {
    const systemPrompt = `You are a legislative research assistant for Makueni County, focused on Makueni County, Kenya.
Your role is to help research legislative topics, provide context on Kenya's parliamentary procedures, compare with regional and national benchmarks, and suggest talking points that strengthen the candidate's credentials.
Always provide structured, factual responses with clear sections.`;

    const userPrompt = `Research Topic: ${topic}

Query: ${query}

Please provide:
1. A concise research summary (3-5 paragraphs)
2. Key findings and implications for county services
3. Relevant benchmarks or comparisons (how does Makueni County compare nationally?)
4. Relevant county plans, budgets, policies or assembly records
5. Evidence sources to cite

Format your response with clear section headers using **bold** for headers.`;

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 1500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    response = aiResponse.choices[0]?.message?.content ?? "";
    aiGenerated = true;
    const lines = response.split("\n");
    keyPoints = lines.filter((l: string) => l.trim().match(/^[-•*]\s+/)).map((l: string) => l.replace(/^[-•*]\s+/, "").trim()).slice(0, 7);
    sources = [
      { title: "Kenya National Assembly Hansard", type: "Official Record", relevance: "Primary legislative source" },
      { title: "Kenya Gazette", type: "Government Publication", relevance: "Official government notices" },
      { title: "CRA Equitable Share Reports", type: "Financial Data", relevance: "Constituency fund allocations" },
      { title: "Kenya National Bureau of Statistics", type: "Data", relevance: "Population & development indicators" },
    ];
  } catch (_) { /* fall through to template */ }

  if (!aiGenerated) {
    response = `**Research Summary: ${topic}**\n\nThis research covers ${topic} as it relates to Makueni County and Kenya's legislative framework. Key considerations include the constitutional mandate under the Fourth Schedule, devolution of relevant functions, and historical budget allocations to Makueni County.\n\n**Legislative Context**\n\nThe National Assembly has addressed ${topic} through various bills and motions. County governments share responsibility with the national government under Article 186 of the Constitution. County governments receive equitable share allocations for devolved functions; verify Makueni County figures against published budget documents.\n\n**Key Recommendations**\n\nFor Makueni County to strengthen credentials on ${topic}: sponsor a private member's bill or motion, table a statement to the relevant committee, and engage the relevant ministry through written questions.`;
    keyPoints = [
      `Makueni's ${topic} needs align with national development priorities`,
      `Constitutional mandate under Chapter Eleven supports county action on ${topic}`,
      `Verify funding source and government responsibility for ${topic} projects`,
      `Check official County Assembly records for policy action on ${topic}`,
      `Committee engagement on ${topic} demonstrates subject matter expertise`,
      `Compare county indicators using official published data`,
    ];
    sources = [
      { title: "Constitution of Kenya, 2010", type: "Legal", relevance: "Fourth Schedule — Division of Functions" },
      { title: "National Assembly Standing Orders", type: "Procedure", relevance: "Bill sponsorship and motion process" },
      { title: "CDF Act 2013 (Amended 2016)", type: "Legislation", relevance: "Constituency development fund mandate" },
      { title: "Makueni County CIDP", type: "Planning", relevance: "County integrated development plan" },
      { title: "Kenya National Bureau of Statistics", type: "Data", relevance: "Makueni county demographic indicators" },
    ];
  }

  const [session] = await db.insert(researchSessionsTable).values({ topic, query, response, keyPoints, sources }).returning();
  res.json({ session, aiGenerated });
});

router.get("/research", async (req, res) => {
  const sessions = await db.select().from(researchSessionsTable).orderBy(desc(researchSessionsTable.createdAt)).limit(20);
  res.json(sessions);
});

router.delete("/research/:id", async (req, res) => {
  await db.delete(researchSessionsTable).where(eq(researchSessionsTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

export default router;
