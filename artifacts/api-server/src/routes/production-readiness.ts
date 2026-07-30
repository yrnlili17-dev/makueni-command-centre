import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  const checks = [
    {
      key: "node-environment",
      label: "Node environment",
      ok: Boolean(process.env.NODE_ENV),
      detail: process.env.NODE_ENV
        ? `NODE_ENV is set to ${process.env.NODE_ENV}.`
        : "NODE_ENV is not set.",
    },
    {
      key: "database-url",
      label: "Database configuration",
      ok: Boolean(process.env.DATABASE_URL),
      detail: process.env.DATABASE_URL
        ? "DATABASE_URL is configured."
        : "DATABASE_URL is missing.",
    },
    {
      key: "port",
      label: "Server port",
      ok: Boolean(process.env.PORT),
      detail: process.env.PORT
        ? `PORT is configured as ${process.env.PORT}.`
        : "PORT is not explicitly configured.",
    },
    {
      key: "production-mode",
      label: "Production mode",
      ok: process.env.NODE_ENV === "production",
      detail:
        process.env.NODE_ENV === "production"
          ? "Server is running in production mode."
          : "Server is not currently running in production mode.",
    },
  ];

  const status = checks.every((check) => check.ok) ? "healthy" : "degraded";

  res.setHeader("Cache-Control", "no-store");
  res.json({
    status,
    environment: process.env.NODE_ENV ?? "unknown",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    checks,
  });
});

export default router;
