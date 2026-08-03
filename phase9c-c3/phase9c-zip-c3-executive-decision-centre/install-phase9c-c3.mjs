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
  "files/ExecutiveDecisionCentre.tsx",
);

const targetComponent = path.join(
  cwd,
  "artifacts/commandcentre/src/components/analytics/ExecutiveDecisionCentre.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase9c-c3-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [analyticsPath, sourceComponent]) {
  if (!fs.existsSync(file)) fail(`Required file missing: ${file}`);
}

let text = fs.readFileSync(analyticsPath, "utf8");

if (text.includes("ExecutiveDecisionCentre")) {
  fail("Phase 9C ZIP C.3 is already installed.");
}

const reactImport =
  'import { useCallback, useEffect, useMemo, useState } from "react";';

if (!text.includes(reactImport)) {
  fail("React import anchor not found.");
}

const growthBranch = `      ) : tab === "growth" ? (
        <TrendPerformanceAnalytics
          overview={data as any}
          campaignReadiness={campaignReadiness}
          onRefresh={() => void load()}
        />
      ) : tab === "executive" ? (`;

if (!text.includes(growthBranch)) {
  fail("Growth branch anchor not found.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(analyticsPath, path.join(backupDir, "analytics.tsx"));

fs.mkdirSync(path.dirname(targetComponent), { recursive: true });
fs.copyFileSync(sourceComponent, targetComponent);

text = text.replace(
  reactImport,
  `${reactImport}
import ExecutiveDecisionCentre from "../components/analytics/ExecutiveDecisionCentre";`,
  1,
);

const replacement = `      ) : tab === "growth" ? (
        <TrendPerformanceAnalytics
          overview={data as any}
          campaignReadiness={campaignReadiness}
          onRefresh={() => void load()}
        />
      ) : tab === "intelligence" ? (
        <ExecutiveDecisionCentre
          overview={data as any}
          campaignReadiness={campaignReadiness}
        />
      ) : tab === "executive" ? (`;

text = text.replace(growthBranch, replacement, 1);
fs.writeFileSync(analyticsPath, text);

const verify = fs.readFileSync(analyticsPath, "utf8");
const checks = [
  verify.includes("ExecutiveDecisionCentre"),
  verify.includes('tab === "intelligence"'),
  verify.includes("campaignReadiness={campaignReadiness}"),
  fs.existsSync(targetComponent),
];

if (checks.some((check) => !check)) {
  fs.copyFileSync(path.join(backupDir, "analytics.tsx"), analyticsPath);
  fs.rmSync(targetComponent, { force: true });
  fail("Verification failed. Original Analytics page restored.");
}

console.log(`
[OK] Phase 9C ZIP C.3 installed.

Added:
  ${targetComponent}

Modified:
  ${analyticsPath}

Backup:
  ${backupDir}

Features:
  - Executive Decision Centre
  - Prioritized campaign decisions
  - High-risk ward ranking
  - High-opportunity ward ranking
  - Resource deployment guidance
  - Rule-based strategic recommendations
  - One-click operational shortcuts

Next:
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
