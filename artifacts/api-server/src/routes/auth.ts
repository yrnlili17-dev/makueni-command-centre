import { Router } from "express";
import { z } from "zod";
import { timingSafeEqual } from "crypto";
import { db, adminUsersTable, auditLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  findByIdentifier,
  verifyPassword,
  getSessionUser,
  permissionsForRole,
  sanitizeUser,
  emergencyUser,
  emergencyPermissions,
  isEmergencySession,
} from "../lib/auth";
import { ensureSeeded } from "../lib/seed";

const router = Router();

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

function safeEqual(value: string, expected: string): boolean {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(valueBuffer, expectedBuffer);
}

function emergencyLoginAllowed(identifier: string, password: string): boolean {
  if (process.env.EMERGENCY_LOGIN_ENABLED !== "true") {
    return false;
  }

  const expectedUsername = process.env.EMERGENCY_LOGIN_USERNAME;
  const expectedPassword = process.env.EMERGENCY_LOGIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return false;
  }

  return (
    safeEqual(identifier.trim().toLowerCase(), expectedUsername.toLowerCase()) &&
    safeEqual(password, expectedPassword)
  );
}

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Username/email and password are required",
    });
    return;
  }

  const { identifier, password } = parsed.data;

  /*
   * Temporary emergency login.
   * This is checked before database seeding or database queries.
   */
  if (emergencyLoginAllowed(identifier, password)) {
    req.session.emergencyAuth = true;
    delete req.session.userId;

    const user = emergencyUser();

    res.json({
      user: sanitizeUser(user),
      permissions: emergencyPermissions,
    });
    return;
  }

  try {
    await ensureSeeded();

    const user = await findByIdentifier(identifier);

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (user.status === "suspended" || user.status === "inactive") {
      res.status(403).json({
        error: "This account has been disabled. Contact your administrator.",
      });
      return;
    }

    const ok = await verifyPassword(password, user.passwordHash);

    if (!ok) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    req.session.userId = user.id;
    req.session.emergencyAuth = false;

    await db
      .update(adminUsersTable)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsersTable.id, user.id));

    try {
      await db.insert(auditLogsTable).values({
        userEmail: user.email,
        userName: user.name,
        action: "Signed in",
        module: "admin",
        severity: "info",
      });
    } catch {
      // Audit logging is non-critical during login.
    }

    res.json({
      user: sanitizeUser(user),
      permissions: await permissionsForRole(user.role),
    });
  } catch (error) {
    console.error("Normal database login failed:", error);

    res.status(503).json({
      error:
        "The database login service is temporarily unavailable. Use the emergency administrator account.",
    });
  }
});

router.get("/me", async (req, res) => {
  const user = await getSessionUser(req);

  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  if (isEmergencySession(req)) {
    res.json({
      user: sanitizeUser(user),
      permissions: emergencyPermissions,
    });
    return;
  }

  res.json({
    user: sanitizeUser(user),
    permissions: await permissionsForRole(user.role),
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

export default router;
