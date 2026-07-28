import { Router } from "express";
import { z } from "zod";
import { db, adminUsersTable, auditLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  findByIdentifier,
  verifyPassword,
  getSessionUser,
  permissionsForRole,
  sanitizeUser,
} from "../lib/auth";
import { ensureSeeded } from "../lib/seed";

const router = Router();

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  await ensureSeeded();
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Username/email and password are required" });
    return;
  }
  const { identifier, password } = parsed.data;

  const user = await findByIdentifier(identifier);
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  if (user.status === "suspended" || user.status === "inactive") {
    res.status(403).json({ error: "This account has been disabled. Contact your administrator." });
    return;
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  req.session.userId = user.id;
  await db.update(adminUsersTable).set({ lastLoginAt: new Date() }).where(eq(adminUsersTable.id, user.id));

  try {
    await db.insert(auditLogsTable).values({
      userEmail: user.email, userName: user.name,
      action: "Signed in", module: "admin", severity: "info",
    });
  } catch { /* non-critical */ }

  res.json({ user: sanitizeUser(user), permissions: await permissionsForRole(user.role) });
});

router.get("/me", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ user: sanitizeUser(user), permissions: await permissionsForRole(user.role) });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

export default router;
