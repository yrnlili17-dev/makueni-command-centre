#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const dashboard = path.join(cwd,"artifacts/commandcentre/src/pages/intelligence.tsx");
const componentDir = path.join(cwd,"artifacts/commandcentre/src/components/intelligence");
const componentFile = path.join(componentDir,"ExecutiveDashboardV6.tsx");
const source = path.join(path.dirname(new URL(import.meta.url).pathname),"files","ExecutiveDashboardV6.tsx");

if(!fs.existsSync(dashboard)){
  console.error("[FAILED] intelligence.tsx not found");
  process.exit(1);
}

fs.mkdirSync(componentDir,{recursive:true});
fs.copyFileSync(source,componentFile);

let text=fs.readFileSync(dashboard,"utf8");

if(!text.includes("ExecutiveDashboardV6")){
  text=text.replace(
    'import IncidentOperationsV6 from "../components/intelligence/IncidentOperationsV6";',
    'import IncidentOperationsV6 from "../components/intelligence/IncidentOperationsV6";\nimport ExecutiveDashboardV6 from "../components/intelligence/ExecutiveDashboardV6";'
  );
}

if(text.includes('label: "INCIDENT OPS"') && !text.includes('label: "EXEC DASHBOARD"')){
  text=text.replace(
    '    { id: "incidents", label: "INCIDENT OPS", icon: <ShieldAlert className="w-3 h-3" /> },',
    '    { id: "incidents", label: "INCIDENT OPS", icon: <ShieldAlert className="w-3 h-3" /> },\n    { id: "executive", label: "EXEC DASHBOARD", icon: <BarChart3 className="w-3 h-3" /> },'
  );
}

text=text.replace(
'      {/* ── PHASE 6 INCIDENT OPERATIONS ── */}',
'      {tab === "executive" && <ExecutiveDashboardV6 />}\n\n      {/* ── PHASE 6 INCIDENT OPERATIONS ── */}'
);

if(!text.includes('"executive"')){
 text=text.replace(/type Tab = ([^;]+);/,(_,u)=>`type Tab = ${u} | "executive";`);
}

fs.writeFileSync(dashboard,text);

console.log(`[OK] Phase 6 ZIP D installed.

Added:
  ${componentFile}

Modified:
  ${dashboard}

Next:
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build`);
