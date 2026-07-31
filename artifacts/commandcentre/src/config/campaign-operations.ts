import { CONSTITUENCIES, WARDS } from "./campaign-config";

export const CAMPAIGN_OPERATIONS = {
  scope: "Countywide",

  headquarters: "County Campaign Secretariat",

  commandCentre: "County Operations Centre",

  operationsName: "County Campaign Operations",

  election: "2027 General Election",

  constituencies: CONSTITUENCIES.length,

  wards: WARDS.length,

  reportingStructure: [
    "County",
    "Constituency",
    "Ward",
    "Polling Station",
  ],

  fieldModel: "Ward Based",

  electionMode: "Governor Campaign",

  reportsTo: "Campaign Executive",
} as const;