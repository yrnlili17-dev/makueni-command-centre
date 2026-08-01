#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();
const pagePath = path.join(
  cwd,
  "artifacts/commandcentre/src/pages/intelligence.tsx",
);
const componentDir = path.join(
  cwd,
  "artifacts/commandcentre/src/components/intelligence",
);
const componentPath = path.join(
  componentDir,
  "IncidentOperationsV6.tsx",
);
const packageDir = path.dirname(fileURLToPath(import.meta.url));
const sourceComponent = path.join(
  packageDir,
  "files/IncidentOperationsV6.tsx",
);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase6-zip-b-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [pagePath, sourceComponent]) {
  if (!fs.existsSync(file)) fail(`Required file not found: ${file}`);
}

let page = fs.readFileSync(pagePath, "utf8");

if (page.includes("IncidentOperationsV6")) {
  fail("Phase 6 ZIP B is already installed.");
}

if (!page.includes('type Tab =')) {
  fail('Could not locate the "type Tab =" declaration.');
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(pagePath, path.join(backupDir, "intelligence.tsx"));

fs.mkdirSync(componentDir, { recursive: true });
fs.copyFileSync(sourceComponent, componentPath);

/* Import component after the React import */
const reactImport =
  'import { useState, useEffect, useCallback } from "react";';

if (!page.includes(reactImport)) {
  fail("Could not locate the expected React import.");
}

page = page.replace(
  reactImport,
  `${reactImport}\nimport IncidentOperationsV6 from "../components/intelligence/IncidentOperationsV6";`,
);

/* Add the incidents tab to the Tab union */
page = page.replace(
  /type Tab = ([^;]+);/,
  (match, union) => {
    if (union.includes('"incidents"')) return match;
    return `type Tab = ${union} | "incidents";`;
  },
);

/* Add the tab button after LIVE FEED */
const feedTabPattern =
  /(\{\s*id:\s*"feed",\s*label:\s*"LIVE FEED",[\s\S]*?\},)/;

if (!feedTabPattern.test(page)) {
  fail("Could not locate the LIVE FEED tab definition.");
}

page = page.replace(
  feedTabPattern,
  `$1\n    { id: "incidents", label: "INCIDENT OPS", icon: <ShieldAlert className="w-3 h-3" /> },`,
);

/* Ensure ShieldAlert is imported from lucide-react */
if (!/\bShieldAlert\b/.test(page.split("\n").slice(0, 80).join("\n"))) {
  const lucideStart = page.indexOf('from "lucide-react";');
  if (lucideStart === -1) fail("Could not locate lucide-react import.");

  const importBlockStart = page.lastIndexOf("import {", lucideStart);
  const importBlockEnd = page.indexOf("}", importBlockStart);
  const importBlock = page.slice(importBlockStart, importBlockEnd + 1);

  if (!importBlock.includes("ShieldAlert")) {
    const updated = importBlock.replace("{", "{\n  ShieldAlert,");
    page =
      page.slice(0, importBlockStart) +
      updated +
      page.slice(importBlockEnd + 1);
  }
}

/* Insert the new render block before the Response Queue marker */
const marker = "      {/* ── RESPONSE QUEUE V5 ── */}";
const fallbackMarker = "      {/* ── RESPONSE QUEUE ── */}";
const targetMarker = page.includes(marker)
  ? marker
  : page.includes(fallbackMarker)
    ? fallbackMarker
    : null;

if (!targetMarker) {
  fail("Could not locate the Response Queue section.");
}

const incidentBlock = `      {/* ── PHASE 6 INCIDENT OPERATIONS ── */}
      {tab === "incidents" && <IncidentOperationsV6 />}

`;

page = page.replace(targetMarker, incidentBlock + targetMarker);

fs.writeFileSync(pagePath, page);

console.log(`
[OK] Phase 6 ZIP B installed.

Backup:
  ${backupDir}

Added:
  ${componentPath}

Modified:
  ${pagePath}

New UI:
  Narrative Command → INCIDENT OPS

Next:
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
