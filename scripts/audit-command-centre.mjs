import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FRONTEND = path.join(ROOT, "artifacts/commandcentre/src");
const BACKEND = path.join(ROOT, "artifacts/api-server/src");

function walk(dir, extensions = [".tsx", ".ts", ".jsx", ".js"]) {
  if (!fs.existsSync(dir)) return [];

  const results = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === "build"
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      results.push(...walk(fullPath, extensions));
    } else if (extensions.includes(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }

  return results;
}

function relative(file) {
  return path.relative(ROOT, file);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function lineNumber(content, index) {
  return content.slice(0, index).split("\n").length;
}

function addIssue(issues, severity, category, file, line, message, evidence = "") {
  issues.push({
    severity,
    category,
    file: relative(file),
    line,
    message,
    evidence: evidence.trim().replace(/\s+/g, " ").slice(0, 220),
  });
}

const frontendFiles = walk(FRONTEND);
const backendFiles = walk(BACKEND);

const issues = [];
const frontendRoutes = new Set();
const navigationPaths = new Set();
const frontendApiCalls = new Set();
const backendRoutes = new Set();
const pages = [];

for (const file of frontendFiles) {
  const content = read(file);

  if (file.includes(`${path.sep}pages${path.sep}`) && file.endsWith(".tsx")) {
    pages.push(relative(file));
  }

  // React Router routes
  for (const match of content.matchAll(/path\s*=\s*["'`]([^"'`]+)["'`]/g)) {
    frontendRoutes.add(match[1]);
  }

  // Navigation href/to values
  for (const match of content.matchAll(
    /(?:to|href)\s*=\s*["'`]([^"'`]+)["'`]/g
  )) {
    const value = match[1];
    if (value.startsWith("/")) navigationPaths.add(value);
  }

  // navigate("/...")
  for (const match of content.matchAll(
    /navigate\s*\(\s*["'`]([^"'`]+)["'`]/g
  )) {
    navigationPaths.add(match[1]);
  }

  // API calls
  for (const match of content.matchAll(
    /(?:fetch|apiFetch)\s*\(\s*(?:`\$\{BASE\})?["'`]?([^"'`\s)]+)/g
  )) {
    const endpoint = match[1]
      .replace(/^\$\{BASE\}/, "")
      .replace(/^api/, "/api")
      .split("?")[0];

    if (endpoint.includes("/api/")) frontendApiCalls.add(endpoint);
  }

  // TODOs/placeholders
  for (const pattern of [
    /TODO/gi,
    /FIXME/gi,
    /COMING[_\s-]?SOON/gi,
    /NOT[_\s-]?IMPLEMENTED/gi,
    /PLACEHOLDER/gi,
    /MOCK[_\s-]?DATA/gi,
  ]) {
    for (const match of content.matchAll(pattern)) {
      addIssue(
        issues,
        "medium",
        "placeholder",
        file,
        lineNumber(content, match.index),
        `Potential unfinished implementation: ${match[0]}`,
        content.split("\n")[lineNumber(content, match.index) - 1] ?? ""
      );
    }
  }

  // Buttons lacking obvious handlers
  for (const match of content.matchAll(/<button\b([^>]*)>/g)) {
    const attrs = match[1];

    if (
      !/onClick\s*=/.test(attrs) &&
      !/type\s*=\s*["']submit["']/.test(attrs) &&
      !/disabled/.test(attrs)
    ) {
      addIssue(
        issues,
        "high",
        "non-clickable-button",
        file,
        lineNumber(content, match.index),
        "Button has no onClick handler and is not a submit button.",
        match[0]
      );
    }
  }

  // Button components lacking obvious handlers
  for (const match of content.matchAll(/<Button\b([^>]*)>/g)) {
    const attrs = match[1];

    if (
      !/onClick\s*=/.test(attrs) &&
      !/asChild/.test(attrs) &&
      !/type\s*=\s*["']submit["']/.test(attrs) &&
      !/disabled/.test(attrs)
    ) {
      addIssue(
        issues,
        "high",
        "non-clickable-button-component",
        file,
        lineNumber(content, match.index),
        "Button component has no onClick, asChild, submit behavior, or disabled state.",
        match[0]
      );
    }
  }

  // Cursor-pointer without interaction
  for (const match of content.matchAll(
    /<(div|section|article|span)\b([^>]*)className\s*=\s*["'`][^"'`]*cursor-pointer[^"'`]*["'`]([^>]*)>/g
  )) {
    const full = match[0];

    if (
      !/onClick\s*=/.test(full) &&
      !/role\s*=\s*["']button["']/.test(full) &&
      !/tabIndex\s*=/.test(full)
    ) {
      addIssue(
        issues,
        "high",
        "fake-clickable-element",
        file,
        lineNumber(content, match.index),
        "Element uses cursor-pointer but has no click handler.",
        full
      );
    }
  }

  // Static StatCard-style usage without a destination
  for (const match of content.matchAll(/<StatCard\b([^>]*)\/>/g)) {
    const attrs = match[1];

    if (
      !/onClick\s*=/.test(attrs) &&
      !/(to|href|route|path)\s*=/.test(attrs)
    ) {
      addIssue(
        issues,
        "medium",
        "static-dashboard-card",
        file,
        lineNumber(content, match.index),
        "StatCard is display-only and has no navigation destination.",
        match[0]
      );
    }
  }

  // Hard-coded operational status
  if (/status:\s*["']OPERATIONAL["']/.test(content)) {
    const index = content.search(/status:\s*["']OPERATIONAL["']/);

    addIssue(
      issues,
      "medium",
      "hard-coded-status",
      file,
      lineNumber(content, index),
      "Operational system status appears hard-coded rather than health-check driven.",
      content.split("\n")[lineNumber(content, index) - 1] ?? ""
    );
  }
}

// Backend route discovery
for (const file of backendFiles) {
  const content = read(file);

  for (const match of content.matchAll(
    /router\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/g
  )) {
    backendRoutes.add(match[2]);
  }
}

// Pages likely unregistered
for (const page of pages) {
  const base = path.basename(page, ".tsx");

  const routeCandidates = [
    `/${base}`,
    `/${base.replace(/_/g, "-")}`,
    base === "dashboard" ? "/" : null,
  ].filter(Boolean);

  const registered = routeCandidates.some((candidate) =>
    frontendRoutes.has(candidate)
  );

  if (!registered) {
    issues.push({
      severity: "medium",
      category: "possibly-unregistered-page",
      file: page,
      line: 1,
      message: `Page may not have a matching registered route: ${routeCandidates.join(", ")}`,
      evidence: "",
    });
  }
}

// Navigation targets missing routes
for (const navPath of navigationPaths) {
  const normalized = navPath.replace(/\/+$/, "") || "/";

  const exists = [...frontendRoutes].some((route) => {
    const normalizedRoute = route.replace(/\/+$/, "") || "/";
    return normalizedRoute === normalized;
  });

  if (!exists && !navPath.startsWith("http")) {
    issues.push({
      severity: "high",
      category: "missing-frontend-route",
      file: "navigation",
      line: 0,
      message: `Navigation points to a route that may not be registered: ${navPath}`,
      evidence: "",
    });
  }
}

const severityOrder = { high: 0, medium: 1, low: 2 };

issues.sort((a, b) => {
  return (
    severityOrder[a.severity] - severityOrder[b.severity] ||
    a.file.localeCompare(b.file) ||
    a.line - b.line
  );
});

const summary = {
  generatedAt: new Date().toISOString(),
  frontendFilesScanned: frontendFiles.length,
  backendFilesScanned: backendFiles.length,
  pagesFound: pages.length,
  frontendRoutesFound: frontendRoutes.size,
  navigationPathsFound: navigationPaths.size,
  frontendApiCallsFound: frontendApiCalls.size,
  backendRouteDefinitionsFound: backendRoutes.size,
  issueCount: issues.length,
  high: issues.filter((i) => i.severity === "high").length,
  medium: issues.filter((i) => i.severity === "medium").length,
  low: issues.filter((i) => i.severity === "low").length,
};

const report = [
  "# Makueni Command Centre Audit",
  "",
  `Generated: ${summary.generatedAt}`,
  "",
  "## Summary",
  "",
  `- Frontend files scanned: ${summary.frontendFilesScanned}`,
  `- Backend files scanned: ${summary.backendFilesScanned}`,
  `- Pages found: ${summary.pagesFound}`,
  `- Frontend routes found: ${summary.frontendRoutesFound}`,
  `- Navigation paths found: ${summary.navigationPathsFound}`,
  `- Frontend API calls found: ${summary.frontendApiCallsFound}`,
  `- Backend route definitions found: ${summary.backendRouteDefinitionsFound}`,
  `- Total findings: ${summary.issueCount}`,
  `- High priority: ${summary.high}`,
  `- Medium priority: ${summary.medium}`,
  `- Low priority: ${summary.low}`,
  "",
  "## Findings",
  "",
  ...issues.flatMap((issue, index) => [
    `### ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.category}`,
    "",
    `- File: \`${issue.file}${issue.line ? `:${issue.line}` : ""}\``,
    `- Issue: ${issue.message}`,
    issue.evidence ? `- Evidence: \`${issue.evidence.replace(/`/g, "\\`")}\`` : "",
    "",
  ]),
].filter(Boolean).join("\n");

const reportPath = path.join(ROOT, "SYSTEM_AUDIT_REPORT.md");
const jsonPath = path.join(ROOT, "system-audit-report.json");

fs.writeFileSync(reportPath, report);
fs.writeFileSync(
  jsonPath,
  JSON.stringify({ summary, issues }, null, 2)
);

console.log("\nAudit complete.");
console.log(`Report: ${path.relative(ROOT, reportPath)}`);
console.log(`JSON:   ${path.relative(ROOT, jsonPath)}`);
console.log("");
console.table(summary);
