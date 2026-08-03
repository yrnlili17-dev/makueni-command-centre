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
  "files/GeographicIntelligence.tsx",
);

const targetComponent = path.join(
  cwd,
  "artifacts/commandcentre/src/components/analytics/GeographicIntelligence.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase9c-b2-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [analyticsPath, sourceComponent]) {
  if (!fs.existsSync(file)) {
    fail(`Required file missing: ${file}`);
  }
}

let text = fs.readFileSync(analyticsPath, "utf8");

if (text.includes("GeographicIntelligence")) {
  fail("Phase 9C ZIP B.2 is already installed.");
}

const importAnchor =
  'import { useCallback, useEffect, useMemo, useState } from "react";';

const geographyStart = '      ) : tab === "geography" ? (';
const geographyEnd =
  '      ) : (\n        <section className="border border-border bg-card p-10 text-center">';

if (!text.includes(importAnchor)) {
  fail("React import anchor was not found.");
}

const startIndex = text.indexOf(geographyStart);
const endIndex = text.indexOf(
  geographyEnd,
  startIndex + geographyStart.length,
);

if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
  fail(
    "Geographic shell boundaries were not found. No files were modified.",
  );
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(
  analyticsPath,
  path.join(backupDir, "analytics.tsx"),
);

if (fs.existsSync(targetComponent)) {
  fs.copyFileSync(
    targetComponent,
    path.join(backupDir, "GeographicIntelligence.tsx"),
  );
}

fs.mkdirSync(path.dirname(targetComponent), { recursive: true });
fs.copyFileSync(sourceComponent, targetComponent);

text = text.replace(
  importAnchor,
  `${importAnchor}
import GeographicIntelligence from "../components/analytics/GeographicIntelligence";`,
  1,
);

const replacement = `      ) : tab === "geography" ? (
        <GeographicIntelligence
          constituencies={(data as any)?.constituencies ?? []}
        />
`;

text =
  text.slice(0, startIndex) +
  replacement +
  text.slice(endIndex);

fs.writeFileSync(analyticsPath, text);

const verify = fs.readFileSync(analyticsPath, "utf8");

const count =
  (verify.match(/GeographicIntelligence/g) ?? []).length;

const checks = [
  count === 3,
  fs.existsSync(targetComponent),
  verify.includes(
    'constituencies={(data as any)?.constituencies ?? []}',
  ),
];

if (checks.some((check) => !check)) {
  fs.copyFileSync(
    path.join(backupDir, "analytics.tsx"),
    analyticsPath,
  );

  if (fs.existsSync(targetComponent)) {
    fs.rmSync(targetComponent);
  }

  fail(
    "Installation verification failed. Original Analytics page restored.",
  );
}

console.log(`
[OK] Phase 9C ZIP B.2 installed.

Added:
  ${targetComponent}

Modified:
  ${analyticsPath}

Backup:
  ${backupDir}

Features:
  - Six Makueni constituency cards
  - Live constituent and coverage metrics
  - Support classification
  - Constituency readiness status
  - Executive geographic rankings
  - Click-through to filtered Campaign Database

Next:
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
