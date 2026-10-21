import { createHmac, createVerify, timingSafeEqual } from "node:crypto";
import type { MessagingProvider } from "@workspace/db";

/**
 * Live senders and delivery-receipt verification for:
 *  - WhatsApp via Meta Cloud API (provider "meta")
 *  - Email via SendGrid (provider "sendgrid") and Mailgun (provider "mailgun")
 *
 * Provider record field usage (messaging_providers):
 *  meta      apiKey = permanent access token, phoneNumberId, apiSecret = app secret
 *            (verifies webhook signatures), webhookSecret = webhook verify token
 *  sendgrid  apiKey, fromEmail, fromName, webhookSecret = Event Webhook public key
 *  mailgun   apiKey, username = sending domain, smtpHost = API base URL
 *            (default https://api.mailgun.net; EU: https://api.eu.mailgun.net),
 *            fromEmail, fromName, webhookSecret = HTTP webhook signing key
 */

export const META_GRAPH_VERSION = "v21.0";

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

/** Kenyan numbers to E.164 digits without "+", e.g. 0712345678 -> 254712345678. */
export function toWhatsAppDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return "254" + digits.slice(1);
  if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("1"))) return "254" + digits;
  return digits;
}

export function isValidEmail(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Validation message for a provider's required settings, or null when complete. */
export function missingProviderSettings(provider: MessagingProvider): string | null {
  switch (provider.provider) {
    case "meta":
      return provider.apiKey && provider.phoneNumberId
        ? null : "Meta Cloud API requires a permanent access token and Phone Number ID";
    case "sendgrid":
      return provider.apiKey && isValidEmail(provider.fromEmail)
        ? null : "SendGrid requires an API key and a verified From email";
    case "mailgun":
      return provider.apiKey && provider.username && isValidEmail(provider.fromEmail)
        ? null : "Mailgun requires an API key, sending domain and From email";
    default:
      return null;
  }
}

// ── Email body helpers ─────────────────────────────────────────────────────

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function emailBodies(body: string): { html: string; text: string } {
  const looksHtml = /<\/?[a-z][\s\S]*>/i.test(body);
  if (looksHtml) {
    const text = body
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return { html: body, text };
  }
  return { html: escapeHtml(body).replace(/\r?\n/g, "<br>"), text: body };
}

function fromHeader(provider: MessagingProvider): string {
  const name = provider.fromName?.trim();
  return name ? `${name.replace(/[<>"]/g, "")} <${provider.fromEmail}>` : provider.fromEmail!;
}

// ── Senders: each returns the provider message id or throws ────────────────

export async function sendMetaWhatsApp(provider: MessagingProvider, to: string, body: string): Promise<string> {
  const response = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(provider.phoneNumberId!)}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toWhatsAppDigits(to),
        type: "text",
        text: { preview_url: false, body },
      }),
    },
  );
  const payload = await response.json().catch(() => ({})) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string; code?: number };
  };
  const id = payload.messages?.[0]?.id;
  if (!response.ok || !id) {
    const code = payload.error?.code;
    const hint = code === 131047 || code === 131026
      ? " (outside WhatsApp's 24-hour window: the contact must message you first, or use an approved template)"
      : "";
    throw new Error((payload.error?.message ?? `Meta Cloud API HTTP ${response.status}`) + hint);
  }
  return id;
}

export async function sendSendGridEmail(
  provider: MessagingProvider, to: string, subject: string, body: string, campaignId: number,
): Promise<string> {
  const { html, text } = emailBodies(body);
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${provider.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }], custom_args: { campaign_id: String(campaignId) } }],
      from: { email: provider.fromEmail, ...(provider.fromName ? { name: provider.fromName } : {}) },
      subject,
      content: [{ type: "text/plain", value: text }, { type: "text/html", value: html }],
      tracking_settings: { open_tracking: { enable: true }, click_tracking: { enable: true } },
    }),
  });
  if (response.status !== 202) {
    const payload = await response.json().catch(() => ({})) as { errors?: Array<{ message?: string }> };
    throw new Error(payload.errors?.[0]?.message ?? `SendGrid HTTP ${response.status}`);
  }
  const id = response.headers.get("x-message-id");
  if (!id) throw new Error("SendGrid accepted the email but returned no message id");
  return id;
}

export async function sendMailgunEmail(
  provider: MessagingProvider, to: string, subject: string, body: string, campaignId: number,
): Promise<string> {
  const { html, text } = emailBodies(body);
  const base = (provider.smtpHost?.trim() || "https://api.mailgun.net").replace(/\/$/, "");
  const form = new URLSearchParams({ from: fromHeader(provider), to, subject, text, html });
  form.set("o:tracking", "yes");
  form.set("v:campaign_id", String(campaignId));
  const response = await fetch(`${base}/v3/${encodeURIComponent(provider.username!)}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${provider.apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const payload = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok || !payload.id) throw new Error(payload.message ?? `Mailgun HTTP ${response.status}`);
  return payload.id.replace(/^<|>$/g, "");
}

// ── Webhook verification ───────────────────────────────────────────────────

/** Meta: X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(app secret, raw body). */
export function verifyMetaSignature(appSecret: string, rawBody: Buffer, header: string | undefined): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return safeEqual(expected, header);
}

/** SendGrid signed Event Webhook: ECDSA P-256 / SHA-256 over timestamp + raw body. */
export function verifySendGridSignature(
  publicKey: string, rawBody: Buffer, signature: string | undefined, timestamp: string | undefined,
): boolean {
  if (!signature || !timestamp) return false;
  const pem = publicKey.includes("BEGIN PUBLIC KEY")
    ? publicKey
    : `-----BEGIN PUBLIC KEY-----\n${publicKey.trim().replace(/(.{64})/g, "$1\n")}\n-----END PUBLIC KEY-----`;
  try {
    const verifier = createVerify("sha256");
    verifier.update(timestamp);
    verifier.update(rawBody);
    return verifier.verify(pem, signature, "base64");
  } catch {
    return false;
  }
}

/** Mailgun: signature = HMAC-SHA256(signing key, timestamp + token); reject stale (>15 min). */
export function verifyMailgunSignature(
  signingKey: string, sig: { timestamp?: string; token?: string; signature?: string } | undefined,
): boolean {
  if (!sig?.timestamp || !sig.token || !sig.signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(sig.timestamp)) > 15 * 60) return false;
  const expected = createHmac("sha256", signingKey).update(sig.timestamp + sig.token).digest("hex");
  return safeEqual(expected, sig.signature);
}

/** Map provider event names to our delivery statuses (null = ignore). */
export function normalizeEventStatus(event: string): "sent" | "delivered" | "opened" | "failed" | null {
  const e = event.toLowerCase();
  if (["delivered"].includes(e)) return "delivered";
  if (["read", "open", "opened", "click", "clicked"].includes(e)) return "opened";
  if (["failed", "bounce", "bounced", "dropped", "rejected", "permanent_fail", "temporary_fail"].includes(e)) return "failed";
  if (["sent", "processed", "accepted", "deferred"].includes(e)) return "sent";
  return null;
}
