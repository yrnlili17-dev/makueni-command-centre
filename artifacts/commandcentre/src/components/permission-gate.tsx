import type { ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { useAuth, type PermLevel } from "@/lib/auth";

export function PermissionGate({
  module,
  level = "read",
  children,
  fallback = null,
}: {
  module: string;
  level?: PermLevel;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can } = useAuth();
  return can(module, level) ? <>{children}</> : <>{fallback}</>;
}

export function WriteRestrictedNotice({ module }: { module: string }) {
  const { can } = useAuth();
  if (can(module, "write")) return null;
  return (
    <div className="enterprise-readonly-banner" role="status">
      <LockKeyhole className="h-3.5 w-3.5" />
      READ-ONLY ACCESS — contact an administrator to request editing permission.
    </div>
  );
}
