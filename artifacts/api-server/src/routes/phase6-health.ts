import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";

const router: IRouter = Router();

function fileExistsInAnyLocation(paths: string[]): boolean {
  return paths.some((candidate) => fs.existsSync(candidate));
}

router.get("/", async (_req, res) => {
  let database = "unavailable";

  try {
    await db.execute(sql`SELECT 1`);
    database = "connected";
  } catch (error) {
    console.error("Phase 6 database health check failed:", error);
  }

  const cwd = process.cwd();

  /*
   * pnpm --filter starts the API with artifacts/api-server as cwd.
   * Render may start it from the repository root.
   * Check both layouts so the health endpoint works locally and on Render.
   */
  const incidentEngine = fileExistsInAnyLocation([
    path.resolve(
      cwd,
      "src/services/intelligence-incident-engine.ts",
    ),
    path.resolve(
      cwd,
      "artifacts/api-server/src/services/intelligence-incident-engine.ts",
    ),
  ]);

  const localIntelligence = fileExistsInAnyLocation([
    path.resolve(
      cwd,
      "src/services/local-intelligence-engine.ts",
    ),
    path.resolve(
      cwd,
      "artifacts/api-server/src/services/local-intelligence-engine.ts",
    ),
  ]);

  const executiveDashboard = fileExistsInAnyLocation([
    path.resolve(
      cwd,
      "../commandcentre/src/components/intelligence/ExecutiveDashboardV6.tsx",
    ),
    path.resolve(
      cwd,
      "artifacts/commandcentre/src/components/intelligence/ExecutiveDashboardV6.tsx",
    ),
  ]);

  const complete =
    database === "connected" &&
    incidentEngine &&
    localIntelligence &&
    executiveDashboard;

  res.status(complete ? 200 : 503).json({
    status: complete ? "ok" : "degraded",
    phase6: {
      incidentEngine,
      localIntelligence,
      executiveDashboard,
    },
    database,
    runtime: {
      workingDirectory: cwd,
    },
    checkedAt: new Date().toISOString(),
  });
});

export default router;
