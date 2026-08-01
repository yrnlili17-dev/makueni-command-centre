import { createHash } from "node:crypto";

export type LocalAnalysis = {
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number;
  threatLevel: "normal" | "elevated" | "high" | "critical";
  confidence: number;
  topic: string;
  recommendedAction: "ignore" | "monitor" | "respond" | "escalate";
  rationale: string;
  riskFlags: string[];
  keyPhrases: string[];
  responseOptions: Array<{
    tone: "factual" | "community" | "firm";
    content: string;
  }>;
};

const NEGATIVE_WORDS = [
  "corrupt",
  "corruption",
  "failed",
  "failure",
  "lie",
  "lies",
  "misused",
  "stolen",
  "nepotism",
  "scandal",
  "fraud",
  "ignored",
  "nothing",
  "incompetent",
  "kickback",
  "absent",
  "absentee",
  "betrayed",
  "broken promise",
];

const POSITIVE_WORDS = [
  "development",
  "progress",
  "support",
  "leadership",
  "thank",
  "hongera",
  "successful",
  "improved",
  "delivered",
  "community",
  "solution",
  "opportunity",
];

const CRITICAL_FLAGS = [
  "corrupt",
  "corruption",
  "kickback",
  "stolen",
  "fraud",
  "tribal",
  "violence",
  "threat",
  "death",
  "investigate",
  "scandal",
];

const TOPICS: Array<[string, string[]]> = [
  ["water access", ["water", "borehole", "dam", "drought", "river"]],
  ["road infrastructure", ["road", "roads", "tarmac", "bridge", "transport"]],
  ["healthcare", ["health", "hospital", "dispensary", "doctor", "medicine"]],
  ["youth employment", ["youth", "jobs", "employment", "internship", "business"]],
  ["education access", ["school", "education", "bursary", "students", "college"]],
  ["agriculture", ["farmer", "farming", "agriculture", "livestock", "irrigation"]],
  ["accountability and public resources", ["corrupt", "fund", "tender", "procurement", "accountability"]],
  ["security", ["security", "crime", "violence", "police", "attack"]],
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s#@'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function countMatches(text: string, values: string[]) {
  return values.reduce(
    (count, value) => count + (text.includes(value) ? 1 : 0),
    0,
  );
}

function topicFor(text: string) {
  let best = { topic: "Makueni development priorities", score: 0 };

  for (const [topic, keywords] of TOPICS) {
    const score = countMatches(text, keywords);
    if (score > best.score) best = { topic, score };
  }

  return best.topic;
}

function extractKeyPhrases(text: string) {
  const words = normalize(text)
    .split(" ")
    .filter((word) => word.length > 4 && !word.startsWith("@"))
    .filter(
      (word) =>
        ![
          "about",
          "after",
          "again",
          "being",
          "campaign",
          "county",
          "every",
          "makueni",
          "people",
          "their",
          "there",
          "these",
          "those",
          "which",
          "while",
          "would",
        ].includes(word),
    );

  const frequencies = new Map<string, number>();
  for (const word of words) {
    frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
  }

  return [...frequencies.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word);
}

function riskFlagsFor(text: string) {
  const flags: string[] = [];

  if (countMatches(text, ["corrupt", "kickback", "fraud", "stolen"]) > 0) {
    flags.push("LEGAL_REVIEW");
  }
  if (countMatches(text, ["violence", "death", "threat", "attack"]) > 0) {
    flags.push("SECURITY_ESCALATION");
  }
  if (countMatches(text, ["tribal", "ethnic", "hate"]) > 0) {
    flags.push("HATE_SPEECH_RISK");
  }
  if (countMatches(text, ["rumour", "rumor", "unverified", "sources say"]) > 0) {
    flags.push("UNVERIFIED_CLAIM");
  }
  if (text.includes("children") || text.includes("minor")) {
    flags.push("MINOR_SAFETY");
  }

  return flags;
}

function trimToPlatform(text: string, platform: string) {
  const limits: Record<string, number> = {
    "Twitter/X": 280,
    "TikTok Caption": 150,
    SMS: 160,
    WhatsApp: 450,
    Facebook: 500,
    "Press Statement": 900,
    "Baraza Speech": 700,
  };

  const limit = limits[platform] ?? 500;
  return text.length <= limit
    ? text
    : `${text.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

function responseOptions(topic: string, platform: string, threat: string) {
  const factual =
    `Facts and accountability matter. Prof. Philip Kaloki's campaign remains focused on ${topic}, responsible leadership and practical solutions for communities across Makueni County.`;

  const community =
    `We understand the concern being raised. The campaign will continue listening to residents, verifying information and presenting clear, workable plans on ${topic} for every ward in Makueni.`;

  const firmPrefix =
    threat === "critical" || threat === "high"
      ? "Unverified claims should not replace evidence. "
      : "";

  const firm =
    `${firmPrefix}Our response will remain respectful, factual and focused on ${topic}, integrity and a better future for Makueni County.`;

  return [
    { tone: "factual" as const, content: trimToPlatform(factual, platform) },
    { tone: "community" as const, content: trimToPlatform(community, platform) },
    { tone: "firm" as const, content: trimToPlatform(firm, platform) },
  ];
}

export function analyseLocally(input: {
  content: string;
  platform?: string;
  engagementCount?: number;
  duplicateCount?: number;
}): LocalAnalysis {
  const platform = input.platform ?? "Unknown";
  const engagement = Number(input.engagementCount ?? 0);
  const duplicates = Number(input.duplicateCount ?? 0);
  const text = normalize(input.content);

  const negative = countMatches(text, NEGATIVE_WORDS);
  const positive = countMatches(text, POSITIVE_WORDS);
  const critical = countMatches(text, CRITICAL_FLAGS);

  const rawSentiment = clamp((positive - negative) * 22, -100, 100);
  const sentiment =
    rawSentiment <= -15
      ? "negative"
      : rawSentiment >= 15
        ? "positive"
        : "neutral";

  const threatScore =
    negative * 12 +
    critical * 18 +
    Math.min(20, Math.floor(engagement / 500)) +
    Math.min(15, duplicates * 3);

  const threatLevel =
    threatScore >= 70
      ? "critical"
      : threatScore >= 45
        ? "high"
        : threatScore >= 20
          ? "elevated"
          : "normal";

  const flags = riskFlagsFor(text);
  const topic = topicFor(text);

  const recommendedAction =
    flags.includes("SECURITY_ESCALATION") ||
    flags.includes("HATE_SPEECH_RISK") ||
    threatLevel === "critical"
      ? "escalate"
      : threatLevel === "high" ||
          (sentiment === "negative" && engagement >= 300)
        ? "respond"
        : threatLevel === "elevated" || duplicates > 1
          ? "monitor"
          : sentiment === "positive"
            ? "ignore"
            : "monitor";

  const confidence = clamp(
    58 +
      Math.min(18, negative * 4 + positive * 3) +
      Math.min(12, duplicates * 2) +
      (flags.length > 0 ? 6 : 0),
    45,
    97,
  );

  const rationale =
    recommendedAction === "escalate"
      ? "The content contains high-risk legal, security or reputational indicators and should be reviewed by campaign leadership before any public response."
      : recommendedAction === "respond"
        ? "The mention has meaningful negative reach or risk. A factual, approved response is recommended."
        : recommendedAction === "ignore"
          ? "The mention is positive or low-risk and does not require a defensive response."
          : "Continue monitoring until reach, repetition or evidence justifies a direct response.";

  return {
    sentiment,
    sentimentScore: rawSentiment,
    threatLevel,
    confidence,
    topic,
    recommendedAction,
    rationale,
    riskFlags: flags,
    keyPhrases: extractKeyPhrases(input.content),
    responseOptions: responseOptions(topic, platform, threatLevel),
  };
}

export function buildLocalBrief(analyses: LocalAnalysis[]) {
  const counts = {
    positive: analyses.filter((item) => item.sentiment === "positive").length,
    neutral: analyses.filter((item) => item.sentiment === "neutral").length,
    negative: analyses.filter((item) => item.sentiment === "negative").length,
    critical: analyses.filter((item) => item.threatLevel === "critical").length,
    high: analyses.filter((item) => item.threatLevel === "high").length,
  };

  const topicCounts = new Map<string, number>();
  for (const item of analyses) {
    topicCounts.set(item.topic, (topicCounts.get(item.topic) ?? 0) + 1);
  }

  const topTopics = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }));

  const digest = createHash("sha256")
    .update(JSON.stringify({ counts, topTopics }))
    .digest("hex")
    .slice(0, 12);

  return {
    generatedBy: "local-intelligence-engine",
    requiresApiKeys: false,
    digest,
    counts,
    topTopics,
    summary:
      `Narrative brief: ${counts.negative} negative, ${counts.neutral} neutral and ${counts.positive} positive mentions analysed. ${counts.critical + counts.high} incidents require priority review.`,
  };
}
