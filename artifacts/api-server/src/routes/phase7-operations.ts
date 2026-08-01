import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS narrative_incident_evidence (
      id serial PRIMARY KEY,
      incident_id integer NOT NULL,
      evidence_type text NOT NULL,
      title text NOT NULL,
      source_url text,
      notes text,
      verification_status text NOT NULL DEFAULT 'unverified',
      legal_review_status text NOT NULL DEFAULT 'not_requested',
      created_by text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS narrative_incident_reviews (
      id serial PRIMARY KEY,
      incident_id integer NOT NULL UNIQUE,
      fact_verification_status text NOT NULL DEFAULT 'pending',
      legal_review_status text NOT NULL DEFAULT 'not_requested',
      campaign_position text,
      investigation_summary text,
      updated_by text,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function findIncident(identifier: string) {
  const numeric = Number(identifier.replace(/^INT-2027-/, ""));
  if (!Number.isFinite(numeric)) return null;

  const result = await db.execute(sql`
    SELECT *
    FROM narrative_incidents
    WHERE incident_code = ${identifier}
       OR id = ${numeric}
       OR mention_id = ${numeric}
    LIMIT 1
  `);

  return (result as any).rows?.[0] ?? null;
}

router.get("/incidents/:identifier/evidence", async (req, res) => {
  await ensureTables();
  const incident = await findIncident(String(req.params.identifier));

  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  const result = await db.execute(sql`
    SELECT *
    FROM narrative_incident_evidence
    WHERE incident_id = ${incident.id}
    ORDER BY created_at DESC
  `);

  res.json((result as any).rows ?? []);
});

router.post("/incidents/:identifier/evidence", async (req, res) => {
  await ensureTables();
  const incident = await findIncident(String(req.params.identifier));

  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  const {
    evidenceType,
    title,
    sourceUrl,
    notes,
    verificationStatus = "unverified",
    legalReviewStatus = "not_requested",
    createdBy = "Campaign Operations",
  } = req.body ?? {};

  if (!evidenceType || !title) {
    res.status(400).json({
      error: "evidenceType and title are required",
    });
    return;
  }

  const result = await db.execute(sql`
    INSERT INTO narrative_incident_evidence (
      incident_id,
      evidence_type,
      title,
      source_url,
      notes,
      verification_status,
      legal_review_status,
      created_by
    )
    VALUES (
      ${incident.id},
      ${evidenceType},
      ${title},
      ${sourceUrl ?? null},
      ${notes ?? null},
      ${verificationStatus},
      ${legalReviewStatus},
      ${createdBy}
    )
    RETURNING *
  `);

  res.status(201).json((result as any).rows?.[0]);
});

router.delete("/evidence/:id", async (req, res) => {
  await ensureTables();
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid evidence id" });
    return;
  }

  await db.execute(sql`
    DELETE FROM narrative_incident_evidence
    WHERE id = ${id}
  `);

  res.json({ ok: true });
});

router.get("/incidents/:identifier/review", async (req, res) => {
  await ensureTables();
  const incident = await findIncident(String(req.params.identifier));

  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  const result = await db.execute(sql`
    SELECT *
    FROM narrative_incident_reviews
    WHERE incident_id = ${incident.id}
    LIMIT 1
  `);

  res.json(
    (result as any).rows?.[0] ?? {
      incident_id: incident.id,
      fact_verification_status: "pending",
      legal_review_status: "not_requested",
      campaign_position: null,
      investigation_summary: null,
      updated_by: null,
      updated_at: null,
    },
  );
});

router.put("/incidents/:identifier/review", async (req, res) => {
  await ensureTables();
  const incident = await findIncident(String(req.params.identifier));

  if (!incident) {
    res.status(404).json({ error: "Incident not found" });
    return;
  }

  const {
    factVerificationStatus = "pending",
    legalReviewStatus = "not_requested",
    campaignPosition,
    investigationSummary,
    updatedBy = "Campaign Operations",
  } = req.body ?? {};

  const result = await db.execute(sql`
    INSERT INTO narrative_incident_reviews (
      incident_id,
      fact_verification_status,
      legal_review_status,
      campaign_position,
      investigation_summary,
      updated_by
    )
    VALUES (
      ${incident.id},
      ${factVerificationStatus},
      ${legalReviewStatus},
      ${campaignPosition ?? null},
      ${investigationSummary ?? null},
      ${updatedBy}
    )
    ON CONFLICT (incident_id)
    DO UPDATE SET
      fact_verification_status = EXCLUDED.fact_verification_status,
      legal_review_status = EXCLUDED.legal_review_status,
      campaign_position = EXCLUDED.campaign_position,
      investigation_summary = EXCLUDED.investigation_summary,
      updated_by = EXCLUDED.updated_by,
      updated_at = now()
    RETURNING *
  `);

  res.json((result as any).rows?.[0]);
});

router.get("/health", async (_req, res) => {
  try {
    await ensureTables();
    res.json({
      status: "ok",
      responseOperations: true,
      evidenceRegister: true,
      investigationReview: true,
      localCampaignIntelligence: true,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "degraded",
      error: error instanceof Error ? error.message : "Unknown error",
      checkedAt: new Date().toISOString(),
    });
  }
});

export default router;
