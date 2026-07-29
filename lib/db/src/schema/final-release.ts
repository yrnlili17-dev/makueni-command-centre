import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const electionAgentReportsTable = pgTable("election_agent_reports", {
  id: serial("id").primaryKey(),
  pollingStation: text("polling_station").notNull(),
  ward: text("ward"),
  constituency: text("constituency"),
  agentName: text("agent_name").notNull(),
  reportType: text("report_type").notNull().default("status"),
  turnout: integer("turnout").notNull().default(0),
  registeredVoters: integer("registered_voters").notNull().default(0),
  candidateVotes: integer("candidate_votes").notNull().default(0),
  totalValidVotes: integer("total_valid_votes").notNull().default(0),
  incidentLevel: text("incident_level").notNull().default("none"),
  notes: text("notes"),
  formReference: text("form_reference"),
  verificationStatus: text("verification_status").notNull().default("pending"),
  reportedAt: timestamp("reported_at").notNull().defaultNow(),
});

export const publicCampaignContentTable = pgTable("public_campaign_content", {
  id: serial("id").primaryKey(),
  contentType: text("content_type").notNull().default("update"),
  title: text("title").notNull(),
  summary: text("summary"),
  body: text("body"),
  imageUrl: text("image_url"),
  actionLabel: text("action_label"),
  actionUrl: text("action_url"),
  published: boolean("published").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productionChecksTable = pgTable("production_checks", {
  id: serial("id").primaryKey(),
  checkName: text("check_name").notNull(),
  category: text("category").notNull().default("operations"),
  status: text("status").notNull().default("pending"),
  details: text("details"),
  owner: text("owner"),
  lastCheckedAt: timestamp("last_checked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productionIncidentsTable = pgTable("production_incidents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  severity: text("severity").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  service: text("service"),
  description: text("description"),
  resolution: text("resolution"),
  openedAt: timestamp("opened_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});
