import { Router } from "express";
import { db, legislativeRecordsTable, achievementsTable, researchSessionsTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
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
  res.json(records);
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
  const conditions = [];
  if (category) conditions.push(eq(achievementsTable.category, category));
  if (ward && ward !== "all") conditions.push(eq(achievementsTable.ward, ward));
  if (published === "true") conditions.push(eq(achievementsTable.published, true));
  const where = conditions.length ? and(...conditions) : undefined;
  const items = await db.select().from(achievementsTable).where(where).orderBy(desc(achievementsTable.year), desc(achievementsTable.createdAt));
  res.json(items);
});

router.post("/achievements", async (req, res) => {
  const { title, description, category = "infrastructure", ward = "all", year, status = "completed", impactMetric, impactValue, budget, fundingSource, partnerAgencies = [], published = false, featured = false } = req.body;
  if (!title || !description || !year) { res.status(400).json({ error: "title, description, year required" }); return; }
  const [item] = await db.insert(achievementsTable).values({ title, description, category, ward, year, status, impactMetric, impactValue, budget, fundingSource, partnerAgencies, photos: [], published, featured }).returning();
  res.status(201).json(item);
});

router.patch("/achievements/:id", async (req, res) => {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const fields = ["title","description","category","ward","year","status","impactMetric","impactValue","budget","fundingSource","partnerAgencies","published","featured"];
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
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

const CANDIDATE_BRIEF = `
CANDIDATE: Prof. Philip Kaloki (Prof. Kaloki)
ROLE: Member of the National Assembly, Makueni Constituency, Makueni County, Kenya
PARTY: Wiper Democratic Movement (Patriotic Front) | Symbol: Umbrella | Slogan: "Komboa Kenya"
PROFESSION: Biomedical Engineer (15+ years) | Entrepreneur | Community leader
HOME WARD: Kaiti
CONSTITUENCY: 78,000 registered voters | 5 wards: Mbooni, Kilome, Kaiti, Makueni, Kibwezi West and Kibwezi East constituencies | 165 polling stations
KEY LOCAL ISSUES: Water access, rural road rehabilitation, youth unemployment, quality health facilities, agriculture support
ECONOMIC BASE: Coffee, maize & beans, horticulture, quarry stones, ballast mining
PARLIAMENTARY TERM: 13th Parliament (2022–2027)
COMMITTEES: Transport, Public Works & Housing; Health; Devolution & ASALs (approximate from constituency profile)
CDF ALLOCATION: ~KES 120M/year | Has overseen 40+ CDF projects
NOTABLE: Engineer background — strong on infrastructure bills; close ties with Ukambani region MPs; actively engaged on water and roads for Makueni
`.trim();

router.post("/ai-populate", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  try {
    // Run both AI calls in parallel — strict compact schema to stay within token budget
    const RECORDS_PROMPT = `You are a database builder for a Kenyan MNA credentials system.

${CANDIDATE_BRIEF}

Output ONLY compact raw JSON. No markdown. No extra whitespace. No explanations.
Schema (strict, all fields required, keep ALL text fields under 120 characters):
{"records":[{"title":"string","type":"bill|motion|petition|speech|committee|question|statement|amendment","description":"string max 120 chars","date":"YYYY-MM-DD","session":"string","status":"passed|pending|defeated|withdrawn|in_committee|second_reading|first_reading|responded|answered|completed","category":"agriculture|education|health|infrastructure|security|finance|environment|youth|women|governance|water|housing|general","impact":"string max 80 chars","tags":["tag"],"published":true,"featured":false}]}

Generate 8 records in this order: 2 bills, 2 motions, 1 question, 1 statement, 1 committee, 1 petition.
Dates between 2022-09-20 and ${today}. Mark 2 as featured:true. Use KeNHA, WaSREB, NHIF where relevant.`;

    const ACHIEVEMENTS_PROMPT = `You are a database builder for a Kenyan MNA achievements system.

${CANDIDATE_BRIEF}

Output ONLY compact raw JSON. No markdown. No extra whitespace. No explanations.
Schema (strict, all fields required, keep ALL text fields under 120 characters):
{"achievements":[{"title":"string","description":"string max 120 chars","category":"infrastructure|education|health|water|security|youth|women|agriculture|environment|governance|economy|housing","ward":"official Makueni ward name|all","year":"2022|2023|2024|2025|2026","status":"completed|ongoing|planned","impactMetric":"string","impactValue":"string","budget":"number as string","fundingSource":"string","partnerAgencies":["string"],"published":true,"featured":false}]}

Generate 8 achievements. Cover all 5 wards (min 1 each). Categories: infrastructure, water, health, education, youth, women, agriculture. Vary years 2022–2026. Mark 2 as featured:true. Use real place names: Wote, Makindu, Kathonzweni, Mbooni, Kasikeu and Mtito Andei.`;

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
    const systemPrompt = `You are a legislative research assistant for Prof. Philip Kaloki, Member of the National Assembly for Makueni Constituency, Kenya.
Your role is to help research legislative topics, provide context on Kenya's parliamentary procedures, compare with regional and national benchmarks, and suggest talking points that strengthen the candidate's credentials.
Always provide structured, factual responses with clear sections.`;

    const userPrompt = `Research Topic: ${topic}

Query: ${query}

Please provide:
1. A concise research summary (3-5 paragraphs)
2. Key talking points (bullet list of 5-7 points) that the MNA can use
3. Relevant benchmarks or comparisons (how does Makueni/Machakos compare nationally?)
4. Suggested legislation or motions related to this topic
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
    response = `**Research Summary: ${topic}**\n\nThis research covers ${topic} as it relates to Makueni Constituency and Kenya's legislative framework. Key considerations include the constitutional mandate under the Fourth Schedule, devolution of relevant functions, and historical budget allocations to Makueni County.\n\n**Legislative Context**\n\nThe National Assembly has addressed ${topic} through various bills and motions. County governments share responsibility with the national government under Article 186 of the Constitution. Makueni Constituency, as part of Makueni County, receives equitable share allocations directed towards ${topic}-related development.\n\n**Key Recommendations**\n\nFor Prof. Philip Kaloki to strengthen credentials on ${topic}: sponsor a private member's bill or motion, table a statement to the relevant committee, and engage the relevant ministry through written questions.`;
    keyPoints = [
      `Makueni's ${topic} needs align with national development priorities`,
      `Constitutional mandate under Chapter Eleven supports county action on ${topic}`,
      `CDF allocations can be directed to ${topic} projects in all 5 wards`,
      `Sponsoring a bill on ${topic} builds legislative credentials`,
      `Committee engagement on ${topic} demonstrates subject matter expertise`,
      `Cross-party collaboration on ${topic} broadens political appeal`,
    ];
    sources = [
      { title: "Constitution of Kenya, 2010", type: "Legal", relevance: "Fourth Schedule — Division of Functions" },
      { title: "National Assembly Standing Orders", type: "Procedure", relevance: "Bill sponsorship and motion process" },
      { title: "CDF Act 2013 (Amended 2016)", type: "Legislation", relevance: "Constituency development fund mandate" },
      { title: "Makueni County CIDP", type: "Planning", relevance: "County integrated development plan" },
      { title: "Kenya National Bureau of Statistics", type: "Data", relevance: "Makueni constituency demographics" },
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
