import {
  AI_CONFIG,
  CAMPAIGN_CONFIG,
  CAMPAIGN_COUNTY,
  CAMPAIGN_NAME,
  CAMPAIGN_PARTY,
  CAMPAIGN_POSITION,
  CANDIDATE_NAME,
  CANDIDATE_SHORT_NAME,
  CONSTITUENCIES,
  WARDS,
} from "./campaign-config";

export {
  AI_CONFIG,
  CAMPAIGN_CONFIG,
  CAMPAIGN_COUNTY,
  CAMPAIGN_NAME,
  CAMPAIGN_PARTY,
  CAMPAIGN_POSITION,
  CANDIDATE_NAME,
  CANDIDATE_SHORT_NAME,
  CONSTITUENCIES,
  WARDS,
};

export const CAMPAIGN_IDENTITY = {
  candidateName: CANDIDATE_NAME,
  candidateShortName: CANDIDATE_SHORT_NAME,
  campaignName: CAMPAIGN_NAME,
  party: CAMPAIGN_PARTY,
  office: CAMPAIGN_POSITION,
  jurisdiction: CAMPAIGN_COUNTY,
  electionType: CAMPAIGN_CONFIG.candidate.electionType,
} as const;

export const COUNTY_SUMMARY = {
  constituencyCount: CONSTITUENCIES.length,
  wardCount: WARDS.length,
  constituencies: CONSTITUENCIES.map((constituency) => constituency.name),
} as const;

export const GOVERNOR_CAMPAIGN_CONTEXT = `
Candidate: ${CANDIDATE_NAME}
Campaign: ${CAMPAIGN_NAME}
Party: ${CAMPAIGN_PARTY}
Office sought: ${CAMPAIGN_POSITION}
Jurisdiction: ${CAMPAIGN_COUNTY}
Election type: ${CAMPAIGN_CONFIG.candidate.electionType}
Campaign scope: ${COUNTY_SUMMARY.constituencyCount} constituencies and ${COUNTY_SUMMARY.wardCount} wards.

The campaign is countywide. Strategy, speeches, reports, intelligence,
field operations and communications must reflect the responsibilities
of a County Governor and the priorities of residents across Makueni County.

Do not describe the candidate as an MP, MNA or Member of Parliament.
Do not attribute unverified achievements, statistics, endorsements,
projects or public statements to the candidate.
Public-facing AI content must require human review and approval.
`.trim();

export function buildCandidateDescription(): string {
  return `${CANDIDATE_NAME}, ${CAMPAIGN_PARTY} candidate for ${CAMPAIGN_POSITION} of ${CAMPAIGN_COUNTY}`;
}

export function buildCampaignDescription(): string {
  return `${CAMPAIGN_NAME}, the countywide gubernatorial campaign of ${CANDIDATE_NAME}`;
}

export function buildGovernorSystemPrompt(purpose: string): string {
  return `
You are ${AI_CONFIG.identity.assistantName}.

${GOVERNOR_CAMPAIGN_CONTEXT}

Your current function is: ${purpose}.

Use professional, factual and dignified language.
Distinguish verified facts from strategic recommendations.
Do not fabricate public sentiment, polling figures, achievements,
endorsements or development records.
`.trim();
}
