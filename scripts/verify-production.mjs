import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "artifacts/commandcentre/src/App.tsx",
  "artifacts/commandcentre/src/pages/dashboard.tsx",
  "artifacts/commandcentre/src/components/layout.tsx",
  "artifacts/api-server/src/index.ts",
  "scripts/audit-command-centre.mjs",
];
let failed = false;
for (const file of required) {
  const ok = fs.existsSync(path.join(root, file));
  console.log(`${ok ? "PASS" : "FAIL"} ${file}`);
  if (!ok) failed = true;
}
const app = fs.readFileSync(path.join(root, "artifacts/commandcentre/src/App.tsx"), "utf8");
const routes = [...app.matchAll(/<Route path="([^"]+)"/g)].map((m) => m[1]);
const duplicates = routes.filter((route, index) => routes.indexOf(route) !== index);
console.log(`INFO ${routes.length} explicit frontend routes`);
if (duplicates.length) { console.error(`FAIL duplicate routes: ${[...new Set(duplicates)].join(", ")}`); failed = true; }
else console.log("PASS no duplicate explicit routes");
const dashboard = fs.readFileSync(path.join(root, "artifacts/commandcentre/src/pages/dashboard.tsx"), "utf8");
const expected = ["/members", "/volunteers", "/messaging", "/field-ops", "/gis-centre", "/intelligence", "/executive-command", "/events"];
for (const route of expected) {
  const ok = dashboard.includes(`href="${route}"`);
  console.log(`${ok ? "PASS" : "FAIL"} dashboard link ${route}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log("\nProduction source verification passed.");
