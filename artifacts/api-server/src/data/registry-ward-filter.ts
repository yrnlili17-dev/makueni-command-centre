/** Read-only registry filters. Unknown means an unassigned (NULL) ward. */
export function parseRegistryWardFilter(value: unknown, knownWards: readonly string[]):
  { kind: "all" } | { kind: "unknown" } | { kind: "known"; ward: string } | { kind: "invalid" } {
  if (value === undefined || value === "") return { kind: "all" };
  if (value === "unknown") return { kind: "unknown" };
  if (typeof value === "string" && knownWards.includes(value)) return { kind: "known", ward: value };
  return { kind: "invalid" };
}
