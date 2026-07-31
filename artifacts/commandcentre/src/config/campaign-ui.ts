import {
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

export const CAMPAIGN_UI = {
  candidateName: CANDIDATE_NAME,
  candidateShortName: CANDIDATE_SHORT_NAME,
  campaignName: CAMPAIGN_NAME,
  party: CAMPAIGN_PARTY,
  office: CAMPAIGN_POSITION,
  county: CAMPAIGN_COUNTY,

  commandCentreTitle: `${CAMPAIGN_COUNTY} Campaign Command Centre`,
  campaignTitle: `${CAMPAIGN_NAME} — ${CAMPAIGN_POSITION} Campaign`,
  candidateOfficeLabel: `${CANDIDATE_NAME} · ${CAMPAIGN_PARTY} · Candidate for ${CAMPAIGN_POSITION}`,
  countyScopeLabel: `${CAMPAIGN_COUNTY} · ${CONSTITUENCIES.length} Constituencies · ${WARDS.length} Wards`,
  reportIdentity: `${CANDIDATE_NAME} · ${CAMPAIGN_POSITION} Candidate · ${CAMPAIGN_COUNTY}`,
} as const;

export const CAMPAIGN_MESSAGES = {
  youth:
    "The youth are the engine of Makueni; county leadership must connect skills, enterprise and opportunity.",

  accountability:
    "Accountable county leadership must protect public resources and deliver effective services across Makueni County.",

  countyLeadership:
    "A serious Governor must be present, responsive and accountable across all six constituencies and 30 wards.",

  posterGuidance:
    "Use short bilingual messages focused on water, healthcare, roads, agriculture, jobs, enterprise and accountable county services.",
} as const;
