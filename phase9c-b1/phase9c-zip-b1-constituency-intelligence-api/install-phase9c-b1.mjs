#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();

const routePath = path.join(
  cwd,
  "artifacts/api-server/src/routes/dashboard-intelligence.ts",
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase9c-b1-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

if (!fs.existsSync(routePath)) {
  fail(`Route file not found: ${routePath}`);
}

let text = fs.readFileSync(routePath, "utf8");

if (
  text.includes("constituency_readiness") &&
  text.includes("constituencies:(ctr as any).rows")
) {
  fail("Phase 9C ZIP B.1 is already installed.");
}

const wardQueryAnchor = `  const wr = await db.execute(sql\`
    SELECT ward, count(*)::integer AS constituents,
      count(*) FILTER (WHERE phone IS NOT NULL AND phone <> '')::integer AS phone_ready,
      count(*) FILTER (WHERE gender='female')::integer AS women
    FROM campaign_constituents
    WHERE ward IS NOT NULL AND ward <> ''
    GROUP BY ward ORDER BY constituents DESC, ward LIMIT 12
  \`);`;

const constituencyQuery = `  const wr = await db.execute(sql\`
    SELECT ward, count(*)::integer AS constituents,
      count(*) FILTER (WHERE phone IS NOT NULL AND phone <> '')::integer AS phone_ready,
      count(*) FILTER (WHERE gender='female')::integer AS women
    FROM campaign_constituents
    WHERE ward IS NOT NULL AND ward <> ''
    GROUP BY ward ORDER BY constituents DESC, ward LIMIT 12
  \`);

  const ctr = await db.execute(sql\`
    WITH constituency_base AS (
      SELECT
        constituency,
        phone,
        email,
        gender,
        dob,
        ward,
        polling_station,
        support_level,
        CASE
          WHEN dob IS NULL THEN NULL
          ELSE date_part('year', age(current_date, dob))::integer
        END AS age_years
      FROM campaign_constituents
      WHERE constituency IS NOT NULL
        AND btrim(constituency) <> ''
    )
    SELECT
      constituency,
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
      count(DISTINCT ward) FILTER (
        WHERE ward IS NOT NULL AND btrim(ward) <> ''
      )::integer AS wards,
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
      count(*) FILTER (
        WHERE ward IS NULL OR btrim(ward) = ''
      )::integer AS missing_ward,
      CASE
        WHEN count(*) = 0 THEN 0
        ELSE round(
          (
            (
              count(*) FILTER (
                WHERE phone IS NOT NULL AND btrim(phone) <> ''
              )
            )::numeric / count(*)::numeric
          ) * 60
          +
          (
            (
              count(*) FILTER (
                WHERE ward IS NOT NULL AND btrim(ward) <> ''
              )
            )::numeric / count(*)::numeric
          ) * 40
        )::integer
      END AS constituency_readiness
    FROM constituency_base
    GROUP BY constituency
    ORDER BY constituents DESC, constituency
  \`);`;

if (!text.includes(wardQueryAnchor)) {
  fail(
    "Ward aggregation anchor was not found. No files were modified.",
  );
}

const responseAnchor = `    wards:(wr as any).rows ?? [], recentImports:(ir as any).rows ?? [],`;

const responseReplacement = `    wards:(wr as any).rows ?? [],
    constituencies:(ctr as any).rows ?? [],
    recentImports:(ir as any).rows ?? [],`;

if (!text.includes(responseAnchor)) {
  fail(
    "Overview response anchor was not found. No files were modified.",
  );
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(routePath, path.join(backupDir, "dashboard-intelligence.ts"));

text = text.replace(wardQueryAnchor, constituencyQuery, 1);
text = text.replace(responseAnchor, responseReplacement, 1);

fs.writeFileSync(routePath, text);

const verify = fs.readFileSync(routePath, "utf8");

const checks = [
  verify.includes("constituency_readiness"),
  verify.includes("constituencies:(ctr as any).rows"),
  verify.includes("strong_support"),
  verify.includes("polling_stations"),
  verify.includes("missing_ward"),
];

if (checks.some((check) => !check)) {
  fs.copyFileSync(
    path.join(backupDir, "dashboard-intelligence.ts"),
    routePath,
  );
  fail(
    "Installation verification failed. The original route was restored.",
  );
}

console.log(`
[OK] Phase 9C ZIP B.1 installed.

Modified:
  ${routePath}

Backup:
  ${backupDir}

The overview endpoint now returns:
  - constituency
  - constituents
  - phone_ready
  - email_ready
  - women
  - men
  - youth
  - wards
  - polling_stations
  - strong_support
  - leaning_support
  - undecided
  - opposed
  - missing_phone
  - missing_ward
  - constituency_readiness

Next:
  pnpm --filter @workspace/api-server build
`);
