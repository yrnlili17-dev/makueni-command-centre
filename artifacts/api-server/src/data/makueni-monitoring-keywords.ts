/** Public mention matching only. Matches do not establish authorship or political support. */
export const MAKUENI_MONITORING_KEYWORDS = {
  requested: ["Pro.Philip kaloki", "Makueni Governer 2027", "Kaloki", "UDA", "Ukambani"],
  nameVariants: ["Prof. Philip Kaloki", "Prof Philip Kaloki", "Philip Kaloki", "Philip Kyalo Kaloki", "Pro.Philip kaloki"],
  electionVariants: ["Makueni Governor 2027", "Makueni Governer 2027", "Makueni 2027 Governor"],
  broadTerms: ["Kaloki", "UDA", "Ukambani"],
  scope: "Makueni County",
  rule: "Full candidate-name or Makueni election-phrase matches are accepted. Broad terms require Makueni in the same item. Matches are mentions, not verified candidate-authored posts.",
  coverage: "Configured for the existing manual public-web scan. Continuous Bluesky and Mastodon collection is not activated by this keyword configuration.",
} as const;

function normalize(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}
function hasPhrase(text: string, phrase: string): boolean {
  return ` ${text} `.includes(` ${normalize(phrase)} `);
}

export function matchMakueniMonitoringKeywords(text: string) {
  const normalized = normalize(text);
  const names = MAKUENI_MONITORING_KEYWORDS.nameVariants.filter(term => hasPhrase(normalized, term));
  const elections = MAKUENI_MONITORING_KEYWORDS.electionVariants.filter(term => hasPhrase(normalized, term));
  const broad = MAKUENI_MONITORING_KEYWORDS.broadTerms.filter(term => hasPhrase(normalized, term));
  const local = hasPhrase(normalized, "Makueni");
  return {
    matched: names.length > 0 || elections.length > 0 || (local && broad.length > 0),
    matchedTerms: [...names, ...elections, ...(local ? broad : [])],
    requiresAuthorshipVerification: true,
  };
}

export function makueniMonitoringQueries(): string[] {
  return [...new Set([
    ...MAKUENI_MONITORING_KEYWORDS.nameVariants.map(name => `"${name}" Makueni`),
    ...MAKUENI_MONITORING_KEYWORDS.electionVariants.map(term => `"${term}"`),
    ...MAKUENI_MONITORING_KEYWORDS.broadTerms.map(term => `"${term}" Makueni`),
  ])];
}
