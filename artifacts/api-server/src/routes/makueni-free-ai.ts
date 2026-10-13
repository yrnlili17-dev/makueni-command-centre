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
}): string {
  const message = input.message.trim();
  const lower = message.toLowerCase();
  const moduleName = input.module ?? "dashboard";
  const context = input.context ?? {};
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
