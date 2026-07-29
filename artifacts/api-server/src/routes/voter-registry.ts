import { Router } from "express";
import { db, voterRegistryTable, voterSyncLogsTable, iebcCredentialsTable } from "@workspace/db";
import { eq, sql, desc, ilike, or, and } from "drizzle-orm";

const router = Router();

// ── Stats ──────────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  const [totals] = await db.select({
    total: sql<number>`count(*)`,
    verified: sql<number>`count(*) filter (where status = 'verified')`,
    pending: sql<number>`count(*) filter (where status = 'pending')`,
    rejected: sql<number>`count(*) filter (where status = 'rejected')`,
    fromUpload: sql<number>`count(*) filter (where source = 'upload')`,
    fromApi: sql<number>`count(*) filter (where source = 'api')`,
    fromManual: sql<number>`count(*) filter (where source = 'manual')`,
  }).from(voterRegistryTable);

  const wardBreakdown = await db
    .select({ ward: voterRegistryTable.ward, count: sql<number>`count(*)` })
    .from(voterRegistryTable)
    .groupBy(voterRegistryTable.ward);

  const recentLogs = await db
    .select()
    .from(voterSyncLogsTable)
    .orderBy(desc(voterSyncLogsTable.createdAt))
    .limit(5);

  res.json({
    total: Number(totals?.total ?? 0),
    verified: Number(totals?.verified ?? 0),
    pending: Number(totals?.pending ?? 0),
    rejected: Number(totals?.rejected ?? 0),
    fromUpload: Number(totals?.fromUpload ?? 0),
    fromApi: Number(totals?.fromApi ?? 0),
    fromManual: Number(totals?.fromManual ?? 0),
    wardBreakdown: wardBreakdown.map(w => ({ ward: w.ward ?? "Unknown", count: Number(w.count) })),
    recentLogs,
  });
});

// ── List ───────────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const { search, ward, status, source, limit: limitStr, offset: offsetStr } = req.query as Record<string, string>;
  const limit = parseInt(limitStr ?? "100");
  const offset = parseInt(offsetStr ?? "0");

  const conditions = [];
  if (search) {
    conditions.push(or(
      ilike(voterRegistryTable.fullName, `%${search}%`),
      ilike(voterRegistryTable.nationalId, `%${search}%`),
      ilike(voterRegistryTable.voterNumber, `%${search}%`),
      ilike(voterRegistryTable.phone, `%${search}%`),
    ));
  }
  if (ward) conditions.push(eq(voterRegistryTable.ward, ward));
  if (status) conditions.push(eq(voterRegistryTable.status, status));
  if (source) conditions.push(eq(voterRegistryTable.source, source));

  const rows = await db
    .select()
    .from(voterRegistryTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(voterRegistryTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(voterRegistryTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json({ data: rows, total: Number(countRow?.count ?? 0), limit, offset });
});

// ── Create (manual capture) ────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const {
    nationalId, voterNumber, fullName, phone, gender, dateOfBirth,
    ward, subCounty, pollingStation, pollingStationCode, stream, importBatch, notes,
  } = req.body;

  if (!fullName) { res.status(400).json({ error: "fullName required" }); return; }

  const [record] = await db.insert(voterRegistryTable).values({
    nationalId, voterNumber, fullName, phone, gender, dateOfBirth,
    ward, subCounty, pollingStation, pollingStationCode, stream,
    importBatch, reviewNotes: notes,
    status: "verified",
    source: "manual",
  }).returning();

  res.status(201).json(record);
});

// ── Bulk upload (CSV parsed on frontend, sent as JSON) ─────────────────────
router.post("/upload", async (req, res) => {
  const { records, batchName } = req.body as {
    records: Array<{
      nationalId?: string; voterNumber?: string; fullName: string; phone?: string;
      gender?: string; dateOfBirth?: string; ward?: string; subCounty?: string;
      pollingStation?: string; pollingStationCode?: string; stream?: string;
    }>;
    batchName: string;
  };

  if (!Array.isArray(records) || records.length === 0) {
    res.status(400).json({ error: "records array required" }); return;
  }

  const batchId = batchName || `UPLOAD-${Date.now()}`;
  let newCount = 0;
  let dupCount = 0;

  for (const r of records) {
    if (!r.fullName) continue;

    // Check for duplicate by nationalId or voterNumber
    let isDup = false;
    if (r.nationalId) {
      const [existing] = await db.select({ id: voterRegistryTable.id })
        .from(voterRegistryTable).where(eq(voterRegistryTable.nationalId, r.nationalId));
      if (existing) { isDup = true; dupCount++; }
    }

    if (!isDup) {
      await db.insert(voterRegistryTable).values({
        ...r,
        importBatch: batchId,
        status: "pending",
        source: "upload",
      });
      newCount++;
    }
  }

  // Log the sync
  await db.insert(voterSyncLogsTable).values({
    source: `upload:${batchId}`,
    status: "completed",
    recordsProcessed: records.length,
    recordsNew: newCount,
    recordsDuplicate: dupCount,
    details: `Uploaded ${records.length} records. New: ${newCount}, Duplicates skipped: ${dupCount}`,
  });

  res.json({ processed: records.length, new: newCount, duplicates: dupCount, batchId });
});

// ── Review: update status ──────────────────────────────────────────────────
router.patch("/:id", async (req, res) => {
  const updates: Record<string, unknown> = {};
  ["status", "reviewNotes", "fullName", "nationalId", "voterNumber", "phone", "ward", "pollingStation", "gender"].forEach(f => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });
  updates.updatedAt = new Date();

  const [record] = await db.update(voterRegistryTable)
    .set(updates)
    .where(eq(voterRegistryTable.id, parseInt(req.params.id)))
    .returning();

  if (!record) { res.status(404).json({ error: "Not found" }); return; }
  res.json(record);
});

// ── Bulk review action ─────────────────────────────────────────────────────
router.post("/bulk-review", async (req, res) => {
  const { ids, action } = req.body as { ids: number[]; action: "verify" | "reject" };
  if (!Array.isArray(ids) || !action) { res.status(400).json({ error: "ids and action required" }); return; }

  const status = action === "verify" ? "verified" : "rejected";
  await db.update(voterRegistryTable)
    .set({ status, updatedAt: new Date() })
    .where(sql`id = ANY(${ids})`);

  res.json({ updated: ids.length, status });
});

// ── Delete ─────────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  await db.delete(voterRegistryTable).where(eq(voterRegistryTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

// ── IEBC Credentials ───────────────────────────────────────────────────────
router.get("/iebc/credentials", async (req, res) => {
  const [creds] = await db.select().from(iebcCredentialsTable).limit(1);
  if (!creds) { res.json({ configured: false }); return; }
  res.json({
    configured: !!(creds.apiKey),
    baseUrl: creds.baseUrl,
    clientId: creds.clientId,
    notes: creds.notes,
    lastTested: creds.lastTested,
    lastStatus: creds.lastStatus,
  });
});

router.post("/iebc/credentials", async (req, res) => {
  const { apiKey, baseUrl, clientId, notes } = req.body;
  const [existing] = await db.select().from(iebcCredentialsTable).limit(1);

  if (existing) {
    const [updated] = await db.update(iebcCredentialsTable)
      .set({ apiKey, baseUrl: baseUrl || "https://api.iebc.or.ke/v1", clientId, notes, updatedAt: new Date() })
      .where(eq(iebcCredentialsTable.id, existing.id))
      .returning();
    res.json({ configured: !!(updated.apiKey), baseUrl: updated.baseUrl, clientId: updated.clientId });
  } else {
    const [created] = await db.insert(iebcCredentialsTable)
      .values({ apiKey, baseUrl: baseUrl || "https://api.iebc.or.ke/v1", clientId, notes })
      .returning();
    res.json({ configured: !!(created.apiKey), baseUrl: created.baseUrl, clientId: created.clientId });
  }
});

// ── IEBC: Test Connection ──────────────────────────────────────────────────
router.post("/iebc/test", async (req, res) => {
  const [creds] = await db.select().from(iebcCredentialsTable).limit(1);
  if (!creds?.apiKey) { res.status(400).json({ ok: false, message: "API key not configured" }); return; }

  let ok = false;
  let message = "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(`${creds.baseUrl}/ping`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${creds.apiKey}`, "X-Client-ID": creds.clientId ?? "" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    ok = response.ok;
    message = ok ? "Connection successful" : `HTTP ${response.status}: ${response.statusText}`;
  } catch (err: any) {
    ok = false;
    message = err.name === "AbortError" ? "Connection timed out" : `Connection failed: ${err.message}`;
  }

  await db.update(iebcCredentialsTable)
    .set({ lastTested: new Date(), lastStatus: ok ? "connected" : "failed", updatedAt: new Date() })
    .where(eq(iebcCredentialsTable.id, creds.id));

  res.json({ ok, message });
});

// ── IEBC: Sync ─────────────────────────────────────────────────────────────
router.post("/iebc/sync", async (req, res) => {
  const { ward, pollingStation, limit: limitReq } = req.body;
  const [creds] = await db.select().from(iebcCredentialsTable).limit(1);

  if (!creds?.apiKey) { res.status(400).json({ error: "IEBC API not configured" }); return; }

  let imported = 0;
  let message = "";

  try {
    const params = new URLSearchParams();
    if (ward) params.set("ward", ward);
    if (pollingStation) params.set("polling_station", pollingStation);
    if (limitReq) params.set("limit", String(limitReq));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(`${creds.baseUrl}/voters?${params}`, {
      headers: { "Authorization": `Bearer ${creds.apiKey}`, "X-Client-ID": creds.clientId ?? "" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`IEBC API error: ${response.status} ${response.statusText}`);
    }

    const data: { voters?: Array<Record<string, string>> } = await response.json();
    const voters = data.voters ?? [];

    for (const v of voters) {
      const natId = v["national_id"] ?? v["nationalId"];
      if (natId) {
        const [existing] = await db.select({ id: voterRegistryTable.id })
          .from(voterRegistryTable).where(eq(voterRegistryTable.nationalId, natId));
        if (existing) continue;
      }
      await db.insert(voterRegistryTable).values({
        nationalId: v["national_id"] ?? v["nationalId"],
        voterNumber: v["voter_number"] ?? v["voterNumber"],
        fullName: v["full_name"] ?? v["fullName"] ?? v["name"] ?? "Unknown",
        phone: v["phone"],
        gender: v["gender"],
        dateOfBirth: v["date_of_birth"] ?? v["dob"],
        ward: v["ward"] ?? ward,
        subCounty: v["sub_county"] ?? v["subCounty"],
        pollingStation: v["polling_station"] ?? v["pollingStation"] ?? pollingStation,
        pollingStationCode: v["station_code"] ?? v["pollingStationCode"],
        stream: v["stream"],
        status: "pending",
        source: "api",
        importBatch: `IEBC-${new Date().toISOString().split("T")[0]}`,
      });
      imported++;
    }

    message = `Synced ${voters.length} records from IEBC — ${imported} new`;

    await db.insert(voterSyncLogsTable).values({
      source: "iebc-api",
      status: "completed",
      recordsProcessed: voters.length,
      recordsNew: imported,
      recordsDuplicate: voters.length - imported,
      details: message,
    });

    res.json({ ok: true, processed: voters.length, imported, message });
  } catch (err: any) {
    message = err.message;
    await db.insert(voterSyncLogsTable).values({
      source: "iebc-api",
      status: "failed",
      recordsProcessed: 0,
      recordsNew: 0,
      recordsDuplicate: 0,
      errorMessage: message,
    });
    res.status(502).json({ ok: false, error: message });
  }
});

// ── Sync logs ──────────────────────────────────────────────────────────────
router.get("/sync-logs", async (req, res) => {
  const logs = await db.select().from(voterSyncLogsTable).orderBy(desc(voterSyncLogsTable.createdAt)).limit(50);
  res.json(logs);
});

export default router;
