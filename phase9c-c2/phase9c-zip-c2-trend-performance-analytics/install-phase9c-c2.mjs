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
  "files/TrendPerformanceAnalytics.tsx",
);

const targetComponent = path.join(
  cwd,
  "artifacts/commandcentre/src/components/analytics/TrendPerformanceAnalytics.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase9c-c2-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [analyticsPath, sourceComponent]) {
  if (!fs.existsSync(file)) fail(`Required file missing: ${file}`);
}

let text = fs.readFileSync(analyticsPath, "utf8");

if (text.includes("TrendPerformanceAnalytics")) {
  fail("Phase 9C ZIP C.2 is already installed.");
}

const reactImport =
  'import { useCallback, useEffect, useMemo, useState } from "react";';

if (!text.includes(reactImport)) {
  fail("React import anchor not found.");
}

const executiveBranch = `{tab === "scorecard" ? (`;

if (!text.includes(executiveBranch)) {
  fail("Scorecard branch anchor not found.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(analyticsPath, path.join(backupDir, "analytics.tsx"));

fs.mkdirSync(path.dirname(targetComponent), { recursive: true });
fs.copyFileSync(sourceComponent, targetComponent);

text = text.replace(
  reactImport,
  `${reactImport}
import TrendPerformanceAnalytics from "../components/analytics/TrendPerformanceAnalytics";`,
  1,
);

const oldBranch = `{tab === "scorecard" ? (
        <ExecutiveCampaignScorecard
          overview={data as any}
          campaignReadiness={campaignReadiness}
        />
      ) : tab === "executive" ? (`;

const newBranch = `{tab === "scorecard" ? (
        <ExecutiveCampaignScorecard
          overview={data as any}
          campaignReadiness={campaignReadiness}
        />
      ) : tab === "growth" ? (
        <TrendPerformanceAnalytics
          overview={data as any}
          campaignReadiness={campaignReadiness}
          onRefresh={() => void load()}
        />
      ) : tab === "executive" ? (`;

if (!text.includes(oldBranch)) {
  fs.rmSync(targetComponent, { force: true });
  fail("Analytics branch anchor not found. No file was changed.");
}

text = text.replace(oldBranch, newBranch, 1);
fs.writeFileSync(analyticsPath, text);

const verify = fs.readFileSync(analyticsPath, "utf8");
const checks = [
  verify.includes("TrendPerformanceAnalytics"),
  verify.includes('tab === "growth"'),
  verify.includes("onRefresh={() => void load()}"),
  fs.existsSync(targetComponent),
];

if (checks.some((check) => !check)) {
  fs.copyFileSync(path.join(backupDir, "analytics.tsx"), analyticsPath);
  fs.rmSync(targetComponent, { force: true });
  fail("Verification failed. Original Analytics page restored.");
}

console.log(`
[OK] Phase 9C ZIP C.2 installed.

Added:
  ${targetComponent}

Modified:
  ${analyticsPath}

Backup:
  ${backupDir}

Features:
  - Live Growth tab
  - Period filters: 7D, 30D, 90D, ALL
  - Database growth trend
  - Phone and support coverage
  - Ward performance ranking
  - Constituency performance ranking
  - Campaign readiness KPI
  - Manual refresh

Next:
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
