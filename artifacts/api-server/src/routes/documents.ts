import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import {
  db,
  documentsTable,
  documentFoldersTable,
  documentActivityTable,
  auditLogsTable,
  approvalRequestsTable,
  approvalEventsTable,
} from "@workspace/db";
import { requireAuth, requireActionPermission } from "../lib/auth";

const router = Router();
router.use(requireAuth, requireActionPermission("documents", "view", "read"));

const uploadDir = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${randomBytes(8).toString("hex")}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

function actor(req: any) {
  return { id: req.currentUser!.id, email: req.currentUser!.email, name: req.currentUser!.name };
}
async function audit(req: any, action: string, details?: string, severity = "info") {
  const u = actor(req);
  await db.insert(auditLogsTable).values({ userEmail: u.email, userName: u.name, action, module: "documents", details, severity });
}

router.get("/folders", async (_req, res) => {
  res.json(await db.select().from(documentFoldersTable).orderBy(documentFoldersTable.name));
});

router.post("/folders", requireActionPermission("documents", "folders.create"), async (req, res) => {
  const parsed = z.object({ name: z.string().min(1), description: z.string().optional(), parentId: z.number().int().optional(), visibility: z.enum(["internal", "restricted", "public"]).default("internal") }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message }); return; }
  const u = actor(req);
  const [row] = await db.insert(documentFoldersTable).values({ ...parsed.data, createdById: u.id, createdByEmail: u.email }).returning();
  await audit(req, `Created document folder: ${row.name}`);
  res.status(201).json(row);
});

router.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const status = String(req.query.status ?? "active");
  const category = String(req.query.category ?? "all");
  const conditions: any[] = [];
  if (status !== "all") conditions.push(eq(documentsTable.status, status));
  if (category !== "all") conditions.push(eq(documentsTable.category, category));
  if (q) conditions.push(or(ilike(documentsTable.title, `%${q}%`), ilike(documentsTable.originalName, `%${q}%`))!);
  const rows = await db.select().from(documentsTable).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(documentsTable.createdAt)).limit(500);
  res.json(rows);
});

router.post("/upload", requireActionPermission("documents", "upload"), upload.single("file"), async (req, res) => {
  if (!req.file) { res.status(400).json({ error: "A file is required" }); return; }
  const u = actor(req);
  const requiresApproval = String(req.body.requiresApproval ?? "false") === "true";
  const checksum = createHash("sha256").update(fs.readFileSync(req.file.path)).digest("hex");
  let approvalRequestId: number | null = null;
  let status = "active";
  if (requiresApproval) {
    const token = randomBytes(18).toString("base64url");
    const [approval] = await db.insert(approvalRequestsTable).values({
      token, module: "documents", action: "publish", resourceType: "document", title: `Approve document: ${req.body.title || req.file.originalname}`,
      description: req.body.description || null, payload: { originalName: req.file.originalname }, status: "pending",
      requestedById: u.id, requestedByEmail: u.email, expiresAt: new Date(Date.now() + 48 * 3600000),
    }).returning();
    approvalRequestId = approval.id;
    status = "pending_approval";
    await db.insert(approvalEventsTable).values({ requestId: approval.id, event: "requested", actorId: u.id, actorEmail: u.email });
  }
  const tags = String(req.body.tags ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const [row] = await db.insert(documentsTable).values({
    folderId: req.body.folderId ? Number(req.body.folderId) : null,
    title: req.body.title || req.file.originalname,
    description: req.body.description || null,
    originalName: req.file.originalname,
    storedName: req.file.filename,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    category: req.body.category || "general",
    tags,
    checksum,
    status,
    requiresApproval,
    approvalRequestId,
    uploadedById: u.id,
    uploadedByEmail: u.email,
  }).returning();
  await db.insert(documentActivityTable).values({ documentId: row.id, action: "uploaded", actorId: u.id, actorEmail: u.email, details: `Uploaded ${row.originalName}` });
  await audit(req, `Uploaded document: ${row.title}`, `${row.sizeBytes} bytes; approval=${requiresApproval}`);
  res.status(201).json(row);
});

router.get("/:id/download", requireActionPermission("documents", "download", "read"), async (req, res) => {
  const id = Number(req.params.id);
  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, id)).limit(1);
  if (!doc || !doc.storedName) { res.status(404).json({ error: "Document not found" }); return; }
  const filePath = path.join(uploadDir, doc.storedName);
  if (!fs.existsSync(filePath)) { res.status(410).json({ error: "File is no longer available in local storage" }); return; }
  const u = actor(req);
  await db.insert(documentActivityTable).values({ documentId: doc.id, action: "downloaded", actorId: u.id, actorEmail: u.email });
  res.download(filePath, doc.originalName);
});

router.patch("/:id", requireActionPermission("documents", "update"), async (req, res) => {
  const id = Number(req.params.id);
  const allowed = ["title", "description", "folderId", "category", "tags", "status"];
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];
  const [row] = await db.update(documentsTable).set(updates).where(eq(documentsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  const u = actor(req);
  await db.insert(documentActivityTable).values({ documentId: id, action: "updated", actorId: u.id, actorEmail: u.email, details: Object.keys(updates).join(", ") });
  await audit(req, `Updated document: ${row.title}`);
  res.json(row);
});

router.delete("/:id", requireActionPermission("documents", "delete"), async (req, res) => {
  const id = Number(req.params.id);
  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, id)).limit(1);
  if (!doc) { res.status(404).json({ error: "Not found" }); return; }
  await db.update(documentsTable).set({ status: "archived", updatedAt: new Date() }).where(eq(documentsTable.id, id));
  await audit(req, `Archived document: ${doc.title}`, undefined, "warning");
  res.status(204).send();
});

router.get("/:id/activity", async (req, res) => {
  res.json(await db.select().from(documentActivityTable).where(eq(documentActivityTable.documentId, Number(req.params.id))).orderBy(desc(documentActivityTable.createdAt)));
});

export default router;
