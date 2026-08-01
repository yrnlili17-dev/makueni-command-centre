#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd=process.cwd();
const packageDir=path.dirname(fileURLToPath(import.meta.url));
const routesIndex=path.join(cwd,"artifacts/api-server/src/routes/index.ts");
const healthTarget=path.join(cwd,"artifacts/api-server/src/routes/phase6-health.ts");
const dashboardTarget=path.join(cwd,"artifacts/commandcentre/src/components/intelligence/ExecutiveDashboardV6.tsx");
const healthSource=path.join(packageDir,"files/phase6-health.ts");
const dashboardSource=path.join(packageDir,"files/ExecutiveDashboardV6.tsx");
const stamp=new Date().toISOString().replace(/[:.]/g,"-");
const backupDir=path.join(cwd,`.phase6-zip-e-backup-${stamp}`);

function fail(message){ console.error(`\n[FAILED] ${message}\n`); process.exit(1); }
for(const f of [routesIndex,healthSource,dashboardSource]) if(!fs.existsSync(f)) fail(`Required file not found: ${f}`);
for(const rel of ["artifacts/api-server/src/services/intelligence-incident-engine.ts","artifacts/api-server/src/services/local-intelligence-engine.ts","artifacts/commandcentre/src/components/intelligence/IncidentOperationsV6.tsx"]) if(!fs.existsSync(path.join(cwd,rel))) fail(`Phase 6 dependency missing: ${rel}`);

fs.mkdirSync(backupDir,{recursive:true});
fs.copyFileSync(routesIndex,path.join(backupDir,"routes-index.ts"));
if(fs.existsSync(healthTarget)) fs.copyFileSync(healthTarget,path.join(backupDir,"phase6-health.ts"));
if(fs.existsSync(dashboardTarget)) fs.copyFileSync(dashboardTarget,path.join(backupDir,"ExecutiveDashboardV6.tsx"));
fs.copyFileSync(healthSource,healthTarget);
fs.copyFileSync(dashboardSource,dashboardTarget);

let index=fs.readFileSync(routesIndex,"utf8");
if(!index.includes('from "./phase6-health"')){
  const a='import commandCentreRouter from "./command-centre";';
  if(!index.includes(a)) fail("Could not locate command-centre import.");
  index=index.replace(a,`${a}\nimport phase6HealthRouter from "./phase6-health";`);
}
if(!index.includes('router.use("/phase6-health"')){
  const a='router.use("/command-centre", commandCentreRouter);';
  if(!index.includes(a)) fail("Could not locate command-centre mount.");
  index=index.replace(a,`${a}\nrouter.use("/phase6-health", phase6HealthRouter);`);
}
fs.writeFileSync(routesIndex,index);
console.log(`\n[OK] Phase 6 ZIP E installed.\n\nBackup:\n  ${backupDir}\n\nAdded/updated:\n  ${healthTarget}\n  ${dashboardTarget}\n\nModified:\n  ${routesIndex}\n\nNext:\n  pnpm --filter @workspace/api-server build\n  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build\n`);
