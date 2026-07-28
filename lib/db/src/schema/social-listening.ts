import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const socialMentionsTable = pgTable("social_mentions", {
  id: serial("id").primaryKey(),
  summary: text("summary").notNull(),
  source: text("source"),
  url: text("url"),
  sentiment: text("sentiment").notNull().default("neutral"),
  category: text("category").notNull().default("candidate"),
  topic: text("topic"),
  publishedAt: text("published_at"),
  scannedAt: timestamp("scanned_at").notNull().defaultNow(),
});

export const insertSocialMentionSchema = createInsertSchema(socialMentionsTable).omit({ id: true, scannedAt: true });
export type InsertSocialMention = z.infer<typeof insertSocialMentionSchema>;
export type SocialMention = typeof socialMentionsTable.$inferSelect;
