import { pgTable, serial, text, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

export const commandTasksTable = pgTable("command_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("field"),
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("pending"),
  constituency: text("constituency"),
  ward: text("ward"),
  pollingStation: text("polling_station"),
  assignedTo: text("assigned_to"),
  dueAt: timestamp("due_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const fieldIncidentsTable = pgTable("field_incidents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  severity: text("severity").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  constituency: text("constituency"),
  ward: text("ward"),
  pollingStation: text("polling_station"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  reportedBy: text("reported_by"),
  assignedTo: text("assigned_to"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const volunteerCheckinsTable = pgTable("volunteer_checkins", {
  id: serial("id").primaryKey(),
  volunteerName: text("volunteer_name").notNull(),
  teamName: text("team_name"),
  ward: text("ward"),
  pollingStation: text("polling_station"),
  activityType: text("activity_type").notNull().default("field_visit"),
  householdsReached: integer("households_reached").notNull().default(0),
  doorsKnocked: integer("doors_knocked").notNull().default(0),
  notes: text("notes"),
  checkedInAt: timestamp("checked_in_at").notNull().defaultNow(),
});

export const intelligenceBriefsTable = pgTable("intelligence_briefs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  briefType: text("brief_type").notNull().default("daily"),
  summary: text("summary").notNull(),
  riskLevel: text("risk_level").notNull().default("low"),
  constituency: text("constituency"),
  ward: text("ward"),
  sourceCount: integer("source_count").notNull().default(0),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  published: boolean("published").notNull().default(false),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const commandNotificationsTable = pgTable("command_notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  module: text("module"),
  actionUrl: text("action_url"),
  recipientRole: text("recipient_role"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const executiveReportsTable = pgTable("executive_reports", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  reportType: text("report_type").notNull().default("weekly"),
  periodStart: text("period_start"),
  periodEnd: text("period_end"),
  status: text("status").notNull().default("draft"),
  summary: text("summary"),
  metrics: jsonb("metrics").$type<Record<string, number | string>>().notNull().default({}),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
