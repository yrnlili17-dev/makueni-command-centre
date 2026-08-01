#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const backendPath = path.join(cwd, 'artifacts/api-server/src/routes/intelligence.ts');
const frontendPath = path.join(cwd, 'artifacts/commandcentre/src/pages/intelligence.tsx');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(cwd, `.response-queue-v3-backup-${stamp}`);

function fail(message) {
  console.error(`\n[FAILED] ${message}\n`);
  process.exit(1);
}
function replaceOnce(source, find, replacement, label) {
  const first = source.indexOf(find);
  if (first === -1) fail(`Could not locate ${label}. No files were overwritten.`);
  if (source.indexOf(find, first + find.length) !== -1) fail(`Found more than one ${label}.`);
  return source.replace(find, replacement);
}
for (const file of [backendPath, frontendPath]) if (!fs.existsSync(file)) fail(`Missing ${file}`);
fs.mkdirSync(backupDir, { recursive: true });
fs.copyFileSync(backendPath, path.join(backupDir, 'intelligence.backend.ts'));
fs.copyFileSync(frontendPath, path.join(backupDir, 'intelligence.frontend.tsx'));

let backend = fs.readFileSync(backendPath, 'utf8');
let frontend = fs.readFileSync(frontendPath, 'utf8');
if (backend.includes('RESPONSE_QUEUE_V3_LOCAL_ENGINE')) fail('Response Queue v3 is already installed.');

const oldGenerate = `router.post("/ai-generate-response", async (req, res) => {
  const { content, platform = "Unknown", threatLevel = "normal", mentionId } = req.body;
  if (!content) { res.status(400).json({ error: "content required" }); return; }
  const responseText = await openAiGenerateResponse(content, platform, threatLevel);
  if (mentionId) {
    await db.insert(narrativeResponsesTable).values({
      mentionId, platform, content: responseText, draftedBy: process.env.OPENAI_API_KEY ? "ai" : "template", status: "pending_approval",
    });
  }
  res.json({ response: responseText, aiGenerated: !!process.env.OPENAI_API_KEY });
});`;

const newGenerate = `// RESPONSE_QUEUE_V3_LOCAL_ENGINE
function buildLocalResponseOptions(sourceText: string, platform: string, threatLevel: string): string[] {
  const issue = sourceText.toLowerCase();
  const topic = issue.includes("water") ? "water access" : issue.includes("road") ? "road infrastructure" : issue.includes("health") || issue.includes("hospital") ? "healthcare" : issue.includes("job") || issue.includes("youth") ? "youth opportunity and employment" : issue.includes("corrupt") || issue.includes("fund") ? "accountability and transparent use of public resources" : "Makueni's development priorities";
  const limit = platform === "Twitter/X" ? 280 : platform === "SMS" ? 160 : platform === "TikTok Caption" ? 150 : platform === "WhatsApp" ? 450 : platform === "Facebook" ? 500 : 800;
  const variants = [
    \`Facts and accountability matter. Prof. Philip Kaloki's campaign remains focused on \${topic}, responsible leadership and practical solutions for families across Makueni County.\`,
    \`We understand the concern being raised. The campaign will continue listening to residents, verifying information and presenting clear, workable plans on \${topic} for every ward in Makueni.\`,
    \`\${threatLevel === "critical" || threatLevel === "high" ? "Unverified claims should not replace evidence. " : ""}Our response will remain respectful, factual and focused on \${topic}, integrity and a better future for Makueni County.\`,
  ];
  return variants.map((text) => text.length <= limit ? text : \`\${text.slice(0, Math.max(0, limit - 1)).trimEnd()}…\`);
}

router.post("/ai-generate-response", async (req, res) => {
  const { content, platform = "Unknown", threatLevel = "normal", mentionId } = req.body;
  if (!content) { res.status(400).json({ error: "content required" }); return; }
  const responseOptions = buildLocalResponseOptions(content, platform, threatLevel);
  const responseText = responseOptions[0];
  let savedResponse = null;
  if (mentionId) {
    const existing = await db.select().from(narrativeResponsesTable).where(and(eq(narrativeResponsesTable.mentionId, Number(mentionId)), eq(narrativeResponsesTable.status, "pending_approval"))).orderBy(desc(narrativeResponsesTable.createdAt)).limit(1);
    if (existing.length > 0) {
      [savedResponse] = await db.update(narrativeResponsesTable).set({ platform, content: responseText, draftedBy: "local-engine", updatedAt: new Date() }).where(eq(narrativeResponsesTable.id, existing[0].id)).returning();
    } else {
      [savedResponse] = await db.insert(narrativeResponsesTable).values({ mentionId: Number(mentionId), platform, content: responseText, draftedBy: "local-engine", status: "pending_approval" }).returning();
    }
  }
  res.json({ response: responseText, responseOptions, savedResponse, aiGenerated: false, engine: "local-campaign-engine" });
});`;
backend = replaceOnce(backend, oldGenerate, newGenerate, 'AI response route');

const oldGet = `router.get("/responses", async (req, res) => {
  const { status } = req.query as Record<string, string>;
  const conditions = status ? [eq(narrativeResponsesTable.status, status)] : [];
  const where = conditions.length ? and(...conditions) : undefined;
  const responses = await db.select().from(narrativeResponsesTable).where(where).orderBy(desc(narrativeResponsesTable.createdAt));
  res.json(responses);
});`;
const newGet = `router.get("/responses", async (req, res) => {
  const { status } = req.query as Record<string, string>;
  const conditions = status ? [eq(narrativeResponsesTable.status, status)] : [];
  const where = conditions.length ? and(...conditions) : undefined;
  const responses = await db.select().from(narrativeResponsesTable).where(where).orderBy(desc(narrativeResponsesTable.createdAt));
  const mentions = await db.select().from(narrativeMentionsTable);
  const mentionById = new Map(mentions.map((mention) => [mention.id, mention]));
  res.json(responses.map((response) => {
    const mention = response.mentionId ? mentionById.get(response.mentionId) : undefined;
    const sourceContent = mention?.content ?? "";
    const threatLevel = mention?.threatLevel ?? "normal";
    return { ...response, sourceContent, sourceUrl: mention?.url ?? null, sourceAuthor: mention?.author ?? null, sourcePlatform: mention?.platform ?? response.platform, threatLevel, sentiment: mention?.sentiment ?? null, responseOptions: buildLocalResponseOptions(sourceContent || response.content, response.platform, threatLevel) };
  }));
});`;
backend = replaceOnce(backend, oldGet, newGet, 'GET responses route');

const oldPost = `router.post("/responses", async (req, res) => {
  const { mentionId, platform, content, draftedBy = "manual" } = req.body;
  if (!platform || !content) { res.status(400).json({ error: "platform and content required" }); return; }
  const [response] = await db.insert(narrativeResponsesTable).values({ mentionId, platform, content, draftedBy, status: "pending_approval" }).returning();
  res.status(201).json(response);
});`;
const newPost = `router.post("/responses", async (req, res) => {
  const { mentionId, platform, content, draftedBy = "manual" } = req.body;
  if (!platform || !content) { res.status(400).json({ error: "platform and content required" }); return; }
  if (mentionId) {
    const existing = await db.select().from(narrativeResponsesTable).where(and(eq(narrativeResponsesTable.mentionId, Number(mentionId)), eq(narrativeResponsesTable.status, "pending_approval"))).orderBy(desc(narrativeResponsesTable.createdAt)).limit(1);
    if (existing.length > 0) {
      const [updated] = await db.update(narrativeResponsesTable).set({ platform, content, draftedBy, updatedAt: new Date() }).where(eq(narrativeResponsesTable.id, existing[0].id)).returning();
      res.json(updated); return;
    }
  }
  const [response] = await db.insert(narrativeResponsesTable).values({ mentionId: mentionId ? Number(mentionId) : null, platform, content, draftedBy, status: "pending_approval" }).returning();
  res.status(201).json(response);
});`;
backend = replaceOnce(backend, oldPost, newPost, 'POST responses route');

const oldText = `                  ) : (
                    <p className="text-sm leading-relaxed mb-3">{r.content}</p>
                  )}`;
const newText = `                  ) : (
                    <>
                      {r.sourceContent && <div className="mb-3 border border-border bg-secondary/30 p-3"><p className="mb-1 font-mono text-[9px] tracking-widest text-muted-foreground">ORIGINAL POST {r.sourceAuthor ? \`· \${r.sourceAuthor}\` : ""}</p><p className="line-clamp-3 text-xs text-muted-foreground">{r.sourceContent}</p></div>}
                      <p className="text-sm leading-relaxed mb-3">{r.content}</p>
                      {Array.isArray(r.responseOptions) && r.responseOptions.length > 1 && <div className="mb-3 grid gap-2 lg:grid-cols-3">{r.responseOptions.map((option: string, index: number) => <button key={\`\${r.id}-option-\${index}\`} onClick={async () => { await apiFetch(\`/responses/\${r.id}\`, { method: "PATCH", body: JSON.stringify({ content: option }) }); await loadResponses(); }} className={\`border p-3 text-left text-xs transition-colors hover:border-primary/60 hover:bg-primary/5 \${option === r.content ? "border-primary/50 bg-primary/5" : "border-border"}\`}><span className="mb-1 block font-mono text-[9px] text-primary">OPTION {String.fromCharCode(65 + index)}</span>{option}</button>)}</div>}
                    </>
                  )}`;
frontend = replaceOnce(frontend, oldText, newText, 'queue response text block');

const oldApproved = `{r.status === "approved" && (
                      <button onClick={() => updateResponse(r.id, "published")} className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 font-mono text-[10px] hover:bg-primary/90"><Send className="w-3 h-3" /> PUBLISH TO {r.platform.toUpperCase()}</button>
                    )}`;
const newApproved = `<button onClick={async () => { await navigator.clipboard.writeText(r.content); }} className="flex items-center gap-1 border border-border px-3 py-1.5 font-mono text-[10px] hover:bg-secondary">COPY RESPONSE</button>
                    {r.sourceUrl && <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 border border-border px-3 py-1.5 font-mono text-[10px] hover:bg-secondary"><Eye className="w-3 h-3" /> OPEN ORIGINAL POST</a>}
                    {r.status === "approved" && (
                      <button onClick={() => updateResponse(r.id, "published")} className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 font-mono text-[10px] hover:bg-primary/90"><Send className="w-3 h-3" /> MARK RESPONDED</button>
                    )}`;
frontend = replaceOnce(frontend, oldApproved, newApproved, 'approved response action block');

fs.writeFileSync(backendPath, backend);
fs.writeFileSync(frontendPath, frontend);
console.log(`\n[OK] Response Queue v3 installed.\nBackup: ${backupDir}\n`);
