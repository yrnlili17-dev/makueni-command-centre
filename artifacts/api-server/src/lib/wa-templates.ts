import { Router } from "express";
import { db, messagingProvidersTable, waTemplatesTable, type MessagingProvider, type WaTemplate } from "@workspace/db";
import { and, asc, eq, sql } from "drizzle-orm";
import { META_GRAPH_VERSION, toWhatsAppDigits } from "./channel-senders";
import { recordAudit } from "./audit";

/**
 * WhatsApp message templates (Meta Cloud API).
 *
 * WhatsApp only delivers free-text messages to contacts who wrote to the
 * campaign number in the last 24 hours. Everyone else must receive a template
 * that Meta has approved. Templates are drafted here, submitted to Meta, and
 * their approval status is synced back.
 */

export async function ensureWaTemplates(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "wa_templates" (
      "id" serial PRIMARY KEY,
      "name" text NOT NULL,
      "language" text NOT NULL DEFAULT 'en',
      "category" text NOT NULL DEFAULT 'MARKETING',
      "status" text NOT NULL DEFAULT 'DRAFT',
      "body" text NOT NULL,
      "header_text" text,
      "footer_text" text,
      "variable_count" integer NOT NULL DEFAULT 0,
      "meta_id" text,
      "rejected_reason" text,
      "updated_at" timestamp NOT NULL DEFAULT now(),
      "created_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "wa_templates_name_language_unique" ON "wa_templates" ("name", "language")`);
  await db.execute(sql`ALTER TABLE "message_campaigns" ADD COLUMN IF NOT EXISTS "wa_template_id" integer`);
  await db.execute(sql`ALTER TABLE "message_campaigns" ADD COLUMN IF NOT EXISTS "wa_template_params" text`);
}

/** Highest {{n}} placeholder in the body (Meta numbers them 1..n). */
export function countVariables(body: string): number {
  let max = 0;
  for (const m of body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) max = Math.max(max, Number(m[1]));
  return max;
}

export function validateTemplate(input: { name?: string; body?: string; language?: string; category?: string; headerText?: string; footerText?: string }): string | null {
  if (!input.name || !/^[a-z0-9_]{1,512}$/.test(input.name)) return "Name must use only lowercase letters, numbers and underscores (e.g. rally_reminder)";
  if (!input.body?.trim()) return "Body text is required";
  if (input.body.length > 1024) return "Body must be 1,024 characters or fewer";
  const n = countVariables(input.body);
  for (let i = 1; i <= n; i++) if (!input.body.match(new RegExp(`\\{\\{\\s*${i}\\s*\\}\\}`))) return `Placeholders must be numbered in order: {{${i}}} is missing`;
  if (/^\s*\{\{\d+\}\}|\{\{\d+\}\}\s*$/.test(input.body)) return "Meta rejects templates that start or end with a placeholder. Add words before and after it.";
  if (!["en", "en_US", "en_GB", "sw"].includes(input.language ?? "en")) return "Language must be English or Swahili";
  if (!["MARKETING", "UTILITY"].includes(input.category ?? "MARKETING")) return "Category must be Marketing or Utility";
  if (input.headerText && input.headerText.length > 60) return "Header must be 60 characters or fewer";
  if (input.footerText && input.footerText.length > 60) return "Footer must be 60 characters or fewer";
  return null;
}

async function metaProvider(): Promise<MessagingProvider | undefined> {
  const [p] = await db.select().from(messagingProvidersTable).where(and(
    eq(messagingProvidersTable.channel, "whatsapp"), eq(messagingProvidersTable.provider, "meta"), eq(messagingProvidersTable.isActive, true),
  ));
  return p;
}

async function graph<T>(provider: MessagingProvider, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: { message?: string; error_user_msg?: string } };
  if (!response.ok) throw new Error(payload.error?.error_user_msg ?? payload.error?.message ?? `Meta Cloud API HTTP ${response.status}`);
  return payload;
}

type MetaComponent = { type: string; format?: string; text?: string };
type MetaTemplate = { id: string; name: string; language: string; status: string; category: string; components?: MetaComponent[]; rejected_reason?: string };

function componentsFor(t: Pick<WaTemplate, "body" | "headerText" | "footerText">) {
  const n = countVariables(t.body);
  const components: Array<Record<string, unknown>> = [];
  if (t.headerText) components.push({ type: "HEADER", format: "TEXT", text: t.headerText });
  components.push({
    type: "BODY",
    text: t.body,
    // Meta requires a sample value for every placeholder when reviewing.
    ...(n ? { example: { body_text: [Array.from({ length: n }, (_, i) => ["Mary", "Wote", "Saturday", "10am", "Makindu"][i] ?? `sample${i + 1}`)] } } : {}),
  });
  if (t.footerText) components.push({ type: "FOOTER", text: t.footerText });
  return components;
}

/** Sends an approved template. Parameters are already personalised. */
export async function sendMetaTemplate(provider: MessagingProvider, to: string, template: WaTemplate, params: string[]): Promise<string> {
  const payload = await graph<{ messages?: Array<{ id?: string }> }>(
    provider, `${encodeURIComponent(provider.phoneNumberId!)}/messages`, {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toWhatsAppDigits(to),
        type: "template",
        template: {
          name: template.name,
          language: { code: template.language },
          ...(template.variableCount
            ? { components: [{ type: "body", parameters: params.slice(0, template.variableCount).map(text => ({ type: "text", text: text || "-" })) }] }
            : {}),
        },
      }),
    });
  const id = payload.messages?.[0]?.id;
  if (!id) throw new Error("Meta accepted the template message but returned no id");
  return id;
}

// ── Routes: mounted at /api/messages/wa-templates (messaging permission) ────

export const waTemplatesRouter = Router();

waTemplatesRouter.get("/", async (_req, res) => {
  res.json(await db.select().from(waTemplatesTable).orderBy(asc(waTemplatesTable.name), asc(waTemplatesTable.language)));
});

waTemplatesRouter.post("/", async (req, res) => {
  const input = {
    name: String(req.body?.name ?? "").trim(),
    language: String(req.body?.language ?? "en"),
    category: String(req.body?.category ?? "MARKETING").toUpperCase(),
    body: String(req.body?.body ?? ""),
    headerText: req.body?.headerText ? String(req.body.headerText).trim() : undefined,
    footerText: req.body?.footerText ? String(req.body.footerText).trim() : undefined,
  };
  const problem = validateTemplate(input);
  if (problem) { res.status(400).json({ error: problem }); return; }
  const [existing] = await db.select().from(waTemplatesTable)
    .where(and(eq(waTemplatesTable.name, input.name), eq(waTemplatesTable.language, input.language)));
  if (existing) { res.status(409).json({ error: "A template with this name and language already exists" }); return; }

  const [row] = await db.insert(waTemplatesTable).values({
    ...input, headerText: input.headerText ?? null, footerText: input.footerText ?? null,
    variableCount: countVariables(input.body), status: "DRAFT",
  }).returning();

  // Submit for approval straight away when Meta is configured; otherwise keep the draft.
  const provider = await metaProvider();
  if (!provider?.apiKey || !provider.businessAccountId) {
    res.status(201).json({ ...row, note: "Saved as a draft. Configure the Meta Cloud API WhatsApp provider (with Business Account ID) to submit it for approval." });
    return;
  }
  try {
    const created = await graph<{ id: string; status: string }>(provider, `${encodeURIComponent(provider.businessAccountId)}/message_templates`, {
      method: "POST",
      body: JSON.stringify({ name: row!.name, language: row!.language, category: row!.category, components: componentsFor(row!) }),
    });
    const [updated] = await db.update(waTemplatesTable)
      .set({ metaId: created.id, status: created.status ?? "PENDING", updatedAt: new Date() })
      .where(eq(waTemplatesTable.id, row!.id)).returning();
    void recordAudit(req, { action: `Submitted WhatsApp template "${row!.name}" to Meta`, module: "messaging" });
    res.status(201).json(updated);
  } catch (error) {
    res.status(201).json({ ...row, note: `Saved as a draft. Meta rejected the submission: ${error instanceof Error ? error.message : String(error)}` });
  }
});

/** Pull every template and its approval status from Meta. */
waTemplatesRouter.post("/sync", async (req, res) => {
  const provider = await metaProvider();
  if (!provider?.apiKey || !provider.businessAccountId) {
    res.status(409).json({ error: "Configure the Meta Cloud API WhatsApp provider, including the Business Account ID, first" }); return;
  }
  try {
    let path: string | null = `${encodeURIComponent(provider.businessAccountId)}/message_templates?fields=id,name,language,status,category,components,rejected_reason&limit=100`;
    let synced = 0;
    for (let page = 0; path && page < 20; page++) {
      const result: { data?: MetaTemplate[]; paging?: { next?: string } } = await graph(provider, path);
      for (const t of result.data ?? []) {
        const body = t.components?.find(c => c.type === "BODY")?.text ?? "";
        const header = t.components?.find(c => c.type === "HEADER" && c.format === "TEXT")?.text ?? null;
        const footer = t.components?.find(c => c.type === "FOOTER")?.text ?? null;
        await db.insert(waTemplatesTable).values({
          name: t.name, language: t.language, category: t.category, status: t.status, body,
          headerText: header, footerText: footer, variableCount: countVariables(body),
          metaId: t.id, rejectedReason: t.rejected_reason && t.rejected_reason !== "NONE" ? t.rejected_reason : null,
        }).onConflictDoUpdate({
          target: [waTemplatesTable.name, waTemplatesTable.language],
          set: {
            category: t.category, status: t.status, body, headerText: header, footerText: footer,
            variableCount: countVariables(body), metaId: t.id,
            rejectedReason: t.rejected_reason && t.rejected_reason !== "NONE" ? t.rejected_reason : null,
            updatedAt: new Date(),
          },
        });
        synced++;
      }
      const next = result.paging?.next;
      path = next ? next.replace(/^https:\/\/graph\.facebook\.com\/v[\d.]+\//, "") : null;
    }
    res.json({ synced, templates: await db.select().from(waTemplatesTable).orderBy(asc(waTemplatesTable.name)) });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

waTemplatesRouter.delete("/:id", async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const [row] = await db.select().from(waTemplatesTable).where(eq(waTemplatesTable.id, id));
  if (!row) { res.status(404).json({ error: "Template not found" }); return; }
  const provider = await metaProvider();
  if (row.metaId && provider?.apiKey && provider.businessAccountId) {
    try {
      await graph(provider, `${encodeURIComponent(provider.businessAccountId)}/message_templates?hsm_id=${encodeURIComponent(row.metaId)}&name=${encodeURIComponent(row.name)}`, { method: "DELETE" });
    } catch (error) {
      res.status(502).json({ error: `Meta could not delete it: ${error instanceof Error ? error.message : String(error)}` }); return;
    }
  }
  await db.delete(waTemplatesTable).where(eq(waTemplatesTable.id, id));
  void recordAudit(req, { action: `Deleted WhatsApp template "${row.name}"`, module: "messaging", severity: "warning" });
  res.json({ ok: true });
});
