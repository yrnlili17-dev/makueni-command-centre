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
  "files/ExecutiveCampaignScorecard.tsx",
);

const targetComponent = path.join(
  cwd,
  "artifacts/commandcentre/src/components/analytics/ExecutiveCampaignScorecard.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase9c-c1-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [analyticsPath, sourceComponent]) {
  if (!fs.existsSync(file)) fail(`Required file missing: ${file}`);
}

let text = fs.readFileSync(analyticsPath, "utf8");

if (text.includes("ExecutiveCampaignScorecard")) {
  fail("Phase 9C ZIP C.1 is already installed.");
}

const reactImport =
  'import { useCallback, useEffect, useMemo, useState } from "react";';

if (!text.includes(reactImport)) {
  fail("React import anchor not found.");
}

const typeAnchor = `type Tab =
  | "executive"`;

if (!text.includes(typeAnchor)) {
  fail("Tab type anchor not found.");
}

const tabsAnchor = `const TABS: Array<{ id: Tab; label: string }> = [
  { id: "executive", label: "EXECUTIVE" },`;

if (!text.includes(tabsAnchor)) {
  fail("Tabs array anchor not found.");
}

const executiveBranch = `{tab === "executive" ? (
        <>`;

if (!text.includes(executiveBranch)) {
  fail("Executive branch anchor not found.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(analyticsPath, path.join(backupDir, "analytics.tsx"));

if (fs.existsSync(targetComponent)) {
  fs.copyFileSync(
    targetComponent,
    path.join(backupDir, "ExecutiveCampaignScorecard.tsx"),
  );
}

fs.mkdirSync(path.dirname(targetComponent), { recursive: true });
fs.copyFileSync(sourceComponent, targetComponent);

text = text.replace(
  reactImport,
  `${reactImport}
import ExecutiveCampaignScorecard from "../components/analytics/ExecutiveCampaignScorecard";`,
  1,
);

text = text.replace(
  typeAnchor,
  `type Tab =
  | "scorecard"
  | "executive"`,
  1,
);

text = text.replace(
  tabsAnchor,
  `const TABS: Array<{ id: Tab; label: string }> = [
  { id: "scorecard", label: "EXECUTIVE SCORECARD" },
  { id: "executive", label: "EXECUTIVE" },`,
  1,
);

const branchReplacement = `{tab === "scorecard" ? (
        <ExecutiveCampaignScorecard
          overview={data as any}
          campaignReadiness={campaignReadiness}
        />
      ) : tab === "executive" ? (
        <>`;

text = text.replace(executiveBranch, branchReplacement, 1);

const stateAnchor = `  const [data, setData] = useState<AnalyticsOverview | null>(null);`;

if (!text.includes(stateAnchor)) {
  fs.copyFileSync(path.join(backupDir, "analytics.tsx"), analyticsPath);
  fs.rmSync(targetComponent, { force: true });
  fail("Analytics data-state anchor not found. Original restored.");
}

text = text.replace(
  stateAnchor,
  `${stateAnchor}
  const [campaignReadiness, setCampaignReadiness] = useState<any>(null);`,
  1,
);

const loadAnchor = `      setData(await getOverview());`;

if (!text.includes(loadAnchor)) {
  fs.copyFileSync(path.join(backupDir, "analytics.tsx"), analyticsPath);
  fs.rmSync(targetComponent, { force: true });
  fail("Analytics load anchor not found. Original restored.");
}

text = text.replace(
  loadAnchor,
  `      const [overviewData, readinessResponse] = await Promise.all([
        getOverview(),
        fetch(\`\${BASE}api/campaign-plan/readiness\`, {
          credentials: "include",
        }),
      ]);

      setData(overviewData);

      if (readinessResponse.ok) {
        setCampaignReadiness(await readinessResponse.json());
      } else {
        setCampaignReadiness(null);
      }`,
  1,
);

fs.writeFileSync(analyticsPath, text);

const verify = fs.readFileSync(analyticsPath, "utf8");
const checks = [
  verify.includes("ExecutiveCampaignScorecard"),
  verify.includes('| "scorecard"'),
  verify.includes('{ id: "scorecard", label: "EXECUTIVE SCORECARD" }'),
  verify.includes("campaignReadiness={campaignReadiness}"),
  verify.includes("api/campaign-plan/readiness"),
  fs.existsSync(targetComponent),
];

if (checks.some((check) => !check)) {
  fs.copyFileSync(path.join(backupDir, "analytics.tsx"), analyticsPath);
  fs.rmSync(targetComponent, { force: true });
  fail("Installation verification failed. Original Analytics page restored.");
}

console.log(`
[OK] Phase 9C ZIP C.1 installed.

Added:
  ${targetComponent}

Modified:
  ${analyticsPath}

Backup:
  ${backupDir}

Features:
  - Executive Campaign Scorecard tab
  - Weighted Campaign Health
  - Eight executive KPI scorecards
  - Executive Summary
  - Rule-based prioritized recommendations
  - One-click module navigation
  - Campaign Plan readiness integration

Next:
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
