import { pgTable, serial, text, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";

export const documentFoldersTable = pgTable("document_folders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  parentId: integer("parent_id"),
  visibility: text("visibility").notNull().default("internal"),
  createdById: integer("created_by_id").notNull(),
  createdByEmail: text("created_by_email").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  folderId: integer("folder_id"),
  title: text("title").notNull(),
  description: text("description"),
  originalName: text("original_name").notNull(),
  storedName: text("stored_name"),
  mimeType: text("mime_type").notNull().default("application/octet-stream"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  storageType: text("storage_type").notNull().default("local"),
  storageUrl: text("storage_url"),
  category: text("category").notNull().default("general"),
  tags: jsonb("tags").notNull().default([]),
  version: integer("version").notNull().default(1),
  checksum: text("checksum"),
  status: text("status").notNull().default("active"),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  approvalRequestId: integer("approval_request_id"),
  uploadedById: integer("uploaded_by_id").notNull(),
  uploadedByEmail: text("uploaded_by_email").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const documentActivityTable = pgTable("document_activity", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  action: text("action").notNull(),
  actorId: integer("actor_id").notNull(),
  actorEmail: text("actor_email").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DocumentRecord = typeof documentsTable.$inferSelect;
export type DocumentFolder = typeof documentFoldersTable.$inferSelect;
