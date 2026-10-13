import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { buildFreeMakueniAnswer, buildFreeMakueniSpeech, fetchMakueniOfficialSources, searchFreeMakueniWeb } from "./makueni-free-ai";

const router = Router();
/** In free mode these generation routes must never fall through to OpenAI. */
router.use((req, res, next) => {
  if (process.env.MAKUENI_AI_MODE !== "free" || req.method !== "POST") return next();
  const routePath = req.path;
  if (routePath === "/generate-readiness") return res.json({ mode: "free-template", items: [
    { domain: "Evidence and records", item: "Confirm each reported service issue against a dated official source.", weight: "high" },
    { domain: "Ward coverage", item: "Check that reports identify the correct Makueni sub-county and ward.", weight: "high" },
    { domain: "Public participation", item: "Record concerns, responsible office, action owner and follow-up date.", weight: "medium" },
    { domain: "Budget transparency", item: "Distinguish approved allocation, expenditure and verified outputs.", weight: "high" },
    { domain: "Data protection", item: "Restrict personal data to authorized users and log access.", weight: "high" },
    { domain: "Reporting", item: "Publish reviewed information with source links and update dates.", weight: "medium" }
  ], note: "Template checklist, not a live audit." });
  if (routePath === "/generate-campaign-plan") {
    const today = new Date().toISOString().slice(0, 10);
    const focus = typeof req.body?.focus === "string" ? req.body.focus.slice(0, 200).replace(/[<>]/g, "") : "county service delivery";
    return res.json({ mode: "free-template", milestones: [
      { title: "Verify official source material", description: "Collect current county plans, ward profiles, budget reports and project records.", dueDate: today, category: "Research", priority: "high", owner: "Research team" },
      { title: "Map service issues by ward", description: "Record location, department, source date and verification status.", dueDate: today, category: "Service delivery", priority: "high", owner: "County information team" },
      { title: "Review budget evidence", description: "Separate allocations, expenditure and documented outputs.", dueDate: today, category: "Finance", priority: "high", owner: "Finance review team" },
      { title: "Prepare public information brief", description: "Prepare a neutral brief about " + focus + " using verified sources only.", dueDate: today, category: "Reporting", priority: "medium", owner: "Communications team" },
      { title: "Schedule follow-up", description: "Assign owners and dates to unresolved service questions.", dueDate: today, category: "Follow-up", priority: "medium", owner: "Operations team" }
    ], note: "Template milestones only; no live project status is implied." });
  }
  if (routePath === "/generate-swot") return res.json({ mode: "free-template",
    strengths: [{ title: "Published county records", detail: "Official portals publish plans and project information.", impact: "medium", category: "Evidence", action: "Link claims to dated sources." }],
    weaknesses: [{ title: "Evidence gaps", detail: "Some records may be old or incomplete.", impact: "medium", category: "Data quality", action: "Track source dates and missing fields." }],
    opportunities: [{ title: "Ward-level reporting", detail: "Ward profiles help structure service reviews.", impact: "medium", category: "Reporting", action: "Use a consistent evidence checklist." }],
    threats: [{ title: "Outdated information", detail: "Old reports can be mistaken for current status.", impact: "high", category: "Verification", action: "Confirm status with the official project portal." }],
    generatedAt: new Date().toISOString(), note: "Evidence-led public-service framework." });
  return next();
});

export const CAMPAIGN_CONTEXT = `
You are an AI assistant for the Makueni County Command Centre in Kenya.
Scope: Makueni County only, including Mbooni, Kilome, Kaiti, Makueni, Kibwezi West and Kibwezi East, and the official 30 county assembly wards.
Focus on county services, public participation, approved budgets, roads, water, health, education, agriculture, environment, disaster response and transparent reporting.
Use verified official sources where available. Never invent names, projects, amounts, polling figures or outcomes. Mark uncertain information as unverified.
Do not generate candidate promotion, voter persuasion, opposition research or political attack messages.
`.trim();

const MODULE_CONTEXTS: Record<string, string> = {
  swot: "Review service-delivery strengths, evidence gaps, operational risks and improvement opportunities for Makueni County departments.",
  dashboard: "Summarize verified Makueni County service activity, reporting gaps and operational priorities.",
  messaging: "Draft neutral, factual public-service notices for Makueni County residents.",
  members: "Help maintain accurate Makueni County constituent records and data quality; do not infer political preferences.",
  segments: "Organize records by valid Makueni wards and service needs, not political persuasion or demographic targeting.",
  "field-ops": "Plan county service visits, inspections, public participation and issue follow-up within Makueni County.",
  volunteers: "Coordinate authorized county service and public participation activities within Makueni County.",
  surveys: "Design neutral surveys about Makueni County services and interpret results with clear limitations.",
  events: "Plan public participation forums and county service events within Makueni County.",
  intelligence: "Analyze verified public-service information, emerging issues and misinformation affecting Makueni County.",
  "campaign-plan": "Track Makueni County project milestones, dependencies, deadlines and evidence of completion.",
  kol: "Maintain a directory of Makueni County public-service stakeholders and community organizations.",
  fundraising: "Support transparent, compliant finance recording for authorized Makueni County activities.",
  "election-day": "Support neutral election administration records for polling stations located in Makueni County.",
  credentials: "Research Makueni County public records, county plans, budgets and documented development outcomes.",
  analytics: "Analyze Makueni County service and operational data without unsupported causal claims.",
  admin: "Help maintain secure access, auditability and data integrity for the Makueni County Command Centre.",
  "voters-db": "Maintain the Makueni County voter registry only where legally authorized; preserve source, year and provenance.",
};

const QUICK_PROMPTS: Record<string, string[]> = {
  dashboard: ["Summarize verified county service activity", "Identify missing source records", "List upcoming operational deadlines"],
  messaging: ["Draft a neutral water-service notice", "Explain how residents can submit a service request", "Draft a public participation reminder"],
  members: ["Find incomplete Makueni ward records", "Explain the data validation rules", "Summarize record quality issues"],
  segments: ["Count records by official Makueni ward", "Find records with missing ward assignments", "Review consent and data-quality gaps"],
  "field-ops": ["Plan a county road inspection", "Create a water-point follow-up checklist", "Draft a field visit report template"],
  volunteers: ["Prepare a public-service event checklist", "Create a neutral field reporting template", "Summarize open operational issues"],
  surveys: ["Draft a neutral county service survey", "Summarize responses by official ward", "Identify missing survey metadata"],
  events: ["Plan a county public participation forum", "Create an event logistics checklist", "Draft a post-event report template"],
  intelligence: ["Summarize verified public-service issues", "Flag claims that lack source links", "Draft a factual service update"],
  "campaign-plan": ["List overdue county project milestones", "Identify project dependencies", "Prepare a monthly progress report"],
  kol: ["Review the county stakeholder directory", "Find records missing organization details", "Prepare a public meeting attendance template"],
  fundraising: ["Review transaction reconciliation status", "Summarize verified county activity expenses", "List missing payment configuration details"],
  "election-day": ["Check Makueni polling-station data completeness", "Summarize station reporting status", "List records awaiting verification"],
  swot: ["Review service delivery risks and evidence gaps", "Identify operational strengths and constraints", "Suggest data-quality improvements"],
  credentials: ["Find the official Makueni County development plan", "Summarize a sourced county budget item", "List documents needed to verify a project"],
  analytics: ["Compare service metrics by ward", "Explain missing or outdated data", "Create a source-backed county indicator summary"],
  admin: ["Review role permissions", "Check audit-log completeness", "Review workspace data-isolation controls"],
  "voters-db": ["Check voter records with invalid wards", "Summarize registry provenance", "Identify duplicate records for review"],
};

router.get("/county-knowledge", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.slice(0, 180) : "Makueni County development";
  const [sources, webResults] = await Promise.all([fetchMakueniOfficialSources(), searchFreeMakueniWeb(query)]);
  res.json({
    query,
    webResults,
    mode: process.env.MAKUENI_AI_MODE === "free" ? "free-template-retrieval" : "provider-assisted",
    checkedAt: new Date().toISOString(),
    sources,
    guidance: "Search results are public-web discovery aids, not a complete index or proof of truth. Verify facts in original dated county documents before using them in public statements."
  });
});

router.get("/quick-prompts", (req, res) => {
  const { module = "dashboard" } = req.query as { module?: string };
  res.json({ prompts: QUICK_PROMPTS[module] ?? QUICK_PROMPTS.dashboard });
});

router.post("/generate-speech", async (req, res) => {
  const { area, occasion, topic, language, minutes } = req.body as {
    area?: string; occasion?: string; topic?: string; language?: string; minutes?: number;
  };
  if ([area, occasion, topic, language].some((value) => typeof value === "string" && value.length > 200)) {
    res.status(400).json({ error: "Speech fields must be 200 characters or fewer." });
    return;
  }
  const draft = buildFreeMakueniSpeech({ area, occasion, topic, language, minutes });
  const query = [area || "Makueni County", topic || "service delivery", "Makueni County"].join(" ");
  const [officialSources, webResults] = await Promise.all([fetchMakueniOfficialSources(), searchFreeMakueniWeb(query)]);
  res.json({
    ...draft,
    generatedAt: new Date().toISOString(),
    mode: "free-template-with-public-source-search",
    research: { query, officialSources, webResults },
    notes: [...draft.notes, "Search results are leads, not verified facts. Review linked sources and add only confirmed local details before delivering the speech."],
  });
});

router.post("/generate-readiness", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 4096,
      messages: [
        {
          role: "system",
          content: `${CAMPAIGN_CONTEXT}

You are generating a candidate readiness checklist for a Kenya constituency campaign. Today is ${today}.

Return ONLY a raw JSON object with no markdown, no code fences, no explanation — just the JSON:
{
  "items": [
    {
      "domain": "domain name",
      "item": "specific, actionable checklist item",
      "weight": "low|medium|high",
      "notes": "optional one-line context note relevant to Makueni"
    }
  ]
}

Generate 30-40 checklist items covering ALL of these domains:
- Legal & Compliance (IEBC clearance, nomination papers, party ticket, running mate)
- Financial (budget, donors, bank account, expenditure tracking)
- Ground Game (ward captains, volunteers, door-to-door, polling station mapping)
- Messaging & Brand (manifesto, slogan, social media, website, materials)
- Media & PR (press team, radio, barazas, monitoring, crisis comms)
- Polling & Intelligence (baseline poll, opponent tracking, sentiment, swing wards)
- Technology & Data (voter database, SMS platform, WhatsApp broadcast, reporting tools)
- Candidate Welfare (schedule, security, transportation, health)

Each item must relate to Makueni County services, public reporting, or operational readiness. Assign weight "high" to critical pre-election requirements, "medium" to important items, "low" to nice-to-haves.`,
        },
        {
          role: "user",
          content: "Generate a comprehensive candidate readiness checklist for the Makueni campaign based on the candidate profile and constituency information provided.",
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) { res.status(500).json({ error: "No AI response" }); return; }
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { res.status(500).json({ error: "Invalid AI response format" }); return; }
    const parsed = JSON.parse(jsonMatch[0]);
    res.json({ items: parsed.items ?? [] });
  } catch (err) {
    req.log.error({ err }, "generate-readiness failed");
    res.status(500).json({ error: "Failed to generate readiness checklist. Please retry." });
  }
});

router.post("/generate-campaign-plan", async (req, res) => {
  const { electionDate, focus } = req.body as { electionDate?: string; focus?: string };
  const today = new Date().toISOString().slice(0, 10);
  const election = electionDate || "2027-08-09";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 4096,
      messages: [
        {
          role: "system",
          content: `${CAMPAIGN_CONTEXT}

You are generating a structured milestone plan. Today is ${today}. Election date: ${election}.

Return ONLY a raw JSON object with no markdown, no code fences, no explanation — just the JSON:
{
  "milestones": [
    {
      "title": "short action title",
      "description": "1-2 sentence detail",
      "dueDate": "YYYY-MM-DD",
      "category": "Ground Game|Messaging|Narrative|Fundraising|Events|Polling|GOTV|Legal|Media|Logistics",
      "priority": "low|medium|high|critical",
      "owner": "team member full name"
    }
  ]
}

Generate 18-22 strategic milestones spanning from today to 2 weeks before election day. Spread them across all categories. Make each milestone specific, actionable and realistic for Makueni Constituency. Assign owners from the campaign team.`,
        },
        {
          role: "user",
          content: focus
            ? `Generate a campaign milestone plan focused on: ${focus}`
            : "Generate a comprehensive campaign milestone plan from today to election day covering ground game, messaging, fundraising, legal, GOTV and all other campaign areas.",
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) { res.status(500).json({ error: "No AI response" }); return; }
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { res.status(500).json({ error: "Invalid AI response format" }); return; }
    const parsed = JSON.parse(jsonMatch[0]);
    res.json({ milestones: parsed.milestones ?? [] });
  } catch (err) {
    req.log.error({ err }, "generate-campaign-plan failed");
    res.status(500).json({ error: "Failed to generate campaign plan. Please retry." });
  }
});

router.post("/generate-swot", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  // One call per quadrant — 4 items each — keeps output ~250 tokens per call (safe in prod)
  const ITEM = `{"title":"string","detail":"string","impact":"high|medium|low","category":"Political|Financial|Grassroots|Narrative|Demographic|Infrastructure|Legal|External","action":"string"}`;
  const CTX = `Political strategist supporting Prof. Philip Kaloki in Makueni County, Kenya, for the 2027 election. Keep analysis evidence-led and specific to Makueni County. Do not reference places outside Makueni County. Do not invent personal history, party affiliation, funding, polling, or election results. Output ONLY raw JSON, no markdown. Keep every string field under 90 characters.`;

  function makePrompt(quadrant: string, hint: string) {
    return {
      system: `${CTX}\nSchema: {"${quadrant}":[${ITEM}]}\nGenerate exactly 4 items. ${hint}`,
      user: `Generate the 4-item ${quadrant} JSON now.`,
    };
  }

  const prompts = {
    strengths: makePrompt("strengths", "Assess verifiable assets such as local community engagement, policy proposals, public profile, team capacity and documented service record. Do not assume any are proven without evidence."),
    weaknesses: makePrompt("weaknesses", "Identify areas requiring evidence and improvement: ward coverage, communications reach, volunteer coordination, resourcing, and documented policy detail. Do not state unverified weaknesses as facts."),
    opportunities: makePrompt("opportunities", "Consider Makueni-specific community priorities, youth and women participation, ward listening, public forums, digital information access, and transparent policy commitments."),
    threats: makePrompt("threats", "Consider misinformation, low public trust, fragmented communications, poor source verification, volunteer safety and uneven ward coverage without asserting unverified opponents or polling trends."),
  };

  try {
    const call = (system: string, user: string) =>
      openai.chat.completions.create({
        model: "gpt-5.1",
        max_completion_tokens: 800,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      });

    const [sRes, wRes, oRes, tRes] = await Promise.all([
      call(prompts.strengths.system, prompts.strengths.user),
      call(prompts.weaknesses.system, prompts.weaknesses.user),
      call(prompts.opportunities.system, prompts.opportunities.user),
      call(prompts.threats.system, prompts.threats.user),
    ]);

    function parse(res: any, key: string) {
      const text = res.choices[0]?.message?.content ?? "";
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) return [];
      try { return JSON.parse(m[0])[key] ?? []; } catch { return []; }
    }

    res.json({
      strengths: parse(sRes, "strengths"),
      weaknesses: parse(wRes, "weaknesses"),
      opportunities: parse(oRes, "opportunities"),
      threats: parse(tRes, "threats"),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "generate-swot failed");
    res.status(500).json({ error: "Failed to generate SWOT analysis. Please retry." });
  }
});

router.post("/assist", async (req, res) => {
  const { module = "dashboard", context = {}, message } = req.body as {
    module?: string;
    context?: Record<string, unknown>;
    message: string;
  };

  if (!message?.trim()) {
    res.status(400).json({ error: "message required" });
    return;
  }

  const moduleCtx = MODULE_CONTEXTS[module] ?? MODULE_CONTEXTS.dashboard;
  const contextStr =
    Object.keys(context).length > 0
      ? `\n\nCURRENT MODULE DATA:\n${JSON.stringify(context, null, 2)}`
      : "";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Explicit no-token mode avoids calling the paid model at all.
  if (process.env.MAKUENI_AI_MODE === "free") {
    const [liveSources, publicWebResults] = await Promise.all([fetchMakueniOfficialSources(), searchFreeMakueniWeb(message)]);
    const fallback = buildFreeMakueniAnswer({ message, module, context: { ...context, publicWebResults }, liveSources });
    res.write(`data: ${JSON.stringify({ content: fallback, mode: "free-fallback" })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true, mode: "free-fallback" })}\n\n`);
    res.end();
    return;
  }

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 1024,
      messages: [
        {
          role: "system",
          content: `${CAMPAIGN_CONTEXT}\n\nMODULE: ${module.toUpperCase()}\nROLE: ${moduleCtx}${contextStr}`,
        },
        { role: "user", content: message },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    req.log.warn({ err }, "Paid AI unavailable; using deterministic Makueni fallback");
    const [liveSources, publicWebResults] = await Promise.all([fetchMakueniOfficialSources(), searchFreeMakueniWeb(message)]);
    const fallback = buildFreeMakueniAnswer({ message, module, context: { ...context, publicWebResults }, liveSources });
    res.write(`data: ${JSON.stringify({ content: fallback, mode: "free-fallback" })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true, mode: "free-fallback" })}\n\n`);
  }
  res.end();
});

export default router;
