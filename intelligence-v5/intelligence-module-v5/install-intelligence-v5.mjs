#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const pagePath = path.join(
  cwd,
  "artifacts/commandcentre/src/pages/intelligence.tsx",
);
const componentDir = path.join(
  cwd,
  "artifacts/commandcentre/src/components/response-queue",
);
const componentPath = path.join(componentDir, "ResponseQueueV5.tsx");
const backendPath = path.join(
  cwd,
  "artifacts/api-server/src/routes/intelligence.ts",
);
const sourceComponent = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "files/ResponseQueueV5.tsx",
);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(cwd, `.intelligence-v5-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}

for (const file of [pagePath, backendPath, sourceComponent]) {
  if (!fs.existsSync(file)) fail(`Missing required file: ${file}`);
}

let page = fs.readFileSync(pagePath, "utf8");
let backend = fs.readFileSync(backendPath, "utf8");

if (page.includes("ResponseQueueV5")) {
  fail("Intelligence Module v5 is already installed.");
}
if (!backend.includes("RESPONSE_QUEUE_V3_LOCAL_ENGINE")) {
  fail("Response Queue v3 is required before installing v5.");
}

fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(pagePath, path.join(backupDir, "intelligence.tsx"));
fs.copyFileSync(backendPath, path.join(backupDir, "intelligence.backend.ts"));

/* Add component */
fs.mkdirSync(componentDir, { recursive: true });
fs.copyFileSync(sourceComponent, componentPath);

/* Add import */
const importAnchor = 'import { useState, useEffect, useCallback } from "react";';
if (!page.includes(importAnchor)) {
  fail("Could not locate the React import in intelligence.tsx.");
}
page = page.replace(
  importAnchor,
  `${importAnchor}\nimport ResponseQueueV5 from "../components/response-queue/ResponseQueueV5";`,
);

/* Replace inline queue section */
const queuePattern =
  /\n\s*\{\/\* ── RESPONSE QUEUE ── \*\/\}[\s\S]*?\n\s*\{\/\* ── AI REBUTTAL CENTER ── \*\/\}/;

const queueReplacement = `
      {/* ── RESPONSE QUEUE V5 ── */}
      {tab === "queue" && (
        <ResponseQueueV5
          responses={responses}
          loading={responsesLoading}
          onRefresh={loadResponses}
          onUpdate={updateResponse}
          onDelete={deleteResponse}
          onSaveContent={async (id, content) => {
            await apiFetch(\`/responses/\${id}\`, {
              method: "PATCH",
              body: JSON.stringify({ content }),
            });
            await loadResponses();
          }}
        />
      )}

      {/* ── AI REBUTTAL CENTER ── */}`;

if (!queuePattern.test(page)) {
  fail("Could not locate the inline Response Queue section.");
}
page = page.replace(queuePattern, queueReplacement);

/* Replace GET /responses with a deduped operational response */
const routePattern =
  /router\.get\("\/responses", async \(req, res\) => \{[\s\S]*?\n\}\);\n\nrouter\.post\("\/responses"/;

const routeReplacement = `router.get("/responses", async (req, res) => {
  const { status } = req.query as Record<string, string>;
  const conditions = status ? [eq(narrativeResponsesTable.status, status)] : [];
  const where = conditions.length ? and(...conditions) : undefined;

  const allResponses = await db
    .select()
    .from(narrativeResponsesTable)
    .where(where)
    .orderBy(desc(narrativeResponsesTable.createdAt));

  // Newest response wins. Manual drafts without a mention stay separate.
  const responses = allResponses.filter((response, index, rows) => {
    if (response.mentionId == null) return true;
    return index === rows.findIndex(
      (candidate) => candidate.mentionId === response.mentionId,
    );
  });

  const mentions = await db.select().from(narrativeMentionsTable);
  const mentionById = new Map(
    mentions.map((mention) => [mention.id, mention]),
  );

  function sourceFallback(
    platform: string,
    author?: string | null,
  ): string | null {
    const cleanAuthor = author?.trim().replace(/^@/, "");
    if (!cleanAuthor) return null;

    const key = platform.toLowerCase();
    if (key.includes("twitter") || key === "x") {
      return \`https://x.com/\${encodeURIComponent(cleanAuthor)}\`;
    }
    if (key.includes("facebook")) {
      return \`https://www.facebook.com/\${encodeURIComponent(cleanAuthor)}\`;
    }
    if (key.includes("tiktok")) {
      return \`https://www.tiktok.com/@\${encodeURIComponent(cleanAuthor)}\`;
    }
    if (key.includes("instagram")) {
      return \`https://www.instagram.com/\${encodeURIComponent(cleanAuthor)}/\`;
    }
    return null;
  }

  res.json(
    responses.map((response) => {
      const mention = response.mentionId
        ? mentionById.get(response.mentionId)
        : undefined;
      const sourceContent = mention?.content ?? "";
      const sourceAuthor = mention?.author ?? null;
      const sourcePlatform = mention?.platform ?? response.platform;
      const sourceUrl = mention?.url ?? null;
      const sourceHref =
        sourceUrl || sourceFallback(sourcePlatform, sourceAuthor);
      const threatLevel = mention?.threatLevel ?? "normal";
      const hiddenDuplicateCount =
        response.mentionId == null
          ? 0
          : Math.max(
              0,
              allResponses.filter(
                (item) => item.mentionId === response.mentionId,
              ).length - 1,
            );

      return {
        ...response,
        sourceContent,
        sourceAuthor,
        sourcePlatform,
        sourceUrl,
        sourceHref,
        sourceLinkLabel: sourceUrl
          ? "OPEN ORIGINAL POST"
          : sourceHref
            ? "OPEN SOURCE PROFILE"
            : null,
        threatLevel,
        sentiment: mention?.sentiment ?? null,
        hiddenDuplicateCount,
        responseOptions: buildLocalResponseOptions(
          sourceContent || response.content,
          response.platform,
          threatLevel,
        ),
      };
    }),
  );
});

router.post("/responses"`;

if (!routePattern.test(backend)) {
  fail('Could not locate GET "/responses" in the backend.');
}
backend = backend.replace(routePattern, routeReplacement);

fs.writeFileSync(pagePath, page);
fs.writeFileSync(backendPath, backend);

console.log(`
[OK] Intelligence Module v5 installed.

Backup:
  ${backupDir}

Added:
  ${componentPath}

Modified:
  ${pagePath}
  ${backendPath}

Next:
  pnpm --filter @workspace/api-server build
  PORT=5173 BASE_PATH=/ pnpm --filter @workspace/commandcentre build
`);
