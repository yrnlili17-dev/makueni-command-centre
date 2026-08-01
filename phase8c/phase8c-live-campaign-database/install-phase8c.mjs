#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));

const frontendRoot = path.join(cwd, "artifacts/commandcentre/src");
const routesIndex = path.join(cwd, "artifacts/api-server/src/routes/index.ts");
const backendTarget = path.join(
  cwd,
  "artifacts/api-server/src/routes/campaign-database.ts",
);

const sharedTarget = path.join(
  frontendRoot,
  "components/data-intelligence/ConstituentDatabaseV8C.tsx",
);
const segmentsTarget = path.join(
  frontendRoot,
  "components/data-intelligence/AudienceSegmentationV8C.tsx",
);

const backendSource = path.join(packageDir, "files/campaign-database.ts");
const sharedSource = path.join(packageDir, "files/ConstituentDatabaseV8C.tsx");
const segmentsSource = path.join(packageDir, "files/AudienceSegmentationV8C.tsx");

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase8c-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [
  routesIndex,
  backendSource,
  sharedSource,
  segmentsSource,
]) {
  if (!fs.existsSync(file)) fail(`Required file not found: ${file}`);
}

function findPage(candidates, patterns) {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  const pagesDir = path.join(frontendRoot, "pages");
  if (!fs.existsSync(pagesDir)) return null;

  for (const name of fs.readdirSync(pagesDir)) {
    if (!name.endsWith(".tsx")) continue;
    const file = path.join(pagesDir, name);
    const text = fs.readFileSync(file, "utf8");
    if (patterns.some((pattern) => text.includes(pattern))) return file;
  }

  return null;
}

const membersPage = findPage(
  [
    path.join(frontendRoot, "pages/members.tsx"),
    path.join(frontendRoot, "pages/voters.tsx"),
  ],
  ["IDENTITY GRAPH", "NO_CONTACTS_FOUND", "Add Operative"],
);

const databasePage = findPage(
  [
    path.join(frontendRoot, "pages/voters-db.tsx"),
    path.join(frontendRoot, "pages/constituent-database.tsx"),
  ],
  ["Constituent Database", "VOTER ROLL", "CLICK SEARCH TO LOAD VOTER ROLL"],
);

const segmentsPage = findPage(
  [path.join(frontendRoot, "pages/segments.tsx")],
  ["AUDIENCE SEGMENTATION", "NO_SEGMENTS_IN_CATEGORY"],
);

if (!membersPage) fail("Could not locate the Members/Voters page.");
if (!databasePage) fail("Could not locate the Constituent Database page.");
if (!segmentsPage) fail("Could not locate the Segmentation page.");

fs.mkdirSync(backupDir, { recursive: true });

for (const file of [
  routesIndex,
  membersPage,
  databasePage,
  segmentsPage,
]) {
  fs.copyFileSync(file, path.join(backupDir, path.basename(file)));
}

for (const file of [backendTarget, sharedTarget, segmentsTarget]) {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(backupDir, path.basename(file)));
  }
}

fs.mkdirSync(path.dirname(sharedTarget), { recursive: true });
fs.copyFileSync(backendSource, backendTarget);
fs.copyFileSync(sharedSource, sharedTarget);
fs.copyFileSync(segmentsSource, segmentsTarget);

let index = fs.readFileSync(routesIndex, "utf8");

if (!index.includes('from "./campaign-database"')) {
  const importAnchor = 'import commandCentreRouter from "./command-centre";';
  if (!index.includes(importAnchor)) {
    fail("Could not locate command-centre router import.");
  }

  index = index.replace(
    importAnchor,
    `${importAnchor}\nimport campaignDatabaseRouter from "./campaign-database";`,
  );
}

if (!index.includes('router.use("/campaign-database"')) {
  const mountAnchor = 'router.use("/command-centre", commandCentreRouter);';
  if (!index.includes(mountAnchor)) {
    fail("Could not locate command-centre router mount.");
  }

  index = index.replace(
    mountAnchor,
    `${mountAnchor}\nrouter.use("/campaign-database", campaignDatabaseRouter);`,
  );
}

fs.writeFileSync(routesIndex, index);

function wrapperFor(page, component, title, subtitle) {
  const relative = path
    .relative(path.dirname(page), component)
    .replaceAll(path.sep, "/")
    .replace(/\.tsx$/, "");
  const importPath = relative.startsWith(".") ? relative : `./${relative}`;

  return `import { ConstituentDatabaseV8C } from "${importPath}";

export default function Phase8CPage() {
  return (
    <ConstituentDatabaseV8C
      title=${JSON.stringify(title)}
      subtitle=${JSON.stringify(subtitle)}
    />
  );
}
`;
}

fs.writeFileSync(
  membersPage,
  wrapperFor(
    membersPage,
    sharedTarget,
    "Identity Graph",
    "Searchable campaign members, contacts, consent and interaction history",
  ),
);

fs.writeFileSync(
  databasePage,
  wrapperFor(
    databasePage,
    sharedTarget,
    "Constituent Database",
    "Master voter and constituent register",
  ),
);

const segmentsRelative = path
  .relative(path.dirname(segmentsPage), segmentsTarget)
  .replaceAll(path.sep, "/")
  .replace(/\.tsx$/, "");
const segmentsImport = segmentsRelative.startsWith(".")
  ? segmentsRelative
  : `./${segmentsRelative}`;

fs.writeFileSync(
  segmentsPage,
  `import AudienceSegmentationV8C from "${segmentsImport}";

export default function Phase8CSegmentsPage() {
  return <AudienceSegmentationV8C />;
}
`,
);

console.log(`
[OK] Phase 8C Live Campaign Database installed.

Backup:
  ${backupDir}

Added backend:
  ${backendTarget}

Added frontend:
  ${sharedTarget}
  ${segmentsTarget}

Replaced pages:
  ${membersPage}
  ${databasePage}
  ${segmentsPage}

Next:
  pnpm --filter @workspace/api-server build
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
