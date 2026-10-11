/**
 * Workspace registry for future multi-area deployments.
 *
 * Makueni remains the active workspace. Additional workspace entries are
 * deliberately marked as geography-not-configured until verified local
 * administrative reference data is supplied; this prevents accidental
 * cross-county data mixing or invented wards.
 */
export type WorkspaceDefinition = {
  id: string;
  label: string;
  level: "county" | "sub-county" | "county-and-sub-county";
  geographyReady: boolean;
  parentWorkspaceId?: string;
};

export const WORKSPACES: readonly WorkspaceDefinition[] = [
  {
    id: "makueni",
    label: "Makueni County",
    level: "county",
    geographyReady: true,
  },
  {
    id: "machakos",
    label: "Machakos County",
    level: "county",
    geographyReady: false,
  },
  {
    id: "matungulu",
    label: "Matungulu",
    level: "sub-county",
    geographyReady: false,
    parentWorkspaceId: "machakos",
  },
] as const;

export const DEFAULT_WORKSPACE_ID = "makueni";

export function getWorkspace(id: string): WorkspaceDefinition | undefined {
  return WORKSPACES.find((workspace) => workspace.id === id);
}

/**
 * Keep future records tenant/workspace scoped. Call this when adding workspace
 * IDs to database-backed records; do not infer a workspace from a ward label.
 */
export function normalizeWorkspaceId(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_WORKSPACE_ID;
  const normalized = value.trim().toLowerCase();
  return getWorkspace(normalized) ? normalized : DEFAULT_WORKSPACE_ID;
}
