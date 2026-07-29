import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import { db, adminUsersTable, adminRolesTable } from "@workspace/db";
import type { AdminUser } from "@workspace/db";
import { eq, or } from "drizzle-orm";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      currentUser?: AdminUser;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    userId?: number;
    emergencyAuth?: boolean;
  }
}

export type PermLevel = "none" | "read" | "write";

export const emergencyPermissions: Record<string, PermLevel> = new Proxy(
  {},
  {
    get: () => "write" as PermLevel,
  },
);

export function emergencyUser(): AdminUser {
  return {
    id: -1,
    name: process.env.EMERGENCY_LOGIN_NAME || "Emergency Administrator",
    email: process.env.EMERGENCY_LOGIN_EMAIL || "emergency-admin@local.invalid",
    username: process.env.EMERGENCY_LOGIN_USERNAME || "emergency-admin",
    passwordHash: null,
    phone: null,
    role: "super_admin",
    status: "active",
    notes: "Temporary emergency database-independent account",
    geographicLevel: "county",
    assignedCounty: "Makueni",
    assignedConstituencies: [],
    assignedWards: [],
    assignedPollingCentres: [],
    assignedPollingStations: [],
    assignedVillages: [],
    inviteToken: null,
    invitedBy: null,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function isEmergencySession(req: Request): boolean {
  return req.session?.emergencyAuth === true;
}

// ── Password hashing ──────────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── Credential generation ───────────────────────────────────────────────────

// Unambiguous character set — no 0/O/1/l/I to avoid confusion when sharing.
const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const ALL = UPPER + LOWER + DIGITS;

function pick(set: string): string {
  return set[randomInt(set.length)];
}

export function generatePassword(length = 12): string {
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(DIGITS)];
  while (chars.length < length) chars.push(pick(ALL));
  // Fisher–Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function slugBase(name: string, email: string): string {
  const fromEmail = (email.split("@")[0] ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "")
    .replace(/^\.+|\.+$/g, "");
  if (fromEmail) return fromEmail;
  const fromName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return fromName || "user";
}

export async function generateUsername(name: string, email: string): Promise<string> {
  const base = slugBase(name, email);
  let candidate = base;
  let n = 1;
  // Ensure uniqueness against existing usernames.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await db
      .select({ id: adminUsersTable.id })
      .from(adminUsersTable)
      .where(eq(adminUsersTable.username, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
    n += 1;
    candidate = `${base}${n}`;
  }
}

// ── Roles / permissions ───────────────────────────────────────────────────────

export async function permissionsForRole(roleName: string): Promise<Record<string, PermLevel>> {
  const [role] = await db
    .select()
    .from(adminRolesTable)
    .where(eq(adminRolesTable.name, roleName))
    .limit(1);
  return (role?.permissions as Record<string, PermLevel>) ?? {};
}

export function sanitizeUser(user: AdminUser): Omit<AdminUser, "passwordHash"> {
  const { passwordHash: _omit, ...rest } = user;
  return rest;
}

// ── Session helpers / middleware ──────────────────────────────────────────────

export async function getSessionUser(req: Request): Promise<AdminUser | null> {
  if (isEmergencySession(req)) {
    return emergencyUser();
  }

  const userId = req.session?.userId;
  if (!userId) return null;

  const [user] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, userId))
    .limit(1);

  return user ?? null;
}

export async function findByIdentifier(identifier: string): Promise<AdminUser | null> {
  const id = identifier.trim();
  const [user] = await db
    .select()
    .from(adminUsersTable)
    .where(or(eq(adminUsersTable.username, id.toLowerCase()), eq(adminUsersTable.email, id)))
    .limit(1);
  return user ?? null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (user.status === "suspended" || user.status === "inactive") {
    res.status(403).json({ error: "Account disabled" });
    return;
  }
  req.currentUser = user;
  next();
}

export function requirePermission(module: string, level: PermLevel = "read") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.currentUser ?? (await getSessionUser(req));
    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    req.currentUser = user;

    if (isEmergencySession(req)) {
      next();
      return;
    }

    const perms = await permissionsForRole(user.role);
    const have = perms[module] ?? "none";
    const ok = level === "read" ? have === "read" || have === "write" : have === "write";
    if (!ok) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}


export function requireActionPermission(module: string, action: string, level: PermLevel = "write") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.currentUser ?? (await getSessionUser(req));
    if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }
    req.currentUser = user;
    if (isEmergencySession(req) || user.role === "super_admin" || user.role === "super-admin") { next(); return; }
    const perms = await permissionsForRole(user.role);
    const actionPermission = perms[`${module}.${action}`];
    const modulePermission = perms[module] ?? "none";
    const have = actionPermission ?? modulePermission;
    const ok = level === "read" ? have === "read" || have === "write" : have === "write";
    if (!ok) { res.status(403).json({ error: `Permission denied: ${module}.${action}` }); return; }
    next();
  };
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  const role = req.currentUser?.role;
  if (isEmergencySession(req) || role === "super_admin" || role === "super-admin") { next(); return; }
  res.status(403).json({ error: "Super Admin approval required" });
}

export function enforceGeographicScope(fieldMap: { constituency?: string; ward?: string; pollingCentre?: string; pollingStation?: string; village?: string } = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.currentUser;
    if (!user || isEmergencySession(req) || user.role === "super_admin" || user.role === "super-admin" || user.geographicLevel === "county") { next(); return; }
    const source = { ...req.query, ...req.body, ...req.params } as Record<string, unknown>;
    const checks: Array<[string | undefined, unknown, unknown]> = [
      [fieldMap.constituency ?? "constituency", source[fieldMap.constituency ?? "constituency"], user.assignedConstituencies],
      [fieldMap.ward ?? "ward", source[fieldMap.ward ?? "ward"], user.assignedWards],
      [fieldMap.pollingCentre ?? "pollingCentre", source[fieldMap.pollingCentre ?? "pollingCentre"], user.assignedPollingCentres],
      [fieldMap.pollingStation ?? "pollingStation", source[fieldMap.pollingStation ?? "pollingStation"], user.assignedPollingStations],
      [fieldMap.village ?? "village", source[fieldMap.village ?? "village"], user.assignedVillages],
    ];
    for (const [name, value, assigned] of checks) {
      if (value && Array.isArray(assigned) && assigned.length > 0 && !assigned.includes(String(value))) {
        res.status(403).json({ error: `Outside assigned geographic scope: ${name}` }); return;
      }
    }
    next();
  };
}
