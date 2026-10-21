import type { Request } from "express";
import { db, auditLogsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

/** Adds audit columns that older databases lack. Runs at boot. */
export async function ensureAuditColumns(): Promise<void> {
  await db.execute(sql`ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "user_agent" text`);
}

export function clientIp(req: Request): string | null {
  // app.set("trust proxy", 1) makes req.ip the real client address behind Render's proxy.
  const ip = req.ip ?? req.socket?.remoteAddress ?? null;
  return ip ? ip.replace(/^::ffff:/, "") : null;
}

export async function recordAudit(
  req: Request,
  entry: { action: string; module: string; details?: string | null; severity?: "info" | "warning" | "critical" },
  who?: { email: string; name: string },
): Promise<void> {
  const user = who ?? req.currentUser;
  try {
    await db.insert(auditLogsTable).values({
      userEmail: user?.email ?? "system",
      userName: user?.name ?? "System",
      action: entry.action,
      module: entry.module,
      details: entry.details ?? null,
      severity: entry.severity ?? "info",
      ipAddress: clientIp(req),
      userAgent: String(req.header("user-agent") ?? "").slice(0, 400) || null,
    });
  } catch {
    // Auditing must never break the request it is recording.
  }
}

// Modules whose data is sensitive enough that reading it is itself recorded.
const SENSITIVE_READS: Record<string, string> = {
  constituents: "Opened the constituent database",
  voters: "Opened voter records",
  finance: "Opened fundraising and donor records",
  "election-day": "Opened election-day results",
  admin: "Opened system administration",
};
const lastLogged = new Map<string, number>();
const THROTTLE_MS = 10 * 60 * 1000;

/** Records the first read of a sensitive module per user every 10 minutes. */
export function auditSensitiveRead(req: Request, module: string): void {
  const label = SENSITIVE_READS[module];
  const user = req.currentUser;
  if (!label || !user || !["GET", "HEAD"].includes(req.method)) return;
  const key = `${user.id}:${module}`;
  const now = Date.now();
  if ((lastLogged.get(key) ?? 0) > now - THROTTLE_MS) return;
  lastLogged.set(key, now);
  if (lastLogged.size > 5000) lastLogged.clear();
  void recordAudit(req, { action: label, module });
}
