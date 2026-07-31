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

const patterns = [
  /Makueni Constituency/gi,
  /Makueni East/gi,
  /Makueni West/gi,
  /Makueni North/gi,
  /Member of Parliament/gi,
  /\bMNA\b/g,
  /\bMP\b/g,
  /parliamentary/gi,
  /constituency office/gi,
  /constituency campaign/gi,
  /Wiper Patriotic Front/gi,
  /Komboa Kenya/gi,
  /Stephen Mule/gi,
  /Hon\.?\s*Mule/gi,
  /Mheshimiwa Mule/gi,
  /Mwanamule/gi,
];

let findings = 0;

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log(`MISSING: ${file}`);
    continue;
  }

  const lines = fs.readFileSync(file, "utf8").split("\n");

  for (let index = 0; index < lines.length; index++) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;

      if (pattern.test(lines[index])) {
        console.log(`${file}:${index + 1}: ${lines[index].trim()}`);
        findings++;
        break;
      }
    }
  }
}

console.log(`\nBatch C2 legacy findings: ${findings}`);
