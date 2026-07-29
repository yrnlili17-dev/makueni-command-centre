import { Router } from "express";
import { z } from "zod";
import { db, adminUsersTable, adminRolesTable, auditLogsTable, systemConfigTable } from "@workspace/db";
import type { AdminUser } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import {
  requireAuth,
  requirePermission,
  generateUsername,
  generatePassword,
  hashPassword,
  sanitizeUser,
  requireActionPermission,
} from "../lib/auth";
import { ensureSeeded } from "../lib/seed";

const router = Router();

// All admin endpoints require an authenticated user with admin access.
router.use(requireAuth, requirePermission("admin", "read"));

// ── Audit helper ──────────────────────────────────────────────────────────────

function actor(req: { currentUser?: AdminUser }): { email: string; name: string } {
  return { email: req.currentUser?.email ?? "admin@system", name: req.currentUser?.name ?? "System Admin" };
}

async function logAudit(userEmail: string, userName: string, action: string, module: string, details?: string, severity: string = "info") {
  try {
    await db.insert(auditLogsTable).values({ userEmail, userName, action, module, details, severity });
  } catch { /* non-critical */ }
}

// ── Users ─────────────────────────────────────────────────────────────────────

router.get("/users", async (_req, res) => {
  await ensureSeeded();
  const users = await db.select().from(adminUsersTable).orderBy(desc(adminUsersTable.createdAt));
  res.json(users.map(sanitizeUser));
});

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("A valid email is required"),
  role: z.string().min(1).default("viewer"),
  phone: z.string().optional(),
  notes: z.string().optional(),
  geographicLevel: z.enum(["county","constituency","ward","polling_centre","polling_station","village"]).default("county"),
  assignedCounty: z.string().default("Makueni"),
  assignedConstituencies: z.array(z.string()).default([]),
  assignedWards: z.array(z.string()).default([]),
  assignedPollingCentres: z.array(z.string()).default([]),
  assignedPollingStations: z.array(z.string()).default([]),
  assignedVillages: z.array(z.string()).default([]),
});

// Admin creates a user; the system generates a username + password to share.
router.post("/users", requireActionPermission("admin", "users.create"), async (req, res) => {
  await ensureSeeded();
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const { name, email, role, phone, notes, geographicLevel, assignedCounty, assignedConstituencies, assignedWards, assignedPollingCentres, assignedPollingStations, assignedVillages } = parsed.data;

  const existing = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, email));
  if (existing.length > 0) { res.status(409).json({ error: "A user with this email already exists" }); return; }

  const username = await generateUsername(name, email);
  const password = generatePassword();
  const passwordHash = await hashPassword(password);

  const [user] = await db.insert(adminUsersTable).values({
    name, email, username, passwordHash, phone, notes, role, geographicLevel, assignedCounty, assignedConstituencies, assignedWards, assignedPollingCentres, assignedPollingStations, assignedVillages,
    status: "active", invitedBy: actor(req).email,
  }).returning();

  await logAudit(actor(req).email, actor(req).name, `Created user: ${email} (${role})`, "admin", `Username: ${username}`, "info");

  res.status(201).json({ user: sanitizeUser(user), username, password });
});

// Regenerate a user's password and return the new one once.
router.post("/users/:id/reset-password", requireActionPermission("admin", "users.reset_password"), async (req, res) => {
  const password = generatePassword();
  const passwordHash = await hashPassword(password);
  const [user] = await db.update(adminUsersTable)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(adminUsersTable.id, parseInt(String(req.params.id))))
    .returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  await logAudit(actor(req).email, actor(req).name, `Reset password for: ${user.email}`, "admin", undefined, "warning");
  res.json({ user: sanitizeUser(user), username: user.username, password });
});

router.patch("/users/:id", requireActionPermission("admin", "users.update"), async (req, res) => {
  const targetId = parseInt(String(req.params.id));
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const fields = ["name", "email", "phone", "role", "status", "notes", "geographicLevel", "assignedCounty", "assignedConstituencies", "assignedWards", "assignedPollingCentres", "assignedPollingStations", "assignedVillages"];
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  // Never allow the last active super-admin to be suspended, deactivated, or demoted.
  const demoting = updates.role !== undefined && updates.role !== "super-admin";
  const disabling = updates.status !== undefined && updates.status !== "active";
  if (demoting || disabling) {
    const [target] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, targetId)).limit(1);
    if (target && target.role === "super-admin" && target.status === "active") {
      const others = await db
        .select({ id: adminUsersTable.id })
        .from(adminUsersTable)
        .where(and(eq(adminUsersTable.role, "super-admin"), eq(adminUsersTable.status, "active")))
        .limit(2);
      if (others.filter(u => u.id !== targetId).length === 0) {
        res.status(400).json({ error: "Cannot suspend or demote the last active super-admin — the system would be locked out. Promote another super-admin first." });
        return;
      }
    }
  }

  const [user] = await db.update(adminUsersTable).set(updates).where(eq(adminUsersTable.id, targetId)).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  await logAudit(actor(req).email, actor(req).name, `Updated user: ${user.email}`, "admin", `Fields: ${Object.keys(updates).filter(k => k !== "updatedAt").join(", ")}`);
  res.json(sanitizeUser(user));
});

router.delete("/users/:id", requireActionPermission("admin", "users.delete"), async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [user] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, id));
  if (user && user.id === req.currentUser?.id) { res.status(400).json({ error: "You cannot delete your own account" }); return; }
  if (user && user.role === "super-admin" && user.status === "active") {
    const others = await db
      .select({ id: adminUsersTable.id })
      .from(adminUsersTable)
      .where(and(eq(adminUsersTable.role, "super-admin"), eq(adminUsersTable.status, "active")))
      .limit(2);
    if (others.filter(u => u.id !== user.id).length === 0) {
      res.status(400).json({ error: "Cannot delete the last active super-admin — the system would be locked out. Promote another super-admin first." });
      return;
    }
  }
  if (user) await logAudit(actor(req).email, actor(req).name, `Deleted user: ${user.email}`, "admin", undefined, "warning");
  await db.delete(adminUsersTable).where(eq(adminUsersTable.id, id));
  res.status(204).send();
});

// ── Roles ─────────────────────────────────────────────────────────────────────

router.get("/roles", async (_req, res) => {
  await ensureSeeded();
  const roles = await db.select().from(adminRolesTable).orderBy(adminRolesTable.name);
  res.json(roles);
});

router.post("/roles", requireActionPermission("admin", "roles.create"), async (req, res) => {
  const { name, description = "", color = "#6b7280", permissions = {} } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const [role] = await db.insert(adminRolesTable).values({ name, description, color, permissions }).returning();
  await logAudit(actor(req).email, actor(req).name, `Created role: ${name}`, "admin");
  res.status(201).json(role);
});

router.patch("/roles/:id", requireActionPermission("admin", "roles.update"), async (req, res) => {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const fields = ["name", "description", "color", "permissions"];
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const [role] = await db.update(adminRolesTable).set(updates).where(eq(adminRolesTable.id, parseInt(String(req.params.id)))).returning();
  if (!role) { res.status(404).json({ error: "Not found" }); return; }
  await logAudit(actor(req).email, actor(req).name, `Updated role: ${role.name}`, "admin");
  res.json(role);
});

router.delete("/roles/:id", requireActionPermission("admin", "roles.delete"), async (req, res) => {
  const [role] = await db.select().from(adminRolesTable).where(eq(adminRolesTable.id, parseInt(String(req.params.id))));
  if (role?.isSystem) { res.status(403).json({ error: "Cannot delete system roles" }); return; }
  if (role) await logAudit(actor(req).email, actor(req).name, `Deleted role: ${role.name}`, "admin", undefined, "warning");
  await db.delete(adminRolesTable).where(eq(adminRolesTable.id, parseInt(String(req.params.id))));
  res.status(204).send();
});

// ── Audit Log ─────────────────────────────────────────────────────────────────

router.get("/audit", async (req, res) => {
  const { module, severity } = req.query as Record<string, string>;
  const conditions = [];
  if (module && module !== "all") conditions.push(eq(auditLogsTable.module, module));
  if (severity && severity !== "all") conditions.push(eq(auditLogsTable.severity, severity));
  const where = conditions.length ? and(...conditions) : undefined;
  const logs = await db.select().from(auditLogsTable).where(where).orderBy(desc(auditLogsTable.createdAt)).limit(200);
  res.json(logs);
});

// ── System Config ─────────────────────────────────────────────────────────────

router.get("/config", async (_req, res) => {
  await ensureSeeded();
  const configs = await db.select().from(systemConfigTable).orderBy(systemConfigTable.category, systemConfigTable.key);
  res.json(configs);
});

router.patch("/config/:id", requireActionPermission("admin", "config.update"), async (req, res) => {
  const { value } = req.body;
  if (value === undefined) { res.status(400).json({ error: "value required" }); return; }
  const [cfg] = await db.update(systemConfigTable).set({ value, updatedBy: actor(req).email, updatedAt: new Date() }).where(eq(systemConfigTable.id, parseInt(String(req.params.id)))).returning();
  if (!cfg) { res.status(404).json({ error: "Not found" }); return; }
  await logAudit(actor(req).email, actor(req).name, `Config updated: ${cfg.key}`, "admin", cfg.isSecret ? "(value hidden)" : `New value: ${value}`);
  res.json(cfg);
});

export default router;
