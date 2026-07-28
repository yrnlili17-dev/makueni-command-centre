import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const strategistConversations = pgTable("strategist_conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const strategistMessages = pgTable("strategist_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type StrategistConversation = typeof strategistConversations.$inferSelect;
export type StrategistMessage = typeof strategistMessages.$inferSelect;
