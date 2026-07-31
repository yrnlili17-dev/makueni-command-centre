import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let failures = 0;

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  failures += 1;
  console.error(`FAIL ${message}`);
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    fail(`Missing file: ${relativePath}`);
    return "";
  }

  return fs.readFileSync(absolutePath, "utf8");
}

console.log("\nVersion 2.1.0 Batch C1 verification\n");

const uiConfig = read(
  "artifacts/commandcentre/src/config/campaign-ui.ts"
);

uiConfig.includes("CAMPAIGN_UI")
  ? pass("Shared campaign UI configuration exists")
  : fail("Shared campaign UI configuration missing");

uiConfig.includes("CANDIDATE_NAME")
  ? pass("Candidate identity comes from generated configuration")
  : fail("Candidate identity is not configuration-driven");

uiConfig.includes("CAMPAIGN_COUNTY")
  ? pass("County identity comes from generated configuration")
  : fail("County identity is not configuration-driven");

const campaignPlan = read(
  "artifacts/commandcentre/src/pages/campaign-plan.tsx"
);

campaignPlan.includes('from "../config/campaign-ui"')
  ? pass("Campaign Plan imports campaign UI configuration")
  : fail("Campaign Plan does not import campaign UI configuration");

campaignPlan.includes("CAMPAIGN_UI.reportIdentity")
  ? pass("Campaign Plan report identity is configuration-driven")
  : fail("Campaign Plan report identity remains hard-coded");

const intelligence = read(
  "artifacts/commandcentre/src/pages/intelligence.tsx"
);

intelligence.includes('from "../config/campaign-ui"')
  ? pass("Intelligence imports campaign UI configuration")
  : fail("Intelligence does not import campaign UI configuration");

intelligence.includes("CAMPAIGN_MESSAGES.youth")
  ? pass("Youth message is configuration-driven")
  : fail("Youth message is not configuration-driven");

const layout = read(
  "artifacts/commandcentre/src/components/layout.tsx"
);

layout.includes('from "../config/campaign-ui"')
  ? pass("Layout imports campaign UI configuration")
  : fail("Layout does not import campaign UI configuration");

const checkedFiles = [
  "artifacts/commandcentre/src/pages/campaign-plan.tsx",
  "artifacts/commandcentre/src/pages/intelligence.tsx",
  "artifacts/commandcentre/src/components/layout.tsx",
  "artifacts/commandcentre/src/pages/dashboard.tsx",
  "artifacts/commandcentre/src/pages/login.tsx",
  "artifacts/commandcentre/src/pages/public-campaign.tsx",
];

const prohibitedPatterns = [
  ["Makueni Constituency", /Makueni Constituency/gi],
  ["Makueni MNA", /Makueni MNA/gi],
  ["MNA candidate", /MNA candidate/gi],
  ["Member of Parliament", /Member of Parliament/gi],
  ["holiday MPs", /holiday MPs/gi],
  ["MP is the connector", /MP is the connector/gi],
  ["Wiper Patriotic Front", /Wiper Patriotic Front/gi],
  ["Komboa Kenya", /Komboa Kenya/gi],
  ["Stephen Mule", /Stephen Mule/gi],
  ["Hon. Mule", /Hon\. Mule/gi],
  ["Mheshimiwa Mule", /Mheshimiwa Mule/gi],
  ["Mwanamule", /Mwanamule/gi],
];

for (const [label, pattern] of prohibitedPatterns) {
  const matches = [];

  for (const relativePath of checkedFiles) {
    const content = read(relativePath);

    if (pattern.test(content)) {
      matches.push(relativePath);
    }

    pattern.lastIndex = 0;
  }

  matches.length === 0
    ? pass(`No visible legacy identity: ${label}`)
    : fail(`${label} remains in: ${matches.join(", ")}`);
}

if (failures > 0) {
  console.error(
    `\nBatch C1 verification failed with ${failures} problem(s).`
  );
  process.exit(1);
}

console.log("\nVersion 2.1.0 Batch C1 verification passed.");
