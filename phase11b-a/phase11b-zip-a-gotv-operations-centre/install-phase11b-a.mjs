#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd=process.cwd();
const pkg=path.dirname(fileURLToPath(import.meta.url));
const routePath=path.join(cwd,"artifacts/api-server/src/routes/turnout.ts");
const pagePath=path.join(cwd,"artifacts/commandcentre/src/pages/turnout.tsx");
const patchPath=path.join(pkg,"files/turnout-gotv-operations.patch.txt");
const sourceComponent=path.join(pkg,"files/GotvOperationsCentre.tsx");
const targetComponent=path.join(cwd,"artifacts/commandcentre/src/components/gotv/GotvOperationsCentre.tsx");
const stamp=new Date().toISOString().replace(/[:.]/g,"-");
const backupDir=path.join(cwd,`.phase11b-zip-a-backup-${stamp}`);

function fail(m){console.error(`\n[FAILED] ${m}\n`);process.exit(1);}

for(const f of [routePath,pagePath,patchPath,sourceComponent]) if(!fs.existsSync(f)) fail(`Required file missing: ${f}`);

let route=fs.readFileSync(routePath,"utf8");
let page=fs.readFileSync(pagePath,"utf8");

if(route.includes('router.get("/operations-centre"')&&page.includes("GotvOperationsCentre")) fail("Phase 11B ZIP A is already installed.");
if(!route.includes("export default router;")) fail("Turnout route export anchor not found.");

const rootMatch=page.match(/return\s*\(\s*\n?\s*<div className="space-y-[^"]+">/);
if(!rootMatch) fail("Turnout page root container anchor not found.");

const imports=[...page.matchAll(/^import .*;$/gm)];
if(imports.length===0) fail("Turnout import block not found.");

fs.mkdirSync(backupDir,{recursive:true});
fs.copyFileSync(routePath,path.join(backupDir,"turnout.ts"));
fs.copyFileSync(pagePath,path.join(backupDir,"turnout.tsx"));
fs.mkdirSync(path.dirname(targetComponent),{recursive:true});
fs.copyFileSync(sourceComponent,targetComponent);

route=route.replace("export default router;",fs.readFileSync(patchPath,"utf8")+"\nexport default router;");

const last=imports[imports.length-1];
const at=(last.index??0)+last[0].length;
page=page.slice(0,at)+'\nimport GotvOperationsCentre from "@/components/gotv/GotvOperationsCentre";'+page.slice(at);
page=page.replace(rootMatch[0],rootMatch[0]+"\n      <GotvOperationsCentre />",1);

fs.writeFileSync(routePath,route);
fs.writeFileSync(pagePath,page);

const ok=[
  fs.readFileSync(routePath,"utf8").includes("gotv_household_visits"),
  fs.readFileSync(routePath,"utf8").includes('router.get("/operations-centre"'),
  fs.readFileSync(pagePath,"utf8").includes("<GotvOperationsCentre />"),
  fs.existsSync(targetComponent),
].every(Boolean);

if(!ok){
  fs.copyFileSync(path.join(backupDir,"turnout.ts"),routePath);
  fs.copyFileSync(path.join(backupDir,"turnout.tsx"),pagePath);
  fs.rmSync(targetComponent,{force:true});
  fail("Verification failed. Original files restored.");
}

console.log(`
[OK] Phase 11B ZIP A installed.

Modified:
  ${routePath}
  ${pagePath}

Added:
  ${targetComponent}

Backup:
  ${backupDir}

Next:
  pnpm --filter @workspace/api-server build
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
