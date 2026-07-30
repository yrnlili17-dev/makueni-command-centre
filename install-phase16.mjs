import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const payload = path.join(root, "phase16-files");
const serviceSource = path.join(payload, "artifacts/api-server/src/services/smart-assist-engine.ts");
const serviceTarget = path.join(root, "artifacts/api-server/src/services/smart-assist-engine.ts");

fs.mkdirSync(path.dirname(serviceTarget), { recursive: true });
fs.copyFileSync(serviceSource, serviceTarget);
console.log("Installed Smart Assist intelligence engine.");

const aiFile = path.join(root, "artifacts/api-server/src/routes/ai.ts");
let ai = fs.readFileSync(aiFile, "utf8");

if (!ai.includes('from "../services/smart-assist-engine"')) {
  ai = ai.replace(
    'import { openai } from "@workspace/integrations-openai-ai-server";',
    'import { openai } from "@workspace/integrations-openai-ai-server";\nimport { buildPhase16Response } from "../services/smart-assist-engine";'
  );
}

const oldLine = 'const content = buildSmartAssistResponse({ message, module, context });';
const newLine = 'const content = await buildPhase16Response({ message, module });';
if (ai.includes(oldLine)) {
  ai = ai.replace(oldLine, newLine);
} else if (!ai.includes(newLine)) {
  throw new Error("Could not locate the Phase 15 Smart Assist response line in ai.ts.");
}

fs.writeFileSync(aiFile, ai);
console.log("Connected /api/ai/assist to the Phase 16 engine.");

console.log("\nPhase 16 files installed.");
console.log("Next run: source .env && node seed-phase16-makueni.mjs");
