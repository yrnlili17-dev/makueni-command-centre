import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

let changedFiles = 0;
let replacementsMade = 0;

function updateFile(relativePath, replacements) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`MISSING FILE: ${relativePath}`);
    process.exitCode = 1;
    return;
  }

  const original = fs.readFileSync(absolutePath, "utf8");
  let updated = original;
  let localChanges = 0;

  for (const [oldValue, newValue] of replacements) {
    const count = updated.split(oldValue).length - 1;

    if (count === 0) {
      console.log(`NOT FOUND: ${relativePath}: ${oldValue.slice(0, 90)}`);
      continue;
    }

    updated = updated.split(oldValue).join(newValue);
    localChanges += count;
    replacementsMade += count;
  }

  if (updated !== original) {
    fs.writeFileSync(absolutePath, updated, "utf8");
    changedFiles += 1;
    console.log(`UPDATED: ${relativePath} (${localChanges} replacement(s))`);
  } else {
    console.log(`UNCHANGED: ${relativePath}`);
  }
}

updateFile("artifacts/commandcentre/src/pages/campaign-plan.tsx", [
  [
    'Prof. Philip Kaloki · Makueni Constituency · Generated {new Date().toLocaleString("en-KE")}',
    'Prof. Philip Kaloki · Governor Candidate · Makueni County · Generated {new Date().toLocaleString("en-KE")}'
  ],
  [
    "MAKUENI COMMAND CENTRE — CAMPAIGN PLAN REPORT",
    "KALOKI 2027 — MAKUENI COUNTY CAMPAIGN PLAN REPORT"
  ],
  [
    "MAKUENI COMMAND CENTRE — CAMPAIGN PLAN",
    "KALOKI 2027 — MAKUENI COUNTY CAMPAIGN PLAN"
  ]
]);

updateFile("artifacts/commandcentre/src/pages/intelligence.tsx", [
  [
    "The youth are the engine; the MP is the connector.",
    "The youth are the engine of Makueni; county leadership must connect skills, enterprise and opportunity."
  ],
  [
    "A serious MP who fights for Makueni's share in Nairobi.",
    "Accountable county leadership must protect public resources and deliver effective services across Makueni County."
  ],
  [
    "Distinguishes him from 'holiday MPs'; ties to constitutional mandate pillar.",
    "Distinguishes the campaign through visible, accountable and countywide leadership."
  ],
  [
    'Short bilingual lines. Top: \\"Komboa Kenya\\" · Bottom: \\"Komboa Makueni na Prof. Kaloki – Maji, Barabara, Kazi.\\"',
    "Short bilingual messages focused on water, healthcare, roads, agriculture, jobs and accountable county services."
  ],
  [
    "Set up a Google Alert for 'Philip Kaloki' or 'Makueni MNA', then paste the RSS feed URL here.",
    "Set up a Google Alert for 'Prof. Philip Kaloki' or 'Kaloki 2027 Makueni Governor', then paste the RSS feed URL here."
  ]
]);

updateFile("artifacts/commandcentre/src/components/layout.tsx", [
  [
    "MAKUENI COUNTY · CAMPAIGN COMMAND CENTRE · SECURE OPERATIONS",
    "KALOKI 2027 · MAKUENI COUNTY · SECURE CAMPAIGN OPERATIONS"
  ]
]);

console.log("\nVersion 2.1.0 Batch C1 migration complete.");
console.log(`Changed files: ${changedFiles}`);
console.log(`Replacements made: ${replacementsMade}`);

if (process.exitCode) {
  process.exit(process.exitCode);
}
