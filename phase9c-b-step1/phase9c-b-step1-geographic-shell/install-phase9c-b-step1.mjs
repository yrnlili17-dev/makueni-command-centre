#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const target = path.join(
  cwd,
  "artifacts/commandcentre/src/pages/analytics.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(
  cwd,
  `.phase9c-b-step1-backup-${stamp}`,
);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

if (!fs.existsSync(target)) {
  fail(`Analytics page not found: ${target}`);
}

let text = fs.readFileSync(target, "utf8");

if (
  text.includes('"geography"') &&
  text.includes("GEOGRAPHIC INTELLIGENCE") &&
  text.includes("Live constituency, ward and polling station analytics")
) {
  fail("Phase 9C ZIP B Step 1 is already installed.");
}

const original = text;

const typeAnchor = `type Tab =
  | "executive"
  | "growth"`;

const typeReplacement = `type Tab =
  | "executive"
  | "geography"
  | "growth"`;

const tabsAnchor = `const TABS: Array<{ id: Tab; label: string }> = [
  { id: "executive", label: "EXECUTIVE" },
  { id: "growth", label: "GROWTH" },`;

const tabsReplacement = `const TABS: Array<{ id: Tab; label: string }> = [
  { id: "executive", label: "EXECUTIVE" },
  { id: "geography", label: "GEOGRAPHIC INTELLIGENCE" },
  { id: "growth", label: "GROWTH" },`;

const executiveCloseAnchor = `          </section>
        </>
      ) : (
        <section className="border border-border bg-card p-10 text-center">`;

const geographicPanel = `          </section>
        </>
      ) : tab === "geography" ? (
        <section className="space-y-4">
          <div className="border border-border bg-card p-4">
            <div>
              <p className="font-mono text-[10px] tracking-widest text-primary">
                GEOGRAPHIC INTELLIGENCE
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Live constituency, ward and polling station analytics will appear here in Phase 9C ZIP B.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <article className="border border-border bg-card p-4">
              <p className="font-mono text-[9px] text-muted-foreground">
                CONSTITUENCIES
              </p>
              <p className="mt-3 text-sm font-medium">
                Constituency Intelligence
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Live constituency totals, support distribution and data completeness will be connected in Step 2.
              </p>
            </article>

            <article className="border border-border bg-card p-4">
              <p className="font-mono text-[9px] text-muted-foreground">
                WARDS
              </p>
              <p className="mt-3 text-sm font-medium">
                Ward Intelligence
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                All 30 wards, rankings, coverage and drill-down navigation will be activated in Step 3.
              </p>
            </article>

            <article className="border border-border bg-card p-4">
              <p className="font-mono text-[9px] text-muted-foreground">
                POLLING STATIONS
              </p>
              <p className="mt-3 text-sm font-medium">
                Polling Station Intelligence
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Polling-station coverage, coordinators and field activity will be connected in Step 4.
              </p>
            </article>
          </div>
        </section>
      ) : (
        <section className="border border-border bg-card p-10 text-center">`;

if (!text.includes(typeAnchor)) {
  fail("Tab type anchor was not found. No file was changed.");
}

if (!text.includes(tabsAnchor)) {
  fail("Tabs array anchor was not found. No file was changed.");
}

if (!text.includes(executiveCloseAnchor)) {
  fail("Analytics panel insertion anchor was not found. No file was changed.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(target, path.join(backupDir, "analytics.tsx"));

text = text.replace(typeAnchor, typeReplacement, 1);
text = text.replace(tabsAnchor, tabsReplacement, 1);
text = text.replace(executiveCloseAnchor, geographicPanel, 1);

fs.writeFileSync(target, text);

const verify = fs.readFileSync(target, "utf8");

const checks = [
  verify.includes('| "geography"'),
  verify.includes('{ id: "geography", label: "GEOGRAPHIC INTELLIGENCE" }'),
  verify.includes("Live constituency, ward and polling station analytics"),
  verify.includes("Constituency Intelligence"),
  verify.includes("Ward Intelligence"),
  verify.includes("Polling Station Intelligence"),
];

if (checks.some((check) => !check)) {
  fs.copyFileSync(path.join(backupDir, "analytics.tsx"), target);
  fail("Installation verification failed. Original analytics page restored.");
}

console.log(`
[OK] Phase 9C ZIP B Step 1 installed.

Modified:
  ${target}

Backup:
  ${backupDir}

Added:
  - Geographic Intelligence tab
  - Constituency Intelligence shell
  - Ward Intelligence shell
  - Polling Station Intelligence shell
  - Automatic verification and rollback protection

Next:
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
