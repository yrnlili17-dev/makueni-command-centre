import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS campaign_constituent_notes (
      id bigserial PRIMARY KEY,
      constituent_id bigint NOT NULL,
      note text NOT NULL,
      created_by text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS campaign_constituent_interactions (
      id bigserial PRIMARY KEY,
      constituent_id bigint NOT NULL,
      interaction_type text NOT NULL,
      channel text,
      summary text,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_by text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

function safeLimit(value: unknown, fallback = 50, max = 500) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), 1), max);
}

function safeOffset(value: unknown) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(Math.trunc(parsed), 0);
}

router.get("/health", async (_req, res) => {
  try {
    await ensureTables();

    const totals = await db.execute(sql`
      SELECT
        count(*)::integer AS constituents,
        count(*) FILTER (WHERE phone IS NOT NULL AND phone <> '')::integer AS with_phone,
        count(*) FILTER (WHERE email IS NOT NULL AND email <> '')::integer AS with_email,
        count(*) FILTER (WHERE ward IS NOT NULL AND ward <> '')::integer AS with_ward
      FROM campaign_constituents
    `);

    res.json({
      status: "ok",
      module: "phase8c-live-campaign-database",
      ...(totals as any).rows?.[0],
    });
  } catch (error) {
    res.status(503).json({
      status: "degraded",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/metrics", async (_req, res) => {
  await ensureTables();

  const result = await db.execute(sql`
    SELECT
      count(*)::integer AS total,
      count(*) FILTER (WHERE phone IS NOT NULL AND phone <> '')::integer AS phone_ready,
      count(*) FILTER (WHERE email IS NOT NULL AND email <> '')::integer AS email_ready,
      count(*) FILTER (WHERE sms_consent = true)::integer AS sms_consented,
      count(*) FILTER (WHERE whatsapp_consent = true)::integer AS whatsapp_consented,
      count(*) FILTER (WHERE email_consent = true)::integer AS email_consented,
      count(*) FILTER (WHERE gender = 'female')::integer AS women,
      count(*) FILTER (WHERE gender = 'male')::integer AS men,
      count(*) FILTER (
        WHERE dob IS NOT NULL
          AND date_part('year', age(current_date, dob)) BETWEEN 18 AND 35
      )::integer AS youth,
      count(DISTINCT ward) FILTER (WHERE ward IS NOT NULL AND ward <> '')::integer AS wards,
      count(DISTINCT constituency) FILTER (
        WHERE constituency IS NOT NULL AND constituency <> ''
      )::integer AS constituencies,
      count(*) FILTER (WHERE support_level = 'strong')::integer AS strong_support,
      count(*) FILTER (WHERE support_level = 'undecided')::integer AS undecided
    FROM campaign_constituents
  `);

  res.json((result as any).rows?.[0] ?? {});
});

router.get("/constituents", async (req, res) => {
  await ensureTables();

  const limit = safeLimit(req.query.limit);
  const offset = safeOffset(req.query.offset);
  const search = String(req.query.search ?? "").trim();
  const ward = String(req.query.ward ?? "").trim();
  const constituency = String(req.query.constituency ?? "").trim();
  const gender = String(req.query.gender ?? "").trim();
  const status = String(req.query.status ?? "").trim();
  const support = String(req.query.support ?? "").trim();

  const rows = await db.execute(sql`
    SELECT *
    FROM campaign_constituents
    WHERE
      (
        ${search} = ''
        OR coalesce(full_name, '') ILIKE ${`%${search}%`}
        OR coalesce(phone, '') ILIKE ${`%${search}%`}
        OR coalesce(national_id, '') ILIKE ${`%${search}%`}
        OR coalesce(email, '') ILIKE ${`%${search}%`}
        OR coalesce(village, '') ILIKE ${`%${search}%`}
        OR coalesce(polling_station, '') ILIKE ${`%${search}%`}
      )
      AND (${ward} = '' OR ward = ${ward})
      AND (${constituency} = '' OR constituency = ${constituency})
      AND (${gender} = '' OR gender = ${gender})
      AND (${status} = '' OR status = ${status})
      AND (${support} = '' OR support_level = ${support})
    ORDER BY full_name NULLS LAST, id
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  const count = await db.execute(sql`
    SELECT count(*)::integer AS total
    FROM campaign_constituents
    WHERE
      (
        ${search} = ''
        OR coalesce(full_name, '') ILIKE ${`%${search}%`}
        OR coalesce(phone, '') ILIKE ${`%${search}%`}
        OR coalesce(national_id, '') ILIKE ${`%${search}%`}
        OR coalesce(email, '') ILIKE ${`%${search}%`}
        OR coalesce(village, '') ILIKE ${`%${search}%`}
        OR coalesce(polling_station, '') ILIKE ${`%${search}%`}
      )
      AND (${ward} = '' OR ward = ${ward})
      AND (${constituency} = '' OR constituency = ${constituency})
      AND (${gender} = '' OR gender = ${gender})
      AND (${status} = '' OR status = ${status})
      AND (${support} = '' OR support_level = ${support})
  `);

  res.json({
    rows: (rows as any).rows ?? [],
    total: (count as any).rows?.[0]?.total ?? 0,
    limit,
    offset,
  });
});

router.get("/constituents/:id", async (req, res) => {
  await ensureTables();
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid constituent id" });
    return;
  }

  const person = await db.execute(sql`
    SELECT *
    FROM campaign_constituents
    WHERE id = ${id}
    LIMIT 1
  `);

  const constituent = (person as any).rows?.[0];
  if (!constituent) {
    res.status(404).json({ error: "Constituent not found" });
    return;
  }

  const [notes, interactions] = await Promise.all([
    db.execute(sql`
      SELECT *
      FROM campaign_constituent_notes
      WHERE constituent_id = ${id}
      ORDER BY created_at DESC
    `),
    db.execute(sql`
      SELECT *
      FROM campaign_constituent_interactions
      WHERE constituent_id = ${id}
      ORDER BY created_at DESC
    `),
  ]);

  res.json({
    constituent,
    notes: (notes as any).rows ?? [],
    interactions: (interactions as any).rows ?? [],
  });
});

router.patch("/constituents/:id", async (req, res) => {
  await ensureTables();
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid constituent id" });
    return;
  }

  const {
    phone,
    email,
    ward,
    constituency,
    county,
    village,
    pollingStation,
    status,
    supportLevel,
    smsConsent,
    whatsappConsent,
    emailConsent,
    tags,
  } = req.body ?? {};

  const result = await db.execute(sql`
    UPDATE campaign_constituents
    SET
      phone = COALESCE(${phone ?? null}, phone),
      email = COALESCE(${email ?? null}, email),
      ward = COALESCE(${ward ?? null}, ward),
      constituency = COALESCE(${constituency ?? null}, constituency),
      county = COALESCE(${county ?? null}, county),
      village = COALESCE(${village ?? null}, village),
      polling_station = COALESCE(${pollingStation ?? null}, polling_station),
      status = COALESCE(${status ?? null}, status),
      support_level = COALESCE(${supportLevel ?? null}, support_level),
      sms_consent = COALESCE(${smsConsent ?? null}, sms_consent),
      whatsapp_consent = COALESCE(${whatsappConsent ?? null}, whatsapp_consent),
      email_consent = COALESCE(${emailConsent ?? null}, email_consent),
      tags = COALESCE(${tags ? JSON.stringify(tags) : null}::jsonb, tags),
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `);

  const updated = (result as any).rows?.[0];
  if (!updated) {
    res.status(404).json({ error: "Constituent not found" });
    return;
  }

  res.json(updated);
});

router.post("/constituents/:id/notes", async (req, res) => {
  await ensureTables();
  const id = Number(req.params.id);
  const note = String(req.body?.note ?? "").trim();
  const createdBy = String(req.body?.createdBy ?? "Campaign Operations");

  if (!Number.isFinite(id) || !note) {
    res.status(400).json({ error: "Valid constituent id and note are required" });
    return;
  }

  const result = await db.execute(sql`
    INSERT INTO campaign_constituent_notes (
      constituent_id, note, created_by
    )
    VALUES (
      ${id}, ${note}, ${createdBy}
    )
    RETURNING *
  `);

  res.status(201).json((result as any).rows?.[0]);
});

router.post("/constituents/:id/interactions", async (req, res) => {
  await ensureTables();
  const id = Number(req.params.id);
  const {
    interactionType,
    channel,
    summary,
    metadata = {},
    createdBy = "Campaign Operations",
  } = req.body ?? {};

  if (!Number.isFinite(id) || !interactionType) {
    res.status(400).json({
      error: "Valid constituent id and interactionType are required",
    });
    return;
  }

  const result = await db.execute(sql`
    INSERT INTO campaign_constituent_interactions (
      constituent_id,
      interaction_type,
      channel,
      summary,
      metadata,
      created_by
    )
    VALUES (
      ${id},
      ${interactionType},
      ${channel ?? null},
      ${summary ?? null},
      ${JSON.stringify(metadata)}::jsonb,
      ${createdBy}
    )
    RETURNING *
  `);

  res.status(201).json((result as any).rows?.[0]);
});

router.get("/filters", async (_req, res) => {
  await ensureTables();

  const [wards, constituencies, statuses, supportLevels] = await Promise.all([
    db.execute(sql`
      SELECT DISTINCT ward AS value
      FROM campaign_constituents
      WHERE ward IS NOT NULL AND ward <> ''
      ORDER BY ward
    `),
    db.execute(sql`
      SELECT DISTINCT constituency AS value
      FROM campaign_constituents
      WHERE constituency IS NOT NULL AND constituency <> ''
      ORDER BY constituency
    `),
    db.execute(sql`
      SELECT DISTINCT status AS value
      FROM campaign_constituents
      WHERE status IS NOT NULL AND status <> ''
      ORDER BY status
    `),
    db.execute(sql`
      SELECT DISTINCT support_level AS value
      FROM campaign_constituents
      WHERE support_level IS NOT NULL AND support_level <> ''
      ORDER BY support_level
    `),
  ]);

  res.json({
    wards: ((wards as any).rows ?? []).map((row: any) => row.value),
    constituencies: ((constituencies as any).rows ?? []).map((row: any) => row.value),
    statuses: ((statuses as any).rows ?? []).map((row: any) => row.value),
    supportLevels: ((supportLevels as any).rows ?? []).map((row: any) => row.value),
  });
});

router.get("/segments", async (_req, res) => {
  await ensureTables();

  const result = await db.execute(sql`
    WITH base AS (
      SELECT
        *,
        CASE
          WHEN dob IS NULL THEN NULL
          ELSE date_part('year', age(current_date, dob))::integer
        END AS age_years
      FROM campaign_constituents
    )
    SELECT *
    FROM (
      SELECT 'Women'::text AS name, 'demographic'::text AS category,
             count(*) FILTER (WHERE gender = 'female')::integer AS members,
             'gender=female'::text AS rule
      FROM base

      UNION ALL

      SELECT 'Men', 'demographic',
             count(*) FILTER (WHERE gender = 'male')::integer,
             'gender=male'
      FROM base

      UNION ALL

      SELECT 'Youth 18–35', 'demographic',
             count(*) FILTER (WHERE age_years BETWEEN 18 AND 35)::integer,
             'age=18-35'
      FROM base

      UNION ALL

      SELECT 'Phone Ready', 'behavioral',
             count(*) FILTER (WHERE phone IS NOT NULL AND phone <> '')::integer,
             'phone!=null'
      FROM base

      UNION ALL

      SELECT 'Email Ready', 'behavioral',
             count(*) FILTER (WHERE email IS NOT NULL AND email <> '')::integer,
             'email!=null'
      FROM base

      UNION ALL

      SELECT 'SMS Consented', 'behavioral',
             count(*) FILTER (WHERE sms_consent = true)::integer,
             'sms_consent=true'
      FROM base

      UNION ALL

      SELECT 'WhatsApp Consented', 'behavioral',
             count(*) FILTER (WHERE whatsapp_consent = true)::integer,
             'whatsapp_consent=true'
      FROM base

      UNION ALL

      SELECT 'Strong Supporters', 'strategic',
             count(*) FILTER (WHERE support_level = 'strong')::integer,
             'support_level=strong'
      FROM base

      UNION ALL

      SELECT 'Undecided', 'strategic',
             count(*) FILTER (WHERE support_level = 'undecided')::integer,
             'support_level=undecided'
      FROM base

      UNION ALL

      SELECT 'Missing Phone', 'data_quality',
             count(*) FILTER (WHERE phone IS NULL OR phone = '')::integer,
             'phone=null'
      FROM base

      UNION ALL

      SELECT 'Missing Ward', 'data_quality',
             count(*) FILTER (WHERE ward IS NULL OR ward = '')::integer,
             'ward=null'
      FROM base
    ) AS segments
    ORDER BY category, name
  `);

  const wardSegments = await db.execute(sql`
    SELECT
      ward AS name,
      'geographic'::text AS category,
      count(*)::integer AS members,
      ('ward=' || ward)::text AS rule
    FROM campaign_constituents
    WHERE ward IS NOT NULL AND ward <> ''
    GROUP BY ward
    ORDER BY ward
  `);

  res.json([
    ...((result as any).rows ?? []),
    ...((wardSegments as any).rows ?? []),
  ]);
});

export default router;
