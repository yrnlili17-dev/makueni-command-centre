#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));

const routePath = path.join(
  cwd,
  "artifacts/api-server/src/routes/dashboard-intelligence.ts",
);
const analyticsPath = path.join(
  cwd,
  "artifacts/commandcentre/src/pages/analytics.tsx",
);
const componentPath = path.join(
  cwd,
  "artifacts/commandcentre/src/components/analytics/GeographicIntelligence.tsx",
);
const sourceComponent = path.join(
  packageDir,
  "files/GeographicIntelligence.tsx",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase9c-b3-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [
  routePath,
  analyticsPath,
  componentPath,
  sourceComponent,
]) {
  if (!fs.existsSync(file)) fail(`Required file missing: ${file}`);
}

let route = fs.readFileSync(routePath, "utf8");
let analytics = fs.readFileSync(analyticsPath, "utf8");

if (
  route.includes("ward_readiness") &&
  analytics.includes("wards={(data as any)?.wards ?? []}")
) {
  fail("Phase 9C ZIP B.3 is already installed.");
}

const oldWardQuery = `  const wr = await db.execute(sql\`
    SELECT ward, count(*)::integer AS constituents,
      count(*) FILTER (WHERE phone IS NOT NULL AND phone <> '')::integer AS phone_ready,
      count(*) FILTER (WHERE gender='female')::integer AS women
    FROM campaign_constituents
    WHERE ward IS NOT NULL AND ward <> ''
    GROUP BY ward ORDER BY constituents DESC, ward LIMIT 12
  \`);`;

const newWardQuery = `  const wr = await db.execute(sql\`
    WITH ward_base AS (
      SELECT
        ward,
        constituency,
        phone,
        email,
        gender,
        dob,
        polling_station,
        support_level,
        CASE
          WHEN dob IS NULL THEN NULL
          ELSE date_part('year', age(current_date, dob))::integer
        END AS age_years
      FROM campaign_constituents
      WHERE ward IS NOT NULL AND btrim(ward) <> ''
    )
    SELECT
      ward,
      max(constituency) AS constituency,
      count(*)::integer AS constituents,
      count(*) FILTER (
        WHERE phone IS NOT NULL AND btrim(phone) <> ''
      )::integer AS phone_ready,
      count(*) FILTER (
        WHERE email IS NOT NULL AND btrim(email) <> ''
      )::integer AS email_ready,
      count(*) FILTER (WHERE gender = 'female')::integer AS women,
      count(*) FILTER (WHERE gender = 'male')::integer AS men,
      count(*) FILTER (
        WHERE age_years BETWEEN 18 AND 35
      )::integer AS youth,
      count(DISTINCT polling_station) FILTER (
        WHERE polling_station IS NOT NULL
          AND btrim(polling_station) <> ''
      )::integer AS polling_stations,
      count(*) FILTER (
        WHERE support_level = 'strong'
      )::integer AS strong_support,
      count(*) FILTER (
        WHERE support_level = 'leaning'
      )::integer AS leaning_support,
      count(*) FILTER (
        WHERE support_level = 'undecided'
      )::integer AS undecided,
      count(*) FILTER (
        WHERE support_level = 'opposed'
      )::integer AS opposed,
      count(*) FILTER (
        WHERE phone IS NULL OR btrim(phone) = ''
      )::integer AS missing_phone,
      CASE
        WHEN count(*) = 0 THEN 0
        ELSE round(
          (
            count(*) FILTER (
              WHERE phone IS NOT NULL AND btrim(phone) <> ''
            )
          )::numeric / count(*)::numeric * 70
          +
          (
            count(*) FILTER (
              WHERE constituency IS NOT NULL
                AND btrim(constituency) <> ''
            )
          )::numeric / count(*)::numeric * 30
        )::integer
      END AS ward_readiness
    FROM ward_base
    GROUP BY ward
    ORDER BY constituents DESC, ward
  \`);`;

if (!route.includes(oldWardQuery)) {
  fail("Ward query anchor not found. No files were modified.");
}

const oldUsage = `        <GeographicIntelligence
          constituencies={(data as any)?.constituencies ?? []}
        />`;

const newUsage = `        <GeographicIntelligence
          constituencies={(data as any)?.constituencies ?? []}
          wards={(data as any)?.wards ?? []}
        />`;

if (!analytics.includes(oldUsage)) {
  fail("Geographic component usage anchor not found.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(routePath, path.join(backupDir, "dashboard-intelligence.ts"));
fs.copyFileSync(analyticsPath, path.join(backupDir, "analytics.tsx"));
fs.copyFileSync(componentPath, path.join(backupDir, "GeographicIntelligence.tsx"));

route = route.replace(oldWardQuery, newWardQuery, 1);
analytics = analytics.replace(oldUsage, newUsage, 1);

fs.writeFileSync(routePath, route);
fs.writeFileSync(analyticsPath, analytics);
fs.copyFileSync(sourceComponent, componentPath);

const checks = [
  fs.readFileSync(routePath, "utf8").includes("ward_readiness"),
  !fs.readFileSync(routePath, "utf8").includes("LIMIT 12"),
  fs.readFileSync(analyticsPath, "utf8").includes(
    "wards={(data as any)?.wards ?? []}",
  ),
  fs.readFileSync(componentPath, "utf8").includes("WARD INTELLIGENCE"),
  fs.readFileSync(componentPath, "utf8").includes("OPEN WARD DATABASE"),
];

if (checks.some((value) => !value)) {
  fs.copyFileSync(path.join(backupDir, "dashboard-intelligence.ts"), routePath);
  fs.copyFileSync(path.join(backupDir, "analytics.tsx"), analyticsPath);
  fs.copyFileSync(
    path.join(backupDir, "GeographicIntelligence.tsx"),
    componentPath,
  );
  fail("Verification failed. Original files restored.");
}

console.log(`
[OK] Phase 9C ZIP B.3 installed.

Modified:
  ${routePath}
  ${analyticsPath}
  ${componentPath}

Backup:
  ${backupDir}

Next:
  pnpm --filter @workspace/api-server build
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
