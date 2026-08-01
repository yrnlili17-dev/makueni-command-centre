#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const cwd=process.cwd(), pkg=path.dirname(fileURLToPath(import.meta.url));
const routes=path.join(cwd,"artifacts/api-server/src/routes/index.ts");
const backend=path.join(cwd,"artifacts/api-server/src/routes/dashboard-intelligence.ts");
const frontRoot=path.join(cwd,"artifacts/commandcentre/src");
const comp=path.join(frontRoot,"components/dashboard/LiveDashboardV9A.tsx");
const stamp=new Date().toISOString().replace(/[:.]/g,"-");
const backup=path.join(cwd,`.phase9a-backup-${stamp}`);
const fail=m=>{console.error(`\n[FAILED] ${m}\n`);process.exit(1)};
for(const f of [routes,path.join(pkg,"files/dashboard-intelligence.ts"),path.join(pkg,"files/LiveDashboardV9A.tsx")]) if(!fs.existsSync(f)) fail(`Required file not found: ${f}`);
let page=null;for(const c of ["dashboard.tsx","home.tsx","command-overview.tsx","index.tsx"].map(n=>path.join(frontRoot,"pages",n)))if(fs.existsSync(c)){page=c;break}
if(!page){const dir=path.join(frontRoot,"pages");for(const n of fs.readdirSync(dir)){if(!n.endsWith(".tsx"))continue;const f=path.join(dir,n),t=fs.readFileSync(f,"utf8");if(t.includes("COMMAND OVERVIEW")||t.includes("Command Overview")||t.includes("TOTAL MEMBERS")){page=f;break}}}
if(!page) fail("Could not locate the Command Overview page.");
if(fs.readFileSync(page,"utf8").includes("LiveDashboardV9A")) fail("Phase 9A is already installed.");
fs.mkdirSync(backup,{recursive:true});for(const f of [routes,page])fs.copyFileSync(f,path.join(backup,path.basename(f)));
fs.mkdirSync(path.dirname(comp),{recursive:true});fs.copyFileSync(path.join(pkg,"files/dashboard-intelligence.ts"),backend);fs.copyFileSync(path.join(pkg,"files/LiveDashboardV9A.tsx"),comp);
let index=fs.readFileSync(routes,"utf8");const ia='import commandCentreRouter from "./command-centre";';const ma='router.use("/command-centre", commandCentreRouter);';if(!index.includes('from "./dashboard-intelligence"')){if(!index.includes(ia))fail("Could not locate router import anchor.");index=index.replace(ia,`${ia}\nimport dashboardIntelligenceRouter from "./dashboard-intelligence";`)}if(!index.includes('router.use("/dashboard-intelligence"')){if(!index.includes(ma))fail("Could not locate router mount anchor.");index=index.replace(ma,`${ma}\nrouter.use("/dashboard-intelligence", dashboardIntelligenceRouter);`)}fs.writeFileSync(routes,index);
const rel=path.relative(path.dirname(page),comp).replaceAll(path.sep,"/").replace(/\.tsx$/,"");const imp=rel.startsWith(".")?rel:`./${rel}`;fs.writeFileSync(page,`import LiveDashboardV9A from "${imp}";\nexport default function DashboardPage(){return <LiveDashboardV9A/>;}\n`);
console.log(`\n[OK] Phase 9A Live Dashboard Intelligence installed.\n\nBackup:\n  ${backup}\n\nNew API:\n  GET /api/dashboard-intelligence/health\n  GET /api/dashboard-intelligence/overview\n\nNext:\n  pnpm --filter @workspace/api-server build\n  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build\n`);
