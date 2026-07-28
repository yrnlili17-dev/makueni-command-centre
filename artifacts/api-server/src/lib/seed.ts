import { db, adminUsersTable, adminRolesTable, systemConfigTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { hashPassword } from "./auth";

let seeded = false;

// connect-pg-simple's `createTableIfMissing` reads its bundled `table.sql`
// relative to __dirname, which does not exist after esbuild bundles the server
// into dist/. So we create the session table ourselves with explicit DDL.
// The auth columns are added to admin_users via Drizzle in dev, but production
// uses autoscale without migration files. This idempotent DDL guarantees the
// columns exist at boot so login/seeding never crash on a not-yet-migrated prod DB.
export async function ensureAuthColumns(): Promise<void> {
  await db.execute(sql`ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "username" text`);
  await db.execute(sql`ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "password_hash" text`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_username_unique" ON "admin_users" ("username")`);
}

// Idempotent DDL for the turnout-prediction assumptions table. Production is
// autoscale with no Drizzle migration files, so we self-heal at boot (same
// pattern as the auth columns) to keep dev push and prod in sync.
export async function ensureTurnoutTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "turnout_assumptions" (
      "id" serial PRIMARY KEY,
      "ward" text NOT NULL UNIQUE,
      "expected_turnout_rate" integer NOT NULL DEFAULT 65,
      "mule_support_share" integer NOT NULL DEFAULT 50,
      "updated_at" timestamp NOT NULL DEFAULT now()
    )
  `);
}

export async function ensureMpesaTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "mpesa_transactions" (
      "id" serial PRIMARY KEY,
      "checkout_request_id" text NOT NULL UNIQUE,
      "merchant_request_id" text,
      "phone" text NOT NULL,
      "amount" integer NOT NULL,
      "account_reference" text,
      "donor_name" text,
      "campaign_id" integer REFERENCES "fundraising_campaigns"("id") ON DELETE SET NULL,
      "ward" text,
      "status" text NOT NULL DEFAULT 'pending',
      "result_code" integer,
      "result_desc" text,
      "mpesa_receipt" text,
      "donation_id" integer REFERENCES "donations"("id") ON DELETE SET NULL,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now()
    )
  `);
}

export async function ensureGeneratedDocsTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "generated_documents" (
      "id" serial PRIMARY KEY,
      "doc_type" text NOT NULL,
      "title" text NOT NULL,
      "occasion" text,
      "audience" text,
      "ward" text,
      "language" text NOT NULL DEFAULT 'English',
      "tone" text,
      "body" text NOT NULL,
      "created_at" timestamp NOT NULL DEFAULT now()
    )
  `);
}

// Idempotent DDL for the ACL AI DI OS decision-intelligence tables. Production
// is autoscale with no Drizzle migration files, so we self-heal at boot (same
// pattern as the turnout/mpesa tables) to keep dev push and prod in sync.
export async function ensureDiTables(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "di_questions" (
      "id" serial PRIMARY KEY,
      "question" text NOT NULL,
      "status" text NOT NULL DEFAULT 'answered',
      "intent" text,
      "intent_label" text,
      "chart_type" text,
      "chart_data" jsonb NOT NULL DEFAULT '[]',
      "chart_meta" jsonb NOT NULL DEFAULT '{}',
      "explanation" text,
      "message" text,
      "created_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "di_briefings" (
      "id" serial PRIMARY KEY,
      "title" text NOT NULL,
      "sections" jsonb NOT NULL DEFAULT '[]',
      "created_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "di_snapshots" (
      "id" serial PRIMARY KEY,
      "metrics" jsonb NOT NULL DEFAULT '{}',
      "no_new_data" boolean NOT NULL DEFAULT false,
      "created_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "di_changes" (
      "id" serial PRIMARY KEY,
      "snapshot_id" integer NOT NULL,
      "metric" text NOT NULL,
      "label" text NOT NULL,
      "previous" integer NOT NULL DEFAULT 0,
      "current" integer NOT NULL DEFAULT 0,
      "delta" integer NOT NULL DEFAULT 0,
      "severity" text NOT NULL DEFAULT 'low',
      "explanation" text NOT NULL DEFAULT '',
      "created_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "di_datasets" (
      "id" serial PRIMARY KEY,
      "name" text NOT NULL,
      "sector" text NOT NULL DEFAULT 'General',
      "description" text,
      "source_type" text NOT NULL DEFAULT 'upload',
      "columns" jsonb NOT NULL DEFAULT '[]',
      "row_count" integer NOT NULL DEFAULT 0,
      "created_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "di_dataset_rows" (
      "id" serial PRIMARY KEY,
      "dataset_id" integer NOT NULL,
      "row" jsonb NOT NULL DEFAULT '{}'
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_di_dataset_rows_dataset" ON "di_dataset_rows" ("dataset_id")`);
  await db.execute(sql`ALTER TABLE "di_questions" ADD COLUMN IF NOT EXISTS "dataset_id" integer`);
  await db.execute(sql`ALTER TABLE "di_briefings" ADD COLUMN IF NOT EXISTS "dataset_id" integer`);
  await db.execute(sql`ALTER TABLE "di_snapshots" ADD COLUMN IF NOT EXISTS "dataset_id" integer`);
  await db.execute(sql`ALTER TABLE "di_changes" ADD COLUMN IF NOT EXISTS "dataset_id" integer`);
  const builtin = await db.execute(sql`SELECT id FROM "di_datasets" WHERE "source_type" = 'builtin' LIMIT 1`);
  let builtinId: number;
  if (builtin.rows.length === 0) {
    const inserted = await db.execute(sql`
      INSERT INTO "di_datasets" ("name", "sector", "description", "source_type")
      VALUES ('Matungulu Campaign', 'Politics & Campaigns', 'Built-in live campaign telemetry: voters, polls, canvassing, fundraising, volunteers and social listening for the Matungulu constituency operation.', 'builtin')
      RETURNING id
    `);
    builtinId = (inserted.rows[0] as { id: number }).id;
  } else {
    builtinId = (builtin.rows[0] as { id: number }).id;
  }
  await db.execute(sql`UPDATE "di_questions" SET "dataset_id" = ${builtinId} WHERE "dataset_id" IS NULL`);
  await db.execute(sql`UPDATE "di_briefings" SET "dataset_id" = ${builtinId} WHERE "dataset_id" IS NULL`);
  await db.execute(sql`UPDATE "di_snapshots" SET "dataset_id" = ${builtinId} WHERE "dataset_id" IS NULL`);
  await db.execute(sql`UPDATE "di_changes" SET "dataset_id" = ${builtinId} WHERE "dataset_id" IS NULL`);
}

export async function ensureStrategistTables(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "strategist_conversations" (
      "id" serial PRIMARY KEY,
      "title" text NOT NULL,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "strategist_messages" (
      "id" serial PRIMARY KEY,
      "conversation_id" integer NOT NULL,
      "role" text NOT NULL,
      "content" text NOT NULL,
      "created_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_strategist_messages_conversation" ON "strategist_messages" ("conversation_id")`);
}

export async function ensureSessionTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "user_sessions" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("sid")
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_user_sessions_expire" ON "user_sessions" ("expire")`);
}

const MODULES = [
  "dashboard", "voters", "constituents", "segmentation", "messaging", "field-ops",
  "volunteers", "intelligence", "events", "narrative", "campaign-plan", "kol",
  "finance", "election-day", "credentials", "admin",
];

export async function seedDefaultRoles(): Promise<void> {
  const existing = await db.select().from(adminRolesTable).limit(1);
  if (existing.length > 0) return;

  const defaultRoles = [
    {
      name: "super-admin", description: "Full system access — reserved for campaign director", color: "#DB143C", isSystem: true,
      permissions: Object.fromEntries(MODULES.map(m => [m, "write"])),
    },
    {
      name: "campaign-manager", description: "Full operational access, no system config", color: "#f97316", isSystem: true,
      permissions: Object.fromEntries(MODULES.filter(m => m !== "admin").map(m => [m, "write"]).concat([["admin", "none"]])),
    },
    {
      name: "field-officer", description: "Field operations, volunteers, surveys", color: "#22c55e", isSystem: true,
      permissions: { dashboard: "read", voters: "read", constituents: "read", segmentation: "none", messaging: "none", "field-ops": "write", volunteers: "write", intelligence: "write", events: "write", narrative: "none", "campaign-plan": "read", kol: "none", finance: "none", "election-day": "write", credentials: "read", admin: "none" },
    },
    {
      name: "communications-officer", description: "Messaging, narrative, KOL, and media", color: "#a855f7", isSystem: true,
      permissions: { dashboard: "read", voters: "read", constituents: "read", segmentation: "read", messaging: "write", "field-ops": "none", volunteers: "none", intelligence: "read", events: "read", narrative: "write", "campaign-plan": "read", kol: "write", finance: "none", "election-day": "none", credentials: "write", admin: "none" },
    },
    {
      name: "finance-officer", description: "Finance ops and fundraising only", color: "#eab308", isSystem: true,
      permissions: { dashboard: "read", voters: "none", constituents: "none", segmentation: "none", messaging: "none", "field-ops": "none", volunteers: "none", intelligence: "none", events: "none", narrative: "none", "campaign-plan": "read", kol: "none", finance: "write", "election-day": "none", credentials: "none", admin: "none" },
    },
    {
      name: "viewer", description: "Read-only access across all modules", color: "#6b7280", isSystem: false,
      permissions: Object.fromEntries(MODULES.filter(m => m !== "admin").map(m => [m, "read"]).concat([["admin", "none"]])),
    },
  ];

  for (const role of defaultRoles) {
    await db.insert(adminRolesTable).values(role).onConflictDoNothing();
  }
}

export async function seedDefaultConfig(): Promise<void> {
  const existing = await db.select().from(systemConfigTable).limit(1);
  if (existing.length > 0) return;

  const defaults = [
    { key: "candidate.name", value: "Hon. Stephen Mule", category: "campaign", description: "Candidate's full name displayed across the system" },
    { key: "candidate.title", value: "MNA — Matungulu Constituency", category: "campaign", description: "Candidate's title and constituency label" },
    { key: "candidate.party", value: "", category: "campaign", description: "Political party affiliation" },
    { key: "campaign.election_date", value: "2027-08-10", category: "campaign", description: "Target election date (YYYY-MM-DD)" },
    { key: "campaign.slogan", value: "", category: "campaign", description: "Campaign slogan displayed on reports and exports" },
    { key: "campaign.headquarters", value: "Tala, Matungulu Constituency", category: "campaign", description: "Campaign HQ address" },
    { key: "campaign.contact_email", value: "", category: "campaign", description: "Primary campaign contact email" },
    { key: "campaign.contact_phone", value: "", category: "campaign", description: "Primary campaign contact phone" },
    { key: "security.session_timeout_hours", value: "24", category: "security", description: "How long a session remains active (hours)" },
    { key: "security.require_2fa", value: "false", category: "security", description: "Require two-factor authentication for all users" },
    { key: "security.allow_invite_only", value: "true", category: "security", description: "Restrict sign-up to invited users only" },
    { key: "security.audit_retention_days", value: "365", category: "security", description: "How many days to retain audit log entries" },
    { key: "notifications.sms_enabled", value: "false", category: "notifications", description: "Enable SMS notifications for field alerts" },
    { key: "notifications.email_enabled", value: "false", category: "notifications", description: "Enable email notifications" },
    { key: "notifications.alert_threshold_days", value: "7", category: "notifications", description: "Days before deadline to trigger alerts" },
    { key: "general.timezone", value: "Africa/Nairobi", category: "general", description: "System timezone for dates and reports" },
    { key: "general.date_format", value: "DD/MM/YYYY", category: "general", description: "Date display format across the system" },
    { key: "general.currency", value: "KES", category: "general", description: "Default currency for financial figures" },
    { key: "general.language", value: "en-KE", category: "general", description: "System language locale" },
    { key: "integrations.openai_enabled", value: "false", category: "integrations", description: "OpenAI AI features enabled (requires OPENAI_API_KEY env var)", isSecret: false },
    { key: "integrations.sms_gateway_url", value: "", category: "integrations", description: "SMS gateway webhook URL", isSecret: false },
    { key: "integrations.sms_api_key", value: "", category: "integrations", description: "SMS gateway API key", isSecret: true },
  ];

  for (const item of defaults) {
    await db.insert(systemConfigTable).values({ ...item, isSecret: item.isSecret ?? false }).onConflictDoNothing();
  }
}

// Bootstrap the initial super-admin so the system is never locked out.
// Uses the long-standing demo credentials so existing access keeps working.
const BOOTSTRAP_EMAIL = "demo@mwanamule.ke";
const BOOTSTRAP_USERNAME = "demo";
const BOOTSTRAP_PASSWORD = "Komboa2027";

export async function ensureBootstrapAdmin(): Promise<void> {
  const [existing] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.email, BOOTSTRAP_EMAIL))
    .limit(1);

  const passwordHash = await hashPassword(BOOTSTRAP_PASSWORD);

  if (!existing) {
    await db.insert(adminUsersTable).values({
      name: "Campaign Director",
      email: BOOTSTRAP_EMAIL,
      username: BOOTSTRAP_USERNAME,
      passwordHash,
      role: "super-admin",
      status: "active",
      invitedBy: "system",
      notes: "Bootstrap super administrator",
    }).onConflictDoNothing();
    return;
  }

  // Backfill credentials for a pre-existing demo record that predates auth.
  if (!existing.passwordHash || !existing.username) {
    await db.update(adminUsersTable).set({
      username: existing.username ?? BOOTSTRAP_USERNAME,
      passwordHash: existing.passwordHash ?? passwordHash,
      role: "super-admin",
      status: "active",
      updatedAt: new Date(),
    }).where(eq(adminUsersTable.id, existing.id));
  }

  // Lockout self-heal: the system must always have at least one active
  // super-admin. If none exists (e.g. the bootstrap admin was suspended and no
  // replacement was created), reactivate the bootstrap admin.
  const activeSupers = await db
    .select({ id: adminUsersTable.id })
    .from(adminUsersTable)
    .where(and(eq(adminUsersTable.role, "super-admin"), eq(adminUsersTable.status, "active")))
    .limit(1);
  if (activeSupers.length === 0) {
    await db.update(adminUsersTable).set({
      role: "super-admin",
      status: "active",
      updatedAt: new Date(),
    }).where(eq(adminUsersTable.email, BOOTSTRAP_EMAIL));
  }
}

export async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  await ensureAuthColumns();
  await ensureSessionTable();
  await ensureTurnoutTable();
  await ensureGeneratedDocsTable();
  await ensureMpesaTable();
  await ensureDiTables();
  await ensureStrategistTables();
  await seedDefaultRoles();
  await seedDefaultConfig();
  await ensureBootstrapAdmin();
  seeded = true;
}
