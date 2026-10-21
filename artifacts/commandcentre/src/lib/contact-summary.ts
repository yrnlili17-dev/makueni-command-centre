/** Interpret registry totals without turning failed or malformed responses into zeros. */
export function parseRegistrySummary(value: unknown): { total: number; byWard: Record<string, number> } {
  const fail = () => { throw new Error("Registry returned incomplete contact counts. Please retry."); };
  if (!value || typeof value !== "object") return fail();
  const data = value as Record<string, unknown>;
  if (typeof data.total !== "number" || !Number.isSafeInteger(data.total) || data.total < 0 || !Array.isArray(data.wardBreakdown)) return fail();
  const byWard: Record<string, number> = Object.create(null);
  let sum = 0;
  for (const item of data.wardBreakdown) {
    if (!item || typeof item !== "object") return fail();
    const row = item as Record<string, unknown>;
    if (typeof row.ward !== "string" || typeof row.count !== "number" || !Number.isSafeInteger(row.count) || row.count < 0) return fail();
    const ward = row.ward.trim() || "Unknown";
    byWard[ward] = (byWard[ward] ?? 0) + row.count;
    sum += row.count;
  }
  if (sum !== data.total) return fail();
  return { total: data.total, byWard };
}
