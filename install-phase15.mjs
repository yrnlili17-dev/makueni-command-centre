import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const payload = path.join(root, "phase15-files");
const coreFiles = [
  "artifacts/api-server/src/routes/ai.ts",
  "artifacts/api-server/src/routes/strategist.ts",
  "artifacts/commandcentre/src/components/ai-assist-panel.tsx",
  "artifacts/commandcentre/src/pages/strategist.tsx",
];

for (const rel of coreFiles) {
  const source = path.join(payload, rel);
  const target = path.join(root, rel);
  if (!fs.existsSync(source)) throw new Error(`Missing Phase 15 payload: ${rel}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  console.log(`Updated ${rel}`);
}

function replaceInFile(rel, replacements) {
  const target = path.join(root, rel);
  if (!fs.existsSync(target)) {
    console.log(`Skipped missing file: ${rel}`);
    return;
  }
  let text = fs.readFileSync(target, "utf8");
  for (const [before, after] of replacements) text = text.split(before).join(after);
  fs.writeFileSync(target, text);
  console.log(`Patched labels in ${rel}`);
}

replaceInFile("artifacts/commandcentre/src/components/layout.tsx", [
  ["AI CHIEF STRATEGIST", "CHIEF STRATEGIST"],
  ["AI ASSIST", "SMART ASSIST"],
]);
replaceInFile("artifacts/commandcentre/src/pages/campaign-plan.tsx", [
  ["ACL AI", "SMART ASSIST"],
  ["AI ASSIST", "SMART ASSIST"],
]);

console.log("\nPhase 15 installed. Build the API and frontend, then deploy.");
