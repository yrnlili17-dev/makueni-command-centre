import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let changedFiles = 0;
let replacementsMade = 0;
let missingPatterns = 0;

function updateFile(relativePath, replacements) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`MISSING FILE ${relativePath}`);
    process.exitCode = 1;
    return;
  }

  const original = fs.readFileSync(absolutePath, "utf8");
  let updated = original;
  let fileChanges = 0;

  for (const [oldValue, newValue] of replacements) {
    if (!updated.includes(oldValue)) {
      console.warn(`NOT FOUND ${relativePath}: ${oldValue.slice(0, 100)}`);
      missingPatterns += 1;
      continue;
    }

    const occurrences = updated.split(oldValue).length - 1;
    updated = updated.split(oldValue).join(newValue);
    fileChanges += occurrences;
    replacementsMade += occurrences;
  }

  if (updated !== original) {
    fs.writeFileSync(absolutePath, updated, "utf8");
    changedFiles += 1;
    console.log(`UPDATED ${relativePath} (${fileChanges} replacement(s))`);
  } else {
    console.log(`UNCHANGED ${relativePath}`);
  }
}

updateFile("artifacts/api-server/src/routes/ai.ts", [
  [
    "- Home Ward: Makueni West | Contact: 0725 988 683",
    "- Campaign Scope: All 6 constituencies and 30 wards of Makueni County"
  ],
  [
    "- 5 Wards: Tala (40 stations), Makueni West (55 stations), Makueni North (26 stations), Makueni East (24 stations), Kyeleni (20 stations)",
    "- County Structure: Mbooni, Kilome, Kaiti, Makueni, Kibwezi West and Kibwezi East constituencies; 30 wards in total"
  ],
  [
    '"The youth are the engine; the MP is the connector."',
    '"The youth are the engine of Makueni; county leadership must connect skills, enterprise and opportunity."'
  ],
  [
    '"A serious MP who fights for Makueni\'s share in Nairobi — not a holiday MP."',
    '"An accountable Governor who protects public resources and delivers effective county services."'
  ],
  [
    "Home-ward advantage (Makueni West).",
    "Countywide leadership rooted in every constituency and ward."
  ],
  [
    "LOCALIZATION: Tala → markets, youth, bodaboda, security. Makueni West/North/East → water, coffee prices, roads, bursaries. Kyeleni → water, feeder roads, security, quarry safety.",
    "LOCALIZATION: Mbooni, Kilome, Kaiti, Makueni, Kibwezi West and Kibwezi East → tailor messages to verified local priorities including water, roads, agriculture, healthcare, jobs, trade and accountable county services."
  ],
  [
    '"Write a WhatsApp message announcing a baraza in Tala"',
    '"Write a WhatsApp message announcing a county campaign baraza in a selected Makueni ward"'
  ],
  [
    '"Plan a rally in Tala for 500 attendees"',
    '"Plan a gubernatorial campaign rally in Wote for 500 attendees"'
  ],
  [
    "specific to Makueni Constituency and Hon. Prof. Philip Kaloki's campaign",
    "specific to Makueni County and Prof. Philip Kaloki's gubernatorial campaign"
  ],
  [
    "realistic for Makueni Constituency.",
    "realistic for the six constituencies and 30 wards of Makueni County."
  ]
]);

updateFile("artifacts/api-server/src/routes/intelligence.ts", [
  [
    "Prof. Philip Kaloki, MNA for Makueni constituency, Kenya",
    "Prof. Philip Kaloki, gubernatorial candidate for Makueni County, Kenya"
  ],
  [
    "Prof. Philip Kaloki, MNA for Makueni, remains committed to serving the people of Makueni constituency with integrity and dedication.",
    "Prof. Philip Kaloki remains committed to presenting a responsible, development-focused vision for the people of Makueni County."
  ],
  [
    'const CANDIDATE_CTX = `Prof. Philip Kaloki (Prof. Kaloki), MNA for Makueni County, covering all six constituencies and 30 wards. Biomedical Engineer. Wiper Patriotic Front, "Komboa Kenya" campaign. 78,000 registered voters, election August 9 2027. His team: Campaign Manager John Kyalo, Comms Fiddellis Wambua.`;',
    'const CANDIDATE_CTX = `Prof. Philip Kaloki (Prof. Kaloki), UDA gubernatorial candidate for Makueni County, covering all six constituencies and 30 wards. Campaign: Kaloki 2027. Do not assume voter totals, endorsements, staff identities or achievements unless verified in approved campaign data.`;'
  ],
  [
    "Makueni MNA Philip Kaloki today launched bursary applications for 500 students from the constituency. CDF allocation of KSh 45M earmarked for education.",
    "The Kaloki 2027 campaign discussed education access and youth opportunity during a Makueni County engagement. Any figures or commitments must be verified before publication."
  ]
]);

updateFile("artifacts/api-server/src/routes/social.ts", [
  [
    'recent public mentions, news articles, and social media posts about "Prof. Philip Kaloki", the Member of Parliament for Makueni Constituency in Makueni County, Kenya',
    'recent public mentions, news articles, and social media posts about "Prof. Philip Kaloki", the Kaloki 2027 gubernatorial candidate for Makueni County, Kenya'
  ],
  [
    "recent trending local issues, public concerns, development news, and hot topics among residents of Makueni Constituency and Makueni County, Kenya",
    "recent trending local issues, public concerns, development news, and hot topics among residents of all six constituencies and 30 wards of Makueni County, Kenya"
  ],
  [
    "recent political activity, statements, or campaigns by rival politicians and opponents in Makueni Constituency and Makueni County, Kenya",
    "recent political activity, statements, or campaigns by gubernatorial competitors and other political actors in Makueni County, Kenya"
  ]
]);

updateFile("artifacts/api-server/src/routes/credentials.ts", [
  [
    "ROLE: Member of the National Assembly, Makueni Constituency, Makueni County, Kenya",
    "ROLE: Gubernatorial candidate for Makueni County, Kenya"
  ],
  [
    "You are a database builder for a Kenyan MNA credentials system.",
    "You are a database builder for a Kenyan gubernatorial candidate credentials system."
  ],
  [
    "You are a database builder for a Kenyan MNA achievements system.",
    "You are a database builder for a Kenyan gubernatorial candidate record and achievements system."
  ],
  [
    "You are a legislative research assistant for Prof. Philip Kaloki, Member of the National Assembly for Makueni Constituency, Kenya.",
    "You are a county policy and governance research assistant for Prof. Philip Kaloki, gubernatorial candidate for Makueni County, Kenya."
  ],
  [
    "that the MNA can use",
    "that the gubernatorial candidate can use"
  ],
  [
    "Makueni Constituency and Kenya's legislative framework",
    "Makueni County and Kenya's constitutional and devolved-governance framework"
  ],
  [
    "Makueni Constituency, as part of Makueni County, receives equitable share allocations directed towards",
    "Makueni County receives equitable share and other lawful county revenues supporting"
  ],
  [
    "sponsor a private member's bill or motion, table a statement to the relevant committee, and engage the relevant ministry through written questions.",
    "develop a lawful county policy proposal, identify the responsible county or national institution, consult affected communities, and establish measurable implementation and accountability steps."
  ]
]);

updateFile("artifacts/api-server/src/routes/speeches.ts", [
  [
    "an accessible MP present in every ward, responsive constituency office.",
    "an accessible Governor present across the county, responsive county leadership and accountable public service."
  ],
  [
    "Makueni Constituency realities.",
    "the realities of Makueni County's six constituencies and 30 wards."
  ]
]);

updateFile("artifacts/api-server/src/lib/seed.ts", [
  [
    '{ key: "candidate.title", value: "MNA — Makueni Constituency", category: "campaign", description: "Candidate\'s title and constituency label" }',
    '{ key: "candidate.title", value: "Governor Candidate — Makueni County", category: "campaign", description: "Candidate office and county campaign label" }'
  ]
]);

console.log("\nVersion 2.1.0 Batch B migration complete.");
console.log(`Changed files: ${changedFiles}`);
console.log(`Replacements made: ${replacementsMade}`);
console.log(`Patterns not found: ${missingPatterns}`);

if (process.exitCode) {
  process.exit(process.exitCode);
}
