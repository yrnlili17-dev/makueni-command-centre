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
  const area = ward ? ward.replace(/\b\\w/g, (letter) => letter.toUpperCase()) : "Makueni County";

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
  language?: string;
  minutes?: number;
}): { title: string; speech: string; notes: string[] } {
  const area = (input.area ?? "Makueni County").trim() || "Makueni County";
  const occasion = (input.occasion ?? "public participation meeting").trim() || "public participation meeting";
  const topic = (input.topic ?? "service delivery and local development").trim() || "service delivery and local development";
  const language = (input.language ?? "English").trim() || "English";
  const minutes = Math.max(1, Math.min(15, Number(input.minutes) || 3));
  const areaLabel = wardExamples[area] ?? area;
  const speech = [
    "REMARKS ON LOCAL SERVICE DELIVERY",
    "",
    `Occasion: ${occasion}`,
    `Area: ${areaLabel}, Makueni County`,
    `Topic: ${topic}`,
    `Draft language: ${language}`,
    "",
    "Protocol observed. County officers, local leaders, community representatives, and residents, good morning.",
    "",
    `Thank you for coming together in ${areaLabel}. This meeting is an opportunity to listen carefully, share verified information and agree on practical next steps concerning ${topic}.`,
    "",
    "Our discussion should begin with the facts on the ground. We should identify the service or project, the location it serves, the responsible office, the latest documented progress and the issues residents still experience. Where information is not yet confirmed, we should say so openly and commit to checking it rather than make promises based on assumptions.",
    "",
    "I encourage residents to raise concerns respectfully and to describe the specific location and impact. County teams should record each issue, identify the office responsible, set a realistic follow-up date and report back to the community. Progress should be measured by evidence of service improvement, not by announcements alone.",
    "",
    "We should also make sure that young people, older residents, persons with disabilities, women and people in remote areas have an accessible opportunity to participate. Personal information shared during follow-up must be handled carefully and should not be disclosed unnecessarily.",
    "",
    "Before we conclude, let us agree on the three most urgent issues, who will follow up each one, what evidence is needed and when the community will receive an update. The resulting action list should be shared through the appropriate public channels.",
    "",
    "Thank you for your time and contribution. Let us continue working together with openness, respect and accountability for the people of Makueni.",
  ].join("\n");
  return {
    title: `${topic} — ${areaLabel}`,
    speech,
    notes: [
      `This template is designed for approximately ${minutes} minute(s); shorten or expand to fit the event.`,
      "Add only verified local project names, budget figures and progress updates before delivery.",
      "Confirm names, titles, dates and official announcements from primary sources.",
      "Generated in deterministic no-token mode; no paid AI model was called.",
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
