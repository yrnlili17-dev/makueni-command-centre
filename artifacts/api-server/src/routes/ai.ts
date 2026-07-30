import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { buildPhase16Response } from "../services/smart-assist-engine";

const router = Router();

export const CAMPAIGN_CONTEXT = `
You are an AI assistant embedded in MAKUENI COMMAND CENTRE — a campaign management platform for Hon. Stephen Mutinda Mule (Mwanamule), MNA candidate for Makueni Constituency, Machakos County, Kenya.

CANDIDATE PROFILE:
- Full Name: Hon. Stephen Mutinda Mule (Mwanamule)
- Party: Wiper Patriotic Front | Slogan: "Komboa Kenya" | Symbol: Umbrella
- Profession: Biomedical Engineer | Experience: 15 years leadership
- Home Ward: Makueni West | Contact: 0725 988 683
- Target: 85%+ vote share

CONSTITUENCY:
- Population: 187,600 | Registered Voters: 78,000
- 5 Wards: Tala (40 stations), Makueni West (55 stations), Makueni North (26 stations), Makueni East (24 stations), Kyeleni (20 stations)
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
1. Development & Reliability (PRIMARY): "A trusted engineer to fix Makueni's basics — water, roads, jobs." Links his biomedical-engineer credibility to concrete delivery. e.g. "Mwanamule: Mhandisi wa Maendeleo, Komboa Makueni." / "Under the Umbrella, Makueni Must Move Forward."
2. Youth & Jobs: "The youth are the engine; the MP is the connector." Practical empowerment (skills, hustles, bodaboda, ICT) for 75,000 youth. e.g. "Vijana Kwanza, Kazi Kwanza – Mwanamule aũsya matalanta ma Makueni."
3. Water & Roads (issue-specific): "No more excuses on water and roads." e.g. "Maji, Barabara, Kazi – Mwanamule Delivers for Makueni."
4. Integrity & Oversight: "A serious MP who fights for Makueni's share in Nairobi — not a holiday MP." e.g. "Sauti ya Makueni Bungeni, Mlinzi wa Fedha za Wenyeji." / "Maendeleo Bila Ulaghai."
5. Local Pride & Homegrown Leadership: "One of us — knows our roads, churches, quarries." Home-ward advantage (Makueni West). e.g. "From Makueni, For Makueni – Mwanamule Under the Umbrella."

LOCALIZATION: Tala → markets, youth, bodaboda, security. Makueni West/North/East → water, coffee prices, roads, bursaries. Kyeleni → water, feeder roads, security, quarry safety. Posters/billboards: short bilingual lines (top "Komboa Kenya", bottom "Komboa Makueni na Mwanamule – Maji, Barabara, Kazi"). Barazas/church: candidate leans into Kikamba, MC uses Kiswahili & English. Online: youth-focused variants. Offline markets: water/roads + integrity lines.

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



export function buildSmartAssistResponse({
  message,
  module = "dashboard",
  context = {},
  liveDigest,
}: {
  message: string;
  module?: string;
  context?: Record<string, unknown>;
  liveDigest?: string;
}): string {
  const query = message.trim();
  const lower = query.toLowerCase();
  const moduleName = module.replace(/-/g, " ");

  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(lower)) {
    return `Hello! I am Smart Assist. I can help you search campaign information, review ${moduleName}, identify priorities, prepare field actions, and guide you to public research sources. What would you like to work on?`;
  }

  if (lower.includes("what can you do") || lower === "help" || lower.includes("how can you help")) {
    return `Smart Assist can help with:
1. Campaign and constituency information
2. Contacts, wards and polling-station guidance
3. Field operations and volunteer planning
4. Messaging and event preparation
5. Social-listening research prompts
6. Chief Strategist recommendations based on available campaign data

Try: “Give me today’s priorities”, “Plan ward outreach”, or “Research water issues in Makueni”.`;
  }

  if (lower.includes("google") || lower.includes("news") || lower.includes("social listening") || lower.includes("what are people saying") || lower.includes("research")) {
    const encoded = encodeURIComponent(query.replace(/social listening|research/gi, "").trim() || "Makueni campaign issues");
    return `SMART RESEARCH

Use these public searches for the latest information:
• Google News: https://news.google.com/search?q=${encoded}
• Google Search: https://www.google.com/search?q=${encoded}
• YouTube: https://www.youtube.com/results?search_query=${encoded}
• X: https://x.com/search?q=${encoded}&src=typed_query

Save useful findings in a Campaign Workspace and record the source, date, issue, ward and recommended action.`;
  }

  if (lower.includes("priority") || lower.includes("today") || lower.includes("this week")) {
    return `CURRENT PRIORITIES FOR ${moduleName.toUpperCase()}

1. Verify the latest ward and polling-station data before making decisions.
2. Identify the three weakest coverage areas and assign an owner to each.
3. Convert every major issue into a field action, a message and a measurable target.
4. Review open incidents, pending approvals and upcoming events.
5. End the week with a short evidence-based progress report.

Next action: select one ward or issue and I will structure a focused action plan.`;
  }

  if (lower.includes("water") || lower.includes("road") || lower.includes("youth") || lower.includes("jobs") || lower.includes("health")) {
    const issue = lower.includes("water") ? "water" : lower.includes("road") ? "roads" : lower.includes("health") ? "healthcare" : "youth employment";
    return `${issue.toUpperCase()} ACTION FRAMEWORK

• Evidence: gather current field reports, photos, affected locations and resident quotations.
• Geography: rank wards and polling stations by urgency.
• Message: explain the problem, the practical intervention and the delivery timeline.
• Field action: assign a local lead and conduct targeted listening meetings.
• Measurement: track households reached, commitments recorded and follow-up actions completed.

For public listening, search Google News, YouTube and X using “${issue} Makueni”.`;
  }

  if (lower.includes("ward") || lower.includes("polling station") || lower.includes("constituency")) {
    return `GEOGRAPHIC CAMPAIGN CHECK

For the requested area, review:
• Registered voters and polling stations
• Contacts and identified supporters
• Active volunteers and field visits
• Local issues and incidents
• Upcoming events and responsible team members

Open the GIS Centre or Constituency Intelligence page, choose the area, then ask me for an outreach or risk plan.`;
  }

  if (lower.includes("message") || lower.includes("sms") || lower.includes("whatsapp")) {
    return `MESSAGE DRAFT

Hello. Our campaign team is listening and working with residents to address the issues that matter most in every ward. Please share your priority and join the next community engagement meeting. Together, we can build accountable leadership and practical development.

Before sending: add the exact location, date, contact and approved campaign signature.`;
  }

  const contextKeys = Object.keys(context);
  const contextNote = contextKeys.length
    ? ` I can see module context fields: ${contextKeys.slice(0, 6).join(", ")}.`
    : "";
  const digestNote = liveDigest ? `

AVAILABLE CAMPAIGN SNAPSHOT
${liveDigest}` : "";

  return `SMART ASSIST — ${moduleName.toUpperCase()}

I understood your request as: “${query}”.${contextNote}

I do not require an AI API key. I work with structured campaign guidance, the available system data and public-search links. Ask a more specific question about a ward, issue, message, event, volunteer operation, polling station or campaign priority.${digestNote}`;
}

const QUICK_PROMPTS: Record<string, string[]> = {
  dashboard: [
    "Summarize our campaign readiness and biggest gaps",
    "What should be our top 3 priorities this week?",
    "Draft a campaign status update for the team",
  ],
  messaging: [
    "Draft an SMS urging voters to register in Makueni",
    "Write a WhatsApp message announcing a baraza in Tala",
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
    "Plan a rally in Tala for 500 attendees",
    "What makes a successful baraza in rural Machakos?",
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
    "What are Stephen Mule's 3 strongest political assets?",
    "What weaknesses could opponents exploit most effectively?",
    "What political opportunities exist in Makueni right now?",
    "What are the top threats to winning in August 2027?",
    "How do we turn our weaknesses into strengths before election day?",
  ],
  credentials: [
    "Research water access legislation relevant to Makueni",
    "Suggest 3 private member bills Stephen Mule could sponsor",
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

Each item must be specific to Makueni Constituency and Hon. Stephen Mule's campaign. Assign weight "high" to critical pre-election requirements, "medium" to important items, "low" to nice-to-haves.`,
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

router.post("/generate-swot", async (_req, res) => {
  const strengths = [
    {
      title: "Strong professional profile",
      detail: "Technical and professional experience supports a competence-based campaign.",
      impact: "high",
      category: "Political",
      action: "Present practical achievements through ward-level public forums.",
    },
    {
      title: "Established local identity",
      detail: "Makueni roots strengthen familiarity, trust and community connection.",
      impact: "high",
      category: "Grassroots",
      action: "Use respected local leaders and community networks as validators.",
    },
    {
      title: "Development-focused message",
      detail: "The campaign can unite voters around services, jobs and accountable leadership.",
      impact: "high",
      category: "Narrative",
      action: "Translate the manifesto into clear household-level benefits.",
    },
    {
      title: "Growing digital infrastructure",
      detail: "The command centre supports coordinated data, messaging and field operations.",
      impact: "medium",
      category: "Infrastructure",
      action: "Ensure every ward team regularly updates campaign information.",
    },
  ];

  const weaknesses = [
    {
      title: "Limited ward coverage",
      detail: "Current contact records represent only a small number of wards.",
      impact: "high",
      category: "Grassroots",
      action: "Prioritize recruitment and data collection in uncovered wards.",
    },
    {
      title: "Low campaign membership",
      detail: "Campaign membership records are not yet populated across the county.",
      impact: "high",
      category: "Demographic",
      action: "Launch a structured membership and volunteer registration drive.",
    },
    {
      title: "Uneven digital visibility",
      detail: "Online engagement may not yet match better-funded opponents.",
      impact: "medium",
      category: "Narrative",
      action: "Create a daily content calendar focused on development and accountability.",
    },
    {
      title: "Operational data gaps",
      detail: "Some GIS, event and election-day modules are still in foundation mode.",
      impact: "medium",
      category: "Infrastructure",
      action: "Complete verified data integration before full campaign deployment.",
    },
  ];

  const opportunities = [
    {
      title: "Youth and first-time voters",
      detail: "Young voters provide a large audience for jobs and innovation messaging.",
      impact: "high",
      category: "Demographic",
      action: "Build youth teams around employment, enterprise and digital outreach.",
    },
    {
      title: "Demand for accountable leadership",
      detail: "Voters are increasingly focused on integrity and measurable county services.",
      impact: "high",
      category: "Political",
      action: "Publish clear commitments with timelines and public accountability measures.",
    },
    {
      title: "Diaspora and professional networks",
      detail: "External supporters can contribute expertise, influence and fundraising.",
      impact: "medium",
      category: "Financial",
      action: "Create a structured diaspora engagement and fundraising programme.",
    },
    {
      title: "Data-driven mobilization",
      detail: "Ward and polling-station intelligence can improve targeting and turnout.",
      impact: "high",
      category: "Infrastructure",
      action: "Use GIS and voter data to prioritize persuasion and GOTV activity.",
    },
  ];

  const threats = [
    {
      title: "Well-funded opponents",
      detail: "Competitors may use greater resources to dominate visibility and mobilization.",
      impact: "high",
      category: "Financial",
      action: "Focus resources on priority wards and trusted grassroots networks.",
    },
    {
      title: "Misinformation campaigns",
      detail: "False narratives may spread quickly through social and messaging platforms.",
      impact: "high",
      category: "Narrative",
      action: "Establish rapid monitoring, verification and response procedures.",
    },
    {
      title: "Low voter turnout",
      detail: "Apathy and logistical barriers could reduce participation in remote areas.",
      impact: "high",
      category: "External",
      action: "Develop polling-station-level turnout targets and mobilization plans.",
    },
    {
      title: "Opposition vote fragmentation",
      detail: "Multiple candidates may divide aligned voters and weaken coalition support.",
      impact: "medium",
      category: "Political",
      action: "Strengthen coalition outreach and communicate the strategic case for unity.",
    },
  ];

  res.setHeader("Cache-Control", "no-store");

  res.json({
    strengths,
    weaknesses,
    opportunities,
    threats,
    generatedAt: new Date().toISOString(),
    source: "campaign-strategy-engine",
  });
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

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const content = await buildPhase16Response({ message, module });
  res.write(`data: ${JSON.stringify({ content })}\n\n`);
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
