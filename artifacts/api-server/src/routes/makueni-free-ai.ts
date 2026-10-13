/**
 * No-token fallback for Makueni County workflows.
 *
 * This deliberately uses deterministic templates and supplied database context.
 * It does not pretend to be a general-purpose LLM or fabricate current county
 * statistics. Live/current claims must be backed by official source records.
 */
export function buildFreeMakueniAnswer(input: {
  message: string;
  module?: string;
  context?: Record<string, unknown>;
  liveSources?: Array<{ title: string; url: string; checkedAt: string; excerpt: string; status: string }>;
}): string {
  const message = input.message.trim();
  const lower = message.toLowerCase();
  const context = input.context ?? {};
  const liveSources = input.liveSources ?? [];
  const webResults = Array.isArray(context.publicWebResults)
    ? (context.publicWebResults as Array<{ title?: string; url?: string; source?: string; publishedAt?: string | null; snippet?: string }>)
        .filter((item) => item && typeof item.title === "string" && typeof item.url === "string")
        .slice(0, 5)
    : [];

  const wards = [
    "Tulimani", "Mbooni", "Kithungo/Kitundu", "Kiteta/Kisau", "Kako/Waia", "Kalawa",
    "Kiima Kiu/Kalanzoni", "Mukaa", "Kasikeu", "Kee", "Kilungu", "Ilima", "Ukia",
    "Nzaui/Kilili/Kalamba", "Muvau/Kikumini", "Kathonzweni", "Mavindini", "Kitise/Kithuki",
    "Wote", "Mbitini", "Makindu", "Kikumbulyu North", "Kikumbulyu South", "Nguumo",
    "Nguu/Masumba", "Emali/Mulala", "Masongaleni", "Mtito Andei", "Thange", "Ivingoni/Nzambani",
  ];
  const ward = wards.find((name) => lower.includes(name.toLowerCase())) ??
    (lower.match(/(?:in|for|at|about)\s+([a-z][a-z /-]{1,35}?)\s+ward\b/i)?.[1]?.trim() ?? "");
  const area = ward ? ward.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Makueni County";

  let issue = "general service delivery";
  let practicalSteps = [
    "List the three most urgent issues residents report and the exact village/facility/road affected.",
    "Check the county project tracker and current ward profile for an existing project, budget and latest recorded status.",
    "Agree on the responsible department, a named follow-up officer, evidence needed and a date to report back to residents.",
  ];
  if (/water|borehole|dam|irrigat|pipe|dry tap/.test(lower)) {
    issue = "water and irrigation";
    practicalSteps = [
      "Map the affected water point or pipeline and record whether it is broken, unreliable, unfinished or inaccessible.",
      "Check the county project tracker for the scheme, budget, contractor/milestone and last recorded update; do not assume a project is complete from its allocation.",
      "Refer repairs or supply gaps to the responsible water office, set an inspection date and publish a clear update for affected villages.",
    ];
  } else if (/road|bridge|murram|transport|access|culvert/.test(lower)) {
    issue = "roads and access";
    practicalSteps = [
      "Identify the exact road section, damaged points and villages/facilities it connects; add dated photos or an inspection report.",
      "Check whether grading, drainage, gravelling or a bridge/culvert is already listed in the ward project records and verify its implementation status.",
      "Prioritise sections that block access to schools, health facilities, markets or emergency services, then record the responsible office and inspection date.",
    ];
  } else if (/health|hospital|clinic|dispensary|medicine|drug|ambulance/.test(lower)) {
    issue = "health services";
    practicalSteps = [
      "Name the affected health facility and the specific gap: staffing, opening hours, essential medicines, equipment, water or referral access.",
      "Verify the issue with a dated facility or county health report; avoid sharing identifiable patient information.",
      "Refer the gap to the responsible health office and agree on an update date and a way residents can report whether service has improved.",
    ];
  } else if (/school|education|bursary|classroom|teacher|ecde/.test(lower)) {
    issue = "education";
    practicalSteps = [
      "Identify the school/ECDE centre and the concrete need, such as classroom safety, water, sanitation, learning materials or bursary access.",
      "Check the current education project list and published bursary criteria; do not promise funding or eligibility without an official notice.",
      "Record the responsible office, the action required and the date parents/community members will receive a progress update.",
    ];
  } else if (/agricultur|mango|livestock|farmer|market|crop|drought|feed/.test(lower)) {
    issue = "agriculture and livelihoods";
    practicalSteps = [
      "Identify the crop/livestock or market problem and the affected farmer group/villages, including the current season.",
      "Check current county agriculture advisories, extension support, water access and market information before recommending a specific intervention.",
      "Coordinate a practical follow-up with the relevant extension officer or cooperative and record what support is available, eligibility and timing.",
    ];
  } else if (/budget|spend|finance|allocation|fund|project cost/.test(lower)) {
    issue = "budget and project delivery";
    practicalSteps = [
      "Find the project in the approved budget/ward profile and record the financial year, department and approved allocation.",
      "Separately verify releases, expenditure, implementation milestones and actual outputs; an allocation alone does not prove work was done.",
      "Ask the responsible office for the latest dated progress report and record any discrepancy for public follow-up.",
    ];
  }

  const resultsSection = webResults.length
    ? [
        "Recent public-web leads to check:",
        ...webResults.map((item, index) =>
          `${index + 1}. ${item.title}${item.source ? ` — ${item.source}` : ""}${item.publishedAt ? ` (${item.publishedAt})` : ""}\n   ${item.url}${item.snippet ? `\n   ${item.snippet}` : ""}`
        ),
      ]
    : ["I could not retrieve matching public-news results just now, so I will not claim a particular project is delayed, funded or completed."];

  const manifestoRelevant = /manifesto|restore the promise|pillar|markets?|price|farm|agricultur|livelihood|water|health|clinic|hospital|development|governance|budget|accountab/i.test(lower);
  const manifestoSection = manifestoRelevant ? [
    "Draft manifesto reference (CONFIDENTIAL — NOT FOR CIRCULATION):",
    "The Restore the Promise 2027–2032 draft groups proposed commitments into five pillars: Nduani/development close to people; markets, price and opportunity; water that lasts; agriculture and livelihoods; healthcare that works. Open and accountable government is the foundation.",
    "Use these as proposed policy commitments, not completed achievements or guaranteed outcomes. The draft's ward-priority figures and statistics need source/date checks before public use.",
  ] : [];

  const official = [
    "Official places to verify local details:",
    "- Makueni Project Monitoring and Tracking System: https://pmts.makueni.go.ke/v2/",
    "- County budget and public-finance documents: https://makueni.go.ke/public-finance-management/",
    "- County documents and ward profiles: https://makueni.go.ke/county-documents/",
  ];

  return [
    `For ${area}, I would start with ${issue}. Here is a practical way to move it forward:`,
    "",
    ...practicalSteps.map((step, index) => `${index + 1}. ${step}`),
    "",
    webResults.length
      ? "I found these public-news leads that may be relevant. They are not confirmation of the situation in this specific ward; open each source and check the date and location."
      : "I do not have enough verified, ward-specific evidence to say which project is currently failing or what funding is available. The steps above are a practical checklist, not a claim that these problems are confirmed in this ward.",
    "",
    ...resultsSection,
    ...(manifestoSection.length ? ["", ...manifestoSection] : []),
    "",
    ...official,
    ...(liveSources.length ? ["", "Official pages checked:", ...liveSources.slice(0, 3).map((source) => `- ${source.title}: ${source.url} (checked ${source.checkedAt}; ${source.status})`)] : []),
  ].join("\n");
}

const wardExamples: Record<string, string> = {
  "Mbooni": "Mbooni",
  "Kilome": "Kilome",
  "Kaiti": "Kaiti",
  "Makueni": "Makueni",
  "Kibwezi West": "Kibwezi West",
  "Kibwezi East": "Kibwezi East",
};

export function buildFreeMakueniSpeech(input: {
  area?: string;
  occasion?: string;
  topic?: string;
  currentGaps?: string;
  language?: string;
  minutes?: number;
}): { title: string; speech: string; notes: string[] } {
  const area = (input.area ?? "Makueni County").trim() || "Makueni County";
  const occasion = (input.occasion ?? "public participation meeting").trim() || "public participation meeting";
  const topic = (input.topic ?? "service delivery and local development").trim() || "service delivery and local development";
  const language = (input.language ?? "English").trim() || "English";
  const minutes = Math.max(1, Math.min(15, Number(input.minutes) || 3));
  const areaLabel = wardExamples[area] ?? area;
  const lowerTopic = topic.toLowerCase();
  const currentGaps = (input.currentGaps ?? "").trim().slice(0, 1600);

  const policySection = /water|borehole|dam|irrigat|pipe|dry tap/.test(lowerTopic)
    ? [
        "First, water must last beyond the rainy season. If elected, my plan will put the repair and maintenance of existing water sources first, protect dams and sand dams from siltation, strengthen storage and extend distribution closer to homes. We will need a clear record of which sources work, which have broken down, who is responsible for maintenance and how quickly repairs are completed.",
        "Water for homes must also support farms and livelihoods. I will pursue practical links between maintained storage, farm ponds and small-scale irrigation, while publishing progress so residents can see what has been repaired, what remains outstanding and what resources have been approved."
      ]
    : /market|price|farmer|agricultur|livelihood|livestock|drought|crop/.test(lowerTopic)
    ? [
        "My plan is to help farmers earn a fairer return for their work. That means improving aggregation, grading and weighing, strengthening storage so farmers are not forced to sell immediately after harvest, and making reliable market-price information easier to access. We will work with producer groups and cooperatives and verify what support is available before announcing it.",
        "Agriculture must be supported before the season is lost. I will prioritise timely access to farm inputs, extension officers who can be contacted by local communities, livestock and veterinary services, and practical water-for-production measures that can withstand dry periods. Progress should be measured by the service farmers receive and the value they can retain—not by announcements alone."
      ]
    : /health|hospital|clinic|medicine|ambulance|diagnostic|maternity/.test(lowerTopic)
    ? [
        "My plan is for healthcare to work when a resident arrives. If elected, I will push for transparent reporting on staffing, essential medicines, functioning diagnostics, maternity capacity, water and power at facilities, and the time it takes to complete a referral.",
        "An ambulance journey is only useful when the receiving facility can provide the care needed. I will prioritise reliable ambulance operations, clear dispatch and referral procedures, and regular public reporting on the gaps that are fixed and those that still require action. Specific facility claims will be based on verified records."
      ]
    : /market|trade|price|electricity|energy|land|business|youth|employment/.test(lowerTopic)
    ? [
        "My plan is to make markets places where producers, traders and young people can build sustainable livelihoods. I will pursue better aggregation and storage, transparent market information, durable market infrastructure, reliable energy where it is needed and clearer land-use planning.",
        "Young people need practical routes into work and enterprise. The plan will connect skills development with real local demand, including opportunities in construction, technology, services and value addition, while following applicable procurement rules and quality standards."
      ]
    : [
        "My plan for Makueni is built around five connected priorities: development where people are; markets, price and opportunity; water that lasts; agriculture and livelihoods; and healthcare that works when residents arrive. Open and accountable government must connect every one of these priorities.",
        "If elected, I will work to move development decisions closer to communities through village-cluster priorities, stronger ward-level follow-up and clear responsibility for each project. Residents should be able to ask what was promised, what was budgeted, what has been delivered, what remains unfinished and when they will receive the next update.",
        "I will also pursue practical improvements in markets and farm incomes, reliable water infrastructure, stronger agricultural extension and functioning health services. These are plans to work towards through lawful county processes, budgets and partnerships—not claims that the work has already been completed."
      ];

  const speech = [
    "RESTORE THE PROMISE",
    "PROF. PHILIP KALOKI",
    "Makueni County Governor Candidate — 2027",
    "",
    `Occasion: ${occasion}`,
    `Area: ${areaLabel}, Makueni County`,
    `Address: ${topic}`,
    `Prepared language: ${language}`,
    "",
    "Protocol observed. Elders, community leaders, residents, women, young people, persons with disabilities and all our guests, good morning.",
    "",
    `I am grateful to join you here in ${areaLabel}. I have come to listen, to explain the direction I believe Makueni should take, and to hear what must change in our communities. I am presenting a plan for what I intend to work on if you elect me—not a claim that these improvements have already happened.`,
    "",
    "My guiding promise is simple: development must reach people where they live, and public service must be judged by results that residents can see and verify. A project should not be measured only by the announcement, the launch or the money allocated. We must ask whether it works, whom it serves, how it is maintained and whether the public can track its progress.",
    "",
    ...policySection,
    "",
    "The foundation for this plan is open and accountable government. I will advocate for meaningful public participation, published priorities, transparent budget and project information, clear service standards and regular progress updates. Communities must be able to follow a project from the priority they raised, through budgeting and implementation, to the evidence that it is complete and working.",
    "",
    `For ${areaLabel}, I want this conversation to produce practical next steps. Let us identify the three most urgent service issues, the exact places affected, the office responsible, the evidence we need and a date for reporting back. Where the facts are not yet confirmed, we will verify them openly rather than mislead residents with figures or promises we cannot support.`,
    "",
    "I will not pretend that every problem can be solved overnight or that a county can act alone on every issue. The work must be prioritised, costed through the proper budget process, implemented lawfully and monitored with the people it is meant to serve. Where national-government or partner action is required, we must be clear about the responsibility and pursue the necessary cooperation.",
    "",
    ...(currentGaps ? [
      "On the current administration's record, the following concerns have been supplied for public scrutiny:",
      currentGaps,
      "These concerns should be stated with their source, date and exact location. Before delivery, confirm the original records and give the responsible office a fair opportunity to clarify the status. Do not present an allegation as an established fact without supporting evidence."
    ] : [
      "Residents deserve a clear account of the current state of services. I will call for published baselines, approved budgets, project milestones, maintenance records and regular ward-level progress reports so the public can judge what has been delivered, what is delayed and what still needs action. Specific failures should be named only when the supporting records have been checked."
    ]),
    "",
    "My commitment is to keep listening, to explain the choices, to report progress honestly and to make accountability part of delivery—not something we remember only when there is a problem. I ask you to hold this plan to a high standard: ask questions, examine the records and judge progress by the difference services make in people's lives.",
    "",
    "Together, let us restore the promise: development that reaches every part of Makueni, opportunity for our farmers and young people, water that lasts, healthcare that works and a government that answers to its people.",
    "",
    "Thank you. May God bless you, and may God bless Makueni County."
  ].join("\n");

  return {
    title: `Prof. Philip Kaloki — ${topic} — ${areaLabel}`,
    speech,
    notes: [
      `Prepared as a campaign-plan speech for approximately ${minutes} minute(s); review aloud and shorten or expand to fit the occasion.`,
      "This speech presents proposed actions if elected; it does not claim that the commitments are already funded or delivered.",
      "Verify local project names, statistics, costs, legal responsibilities and current status before delivery.",
      currentGaps ? "Current administration concerns were supplied by the user; confirm source, date, location and response before stating them as fact." : "No specific current-administration failure was supplied; the speech calls for transparent performance reporting rather than inventing allegations.",
      "The manifesto themes are attributed to Prof. Philip Kaloki's Makueni County 2027 platform."
    ],
  };
}

type PublicSourceSnapshot = {
  title: string;
  url: string;
  checkedAt: string;
  excerpt: string;
  status: string;
};

export type FreeWebResult = { title: string; url: string; source: string; publishedAt: string | null; snippet: string; query: string };

const searchCache = new Map<string, { expiresAt: number; results: FreeWebResult[] }>();

/**
 * Free public-web discovery using Google News RSS. This is search-result discovery,
 * not an official API and not guaranteed comprehensive. Only requests the fixed
 * news.google.com host; never accepts arbitrary URLs.
 */
export async function searchFreeMakueniWeb(query: string): Promise<FreeWebResult[]> {
  const cleaned = query.trim().slice(0, 180);
  if (!cleaned) return [];
  const cacheKey = cleaned.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.results;
  const rssUrl = "https://news.google.com/rss/search?q=" + encodeURIComponent(cleaned + " Makueni Kenya") + "&hl=en-KE&gl=KE&ceid=KE:en";
  try {
    const response = await fetch(rssUrl, { headers: { "User-Agent": "Mozilla/5.0 (compatible; MakueniPublicInfo/1.0)" }, signal: AbortSignal.timeout(6000) });
    if (!response.ok) return [];
    const xml = (await response.text()).slice(0, 500_000);
    const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
    const decode = (value: string) => value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
    const results: FreeWebResult[] = blocks.slice(0, 8).map((block) => {
      const get = (tag: string) => decode(block.match(new RegExp("<" + tag + ">([\\s\\S]*?)</" + tag + ">", "i"))?.[1] ?? "");
      const title = get("title");
      const link = get("link");
      const pubDate = get("pubDate");
      const source = decode(block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] ?? "Google News");
      const description = get("description").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 400);
      return { title, url: link, source, publishedAt: pubDate || null, snippet: description, query: cleaned };
    }).filter((item) => item.title && /^https?:\/\//i.test(item.url));
    searchCache.set(cacheKey, { expiresAt: Date.now() + 10 * 60_000, results });
    return results;
  } catch {
    return [];
  }
}

let sourceCache: { expiresAt: number; items: PublicSourceSnapshot[] } | null = null;
const PUBLIC_MAKUENI_SOURCES = [
  { title: "Makueni Project Monitoring and Tracking System", url: "https://pmts.makueni.go.ke/v2/" },
  { title: "Makueni County Public Finance Management documents", url: "https://makueni.go.ke/public-finance-management/" },
  { title: "Makueni County downloads and ward profiles", url: "https://makueni.go.ke/county-documents/" },
];

/**
 * Token-free source retrieval from fixed, official public URLs. This fetches
 * public page snippets and links only; it does not claim a project is complete
 * merely because a portal is reachable. Cache successful and failed checks for
 * 15 minutes to avoid hammering county sites.
 */
export async function fetchMakueniOfficialSources(): Promise<PublicSourceSnapshot[]> {
  if (sourceCache && sourceCache.expiresAt > Date.now()) return sourceCache.items;
  const checkedAt = new Date().toISOString();
  const items = await Promise.all(PUBLIC_MAKUENI_SOURCES.map(async (source) => {
    try {
      const response = await fetch(source.url, {
        headers: { "User-Agent": "ProKalokiCommandCentre/1.0 (public-source reader)" },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        return { ...source, checkedAt, status: `HTTP ${response.status}`, excerpt: "Source page could not be read; open the official URL to verify." };
      }
      const html = (await response.text()).slice(0, 1_000_000);
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch?.[1]?.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#8211;|&ndash;/g, "–").replace(/\s+/g, " ").trim() || source.title;
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&#8217;|&rsquo;/g, "'")
        .replace(/&#8211;|&ndash;/g, "–")
        .replace(/\s+/g, " ")
        .trim();
      return { ...source, title, checkedAt, status: "reachable", excerpt: text.slice(0, 1100) || "Page reachable, but no readable text was extracted." };
    } catch {
      return { ...source, checkedAt, status: "unreachable", excerpt: "Live fetch failed or timed out. Open the official URL to check manually." };
    }
  }));
  sourceCache = { expiresAt: Date.now() + 15 * 60 * 1000, items };
  return items;
}
