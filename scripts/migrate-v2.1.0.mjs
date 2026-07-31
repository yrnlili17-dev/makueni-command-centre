import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const campaignConfig = {
  version: "2.1.0",
  candidateName: "Prof. Philip Kaloki",
  candidateShortName: "Prof. Kaloki",
  campaignName: "Kaloki 2027",
  party: "UDA",
  position: "Governor",
  county: "Makueni County",
  country: "Kenya",
  slogan: "",
  primaryColour: "",
  secondaryColour: ""
};

const configDirectory = path.join(root, "config");
fs.mkdirSync(configDirectory, { recursive: true });

fs.writeFileSync(
  path.join(configDirectory, "campaign.json"),
  `${JSON.stringify(campaignConfig, null, 2)}\n`,
  "utf8"
);

const files = [
  "artifacts/api-server/src/routes/ai.ts",
  "artifacts/api-server/src/routes/strategist.ts",
  "artifacts/api-server/src/routes/intelligence.ts",
  "scripts/src/seed.ts"
];

const replacements = [
  [
    /Hon\. Stephen Mutinda Mule \(Mwanamule\)/g,
    "Prof. Philip Kaloki"
  ],
  [
    /MNA candidate for Makueni Constituency, Machakos County, Kenya/g,
    "gubernatorial candidate for Makueni County, Kenya"
  ],
  [
    /Stephen Mule/g,
    "Prof. Philip Kaloki"
  ],
  [
    /Hon\. Mule/g,
    "Prof. Kaloki"
  ],
  [
    /Mheshimiwa Mule/g,
    "Prof. Kaloki"
  ],
  [
    /\bMule\b/g,
    "Kaloki"
  ]
];

for (const relativeFile of files) {
  const absoluteFile = path.join(root, relativeFile);

  if (!fs.existsSync(absoluteFile)) {
    console.error(`MISSING ${relativeFile}`);
    process.exitCode = 1;
    continue;
  }

  const original = fs.readFileSync(absoluteFile, "utf8");
  let updated = original;

  for (const [pattern, replacement] of replacements) {
    updated = updated.replace(pattern, replacement);
  }

  if (updated === original) {
    console.log(`UNCHANGED ${relativeFile}`);
    continue;
  }

  fs.writeFileSync(absoluteFile, updated, "utf8");
  console.log(`UPDATED ${relativeFile}`);
}

console.log("\nVersion 2.1.0 candidate migration completed.");
console.log("Campaign: Kaloki 2027");
console.log("Candidate: Prof. Philip Kaloki");
console.log("Party: UDA");
