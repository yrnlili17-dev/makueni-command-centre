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

function checkFile(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (fs.existsSync(absolutePath)) {
    pass(relativePath);
    return true;
  }

  fail(`Missing ${relativePath}`);
  return false;
}

function readJson(relativePath) {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(root, relativePath), "utf8")
    );
  } catch (error) {
    fail(`Cannot parse ${relativePath}: ${error.message}`);
    return null;
  }
}

console.log(
  "\nVersion 2.1.0 Batch A verification\n"
);

const requiredFiles = [
  "config/campaign.json",
  "config/branding.json",
  "config/election.json",
  "config/geography.json",
  "config/ai.json",
  "config/generated-config-bundle.json",
  "artifacts/api-server/src/config/campaign-config.ts",
  "artifacts/commandcentre/src/config/campaign-config.ts",
  "scripts/sync-campaign-config.mjs"
];

for (const file of requiredFiles) {
  checkFile(file);
}

const campaign = readJson("config/campaign.json");
const geography = readJson("config/geography.json");
const ai = readJson("config/ai.json");

if (campaign) {
  campaign.candidate.fullName === "Prof. Philip Kaloki"
    ? pass("Candidate name")
    : fail("Incorrect candidate name");

  campaign.campaign.name === "Kaloki 2027"
    ? pass("Campaign name")
    : fail("Incorrect campaign name");

  campaign.campaign.party === "UDA"
    ? pass("Party")
    : fail("Incorrect party");

  campaign.candidate.position === "Governor"
    ? pass("Governor campaign")
    : fail("Incorrect campaign position");

  campaign.campaign.slogan === ""
    ? pass("Slogan intentionally blank")
    : fail("Slogan should currently be blank");
}

if (geography) {
  const constituencyCount =
    geography.constituencies?.length ?? 0;

  const wardCount =
    geography.constituencies?.reduce(
      (total, constituency) =>
        total + constituency.wards.length,
      0
    ) ?? 0;

  constituencyCount === 6
    ? pass("Six constituencies configured")
    : fail(
        `Expected 6 constituencies, found ${constituencyCount}`
      );

  wardCount === 30
    ? pass("Thirty wards configured")
    : fail(`Expected 30 wards, found ${wardCount}`);

  const duplicateWardIds = geography.constituencies
    .flatMap(constituency => constituency.wards)
    .map(ward => ward.id)
    .filter(
      (id, index, ids) => ids.indexOf(id) !== index
    );

  duplicateWardIds.length === 0
    ? pass("No duplicate ward identifiers")
    : fail(
        `Duplicate ward identifiers: ${[
          ...new Set(duplicateWardIds)
        ].join(", ")}`
      );
}

if (ai) {
  ai.rules?.useGubernatorialContext === true
    ? pass("Gubernatorial AI context enabled")
    : fail("Gubernatorial AI context is not enabled");

  ai.rules?.avoidParliamentaryClaims === true
    ? pass("Parliamentary claims protection enabled")
    : fail("Parliamentary claims protection missing");
}

if (failures > 0) {
  console.error(
    `\nBatch A verification failed with ${failures} problem(s).`
  );
  process.exit(1);
}

console.log(
  "\nVersion 2.1.0 Batch A verification passed."
);
