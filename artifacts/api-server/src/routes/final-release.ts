import { Router } from "express";
import {
  db,
  electionAgentReportsTable,
  publicCampaignContentTable,
  productionChecksTable,
  productionIncidentsTable,
} from "@workspace/db";
import { asc, desc, eq, sql } from "drizzle-orm";

const router = Router();
const parseId = (value: string) => Number.parseInt(value, 10);

router.get("/war-room/summary", async (_req, res) => {
  const [summary] = await db
    .select({
      reports: sql<number>`count(*)`,
      turnout: sql<number>`coalesce(sum(${electionAgentReportsTable.turnout}), 0)`,
      candidateVotes: sql<number>`coalesce(sum(${electionAgentReportsTable.candidateVotes}), 0)`,
      validVotes: sql<number>`coalesce(sum(${electionAgentReportsTable.totalValidVotes}), 0)`,
      pendingVerification: sql<number>`count(*) filter (where ${electionAgentReportsTable.verificationStatus} = 'pending')`,
      incidents: sql<number>`count(*) filter (where ${electionAgentReportsTable.incidentLevel} <> 'none')`,
    })
    .from(electionAgentReportsTable);
  res.json(summary);
});

router.get("/war-room/reports", async (_req, res) => {
  res.json(await db.select().from(electionAgentReportsTable).orderBy(desc(electionAgentReportsTable.reportedAt)).limit(500));
});

router.post("/war-room/reports", async (req, res) => {
  const [row] = await db.insert(electionAgentReportsTable).values(req.body).returning();
  res.status(201).json(row);
});

router.patch("/war-room/reports/:id", async (req, res) => {
  const [row] = await db.update(electionAgentReportsTable)
    .set(req.body)
    .where(eq(electionAgentReportsTable.id, parseId(req.params.id)))
    .returning();
  res.json(row);
});

router.get("/public/content", async (_req, res) => {
  res.json(
    await db.select().from(publicCampaignContentTable)
      .where(eq(publicCampaignContentTable.published, true))
      .orderBy(asc(publicCampaignContentTable.displayOrder), desc(publicCampaignContentTable.createdAt))
  );
});

router.get("/public/admin/content", async (_req, res) => {
  res.json(await db.select().from(publicCampaignContentTable).orderBy(desc(publicCampaignContentTable.createdAt)));
});

router.post("/public/content", async (req, res) => {
  const [row] = await db.insert(publicCampaignContentTable).values(req.body).returning();
  res.status(201).json(row);
});

router.patch("/public/content/:id", async (req, res) => {
  const [row] = await db.update(publicCampaignContentTable)
    .set(req.body)
    .where(eq(publicCampaignContentTable.id, parseId(req.params.id)))
    .returning();
  res.json(row);
});

router.get("/production/summary", async (_req, res) => {
  const [checks] = await db.select({
    total: sql<number>`count(*)`,
    passing: sql<number>`count(*) filter (where ${productionChecksTable.status} = 'passing')`,
    warning: sql<number>`count(*) filter (where ${productionChecksTable.status} = 'warning')`,
    failing: sql<number>`count(*) filter (where ${productionChecksTable.status} = 'failing')`,
  }).from(productionChecksTable);
  const [incidents] = await db.select({
    total: sql<number>`count(*)`,
    open: sql<number>`count(*) filter (where ${productionIncidentsTable.status} <> 'resolved')`,
    critical: sql<number>`count(*) filter (where ${productionIncidentsTable.severity} = 'critical' and ${productionIncidentsTable.status} <> 'resolved')`,
  }).from(productionIncidentsTable);
  res.json({ checks, incidents });
});

router.get("/production/checks", async (_req, res) => {
  res.json(await db.select().from(productionChecksTable).orderBy(desc(productionChecksTable.createdAt)));
});

router.post("/production/checks", async (req, res) => {
  const [row] = await db.insert(productionChecksTable).values(req.body).returning();
  res.status(201).json(row);
});

router.patch("/production/checks/:id", async (req, res) => {
  const [row] = await db.update(productionChecksTable)
    .set(req.body)
    .where(eq(productionChecksTable.id, parseId(req.params.id)))
    .returning();
  res.json(row);
});

router.get("/production/incidents", async (_req, res) => {
  res.json(await db.select().from(productionIncidentsTable).orderBy(desc(productionIncidentsTable.openedAt)));
});

router.post("/production/incidents", async (req, res) => {
  const [row] = await db.insert(productionIncidentsTable).values(req.body).returning();
  res.status(201).json(row);
});

export default router;
