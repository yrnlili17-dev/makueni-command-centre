import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

const BASE = import.meta.env.BASE_URL;

export type PermLevel = "none" | "read" | "write";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  username: string | null;
  role: string;
  status: string;
}

interface AuthState {
  user: AuthUser | null;
  permissions: Record<string, PermLevel>;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (module: string, level?: PermLevel) => boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<Record<string, PermLevel>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}api/auth/me`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setUser(d.user);
        setPermissions(d.permissions ?? {});
      } else {
        setUser(null);
        setPermissions({});
      }
    } catch {
      setUser(null);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await fetch(`${BASE}api/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error ?? "Login failed");
    }
    const d = await res.json();
    setUser(d.user);
    setPermissions(d.permissions ?? {});
  }, []);

  const logout = useCallback(async () => {
    try { await fetch(`${BASE}api/auth/logout`, { method: "POST", credentials: "include" }); } catch { /* ignore */ }
    setUser(null);
    setPermissions({});
  }, []);

  const can = useCallback((module: string, level: PermLevel = "read") => {
    const have = permissions[module] ?? "none";
    return level === "read" ? have === "read" || have === "write" : have === "write";
  }, [permissions]);

  return (
    <AuthContext.Provider value={{ user, permissions, loading, login, logout, refresh, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
