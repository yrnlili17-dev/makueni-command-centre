import { pgTable, serial, text, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const messageCampaignsTable = pgTable("message_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  channel: text("channel").notNull(),
  status: text("status").notNull().default("draft"),
  messageBody: text("message_body").notNull(),
  segmentId: integer("segment_id"),
  recipientList: text("recipient_list"),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  recipientCount: integer("recipient_count").notNull().default(0),
  deliveredCount: integer("delivered_count").notNull().default(0),
  openedCount: integer("opened_count").notNull().default(0),
  clickedCount: integer("clicked_count").notNull().default(0),
  // WhatsApp (Meta Cloud API) approved template to send instead of free text,
  // with one parameter string per {{n}} placeholder (JSON array).
  waTemplateId: integer("wa_template_id"),
  waTemplateParams: text("wa_template_params"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// WhatsApp message templates, created here and submitted to / synced from Meta.
export const waTemplatesTable = pgTable("wa_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  language: text("language").notNull().default("en"),
  category: text("category").notNull().default("MARKETING"),
  status: text("status").notNull().default("DRAFT"),
  body: text("body").notNull(),
  headerText: text("header_text"),
  footerText: text("footer_text"),
  variableCount: integer("variable_count").notNull().default(0),
  metaId: text("meta_id"),
  rejectedReason: text("rejected_reason"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  nameLangUnique: uniqueIndex("wa_templates_name_language_unique").on(table.name, table.language),
}));
export type WaTemplate = typeof waTemplatesTable.$inferSelect;

export const messageDeliveriesTable = pgTable("message_deliveries", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  memberId: integer("member_id"),
  channel: text("channel").notNull(),
  recipient: text("recipient").notNull(),
  provider: text("provider").notNull(),
  providerMessageId: text("provider_message_id"),
  status: text("status").notNull().default("queued"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  providerMessageUnique: uniqueIndex("message_deliveries_provider_message_id_unique").on(table.providerMessageId).where(sql`${table.providerMessageId} is not null`),
}));

export const insertMessageCampaignSchema = createInsertSchema(messageCampaignsTable).omit({ id: true, createdAt: true });
export type InsertMessageCampaign = z.infer<typeof insertMessageCampaignSchema>;
export type MessageCampaign = typeof messageCampaignsTable.$inferSelect;
