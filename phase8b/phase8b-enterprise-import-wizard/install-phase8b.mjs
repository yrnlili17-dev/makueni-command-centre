#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cwd = process.cwd();
const packageDir = path.dirname(fileURLToPath(import.meta.url));

const frontendRoot = path.join(
  cwd,
  "artifacts/commandcentre/src",
);

const componentDir = path.join(
  frontendRoot,
  "components/data-import",
);

const componentTarget = path.join(
  componentDir,
  "DataImportWizardV8B.tsx",
);

const componentSource = path.join(
  packageDir,
  "files/DataImportWizardV8B.tsx",
);

const wrapperSource = path.join(
  packageDir,
  "files/data-management-page.tsx",
);

const candidates = [
  path.join(frontendRoot, "pages/data-management.tsx"),
  path.join(frontendRoot, "pages/data-management-centre.tsx"),
  path.join(frontendRoot, "pages/data-management-center.tsx"),
  path.join(frontendRoot, "pages/import.tsx"),
];

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.phase8b-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [componentSource, wrapperSource]) {
  if (!fs.existsSync(file)) fail(`Package file missing: ${file}`);
}

let pageTarget = candidates.find((file) => fs.existsSync(file));

if (!pageTarget) {
  const pagesDir = path.join(frontendRoot, "pages");
  const files = fs.existsSync(pagesDir)
    ? fs.readdirSync(pagesDir)
        .filter((name) => name.endsWith(".tsx"))
        .map((name) => path.join(pagesDir, name))
    : [];

  pageTarget = files.find((file) => {
    const text = fs.readFileSync(file, "utf8");
    return (
      text.includes("Data Management Centre") ||
      text.includes("Data Management Center") ||
      text.includes("SELECT CSV") ||
      text.includes("Select CSV")
    );
  });
}

if (!pageTarget) {
  fail(
    "Could not locate the current Data Management page. Run: grep -RIl 'Data Management Centre\\|SELECT CSV' artifacts/commandcentre/src/pages",
  );
}

const existingPage = fs.readFileSync(pageTarget, "utf8");

if (existingPage.includes("DataImportWizardV8B")) {
  fail("Phase 8B is already installed.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(
  pageTarget,
  path.join(backupDir, path.basename(pageTarget)),
);

if (fs.existsSync(componentTarget)) {
  fs.copyFileSync(
    componentTarget,
    path.join(backupDir, "DataImportWizardV8B.tsx"),
  );
}

fs.mkdirSync(componentDir, { recursive: true });
fs.copyFileSync(componentSource, componentTarget);

const relativeImport = path.relative(
  path.dirname(pageTarget),
  componentTarget,
).replaceAll(path.sep, "/");

const importPath = relativeImport.startsWith(".")
  ? relativeImport.replace(/\.tsx$/, "")
  : `./${relativeImport.replace(/\.tsx$/, "")}`;

const wrapper = `import DataImportWizardV8B from "${importPath}";

export default function DataManagementPage() {
  return <DataImportWizardV8B />;
}
`;

fs.writeFileSync(pageTarget, wrapper);

console.log(`
[OK] Phase 8B Enterprise Import Wizard installed.

Backup:
  ${backupDir}

Added:
  ${componentTarget}

Replaced page:
  ${pageTarget}

Next:
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
