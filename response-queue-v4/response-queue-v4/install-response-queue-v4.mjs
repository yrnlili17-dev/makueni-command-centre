#!/usr/bin/env node
/**
 * Response Queue v4 installer
 *
 * Requires Response Queue v3.
 *
 * Adds:
 * - one visible queue card per social-media mention
 * - newest response wins when old duplicate rows already exist
 * - source URL fallback to the originating platform profile/search page
 * - clearer source-link labels
 * - automatic backup before changes
 *
 * Run from repository root:
 *   node response-queue-v4/install-response-queue-v4.mjs
 */

import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const backendPath = path.join(cwd, "artifacts/api-server/src/routes/intelligence.ts");
const frontendPath = path.join(cwd, "artifacts/commandcentre/src/pages/intelligence.tsx");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.response-queue-v4-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

function assertFile(file) {
  if (!fs.existsSync(file)) fail(`Required file not found: ${file}`);
}

function replaceOnce(source, find, replacement, label) {
  const index = source.indexOf(find);
  if (index === -1) fail(`Could not locate ${label}. No files were overwritten.`);
  if (source.indexOf(find, index + find.length) !== -1) {
    fail(`Found multiple copies of ${label}; refusing an ambiguous update.`);
  }
  return source.replace(find, replacement);
}

assertFile(backendPath);
assertFile(frontendPath);

let backend = fs.readFileSync(backendPath, "utf8");
let frontend = fs.readFileSync(frontendPath, "utf8");

if (!backend.includes("RESPONSE_QUEUE_V3_LOCAL_ENGINE")) {
  fail("Response Queue v3 was not detected. Install v3 before v4.");
}
if (backend.includes("RESPONSE_QUEUE_V4_DEDUPED_VIEW")) {
  fail("Response Queue v4 is already installed.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(backendPath, path.join(backupDir, "intelligence.backend.ts"));
fs.copyFileSync(frontendPath, path.join(backupDir, "intelligence.frontend.tsx"));

const backendOld = `  const mentionIds = [...new Set(
    responses
      .map((response) => response.mentionId)
      .filter((id): id is number => typeof id === "number")
  )];

  const mentions = mentionIds.length > 0
    ? await db.select().from(narrativeMentionsTable)
    : [];

  const mentionById = new Map(mentions.map((mention) => [mention.id, mention]));

  const enriched = responses.map((response) => {
    const mention = response.mentionId ? mentionById.get(response.mentionId) : undefined;
    const sourceContent = mention?.content ?? "";
    const sourceUrl = mention?.url ?? null;
    const threatLevel = mention?.threatLevel ?? "normal";

    return {
      ...response,
      sourceContent,
      sourceUrl,
      sourceAuthor: mention?.author ?? null,
      sourcePlatform: mention?.platform ?? response.platform,
      threatLevel,
      sentiment: mention?.sentiment ?? null,
      responseOptions: buildLocalResponseOptions(
        sourceContent || response.content,
        response.platform,
        threatLevel,
      ),
    };
  });

  res.json(enriched);`;

const backendNew = `  // RESPONSE_QUEUE_V4_DEDUPED_VIEW
  // The query is newest-first. Keep only the newest response for each mention.
  // Manual drafts without a mentionId remain separate.
  const visibleResponses = responses.filter((response, index, all) => {
    if (response.mentionId == null) return true;
    return index === all.findIndex((candidate) => candidate.mentionId === response.mentionId);
  });

  const mentionIds = [...new Set(
    visibleResponses
      .map((response) => response.mentionId)
      .filter((id): id is number => typeof id === "number")
  )];

  const mentions = mentionIds.length > 0
    ? await db.select().from(narrativeMentionsTable)
    : [];

  const mentionById = new Map(mentions.map((mention) => [mention.id, mention]));

  function buildSourceFallback(platform: string, author?: string | null): string | null {
    const cleanAuthor = author?.trim().replace(/^@/, "");
    if (!cleanAuthor) return null;

    const key = platform.toLowerCase();
    if (key.includes("twitter") || key === "x") return \`https://x.com/\${encodeURIComponent(cleanAuthor)}\`;
    if (key.includes("facebook")) return \`https://www.facebook.com/\${encodeURIComponent(cleanAuthor)}\`;
    if (key.includes("tiktok")) return \`https://www.tiktok.com/@\${encodeURIComponent(cleanAuthor)}\`;
    if (key.includes("instagram")) return \`https://www.instagram.com/\${encodeURIComponent(cleanAuthor)}/\`;
    return null;
  }

  const enriched = visibleResponses.map((response) => {
    const mention = response.mentionId ? mentionById.get(response.mentionId) : undefined;
    const sourceContent = mention?.content ?? "";
    const sourceUrl = mention?.url ?? null;
    const sourceAuthor = mention?.author ?? null;
    const sourcePlatform = mention?.platform ?? response.platform;
    const sourceHref = sourceUrl || buildSourceFallback(sourcePlatform, sourceAuthor);
    const threatLevel = mention?.threatLevel ?? "normal";

    return {
      ...response,
      sourceContent,
      sourceUrl,
      sourceHref,
      sourceLinkLabel: sourceUrl ? "OPEN ORIGINAL POST" : sourceHref ? "OPEN SOURCE PROFILE" : null,
      sourceAuthor,
      sourcePlatform,
      threatLevel,
      sentiment: mention?.sentiment ?? null,
      hiddenDuplicateCount: response.mentionId == null
        ? 0
        : Math.max(0, responses.filter((item) => item.mentionId === response.mentionId).length - 1),
      responseOptions: buildLocalResponseOptions(
        sourceContent || response.content,
        response.platform,
        threatLevel,
      ),
    };
  });

  res.json(enriched);`;

backend = replaceOnce(
  backend,
  backendOld,
  backendNew,
  "the v3 enriched response-list block",
);

const frontendOld = `                    {r.sourceUrl && (
                      <a
                        href={r.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 border border-border px-3 py-1.5 font-mono text-[10px] hover:bg-secondary"
                      >
                        <Eye className="w-3 h-3" /> OPEN ORIGINAL POST
                      </a>
                    )}`;

const frontendNew = `                    {r.sourceHref && (
                      <a
                        href={r.sourceHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 border border-border px-3 py-1.5 font-mono text-[10px] hover:bg-secondary"
                      >
                        <Eye className="w-3 h-3" /> {r.sourceLinkLabel ?? "OPEN SOURCE"}
                      </a>
                    )}

                    {!r.sourceHref && (
                      <span className="flex items-center gap-1 border border-border px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                        SOURCE LINK UNAVAILABLE
                      </span>
                    )}`;

frontend = replaceOnce(
  frontend,
  frontendOld,
  frontendNew,
  "the v3 source-link action",
);

const originalPostOld = `                      <p className="mb-1 font-mono text-[9px] tracking-widest text-muted-foreground">
                        ORIGINAL POST {r.sourceAuthor ? \`· \${r.sourceAuthor}\` : ""}
                      </p>`;

const originalPostNew = `                      <div className="mb-1 flex flex-wrap items-center gap-2 font-mono text-[9px] tracking-widest text-muted-foreground">
                        <span>ORIGINAL POST {r.sourceAuthor ? \`· \${r.sourceAuthor}\` : ""}</span>
                        {Number(r.hiddenDuplicateCount ?? 0) > 0 && (
                          <span className="border border-yellow-400/30 px-2 py-0.5 text-yellow-400">
                            {r.hiddenDuplicateCount} OLD DUPLICATE{r.hiddenDuplicateCount === 1 ? "" : "S"} HIDDEN
                          </span>
                        )}
                      </div>`;

frontend = replaceOnce(
  frontend,
  originalPostOld,
  originalPostNew,
  "the original-post heading",
);

fs.writeFileSync(backendPath, backend);
fs.writeFileSync(frontendPath, frontend);

console.log(`
[OK] Response Queue v4 installed.

Backup:
  ${backupDir}

Modified:
  ${backendPath}
  ${frontendPath}

Next commands:
  pnpm --filter @workspace/api-server build
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
