#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));

const pagePath = path.join(
  cwd,
  "artifacts/commandcentre/src/pages/campaign-plan.tsx",
);

const sourceComponent = path.join(
  packageDir,
  "files/CandidateReadinessExecutive.tsx",
);

const targetComponent = path.join(
  cwd,
  "artifacts/commandcentre/src/components/campaign-plan/CandidateReadinessExecutive.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase9b3-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [pagePath, sourceComponent]) {
  if (!fs.existsSync(file)) fail(`Required file missing: ${file}`);
}

let page = fs.readFileSync(pagePath, "utf8");

if (page.includes("CandidateReadinessExecutive")) {
  fail("Phase 9B.3 is already installed.");
}

const importAnchor = 'import { CAMPAIGN_UI } from "../config/campaign-ui";';

const readinessCandidates = [
  `        {/* ─── CANDIDATE READINESS ─── */}
        {tab === "readiness" && (
          <div className="space-y-3">`,
  `        {/* ─── READINESS ─── */}
        {tab === "readiness" && (
          <div className="space-y-3">`,
  `        {tab === "readiness" && (
          <div className="space-y-3">`,
];

const readinessAnchor = readinessCandidates.find((candidate) =>
  page.includes(candidate),
);

if (!page.includes(importAnchor)) {
  fail("CAMPAIGN_UI import anchor not found.");
}

if (!readinessAnchor) {
  fail("Readiness insertion anchor not found. No files were modified.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(pagePath, path.join(backupDir, "campaign-plan.tsx"));

if (fs.existsSync(targetComponent)) {
  fs.copyFileSync(
    targetComponent,
    path.join(backupDir, "CandidateReadinessExecutive.tsx"),
  );
}

fs.mkdirSync(path.dirname(targetComponent), { recursive: true });
fs.copyFileSync(sourceComponent, targetComponent);

page = page.replace(
  importAnchor,
  `${importAnchor}
import CandidateReadinessExecutive from "../components/campaign-plan/CandidateReadinessExecutive";`,
  1,
);

const inserted = `${readinessAnchor}
            <CandidateReadinessExecutive
              readinessItems={readinessItems}
              milestones={(milestones ?? []) as any[]}
              electionDate={countdown?.electionDate}
              daysRemaining={countdown?.daysRemaining}
              onPrint={handlePrint}
            />`;

page = page.replace(readinessAnchor, inserted, 1);
fs.writeFileSync(pagePath, page);

const verify = fs.readFileSync(pagePath, "utf8");
const count = (verify.match(/CandidateReadinessExecutive/g) ?? []).length;

if (count !== 3 || !fs.existsSync(targetComponent)) {
  fs.copyFileSync(path.join(backupDir, "campaign-plan.tsx"), pagePath);
  if (fs.existsSync(targetComponent)) fs.rmSync(targetComponent);
  fail("Verification failed. Original page restored.");
}

console.log(`
[OK] Phase 9B.3 installed.

Added:
  ${targetComponent}

Modified:
  ${pagePath}

Backup:
  ${backupDir}

Features:
  - Weighted candidate-readiness score
  - Domain-level progress
  - Ownership coverage
  - Priority action ranking
  - Executive readiness assessment
  - Downloadable readiness briefing
  - Print integration

Next:
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
