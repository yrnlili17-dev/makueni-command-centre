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
    fail(`Missing ${relativePath}`);
    return "";
  }

  return fs.readFileSync(absolutePath, "utf8");
}

console.log("\nVersion 2.1.0 Batch B verification\n");

const contextFile = read(
  "artifacts/api-server/src/config/campaign-context.ts"
);

contextFile.includes("GOVERNOR_CAMPAIGN_CONTEXT")
  ? pass("Shared gubernatorial campaign context")
  : fail("Shared gubernatorial context missing");

contextFile.includes("Do not describe the candidate as an MP")
  ? pass("Parliamentary identity protection")
  : fail("Parliamentary identity protection missing");

contextFile.includes("Do not attribute unverified achievements")
  ? pass("Unverified claims protection")
  : fail("Unverified claims protection missing");

const aiRoute = read("artifacts/api-server/src/routes/ai.ts");

aiRoute.includes('from "../config/campaign-context"')
  ? pass("AI route imports campaign context")
  : fail("AI route does not import campaign context");

aiRoute.includes("${GOVERNATORIAL_CONTEXT}") ||
aiRoute.includes("${GOVERNOR_CAMPAIGN_CONTEXT}")
  ? pass("AI route consumes campaign context")
  : fail("AI route does not consume campaign context");

const backendFiles = [
  "artifacts/api-server/src/routes/ai.ts",
  "artifacts/api-server/src/routes/intelligence.ts",
  "artifacts/api-server/src/routes/social.ts",
  "artifacts/api-server/src/routes/credentials.ts",
  "artifacts/api-server/src/routes/speeches.ts",
  "artifacts/api-server/src/routes/strategist.ts",
  "artifacts/api-server/src/lib/seed.ts",
];

const prohibitedPatterns = [
  ["MNA for Makueni", /MNA for Makueni/gi],
  ["Makueni MNA", /Makueni MNA/gi],
  ["Member of Parliament for Makueni", /Member of Parliament for Makueni/gi],
  ["MNA candidate", /MNA candidate/gi],
  ["Makueni Constituency", /Makueni Constituency/gi],
  ["Wiper Patriotic Front", /Wiper Patriotic Front/gi],
  ["Komboa Kenya", /Komboa Kenya/gi],
];

for (const [label, pattern] of prohibitedPatterns) {
  const matches = [];

  for (const relativePath of backendFiles) {
    const content = read(relativePath);

    if (pattern.test(content)) {
      matches.push(relativePath);
    }

    pattern.lastIndex = 0;
  }

  matches.length === 0
    ? pass(`No legacy reference: ${label}`)
    : fail(`${label} remains in: ${matches.join(", ")}`);
}

const requiredFiles = [
  "artifacts/api-server/src/config/campaign-context.ts",
  "scripts/migrate-v2.1.0-batch-b.mjs",
];

for (const relativePath of requiredFiles) {
  fs.existsSync(path.join(root, relativePath))
    ? pass(relativePath)
    : fail(`Missing ${relativePath}`);
}

if (failures > 0) {
  console.error(
    `\nBatch B verification failed with ${failures} problem(s).`
  );
  process.exit(1);
}

console.log("\nVersion 2.1.0 Batch B verification passed.");
