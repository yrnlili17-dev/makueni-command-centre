import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  let database = "unavailable";
  try {
    await db.execute(sql`SELECT 1`);
    database = "connected";
  } catch {
    database = "unavailable";
  }

  const cwd = process.cwd();
  const incidentEngine = fs.existsSync(path.join(cwd, "artifacts/api-server/src/services/intelligence-incident-engine.ts"));
  const localIntelligence = fs.existsSync(path.join(cwd, "artifacts/api-server/src/services/local-intelligence-engine.ts"));
  const executiveDashboard = fs.existsSync(path.join(cwd, "artifacts/commandcentre/src/components/intelligence/ExecutiveDashboardV6.tsx"));
  const complete = database === "connected" && incidentEngine && localIntelligence && executiveDashboard;

  res.status(complete ? 200 : 503).json({
    status: complete ? "ok" : "degraded",
    phase6: { incidentEngine, localIntelligence, executiveDashboard },
    database,
    checkedAt: new Date().toISOString(),
  });
});

export default router;
