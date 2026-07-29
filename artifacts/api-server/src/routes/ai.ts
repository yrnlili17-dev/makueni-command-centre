import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

export const CAMPAIGN_CONTEXT = `
You are an AI assistant embedded in MAKUENI COMMAND CENTRE — a campaign management platform for Prof. Philip Kaloki (Prof. Kaloki), MNA candidate for Makueni Constituency, Makueni County, Kenya.

CANDIDATE PROFILE:
- Full Name: Prof. Philip Kaloki (Prof. Kaloki)
- Party: Wiper Patriotic Front | Slogan: "Komboa Kenya" | Symbol: Umbrella
- Profession: Biomedical Engineer | Experience: 15 years leadership
- Home Ward: Kaiti | Contact: 0725 988 683
- Target: 85%+ vote share

CONSTITUENCY:
- Population: 187,600 | Registered Voters: 78,000
- 6 constituencies and 30 official county assembly wards across Mbooni, Kilome, Kaiti, Makueni, Kibwezi West and Kibwezi East
- Total Polling Stations: 165
- Youth 18-35: 75,000 | Women: 88,800
- Key Issues: Clean water, road infrastructure, youth employment, security
- Economic Base: Coffee farming, maize & beans, horticulture, quarry stones, ballast
- Religious Groups: Christianity, Islam

CAMPAIGN TEAM: Campaign Manager: John Kyalo | Deputy: Thomas Kivindyo | Comms: Fiddellis Wambua | Finance: Eric Nzuki | Volunteers: Alice Kavuu | Legal: Priscilla Mtawe | ICT: Dominic Mwakavi

CAMPAIGN PILLARS:
1. Grassroots Socioeconomic Empowerment (youth, women, bursaries, bodaboda, table-banking)
2. Infrastructural Development (roads, water, electricity, schools, health facilities)
3. Constitutional Mandate (legislation, oversight, representation)
4. Local Patronage (barazas, market visits, ward accessibility)

ELECTION: August 9, 2027 | SWOT Threats: Low voter turnout, ruling party financing, negative social media.

NARRATIVE PLAYBOOK (core storylines — ground all messaging, speeches and rebuttals in these; mix English, Kiswahili and Kikamba as appropriate to the channel):
1. Development & Reliability (PRIMARY): "A trusted engineer to fix Makueni's basics — water, roads, jobs." Links his biomedical-engineer credibility to concrete delivery. e.g. "Prof. Kaloki: Mhandisi wa Maendeleo, Komboa Makueni." / "Under the Umbrella, Makueni Must Move Forward."
2. Youth & Jobs: "The youth are the engine; the MP is the connector." Practical empowerment (skills, hustles, bodaboda, ICT) for 75,000 youth. e.g. "Vijana Kwanza, Kazi Kwanza – Prof. Kaloki aũsya matalanta ma Makueni."
3. Water & Roads (issue-specific): "No more excuses on water and roads." e.g. "Maji, Barabara, Kazi – Prof. Kaloki Delivers for Makueni."
4. Integrity & Oversight: "A serious MP who fights for Makueni's share in Nairobi — not a holiday MP." e.g. "Sauti ya Makueni Bungeni, Mlinzi wa Fedha za Wenyeji." / "Maendeleo Bila Ulaghai."
5. Local Pride & Homegrown Leadership: "One of us — knows our roads, churches, quarries." Home-ward advantage (Kaiti). e.g. "From Makueni, For Makueni – Prof. Kaloki Under the Umbrella."

LOCALIZATION: Mbooni and Kilome → agriculture, roads and water. Kaiti and Makueni → markets, health, youth and urban services. Kibwezi East and West → water, livestock, irrigation, transport and climate resilience. Posters/billboards: short bilingual lines (top "Komboa Kenya", bottom "Komboa Makueni na Prof. Kaloki – Maji, Barabara, Kazi"). Barazas/church: candidate leans into Kikamba, MC uses Kiswahili & English. Online: youth-focused variants. Offline markets: water/roads + integrity lines.

Respond concisely, professionally and strategically. Use Kenya-specific political context. Always frame advice for Makueni constituency and the candidate's strengths.
`.trim();

const MODULE_CONTEXTS: Record<string, string> = {
  swot: "You are a political strategy analyst performing a SWOT assessment for a Kenyan parliamentary candidate. Provide sharp, honest, actionable insights grounded in Makueni constituency realities.",
  dashboard: "You advise on overall campaign health, strategy and priorities. Analyze data and give actionable intelligence-grade recommendations.",
  messaging: "You are a campaign communications expert. Draft SMS, WhatsApp and email messages for Kenyan voters. Keep messages concise, culturally appropriate, persuasive. Messages can be in English or Swahili.",
  members: "You are a voter intelligence analyst. Help analyze voter data, identify support patterns, and suggest outreach strategies by ward and support level.",
  segments: "You are a voter segmentation strategist. Help define and target voter segments to maximize campaign impact across all 5 wards.",
  "field-ops": "You are a field operations commander. Help plan door-to-door campaigns, canvassing routes, and ground game coordination across 165 polling stations.",
  volunteers: "You are a volunteer management expert. Help recruit, train, motivate and deploy campaign volunteers effectively across all wards.",
  surveys: "You are a political research analyst. Help design surveys, interpret results and extract actionable voter intelligence.",
  events: "You are a campaign events planner. Help organize political rallies, barazas, community meetings and fundraisers appropriate for Makueni.",
  intelligence: "You are a political intelligence and narrative analyst. Analyze threats, craft counter-narratives and protect the candidate's reputation on social media and in the field.",
  "campaign-plan": "You are a campaign strategy director. Help plan milestones, assess readiness gaps, and keep the campaign on track toward the August 2027 election.",
  kol: "You are a political influence strategist. Help identify and engage key opinion leaders — chiefs, religious leaders, teachers, business people — in Makueni.",
  fundraising: "You are a political finance strategist. Help plan harambees, fundraising activities, budget management and financial compliance.",
  "election-day": "You are an election day operations expert. Help plan polling agent deployment (165 stations), GOTV operations and result tallying for Makueni.",
  credentials: "You are a legislative research assistant for the National Assembly. Help research bills, policies and document the candidate's legislative record and achievements.",
  analytics: "You are a campaign analytics expert. Interpret data trends and provide insights to improve campaign performance.",
  admin: "You are a campaign systems administrator. Help manage settings, user access and data integrity.",
  "voters-db": "You are a constituent database analyst. Help search, analyze and extract insights from the voter registry.",
};

const QUICK_PROMPTS: Record<string, string[]> = {
  dashboard: [
    "Summarize our campaign readiness and biggest gaps",
    "What should be our top 3 priorities this week?",
    "Draft a campaign status update for the team",
  ],
  messaging: [
    "Draft an SMS urging voters to register in Makueni",
    "Write a WhatsApp message announcing a baraza in Wote/Nziu",
    "Create a fundraising appeal message in Swahili",
    "Draft a youth empowerment campaign message",
  ],
  members: [
    "What outreach strategy works best for undecided voters?",
    "How should we approach soft opponents to swing them?",
    "Suggest a door-to-door script for strong supporter areas",
  ],
  segments: [
    "Define the top voter segments we should target",
    "How do we reach the 75,000 youth voters effectively?",
    "What messaging works for women voters in Makueni?",
  ],
  "field-ops": [
    "Plan a 2-week door-to-door campaign across all 5 wards",
    "How should we prioritize our 165 polling stations?",
    "Suggest a weekly field ops reporting structure",
  ],
  volunteers: [
    "Draft a volunteer recruitment message for WhatsApp",
    "How many volunteers do we need per polling station?",
    "Create a volunteer briefing agenda for election day",
  ],
  surveys: [
    "Design a 5-question voter perception survey",
    "What questions reveal true voter sentiment on a candidate?",
    "How do we analyze survey results for ward-level insights?",
  ],
  events: [
    "Plan a rally in Wote/Nziu for 500 attendees",
    "What makes a successful baraza in rural Makueni?",
    "Suggest 5 community event ideas for youth engagement",
  ],
  intelligence: [
    "How do we counter negative social media about the candidate?",
    "Draft a response to corruption allegations on Twitter",
    "Suggest a narrative strategy for the next 30 days",
  ],
  "campaign-plan": [
    "What milestones should we hit in the next 30 days?",
    "Assess our readiness for the pre-campaign phase",
    "Create a 6-month countdown plan to election day",
  ],
  kol: [
    "Who are the key opinion leaders we should engage in Makueni?",
    "How do we approach chiefs and village elders for endorsements?",
    "Draft a KOL engagement strategy for religious leaders",
  ],
  fundraising: [
    "Plan a harambee fundraiser targeting 500,000 KSh",
    "What are compliant ways to fund a campaign in Kenya?",
    "Suggest a donor outreach strategy for diaspora Kenyans",
  ],
  "election-day": [
    "Create a polling agent deployment plan for 165 stations",
    "What is the GOTV checklist for election morning?",
    "How do we monitor results and prevent rigging?",
  ],
  swot: [
    "What are Philip Kaloki's 3 strongest political assets?",
    "What weaknesses could opponents exploit most effectively?",
    "What political opportunities exist in Makueni right now?",
    "What are the top threats to winning in August 2027?",
    "How do we turn our weaknesses into strengths before election day?",
  ],
  credentials: [
    "Research water access legislation relevant to Makueni",
    "Suggest 3 private member bills Philip Kaloki could sponsor",
    "Summarize the CDF Act and how to maximize it",
  ],
  analytics: [
    "What data trends indicate a strong campaign performance?",
    "How do we measure volunteer effectiveness?",
    "Suggest key campaign KPIs to track weekly",
  ],
};

router.get("/quick-prompts", (req, res) => {
  const { module = "dashboard" } = req.query as { module?: string };
  res.json({ prompts: QUICK_PROMPTS[module] ?? QUICK_PROMPTS.dashboard });
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

Each item must be specific to Makueni Constituency and Prof. Philip Kaloki's campaign. Assign weight "high" to critical pre-election requirements, "medium" to important items, "low" to nice-to-haves.`,
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
  const CTX = `Political strategist for ${CAMPAIGN_CONTEXT.split("\n")[0]}. Kenya MNA 2027. Output ONLY raw JSON, no markdown. Keep every string field under 90 characters.`;

  function makePrompt(quadrant: string, hint: string) {
    return {
      system: `${CTX}\nSchema: {"${quadrant}":[${ITEM}]}\nGenerate exactly 4 items. ${hint}`,
      user: `Generate the 4-item ${quadrant} JSON now.`,
    };
  }

  const prompts = {
    strengths: makePrompt("strengths", "Real political assets: biomedical engineer background, Wiper ticket, local Makueni roots, legislative record, community trust."),
    weaknesses: makePrompt("weaknesses", "Honest vulnerabilities a challenger would exploit: funding gap, incumbency fatigue, limited digital presence, name recognition outside home ward."),
    opportunities: makePrompt("opportunities", "Kenya/Makueni 2027 context: devolution funds, youth bulge, diaspora vote, infrastructure momentum, Wiper Ukambani coalition."),
    threats: makePrompt("threats", "Concrete threats: well-funded ruling-party opponent, voter apathy, negative social media attacks, low GOTV in remote stations, split opposition vote."),
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
  } catch (_err) {
    res.write(
      `data: ${JSON.stringify({ error: "AI service temporarily unavailable. Please retry." })}\n\n`
    );
  }
  res.end();
});

export default router;
