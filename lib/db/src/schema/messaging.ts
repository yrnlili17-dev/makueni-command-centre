import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const messageCampaignsTable = pgTable("message_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  channel: text("channel").notNull(),
  status: text("status").notNull().default("draft"),
  messageBody: text("message_body").notNull(),
  segmentId: integer("segment_id"),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  recipientCount: integer("recipient_count").notNull().default(0),
  deliveredCount: integer("delivered_count").notNull().default(0),
  openedCount: integer("opened_count").notNull().default(0),
  clickedCount: integer("clicked_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageCampaignSchema = createInsertSchema(messageCampaignsTable).omit({ id: true, createdAt: true });
export type InsertMessageCampaign = z.infer<typeof insertMessageCampaignSchema>;
export type MessageCampaign = typeof messageCampaignsTable.$inferSelect;
