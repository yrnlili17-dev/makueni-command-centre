#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));

const analyticsPath = path.join(
  cwd,
  "artifacts/commandcentre/src/pages/analytics.tsx",
);

const sourceComponent = path.join(
  packageDir,
  "files/CampaignKpiDashboard.tsx",
);

const targetComponent = path.join(
  cwd,
  "artifacts/commandcentre/src/components/analytics/CampaignKpiDashboard.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase9c-c4-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [analyticsPath, sourceComponent]) {
  if (!fs.existsSync(file)) fail(`Required file missing: ${file}`);
}

let text = fs.readFileSync(analyticsPath, "utf8");

if (text.includes("CampaignKpiDashboard")) {
  fail("Phase 9C ZIP C.4 is already installed.");
}

const reactImport =
  'import { useCallback, useEffect, useMemo, useState } from "react";';

if (!text.includes(reactImport)) {
  fail("React import anchor not found.");
}

const typeAnchor = `type Tab =
  | "scorecard"`;

if (!text.includes(typeAnchor)) {
  fail("Tab type anchor not found.");
}

const tabsAnchor = `const TABS: Array<{ id: Tab; label: string }> = [
  { id: "scorecard", label: "EXECUTIVE SCORECARD" },`;

if (!text.includes(tabsAnchor)) {
  fail("Tabs array anchor not found.");
}

const scorecardBranch = `{tab === "scorecard" ? (`;

if (!text.includes(scorecardBranch)) {
  fail("Scorecard branch anchor not found.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(analyticsPath, path.join(backupDir, "analytics.tsx"));

fs.mkdirSync(path.dirname(targetComponent), { recursive: true });
fs.copyFileSync(sourceComponent, targetComponent);

text = text.replace(
  reactImport,
  `${reactImport}
import CampaignKpiDashboard from "../components/analytics/CampaignKpiDashboard";`,
  1,
);

text = text.replace(
  typeAnchor,
  `type Tab =
  | "kpi"
  | "scorecard"`,
  1,
);

text = text.replace(
  tabsAnchor,
  `const TABS: Array<{ id: Tab; label: string }> = [
  { id: "kpi", label: "KPI DASHBOARD" },
  { id: "scorecard", label: "EXECUTIVE SCORECARD" },`,
  1,
);

const oldBranch = `{tab === "scorecard" ? (
        <ExecutiveCampaignScorecard
          overview={data as any}
          campaignReadiness={campaignReadiness}
        />`;

const newBranch = `{tab === "kpi" ? (
        <CampaignKpiDashboard
          overview={data as any}
          campaignReadiness={campaignReadiness}
        />
      ) : tab === "scorecard" ? (
        <ExecutiveCampaignScorecard
          overview={data as any}
          campaignReadiness={campaignReadiness}
        />`;

if (!text.includes(oldBranch)) {
  fs.rmSync(targetComponent, { force: true });
  fail("Scorecard JSX branch was not found. No file was changed.");
}

text = text.replace(oldBranch, newBranch, 1);
fs.writeFileSync(analyticsPath, text);

const verify = fs.readFileSync(analyticsPath, "utf8");
const checks = [
  verify.includes("CampaignKpiDashboard"),
  verify.includes('| "kpi"'),
  verify.includes('{ id: "kpi", label: "KPI DASHBOARD" }'),
  verify.includes('tab === "kpi"'),
  verify.includes("campaignReadiness={campaignReadiness}"),
  fs.existsSync(targetComponent),
];

if (checks.some((check) => !check)) {
  fs.copyFileSync(path.join(backupDir, "analytics.tsx"), analyticsPath);
  fs.rmSync(targetComponent, { force: true });
  fail("Verification failed. Original Analytics page restored.");
}

console.log(`
[OK] Phase 9C ZIP C.4 installed.

Added:
  ${targetComponent}

Modified:
  ${analyticsPath}

Backup:
  ${backupDir}

Features:
  - Campaign KPI Dashboard tab
  - Overall KPI performance
  - Target tracking
  - CRM growth target
  - Phone and support coverage
  - Ward and constituency readiness
  - Campaign Plan readiness
  - Field and messaging performance
  - Demographic representation
  - Ward performance
  - Print and CSV export

Next:
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
