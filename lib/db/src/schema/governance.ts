import { pgTable, serial, text, timestamp, integer, jsonb, boolean, uniqueIndex } from "drizzle-orm/pg-core";

export const approvalRequestsTable = pgTable("approval_requests", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  module: text("module").notNull(),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  title: text("title").notNull(),
  description: text("description"),
  payload: jsonb("payload").notNull().default({}),
  status: text("status").notNull().default("pending"),
  requestedById: integer("requested_by_id").notNull(),
  requestedByEmail: text("requested_by_email").notNull(),
  reviewedById: integer("reviewed_by_id"),
  reviewedByEmail: text("reviewed_by_email"),
  reviewComment: text("review_comment"),
  expiresAt: timestamp("expires_at").notNull(),
  reviewedAt: timestamp("reviewed_at"),
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const approvalEventsTable = pgTable("approval_events", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull(),
  event: text("event").notNull(),
  actorId: integer("actor_id").notNull(),
  actorEmail: text("actor_email").notNull(),
  comment: text("comment"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const contactImportBatchesTable = pgTable("contact_import_batches", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  status: text("status").notNull().default("processing"),
  importedById: integer("imported_by_id").notNull(),
  totalRows: integer("total_rows").notNull().default(0),
  acceptedRows: integer("accepted_rows").notNull().default(0),
  duplicateRows: integer("duplicate_rows").notNull().default(0),
  invalidRows: integer("invalid_rows").notNull().default(0),
  errorReport: jsonb("error_report").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const campaignContactsTable = pgTable("campaign_contacts", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  normalizedPhone: text("normalized_phone").notNull(),
  originalPhone: text("original_phone"),
  email: text("email"),
  county: text("county").notNull().default("Makueni"),
  constituency: text("constituency"),
  ward: text("ward"),
  pollingCentre: text("polling_centre"),
  pollingStation: text("polling_station"),
  village: text("village"),
  source: text("source").notNull().default("import"),
  consentStatus: text("consent_status").notNull().default("unknown"),
  importBatchId: integer("import_batch_id"),
  metadata: jsonb("metadata").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({ phoneUnique: uniqueIndex("campaign_contacts_phone_unique").on(table.normalizedPhone) }));

export type ApprovalRequest = typeof approvalRequestsTable.$inferSelect;
export type CampaignContact = typeof campaignContactsTable.$inferSelect;
