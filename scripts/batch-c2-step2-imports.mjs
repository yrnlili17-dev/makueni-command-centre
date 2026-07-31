import fs from "node:fs";

const files = [
  "artifacts/commandcentre/src/pages/field-ops.tsx",
  "artifacts/commandcentre/src/pages/volunteers.tsx",
  "artifacts/commandcentre/src/pages/gis-centre.tsx",
  "artifacts/commandcentre/src/pages/gis-intelligence.tsx",
  "artifacts/commandcentre/src/pages/turnout.tsx",
  "artifacts/commandcentre/src/pages/election-war-room.tsx",
  "artifacts/commandcentre/src/pages/operations-hub.tsx",
  "artifacts/commandcentre/src/pages/reports-hub.tsx",
  "artifacts/commandcentre/src/pages/voters-db.tsx",
  "artifacts/commandcentre/src/pages/events.tsx",
];

const requiredImports = [
  'import { CAMPAIGN_UI } from "../config/campaign-ui";',
  'import { CAMPAIGN_OPERATIONS } from "../config/campaign-operations";',
];

function findLastImportLine(lines) {
  let lastImportLine = -1;
  let insideImport = false;

  for (let index = 0; index < lines.length; index++) {
    const trimmed = lines[index].trim();

    if (!insideImport && trimmed.startsWith("import ")) {
      insideImport = true;
    }

    if (insideImport) {
      lastImportLine = index;

      if (trimmed.endsWith(";")) {
        insideImport = false;
      }

      continue;
    }

    if (
      lastImportLine >= 0 &&
      trimmed !== "" &&
      !trimmed.startsWith("//") &&
      !trimmed.startsWith("/*") &&
      !trimmed.startsWith("*")
    ) {
      break;
    }
  }

  return lastImportLine;
}

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log(`MISSING: ${file}`);
    continue;
  }

  let content = fs.readFileSync(file, "utf8");
  const importsToAdd = requiredImports.filter(
    (statement) => !content.includes(statement),
  );

  if (importsToAdd.length === 0) {
    console.log(`UNCHANGED: ${file}`);
    continue;
  }

  const lines = content.split("\n");
  const lastImportLine = findLastImportLine(lines);

  if (lastImportLine === -1) {
    lines.unshift(...importsToAdd, "");
  } else {
    lines.splice(lastImportLine + 1, 0, ...importsToAdd);
  }

  content = lines.join("\n");
  fs.writeFileSync(file, content);

  console.log(`UPDATED: ${file}`);
}

console.log("\nBatch C2 Step 2 import update complete.");
