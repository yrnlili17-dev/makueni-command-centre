import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const researchWorkspacesTable = pgTable("research_workspaces", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  query: text("query").notNull(),
  geography: text("geography"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const researchSourcesTable = pgTable("research_sources", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => researchWorkspacesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  source: text("source"),
  topic: text("topic"),
  sentiment: text("sentiment").notNull().default("neutral"),
  publishedAt: text("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
