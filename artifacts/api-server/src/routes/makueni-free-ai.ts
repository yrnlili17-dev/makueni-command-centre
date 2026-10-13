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
  const moduleName = input.module ?? "dashboard";
  const context = input.context ?? {};
  const liveSources = input.liveSources ?? [];
  const contextEntries = Object.entries(context).filter(([, value]) => value !== undefined && value !== null && value !== "");
  const contextSummary = contextEntries.length
    ? contextEntries.map(([key, value]) => `- ${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`).join("\n")
    : "No live module data was supplied to this request.";

  const sourceNote = "For current status, verify the latest dated record against the Makueni County Government portal (https://makueni.go.ke/), the County Integrated Development Plan, the approved budget and implementation reports. This fallback does not have a live verified feed, so it will not invent project status, figures or announcements.";
  let guidance = "I can help structure this Makueni County question. Separate confirmed facts from assumptions, identify the responsible department and ward, and record the source and date for each claim.";

  if (/water|borehole|dam|irrigat/.test(lower)) {
    guidance = "Water and irrigation review: identify the affected ward and water point; record supply interruptions, functionality, beneficiaries only as aggregate counts, responsible agency, repair or project milestones, and the last verified inspection date.";
  } else if (/road|bridge|transport|access/.test(lower)) {
    guidance = "Roads and access review: record the road section and ward, surface/condition, reported access problem, responsible agency, approved project reference, contractor where officially documented, milestone, and last inspection date.";
  } else if (/health|hospital|clinic|medicine|drug/.test(lower)) {
    guidance = "Health-service review: focus on facility-level service availability, staffing and commodity availability using dated official reports. Do not publish identifiable patient information.";
  } else if (/school|education|bursary|classroom/.test(lower)) {
    guidance = "Education review: use school-level project records, classroom condition, access, bursary policy and aggregate service indicators. Verify amounts and eligibility against current official notices.";
  } else if (/agricultur|mango|livestock|farmer|market/.test(lower)) {
    guidance = "Agriculture and livelihoods review: capture crop/livestock issue, market access, extension-service availability, season and ward, and cite current agriculture department or official market information.";
  } else if (/speech|address|baraza|forum|meeting/.test(lower)) {
    guidance = "For a public address, use a clear greeting, acknowledge the specific locality, state only verified facts, explain the public-service issue, set out practical next steps, invite public feedback and close respectfully. The speech template endpoint can generate a first draft without paid tokens.";
  } else if (/budget|spend|finance|allocation|fund/.test(lower)) {
    guidance = "Budget review: distinguish approved allocation, funds released, expenditure, commitments and verified outputs. Cite the financial year, budget document, vote/department and page or table; do not treat allocation as proof of completed work.";
  } else if (/current|latest|status|today|now|progress/.test(lower)) {
    guidance = sourceNote;
  } else if (/swot|strength|weakness|opportunit|threat/.test(lower)) {
    guidance = "SWOT framework for Makueni County service delivery: strengths and weaknesses should be internal and evidence-based; opportunities and threats should be external and dated. Attach a source and confidence level to every item and avoid unsupported political claims.";
  }

  return [
    `Makueni County — ${moduleName} assistant (free fallback)`,
    "",
    guidance,
    "",
    "Question received:",
    message,
    "",
    "Available module context:",
    contextSummary,
    "",
    "Suggested next steps:",
    "1. Confirm the exact constituency/ward or service location.",
    "2. Retrieve the latest official source and record its publication/update date.",
    "3. Mark each statement as verified, estimated or unverified.",
    "4. Save the source URL and assign an owner for follow-up.",
    "",
    sourceNote,
    "",
    "Public source checks (page metadata/snippets only; confirm details in the source document):",
    ...(liveSources.length ? liveSources.map((source) => `- ${source.title} [${source.status}; checked ${source.checkedAt}]\\n  ${source.url}\\n  ${source.excerpt}`) : ["- No live public source was reachable during this request."]),
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
