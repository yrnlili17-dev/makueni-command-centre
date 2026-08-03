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
  "files/CampaignExecutiveOperations.tsx",
);

const targetComponent = path.join(
  cwd,
  "artifacts/commandcentre/src/components/campaign-plan/CampaignExecutiveOperations.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase9b2-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [pagePath, sourceComponent]) {
  if (!fs.existsSync(file)) fail(`Required file missing: ${file}`);
}

let page = fs.readFileSync(pagePath, "utf8");

if (page.includes("CampaignExecutiveOperations")) {
  fail("Phase 9B.2 is already installed.");
}

const importAnchor = 'import { CAMPAIGN_UI } from "../config/campaign-ui";';
const overviewAnchor = `        {/* ─── OVERVIEW ─── */}
        {tab === "overview" && (
          <div className="space-y-4">`;

if (!page.includes(importAnchor)) {
  fail("CAMPAIGN_UI import anchor not found.");
}

if (!page.includes(overviewAnchor)) {
  fail("Exact Overview insertion anchor not found. No files were modified.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(pagePath, path.join(backupDir, "campaign-plan.tsx"));

if (fs.existsSync(targetComponent)) {
  fs.copyFileSync(
    targetComponent,
    path.join(backupDir, "CampaignExecutiveOperations.tsx"),
  );
}

fs.mkdirSync(path.dirname(targetComponent), { recursive: true });
fs.copyFileSync(sourceComponent, targetComponent);

page = page.replace(
  importAnchor,
  `${importAnchor}
import CampaignExecutiveOperations from "../components/campaign-plan/CampaignExecutiveOperations";`,
  1,
);

const inserted = `${overviewAnchor}
            <CampaignExecutiveOperations
              milestones={(milestones ?? []) as any[]}
              readiness={readiness as any}
              countdown={countdown as any}
              alerts={alerts}
              onOpenMilestone={(milestone) => {
                setTab("milestones");
                setEditingId(milestone.id);
                setEditForm({
                  title: milestone.title,
                  dueDate: milestone.dueDate,
                  category: milestone.category,
                  status: milestone.status,
                  priority: milestone.priority ?? "medium",
                  owner: milestone.owner,
                });
              }}
            />`;

page = page.replace(overviewAnchor, inserted, 1);
fs.writeFileSync(pagePath, page);

const verify = fs.readFileSync(pagePath, "utf8");
const count = (verify.match(/CampaignExecutiveOperations/g) ?? []).length;

if (count !== 3 || !fs.existsSync(targetComponent)) {
  fs.copyFileSync(path.join(backupDir, "campaign-plan.tsx"), pagePath);
  if (fs.existsSync(targetComponent)) fs.rmSync(targetComponent);
  fail("Verification failed. Original page restored.");
}

console.log(`
[OK] Phase 9B.2 installed.

Added:
  ${targetComponent}

Modified:
  ${pagePath}

Backup:
  ${backupDir}

Features:
  - Executive KPI strip
  - Live campaign health
  - Category progress
  - Executive risk panel
  - Critical milestone timeline
  - Click-through to milestone editor

Next:
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
