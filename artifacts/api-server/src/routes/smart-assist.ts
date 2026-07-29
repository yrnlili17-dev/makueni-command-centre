import { Router } from "express";
import { z } from "zod/v4";
import { db, researchSourcesTable, researchWorkspacesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router = Router();
const workspaceInput = z.object({
  title: z.string().min(2).max(160),
  query: z.string().min(2).max(500),
  geography: z.string().max(120).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
  tags: z.array(z.string().max(60)).max(20).optional().default([]),
});
const sourceInput = z.object({
  title: z.string().min(2).max(300),
  url: z.string().url().max(1200),
  source: z.string().max(150).optional().nullable(),
  topic: z.string().max(120).optional().nullable(),
  sentiment: z.enum(["positive", "negative", "neutral"]).optional().default("neutral"),
  publishedAt: z.string().max(80).optional().nullable(),
});

function decodeXml(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
function tag(block: string, name: string) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m ? decodeXml(m[1]!.trim()) : "";
}

router.get("/news", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) return res.status(400).json({ error: "Search query is required" });
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-KE&gl=KE&ceid=KE:en`;
    const response = await fetch(url, { headers: { "User-Agent": "MakueniCommandCentre/1.0" }, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`News search returned ${response.status}`);
    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 25).map((m) => {
      const block = m[1]!;
      const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
      return {
        title: tag(block, "title"), link: tag(block, "link"), publishedAt: tag(block, "pubDate"),
        source: sourceMatch ? decodeXml(sourceMatch[1]!.trim()) : "Google News",
      };
    }).filter((item) => item.title && item.link);
    return res.json({ query: q, items, mode: "public-news-rss" });
  } catch (error) {
    req.log.error({ error }, "Smart Assist news search failed");
    return res.status(502).json({ error: "Public news search is temporarily unavailable" });
  }
});

router.get("/workspaces", async (_req, res) => {
  const rows = await db.select().from(researchWorkspacesTable).orderBy(desc(researchWorkspacesTable.updatedAt));
  return res.json(rows);
});
router.post("/workspaces", async (req, res) => {
  const parsed = workspaceInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid workspace", details: parsed.error.flatten() });
  const [row] = await db.insert(researchWorkspacesTable).values(parsed.data).returning();
  return res.status(201).json(row);
});
router.get("/workspaces/:id/sources", async (req, res) => {
  const id = Number(req.params.id); if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid workspace id" });
  const rows = await db.select().from(researchSourcesTable).where(eq(researchSourcesTable.workspaceId, id)).orderBy(desc(researchSourcesTable.createdAt));
  return res.json(rows);
});
router.post("/workspaces/:id/sources", async (req, res) => {
  const id = Number(req.params.id); if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid workspace id" });
  const parsed = sourceInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid source", details: parsed.error.flatten() });
  const [row] = await db.insert(researchSourcesTable).values({ workspaceId: id, ...parsed.data }).returning();
  await db.update(researchWorkspacesTable).set({ updatedAt: new Date() }).where(eq(researchWorkspacesTable.id, id));
  return res.status(201).json(row);
});
router.delete("/workspaces/:id", async (req, res) => {
  const id = Number(req.params.id); if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid workspace id" });
  await db.delete(researchWorkspacesTable).where(eq(researchWorkspacesTable.id, id));
  return res.json({ ok: true });
});

export default router;
