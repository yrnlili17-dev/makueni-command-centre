import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "artifacts/commandcentre/src/components/ai-assist-panel.tsx");
if (!fs.existsSync(source)) {
  throw new Error("Phase package file is missing: " + source);
}

console.log("V2.0-A Smart Assist mobile redesign is present.");
console.log("No database migration is required.");
console.log("Build the frontend and API, then deploy.");
