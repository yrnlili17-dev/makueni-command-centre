import { Router } from "express";
import { db, pollingStationsTable, tallyResultsTable, electionEventsTable } from "@workspace/db";
import { eq, sql, desc, and, inArray } from "drizzle-orm";

const router = Router();

const CANDIDATES = [
  { name: "Prof. Philip Kaloki", party: "UDA" },
  { name: "Mutula Kilonzo Jr.", party: "Wiper" },
  { name: "Others", party: "Other Parties" },
];

// ── Summary / HQ Tally ─────────────────────────────────────────────────────
router.get("/summary", async (req, res) => {
  const totalStations = await db.select({ count: sql<number>`count(*)` }).from(pollingStationsTable);
  const submittedStations = await db.select({ count: sql<number>`count(distinct station_code)` }).from(tallyResultsTable);
  const verifiedStations = await db.select({ count: sql<number>`count(distinct station_code)` }).from(tallyResultsTable).where(eq(tallyResultsTable.status, "verified"));

  const tallyByCandidate = await db
    .select({
      candidateName: tallyResultsTable.candidateName,
      party: tallyResultsTable.party,
      totalVotes: sql<number>`coalesce(sum(votes), 0)`,
      verifiedVotes: sql<number>`coalesce(sum(case when status = 'verified' then votes else 0 end), 0)`,
    })
    .from(tallyResultsTable)
    .groupBy(tallyResultsTable.candidateName, tallyResultsTable.party)
    .orderBy(sql`sum(votes) desc`);

  const wardBreakdown = await db
    .select({
      ward: pollingStationsTable.ward,
      totalStations: sql<number>`count(distinct ${pollingStationsTable.id})`,
      submittedStations: sql<number>`count(distinct ${tallyResultsTable.stationCode})`,
    })
    .from(pollingStationsTable)
    .leftJoin(tallyResultsTable, eq(pollingStationsTable.code, tallyResultsTable.stationCode))
    .groupBy(pollingStationsTable.ward);

  const totalRegistered = await db.select({ total: sql<number>`coalesce(sum(registered_voters), 0)` }).from(pollingStationsTable);
  const totalVotesCast = await db.select({ total: sql<number>`coalesce(sum(votes), 0)` }).from(tallyResultsTable).where(eq(tallyResultsTable.candidateName, CANDIDATES[0]!.name));

  res.json({
    totalStations: Number(totalStations[0]?.count ?? 0),
    submittedStations: Number(submittedStations[0]?.count ?? 0),
    verifiedStations: Number(verifiedStations[0]?.count ?? 0),
    totalRegisteredVoters: Number(totalRegistered[0]?.total ?? 0),
    tallyByCandidate,
    wardBreakdown,
  });
});

// ── Stations ───────────────────────────────────────────────────────────────
router.get("/stations", async (req, res) => {
  const { ward, status } = req.query as Record<string, string>;
  let query = db.select().from(pollingStationsTable).orderBy(pollingStationsTable.ward, pollingStationsTable.code);
  const rows = await query;
  let filtered = rows;
  if (ward) filtered = filtered.filter(r => r.ward === ward);
  if (status) filtered = filtered.filter(r => r.status === status);
  res.json(filtered);
});

router.post("/stations", async (req, res) => {
  const { code, name, ward, registeredVoters, streamCount, agentName, agentPhone } = req.body;
  if (!code || !name || !ward) { res.status(400).json({ error: "code, name, ward required" }); return; }
  const [station] = await db.insert(pollingStationsTable).values({ code, name, ward, registeredVoters: registeredVoters ?? 0, streamCount: streamCount ?? 1, agentName, agentPhone, status: "pending" }).returning();
  res.status(201).json(station);
});

router.patch("/stations/:id", async (req, res) => {
  const updates: Record<string, unknown> = {};
  ["code", "name", "ward", "registeredVoters", "streamCount", "agentName", "agentPhone", "status", "notes"].forEach(f => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });
  const [station] = await db.update(pollingStationsTable).set(updates).where(eq(pollingStationsTable.id, parseInt(req.params.id))).returning();
  if (!station) { res.status(404).json({ error: "Not found" }); return; }
  res.json(station);
});

// ── Tally Results ──────────────────────────────────────────────────────────
router.get("/results", async (req, res) => {
  const { stationCode, status } = req.query as Record<string, string>;
  let rows = await db.select().from(tallyResultsTable).orderBy(desc(tallyResultsTable.submittedAt));
  if (stationCode) rows = rows.filter(r => r.stationCode === stationCode);
  if (status) rows = rows.filter(r => r.status === status);
  res.json(rows);
});

router.post("/results", async (req, res) => {
  const { stationCode, results, totalValidVotes, rejectedVotes, submittedBy } = req.body;
  if (!stationCode || !results || !Array.isArray(results)) {
    res.status(400).json({ error: "stationCode and results[] required" }); return;
  }

  const [station] = await db.select().from(pollingStationsTable).where(eq(pollingStationsTable.code, stationCode));
  if (!station) { res.status(404).json({ error: "Station not found" }); return; }

  await db.delete(tallyResultsTable).where(eq(tallyResultsTable.stationCode, stationCode));

  const rows = await db.insert(tallyResultsTable).values(
    results.map((r: { candidateName: string; party: string; votes: number }) => ({
      stationId: station.id,
      stationCode,
      candidateName: r.candidateName,
      party: r.party,
      votes: parseInt(r.votes as unknown as string),
      totalValidVotes: totalValidVotes ?? null,
      rejectedVotes: rejectedVotes ?? 0,
      registeredVoters: station.registeredVoters,
      status: "submitted",
      submittedBy: submittedBy ?? "Agent",
      submittedAt: new Date(),
    }))
  ).returning();

  await db.update(pollingStationsTable).set({ status: "submitted" }).where(eq(pollingStationsTable.code, stationCode));
  res.status(201).json(rows);
});

router.patch("/results/:id/verify", async (req, res) => {
  const { verifiedBy } = req.body;
  const [result] = await db.select().from(tallyResultsTable).where(eq(tallyResultsTable.id, parseInt(req.params.id)));
  if (!result) { res.status(404).json({ error: "Not found" }); return; }
  const [updated] = await db.update(tallyResultsTable).set({ status: "verified", verifiedBy: verifiedBy ?? "HQ", verifiedAt: new Date() }).where(eq(tallyResultsTable.stationCode, result.stationCode)).returning();
  await db.update(pollingStationsTable).set({ status: "verified" }).where(eq(pollingStationsTable.code, result.stationCode));
  res.json(updated);
});

router.patch("/results/:id/dispute", async (req, res) => {
  const [updated] = await db.update(tallyResultsTable).set({ status: "disputed", notes: req.body.notes ?? "Flagged for review" }).where(eq(tallyResultsTable.id, parseInt(req.params.id))).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/results/:id", async (req, res) => {
  await db.delete(tallyResultsTable).where(eq(tallyResultsTable.id, parseInt(req.params.id)));
  res.status(204).send();
});

// ── Election Events ────────────────────────────────────────────────────────
router.get("/events", async (req, res) => {
  const rows = await db.select().from(electionEventsTable).orderBy(desc(electionEventsTable.createdAt));
  res.json(rows);
});

router.post("/events", async (req, res) => {
  const { type, title, description, ward, stationCode, priority } = req.body;
  if (!title || !description) { res.status(400).json({ error: "title and description required" }); return; }
  const [event] = await db.insert(electionEventsTable).values({ type: type ?? "info", title, description, ward, stationCode, priority: priority ?? "normal", status: "open" }).returning();
  res.status(201).json(event);
});

router.patch("/events/:id", async (req, res) => {
  const updates: Record<string, unknown> = {};
  ["status", "notes"].forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const [event] = await db.update(electionEventsTable).set(updates).where(eq(electionEventsTable.id, parseInt(req.params.id))).returning();
  if (!event) { res.status(404).json({ error: "Not found" }); return; }
  res.json(event);
});

// ── Workqueue ──────────────────────────────────────────────────────────────
router.get("/workqueue", async (req, res) => {
  const submittedCodes = (await db.select({ code: tallyResultsTable.stationCode }).from(tallyResultsTable).groupBy(tallyResultsTable.stationCode)).map(r => r.code);

  const unsubmittedStations = await db.select().from(pollingStationsTable).where(inArray(pollingStationsTable.status, ["pending", "open"]));

  const pendingVerification = await db.select().from(tallyResultsTable).where(eq(tallyResultsTable.status, "submitted")).orderBy(tallyResultsTable.stationCode, desc(tallyResultsTable.submittedAt));

  const uniquePending = Object.values(
    pendingVerification.reduce((acc, r) => { if (!acc[r.stationCode]) acc[r.stationCode] = r; return acc; }, {} as Record<string, typeof pendingVerification[0]>)
  );

  res.json({ unsubmittedStations, pendingVerification: uniquePending, submittedCodes });
});

// ── Published Results ──────────────────────────────────────────────────────
router.get("/published", async (req, res) => {
  const verified = await db.select().from(tallyResultsTable).where(eq(tallyResultsTable.status, "verified")).orderBy(tallyResultsTable.candidateName);
  const byCandidate: Record<string, { candidateName: string; party: string; totalVotes: number; stationCount: number }> = {};
  for (const r of verified) {
    if (!byCandidate[r.candidateName]) {
      byCandidate[r.candidateName] = { candidateName: r.candidateName, party: r.party ?? "", totalVotes: 0, stationCount: 0 };
    }
    byCandidate[r.candidateName]!.totalVotes += r.votes;
    byCandidate[r.candidateName]!.stationCount += 1;
  }
  const totals = Object.values(byCandidate).sort((a, b) => b.totalVotes - a.totalVotes);
  res.json({ totals, breakdown: verified });
});


async function ensureElectionOperationsTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS election_station_readiness (
      id bigserial PRIMARY KEY,
      station_id integer,
      station_code text NOT NULL,
      opened boolean NOT NULL DEFAULT false,
      materials_received boolean NOT NULL DEFAULT false,
      device_ready boolean NOT NULL DEFAULT false,
      connectivity_ready boolean NOT NULL DEFAULT false,
      presiding_officer_confirmed boolean NOT NULL DEFAULT false,
      notes text,
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (station_code)
    );

    CREATE TABLE IF NOT EXISTS election_agent_operations (
      id bigserial PRIMARY KEY,
      station_code text NOT NULL,
      agent_name text NOT NULL,
      agent_phone text,
      role text NOT NULL DEFAULT 'primary',
      status text NOT NULL DEFAULT 'assigned',
      checked_in_at timestamptz,
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS election_vehicle_deployments (
      id bigserial PRIMARY KEY,
      registration_number text NOT NULL,
      driver_name text,
      driver_phone text,
      ward text,
      assignment text,
      fuel_status text NOT NULL DEFAULT 'unknown',
      status text NOT NULL DEFAULT 'available',
      last_check_in timestamptz,
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS election_observer_assignments (
      id bigserial PRIMARY KEY,
      observer_name text NOT NULL,
      observer_phone text,
      observer_type text NOT NULL DEFAULT 'party',
      ward text,
      station_code text,
      status text NOT NULL DEFAULT 'assigned',
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS election_incident_escalations (
      id bigserial PRIMARY KEY,
      station_code text,
      ward text,
      title text NOT NULL,
      description text,
      severity text NOT NULL DEFAULT 'medium',
      status text NOT NULL DEFAULT 'open',
      assigned_to text,
      acknowledged_at timestamptz,
      resolved_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

router.get("/operations-centre", async (_req, res) => {
  try {
    await ensureElectionOperationsTables();

    const [stations, agents, vehicles, observers, escalations] = await Promise.all([
      db.execute(sql`
        SELECT
          ps.id,
          ps.code,
          ps.name,
          ps.ward,
          ps.registered_voters AS "registeredVoters",
          ps.agent_name AS "agentName",
          ps.agent_phone AS "agentPhone",
          ps.status,
          coalesce(sr.opened, false) AS opened,
          coalesce(sr.materials_received, false) AS "materialsReceived",
          coalesce(sr.device_ready, false) AS "deviceReady",
          coalesce(sr.connectivity_ready, false) AS "connectivityReady",
          coalesce(sr.presiding_officer_confirmed, false) AS "presidingOfficerConfirmed",
          sr.notes AS "readinessNotes",
          sr.updated_at AS "readinessUpdatedAt"
        FROM polling_stations ps
        LEFT JOIN election_station_readiness sr
          ON sr.station_code = ps.code
        ORDER BY ps.ward, ps.code
      `),
      db.execute(sql`
        SELECT
          id,
          station_code AS "stationCode",
          agent_name AS "agentName",
          agent_phone AS "agentPhone",
          role,
          status,
          checked_in_at AS "checkedInAt",
          notes,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM election_agent_operations
        ORDER BY
          CASE status
            WHEN 'missing' THEN 1
            WHEN 'assigned' THEN 2
            WHEN 'checked-in' THEN 3
            ELSE 4
          END,
          updated_at DESC
      `),
      db.execute(sql`
        SELECT
          id,
          registration_number AS "registrationNumber",
          driver_name AS "driverName",
          driver_phone AS "driverPhone",
          ward,
          assignment,
          fuel_status AS "fuelStatus",
          status,
          last_check_in AS "lastCheckIn",
          notes,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM election_vehicle_deployments
        ORDER BY updated_at DESC
      `),
      db.execute(sql`
        SELECT
          id,
          observer_name AS "observerName",
          observer_phone AS "observerPhone",
          observer_type AS "observerType",
          ward,
          station_code AS "stationCode",
          status,
          notes,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM election_observer_assignments
        ORDER BY updated_at DESC
      `),
      db.execute(sql`
        SELECT
          id,
          station_code AS "stationCode",
          ward,
          title,
          description,
          severity,
          status,
          assigned_to AS "assignedTo",
          acknowledged_at AS "acknowledgedAt",
          resolved_at AS "resolvedAt",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM election_incident_escalations
        ORDER BY
          CASE severity
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            ELSE 4
          END,
          created_at DESC
      `),
    ]);

    const stationRows = (stations as any).rows ?? [];

    const wardMap = new Map<string, any>();

    for (const station of stationRows) {
      const ward = station.ward || "UNASSIGNED";
      if (!wardMap.has(ward)) {
        wardMap.set(ward, {
          ward,
          totalStations: 0,
          readyStations: 0,
          openedStations: 0,
          missingAgents: 0,
        });
      }

      const row = wardMap.get(ward);
      row.totalStations += 1;

      const ready =
        station.opened &&
        station.materialsReceived &&
        station.deviceReady &&
        station.connectivityReady &&
        station.presidingOfficerConfirmed;

      if (ready) row.readyStations += 1;
      if (station.opened) row.openedStations += 1;
      if (!station.agentName && !station.agentPhone) row.missingAgents += 1;
    }

    const wards = [...wardMap.values()].map((row) => ({
      ...row,
      readiness:
        row.totalStations > 0
          ? Math.round((row.readyStations / row.totalStations) * 100)
          : 0,
      openingRate:
        row.totalStations > 0
          ? Math.round((row.openedStations / row.totalStations) * 100)
          : 0,
      riskScore: Math.min(
        100,
        Math.round(
          (1 - row.readyStations / Math.max(1, row.totalStations)) * 70 +
          (row.missingAgents / Math.max(1, row.totalStations)) * 30,
        ),
      ),
    }));

    res.json({
      generatedAt: new Date().toISOString(),
      summary: {
        pollingStations: stationRows.length,
        readyStations: stationRows.filter((station: any) =>
          station.opened &&
          station.materialsReceived &&
          station.deviceReady &&
          station.connectivityReady &&
          station.presidingOfficerConfirmed
        ).length,
        openedStations: stationRows.filter((station: any) => station.opened).length,
        agents: ((agents as any).rows ?? []).length,
        agentsCheckedIn: ((agents as any).rows ?? []).filter(
          (agent: any) => agent.status === "checked-in"
        ).length,
        vehicles: ((vehicles as any).rows ?? []).length,
        activeVehicles: ((vehicles as any).rows ?? []).filter(
          (vehicle: any) => vehicle.status === "deployed"
        ).length,
        observers: ((observers as any).rows ?? []).length,
        openEscalations: ((escalations as any).rows ?? []).filter(
          (incident: any) => incident.status !== "resolved"
        ).length,
      },
      wards,
      stations: stationRows,
      agents: (agents as any).rows ?? [],
      vehicles: (vehicles as any).rows ?? [],
      observers: (observers as any).rows ?? [],
      escalations: (escalations as any).rows ?? [],
    });
  } catch (err) {
    console.error("election operations centre failed", err);
    res.status(500).json({
      error: "Failed to load election operations centre",
      detail: err instanceof Error ? err.message : "Unknown operations-centre error",
    });
  }
});

router.patch("/operations-centre/stations/:code/readiness", async (req, res) => {
  try {
    await ensureElectionOperationsTables();

    const code = decodeURIComponent(String(req.params.code ?? "")).trim();
    const body = req.body as any;

    if (!code) {
      res.status(400).json({ error: "station code required" });
      return;
    }

    const result = await db.execute(sql`
      INSERT INTO election_station_readiness (
        station_code,
        opened,
        materials_received,
        device_ready,
        connectivity_ready,
        presiding_officer_confirmed,
        notes,
        updated_at
      )
      VALUES (
        ${code},
        ${Boolean(body?.opened)},
        ${Boolean(body?.materialsReceived)},
        ${Boolean(body?.deviceReady)},
        ${Boolean(body?.connectivityReady)},
        ${Boolean(body?.presidingOfficerConfirmed)},
        ${body?.notes ?? null},
        now()
      )
      ON CONFLICT (station_code)
      DO UPDATE SET
        opened = excluded.opened,
        materials_received = excluded.materials_received,
        device_ready = excluded.device_ready,
        connectivity_ready = excluded.connectivity_ready,
        presiding_officer_confirmed = excluded.presiding_officer_confirmed,
        notes = excluded.notes,
        updated_at = now()
      RETURNING *
    `);

    res.json((result as any).rows?.[0]);
  } catch (err) {
    console.error("station readiness update failed", err);
    res.status(500).json({
      error: "Failed to update station readiness",
      detail: err instanceof Error ? err.message : "Unknown readiness error",
    });
  }
});

router.post("/operations-centre/agents", async (req, res) => {
  try {
    await ensureElectionOperationsTables();

    const body = req.body as any;
    const stationCode = String(body?.stationCode ?? "").trim();
    const agentName = String(body?.agentName ?? "").trim();

    if (!stationCode || !agentName) {
      res.status(400).json({ error: "stationCode and agentName required" });
      return;
    }

    const result = await db.execute(sql`
      INSERT INTO election_agent_operations (
        station_code,
        agent_name,
        agent_phone,
        role,
        status,
        checked_in_at,
        notes
      )
      VALUES (
        ${stationCode},
        ${agentName},
        ${body?.agentPhone ?? null},
        ${body?.role ?? "primary"},
        ${body?.status ?? "assigned"},
        ${
          body?.status === "checked-in"
            ? new Date()
            : null
        },
        ${body?.notes ?? null}
      )
      RETURNING *
    `);

    res.status(201).json((result as any).rows?.[0]);
  } catch (err) {
    console.error("agent operation create failed", err);
    res.status(500).json({
      error: "Failed to create agent assignment",
      detail: err instanceof Error ? err.message : "Unknown agent error",
    });
  }
});

router.patch("/operations-centre/agents/:id", async (req, res) => {
  try {
    await ensureElectionOperationsTables();

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid agent id" });
      return;
    }

    const body = req.body as any;

    const result = await db.execute(sql`
      UPDATE election_agent_operations
      SET
        status = coalesce(${body?.status ?? null}, status),
        agent_name = coalesce(${body?.agentName ?? null}, agent_name),
        agent_phone = coalesce(${body?.agentPhone ?? null}, agent_phone),
        role = coalesce(${body?.role ?? null}, role),
        notes = coalesce(${body?.notes ?? null}, notes),
        checked_in_at = CASE
          WHEN ${body?.status ?? null} = 'checked-in'
            AND checked_in_at IS NULL
          THEN now()
          ELSE checked_in_at
        END,
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `);

    res.json((result as any).rows?.[0]);
  } catch (err) {
    console.error("agent operation update failed", err);
    res.status(500).json({
      error: "Failed to update agent assignment",
      detail: err instanceof Error ? err.message : "Unknown agent update error",
    });
  }
});

router.post("/operations-centre/vehicles", async (req, res) => {
  try {
    await ensureElectionOperationsTables();

    const body = req.body as any;
    const registrationNumber = String(body?.registrationNumber ?? "").trim();

    if (!registrationNumber) {
      res.status(400).json({ error: "registrationNumber required" });
      return;
    }

    const result = await db.execute(sql`
      INSERT INTO election_vehicle_deployments (
        registration_number,
        driver_name,
        driver_phone,
        ward,
        assignment,
        fuel_status,
        status,
        last_check_in,
        notes
      )
      VALUES (
        ${registrationNumber},
        ${body?.driverName ?? null},
        ${body?.driverPhone ?? null},
        ${body?.ward ?? null},
        ${body?.assignment ?? null},
        ${body?.fuelStatus ?? "unknown"},
        ${body?.status ?? "available"},
        ${body?.status === "deployed" ? new Date() : null},
        ${body?.notes ?? null}
      )
      RETURNING *
    `);

    res.status(201).json((result as any).rows?.[0]);
  } catch (err) {
    console.error("vehicle deployment create failed", err);
    res.status(500).json({
      error: "Failed to create vehicle deployment",
      detail: err instanceof Error ? err.message : "Unknown vehicle error",
    });
  }
});

router.post("/operations-centre/observers", async (req, res) => {
  try {
    await ensureElectionOperationsTables();

    const body = req.body as any;
    const observerName = String(body?.observerName ?? "").trim();

    if (!observerName) {
      res.status(400).json({ error: "observerName required" });
      return;
    }

    const result = await db.execute(sql`
      INSERT INTO election_observer_assignments (
        observer_name,
        observer_phone,
        observer_type,
        ward,
        station_code,
        status,
        notes
      )
      VALUES (
        ${observerName},
        ${body?.observerPhone ?? null},
        ${body?.observerType ?? "party"},
        ${body?.ward ?? null},
        ${body?.stationCode ?? null},
        ${body?.status ?? "assigned"},
        ${body?.notes ?? null}
      )
      RETURNING *
    `);

    res.status(201).json((result as any).rows?.[0]);
  } catch (err) {
    console.error("observer assignment create failed", err);
    res.status(500).json({
      error: "Failed to create observer assignment",
      detail: err instanceof Error ? err.message : "Unknown observer error",
    });
  }
});

router.post("/operations-centre/escalations", async (req, res) => {
  try {
    await ensureElectionOperationsTables();

    const body = req.body as any;
    const title = String(body?.title ?? "").trim();

    if (!title) {
      res.status(400).json({ error: "title required" });
      return;
    }

    const result = await db.execute(sql`
      INSERT INTO election_incident_escalations (
        station_code,
        ward,
        title,
        description,
        severity,
        status,
        assigned_to
      )
      VALUES (
        ${body?.stationCode ?? null},
        ${body?.ward ?? null},
        ${title},
        ${body?.description ?? null},
        ${body?.severity ?? "medium"},
        ${body?.status ?? "open"},
        ${body?.assignedTo ?? null}
      )
      RETURNING *
    `);

    res.status(201).json((result as any).rows?.[0]);
  } catch (err) {
    console.error("incident escalation create failed", err);
    res.status(500).json({
      error: "Failed to create election escalation",
      detail: err instanceof Error ? err.message : "Unknown escalation error",
    });
  }
});

router.patch("/operations-centre/escalations/:id", async (req, res) => {
  try {
    await ensureElectionOperationsTables();

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid escalation id" });
      return;
    }

    const body = req.body as any;

    const result = await db.execute(sql`
      UPDATE election_incident_escalations
      SET
        status = coalesce(${body?.status ?? null}, status),
        severity = coalesce(${body?.severity ?? null}, severity),
        assigned_to = coalesce(${body?.assignedTo ?? null}, assigned_to),
        acknowledged_at = CASE
          WHEN ${body?.status ?? null} = 'investigating'
            AND acknowledged_at IS NULL
          THEN now()
          ELSE acknowledged_at
        END,
        resolved_at = CASE
          WHEN ${body?.status ?? null} = 'resolved'
          THEN now()
          ELSE resolved_at
        END,
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `);

    res.json((result as any).rows?.[0]);
  } catch (err) {
    console.error("incident escalation update failed", err);
    res.status(500).json({
      error: "Failed to update election escalation",
      detail: err instanceof Error ? err.message : "Unknown escalation update error",
    });
  }
});



async function ensureResultEvidenceTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS election_result_forms (
      id bigserial PRIMARY KEY,
      station_code text NOT NULL,
      ward text,
      constituency text,
      form_type text NOT NULL DEFAULT 'polling-station-result',
      document_url text NOT NULL,
      file_name text,
      checksum text,
      submitted_by text,
      review_status text NOT NULL DEFAULT 'pending',
      review_notes text,
      reviewed_by text,
      reviewed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS election_result_forms_station_idx
      ON election_result_forms (station_code);

    CREATE INDEX IF NOT EXISTS election_result_forms_status_idx
      ON election_result_forms (review_status);
  `);
}

router.get("/result-forms", async (req, res) => {
  try {
    await ensureResultEvidenceTables();

    const stationCode = String(req.query.stationCode ?? "").trim();
    const status = String(req.query.status ?? "").trim();

    const result = await db.execute(sql`
      SELECT
        id,
        station_code AS "stationCode",
        ward,
        constituency,
        form_type AS "formType",
        document_url AS "documentUrl",
        file_name AS "fileName",
        checksum,
        submitted_by AS "submittedBy",
        review_status AS "reviewStatus",
        review_notes AS "reviewNotes",
        reviewed_by AS "reviewedBy",
        reviewed_at AS "reviewedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM election_result_forms
      WHERE
        (${stationCode} = '' OR station_code = ${stationCode})
        AND (${status} = '' OR review_status = ${status})
      ORDER BY updated_at DESC
      LIMIT 1000
    `);

    res.json((result as any).rows ?? []);
  } catch (err) {
    res.status(500).json({
      error: "Failed to load result forms",
      detail: err instanceof Error ? err.message : "Unknown result-form error",
    });
  }
});

router.post("/result-forms", async (req, res) => {
  try {
    await ensureResultEvidenceTables();

    const body = req.body as any;
    const stationCode = String(body?.stationCode ?? "").trim();
    const documentUrl = String(body?.documentUrl ?? "").trim();

    if (!stationCode || !documentUrl) {
      res.status(400).json({
        error: "stationCode and documentUrl required",
      });
      return;
    }

    const duplicate = await db.execute(sql`
      SELECT id
      FROM election_result_forms
      WHERE station_code = ${stationCode}
        AND (
          document_url = ${documentUrl}
          OR (
            ${body?.checksum ?? null} IS NOT NULL
            AND checksum = ${body?.checksum ?? null}
          )
        )
      LIMIT 1
    `);

    if (((duplicate as any).rows ?? []).length > 0) {
      res.status(409).json({
        error: "Duplicate result form detected",
      });
      return;
    }

    const result = await db.execute(sql`
      INSERT INTO election_result_forms (
        station_code,
        ward,
        constituency,
        form_type,
        document_url,
        file_name,
        checksum,
        submitted_by,
        review_status
      )
      VALUES (
        ${stationCode},
        ${body?.ward ?? null},
        ${body?.constituency ?? null},
        ${body?.formType ?? "polling-station-result"},
        ${documentUrl},
        ${body?.fileName ?? null},
        ${body?.checksum ?? null},
        ${body?.submittedBy ?? null},
        ${body?.reviewStatus ?? "pending"}
      )
      RETURNING *
    `);

    res.status(201).json((result as any).rows?.[0]);
  } catch (err) {
    res.status(500).json({
      error: "Failed to register result form",
      detail: err instanceof Error ? err.message : "Unknown result-form error",
    });
  }
});

router.patch("/result-forms/:id/review", async (req, res) => {
  try {
    await ensureResultEvidenceTables();

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid result-form id" });
      return;
    }

    const body = req.body as any;
    const status = String(body?.reviewStatus ?? "").trim();

    if (!["pending", "accepted", "rejected", "under-review"].includes(status)) {
      res.status(400).json({ error: "Invalid reviewStatus" });
      return;
    }

    const result = await db.execute(sql`
      UPDATE election_result_forms
      SET
        review_status = ${status},
        review_notes = ${body?.reviewNotes ?? null},
        reviewed_by = ${body?.reviewedBy ?? null},
        reviewed_at = now(),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `);

    if (((result as any).rows ?? []).length === 0) {
      res.status(404).json({ error: "Result form not found" });
      return;
    }

    res.json((result as any).rows[0]);
  } catch (err) {
    res.status(500).json({
      error: "Failed to review result form",
      detail: err instanceof Error ? err.message : "Unknown review error",
    });
  }
});


async function ensureResultsDecisionTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS election_results_decisions (
      id bigserial PRIMARY KEY,
      title text NOT NULL,
      category text NOT NULL DEFAULT 'results',
      priority text NOT NULL DEFAULT 'medium',
      ward text,
      constituency text,
      station_code text,
      owner text,
      decision text,
      status text NOT NULL DEFAULT 'open',
      due_at timestamptz,
      created_by text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS election_results_decisions_status_idx
      ON election_results_decisions (status);

    CREATE INDEX IF NOT EXISTS election_results_decisions_priority_idx
      ON election_results_decisions (priority);
  `);
}

router.get("/results-decisions", async (req, res) => {
  try {
    await ensureResultsDecisionTables();

    const status = String(req.query.status ?? "").trim();
    const result = await db.execute(sql`
      SELECT
        id,
        title,
        category,
        priority,
        ward,
        constituency,
        station_code AS "stationCode",
        owner,
        decision,
        status,
        due_at AS "dueAt",
        created_by AS "createdBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM election_results_decisions
      WHERE (${status} = '' OR status = ${status})
      ORDER BY
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        updated_at DESC
      LIMIT 1000
    `);

    res.json((result as any).rows ?? []);
  } catch (err) {
    res.status(500).json({
      error: "Failed to load results decisions",
      detail: err instanceof Error ? err.message : "Unknown results decision error",
    });
  }
});

router.post("/results-decisions", async (req, res) => {
  try {
    await ensureResultsDecisionTables();

    const body = req.body as any;
    const title = String(body?.title ?? "").trim();

    if (!title) {
      res.status(400).json({ error: "title required" });
      return;
    }

    const result = await db.execute(sql`
      INSERT INTO election_results_decisions (
        title,
        category,
        priority,
        ward,
        constituency,
        station_code,
        owner,
        decision,
        status,
        due_at,
        created_by
      )
      VALUES (
        ${title},
        ${body?.category ?? "results"},
        ${body?.priority ?? "medium"},
        ${body?.ward ?? null},
        ${body?.constituency ?? null},
        ${body?.stationCode ?? null},
        ${body?.owner ?? null},
        ${body?.decision ?? null},
        ${body?.status ?? "open"},
        ${body?.dueAt ?? null},
        ${body?.createdBy ?? null}
      )
      RETURNING *
    `);

    res.status(201).json((result as any).rows?.[0]);
  } catch (err) {
    res.status(500).json({
      error: "Failed to create results decision",
      detail: err instanceof Error ? err.message : "Unknown results decision error",
    });
  }
});

router.patch("/results-decisions/:id", async (req, res) => {
  try {
    await ensureResultsDecisionTables();

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid decision id" });
      return;
    }

    const body = req.body as any;
    const result = await db.execute(sql`
      UPDATE election_results_decisions
      SET
        priority = coalesce(${body?.priority ?? null}, priority),
        owner = coalesce(${body?.owner ?? null}, owner),
        decision = coalesce(${body?.decision ?? null}, decision),
        status = coalesce(${body?.status ?? null}, status),
        due_at = coalesce(${body?.dueAt ?? null}, due_at),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `);

    if (((result as any).rows ?? []).length === 0) {
      res.status(404).json({ error: "Decision not found" });
      return;
    }

    res.json((result as any).rows[0]);
  } catch (err) {
    res.status(500).json({
      error: "Failed to update results decision",
      detail: err instanceof Error ? err.message : "Unknown results decision error",
    });
  }
});


async function ensureExecutiveResultsCommandTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS election_results_escalations (
      id bigserial PRIMARY KEY,
      title text NOT NULL,
      source_type text NOT NULL DEFAULT 'results',
      source_id text,
      priority text NOT NULL DEFAULT 'high',
      ward text,
      constituency text,
      station_code text,
      owner text,
      acknowledged_by text,
      acknowledged_at timestamptz,
      status text NOT NULL DEFAULT 'open',
      resolution text,
      resolved_by text,
      resolved_at timestamptz,
      due_at timestamptz,
      created_by text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS election_results_recommendations (
      id bigserial PRIMARY KEY,
      recommendation_type text NOT NULL DEFAULT 'executive',
      title text NOT NULL,
      rationale text,
      priority text NOT NULL DEFAULT 'medium',
      ward text,
      constituency text,
      station_code text,
      recommended_owner text,
      status text NOT NULL DEFAULT 'proposed',
      accepted_by text,
      accepted_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS election_results_escalations_status_idx
      ON election_results_escalations (status);

    CREATE INDEX IF NOT EXISTS election_results_recommendations_status_idx
      ON election_results_recommendations (status);
  `);
}

router.get("/executive-results-command", async (_req, res) => {
  try {
    await ensureExecutiveResultsCommandTables();
    await ensureResultsDecisionTables();

    const [results, stations, decisions, escalations, recommendations] =
      await Promise.all([
        db.execute(sql`
          SELECT *
          FROM tally_results
          ORDER BY created_at DESC
        `),
        db.execute(sql`
          SELECT *
          FROM polling_stations
          ORDER BY ward, code
        `),
        db.execute(sql`
          SELECT
            id,
            title,
            category,
            priority,
            ward,
            constituency,
            station_code AS "stationCode",
            owner,
            decision,
            status,
            due_at AS "dueAt",
            created_by AS "createdBy",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
          FROM election_results_decisions
          ORDER BY updated_at DESC
        `),
        db.execute(sql`
          SELECT
            id,
            title,
            source_type AS "sourceType",
            source_id AS "sourceId",
            priority,
            ward,
            constituency,
            station_code AS "stationCode",
            owner,
            acknowledged_by AS "acknowledgedBy",
            acknowledged_at AS "acknowledgedAt",
            status,
            resolution,
            resolved_by AS "resolvedBy",
            resolved_at AS "resolvedAt",
            due_at AS "dueAt",
            created_by AS "createdBy",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
          FROM election_results_escalations
          ORDER BY
            CASE priority
              WHEN 'critical' THEN 1
              WHEN 'high' THEN 2
              WHEN 'medium' THEN 3
              ELSE 4
            END,
            updated_at DESC
        `),
        db.execute(sql`
          SELECT
            id,
            recommendation_type AS "recommendationType",
            title,
            rationale,
            priority,
            ward,
            constituency,
            station_code AS "stationCode",
            recommended_owner AS "recommendedOwner",
            status,
            accepted_by AS "acceptedBy",
            accepted_at AS "acceptedAt",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
          FROM election_results_recommendations
          ORDER BY
            CASE priority
              WHEN 'critical' THEN 1
              WHEN 'high' THEN 2
              WHEN 'medium' THEN 3
              ELSE 4
            END,
            updated_at DESC
        `),
      ]);

    const resultRows = (results as any).rows ?? [];
    const stationRows = (stations as any).rows ?? [];
    const decisionRows = (decisions as any).rows ?? [];
    const escalationRows = (escalations as any).rows ?? [];
    const recommendationRows = (recommendations as any).rows ?? [];

    const submittedStationCodes = new Set(
      resultRows
        .map((row: any) =>
          String(
            row.station_code ??
              row.stationCode ??
              row.polling_station_code ??
              "",
          ),
        )
        .filter(Boolean),
    );

    const verifiedStationCodes = new Set(
      resultRows
        .filter(
          (row: any) =>
            String(row.status ?? "submitted").toLowerCase() ===
            "verified",
        )
        .map((row: any) =>
          String(
            row.station_code ??
              row.stationCode ??
              row.polling_station_code ??
              "",
          ),
        )
        .filter(Boolean),
    );

    const disputedStationCodes = new Set(
      resultRows
        .filter((row: any) =>
          ["disputed", "rejected", "under-review"].includes(
            String(row.status ?? "").toLowerCase(),
          ),
        )
        .map((row: any) =>
          String(
            row.station_code ??
              row.stationCode ??
              row.polling_station_code ??
              "",
          ),
        )
        .filter(Boolean),
    );

    const openDecisions = decisionRows.filter(
      (row: any) => row.status !== "closed",
    );
    const openEscalations = escalationRows.filter(
      (row: any) =>
        !["resolved", "closed"].includes(
          String(row.status ?? "").toLowerCase(),
        ),
    );

    const overdueEscalations = openEscalations.filter(
      (row: any) =>
        row.dueAt && new Date(row.dueAt).getTime() < Date.now(),
    );

    const totalStations = stationRows.length;
    const reportingRate =
      totalStations > 0
        ? Math.round(
            (submittedStationCodes.size / totalStations) * 100,
          )
        : 0;

    const verificationRate =
      submittedStationCodes.size > 0
        ? Math.round(
            (verifiedStationCodes.size /
              submittedStationCodes.size) *
              100,
          )
        : 0;

    const countyRiskScore = Math.min(
      100,
      disputedStationCodes.size * 10 +
        openEscalations.length * 8 +
        overdueEscalations.length * 12 +
        openDecisions.filter(
          (row: any) => row.priority === "critical",
        ).length *
          10 +
        Math.max(0, 50 - reportingRate),
    );

    const feed = [
      ...decisionRows.map((row: any) => ({
        id: `decision-${row.id}`,
        type: "decision",
        title: row.title,
        status: row.status,
        priority: row.priority,
        ward: row.ward,
        stationCode: row.stationCode,
        timestamp: row.updatedAt,
      })),
      ...escalationRows.map((row: any) => ({
        id: `escalation-${row.id}`,
        type: "escalation",
        title: row.title,
        status: row.status,
        priority: row.priority,
        ward: row.ward,
        stationCode: row.stationCode,
        timestamp: row.updatedAt,
      })),
      ...recommendationRows.map((row: any) => ({
        id: `recommendation-${row.id}`,
        type: "recommendation",
        title: row.title,
        status: row.status,
        priority: row.priority,
        ward: row.ward,
        stationCode: row.stationCode,
        timestamp: row.updatedAt,
      })),
    ]
      .sort(
        (a: any, b: any) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime(),
      )
      .slice(0, 200);

    res.json({
      generatedAt: new Date().toISOString(),
      summary: {
        totalStations,
        reportingStations: submittedStationCodes.size,
        verifiedStations: verifiedStationCodes.size,
        disputedStations: disputedStationCodes.size,
        reportingRate,
        verificationRate,
        openDecisions: openDecisions.length,
        criticalDecisions: openDecisions.filter(
          (row: any) => row.priority === "critical",
        ).length,
        openEscalations: openEscalations.length,
        overdueEscalations: overdueEscalations.length,
        proposedRecommendations: recommendationRows.filter(
          (row: any) => row.status === "proposed",
        ).length,
        countyRiskScore,
      },
      decisions: decisionRows,
      escalations: escalationRows,
      recommendations: recommendationRows,
      feed,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to load executive results command",
      detail:
        err instanceof Error
          ? err.message
          : "Unknown executive results command error",
    });
  }
});

router.post("/executive-results-command/escalations", async (req, res) => {
  try {
    await ensureExecutiveResultsCommandTables();

    const body = req.body as any;
    const title = String(body?.title ?? "").trim();

    if (!title) {
      res.status(400).json({ error: "title required" });
      return;
    }

    const result = await db.execute(sql`
      INSERT INTO election_results_escalations (
        title,
        source_type,
        source_id,
        priority,
        ward,
        constituency,
        station_code,
        owner,
        status,
        due_at,
        created_by
      )
      VALUES (
        ${title},
        ${body?.sourceType ?? "results"},
        ${body?.sourceId ?? null},
        ${body?.priority ?? "high"},
        ${body?.ward ?? null},
        ${body?.constituency ?? null},
        ${body?.stationCode ?? null},
        ${body?.owner ?? null},
        ${body?.status ?? "open"},
        ${body?.dueAt ?? null},
        ${body?.createdBy ?? null}
      )
      RETURNING *
    `);

    res.status(201).json((result as any).rows?.[0]);
  } catch (err) {
    res.status(500).json({
      error: "Failed to create executive escalation",
      detail:
        err instanceof Error
          ? err.message
          : "Unknown escalation creation error",
    });
  }
});

router.patch("/executive-results-command/escalations/:id", async (req, res) => {
  try {
    await ensureExecutiveResultsCommandTables();

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid escalation id" });
      return;
    }

    const body = req.body as any;
    const status = body?.status ?? null;
    const acknowledged =
      status === "acknowledged" || body?.acknowledgedBy;
    const resolved =
      status === "resolved" || status === "closed";

    const result = await db.execute(sql`
      UPDATE election_results_escalations
      SET
        owner = coalesce(${body?.owner ?? null}, owner),
        priority = coalesce(${body?.priority ?? null}, priority),
        status = coalesce(${status}, status),
        acknowledged_by = coalesce(
          ${body?.acknowledgedBy ?? null},
          acknowledged_by
        ),
        acknowledged_at = CASE
          WHEN ${acknowledged} THEN coalesce(acknowledged_at, now())
          ELSE acknowledged_at
        END,
        resolution = coalesce(${body?.resolution ?? null}, resolution),
        resolved_by = coalesce(
          ${body?.resolvedBy ?? null},
          resolved_by
        ),
        resolved_at = CASE
          WHEN ${resolved} THEN coalesce(resolved_at, now())
          ELSE resolved_at
        END,
        due_at = coalesce(${body?.dueAt ?? null}, due_at),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `);

    if (((result as any).rows ?? []).length === 0) {
      res.status(404).json({ error: "Escalation not found" });
      return;
    }

    res.json((result as any).rows[0]);
  } catch (err) {
    res.status(500).json({
      error: "Failed to update executive escalation",
      detail:
        err instanceof Error
          ? err.message
          : "Unknown escalation update error",
    });
  }
});

router.post("/executive-results-command/recommendations/generate", async (_req, res) => {
  try {
    await ensureExecutiveResultsCommandTables();
    await ensureResultsDecisionTables();

    const [results, stations, decisions, escalations] =
      await Promise.all([
        db.execute(sql`SELECT * FROM tally_results`),
        db.execute(sql`SELECT * FROM polling_stations`),
        db.execute(sql`
          SELECT * FROM election_results_decisions
          WHERE status <> 'closed'
        `),
        db.execute(sql`
          SELECT * FROM election_results_escalations
          WHERE status NOT IN ('resolved', 'closed')
        `),
      ]);

    const resultRows = (results as any).rows ?? [];
    const stationRows = (stations as any).rows ?? [];
    const decisionRows = (decisions as any).rows ?? [];
    const escalationRows = (escalations as any).rows ?? [];

    const submittedCodes = new Set(
      resultRows
        .map((row: any) =>
          String(
            row.station_code ??
              row.stationCode ??
              row.polling_station_code ??
              "",
          ),
        )
        .filter(Boolean),
    );

    const disputedCodes = new Set(
      resultRows
        .filter((row: any) =>
          ["disputed", "rejected", "under-review"].includes(
            String(row.status ?? "").toLowerCase(),
          ),
        )
        .map((row: any) =>
          String(
            row.station_code ??
              row.stationCode ??
              row.polling_station_code ??
              "",
          ),
        )
        .filter(Boolean),
    );

    const recommendations: any[] = [];

    const outstanding = Math.max(
      0,
      stationRows.length - submittedCodes.size,
    );

    if (outstanding > 0) {
      recommendations.push({
        type: "reporting",
        title: "Deploy reporting recovery team",
        rationale: `${outstanding} polling station(s) have not submitted results.`,
        priority: outstanding > 10 ? "critical" : "high",
        owner: "Results Collection Lead",
      });
    }

    if (disputedCodes.size > 0) {
      recommendations.push({
        type: "legal",
        title: "Open evidence review for disputed stations",
        rationale: `${disputedCodes.size} polling station(s) are disputed, rejected or under review.`,
        priority: "critical",
        owner: "Legal & Verification Lead",
      });
    }

    if (decisionRows.length > 5) {
      recommendations.push({
        type: "executive",
        title: "Convene executive decision clearance session",
        rationale: `${decisionRows.length} decisions remain open.`,
        priority: "high",
        owner: "Campaign Director",
      });
    }

    if (escalationRows.length > 0) {
      recommendations.push({
        type: "operations",
        title: "Review unresolved executive escalations",
        rationale: `${escalationRows.length} escalation(s) remain unresolved.`,
        priority: escalationRows.length > 3 ? "critical" : "high",
        owner: "Situation Room Lead",
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: "executive",
        title: "Maintain current results command posture",
        rationale: "No major reporting, dispute or escalation gaps are currently detected.",
        priority: "low",
        owner: "Results Command",
      });
    }

    const created = [];

    for (const item of recommendations) {
      const duplicate = await db.execute(sql`
        SELECT id
        FROM election_results_recommendations
        WHERE title = ${item.title}
          AND status IN ('proposed', 'accepted')
        LIMIT 1
      `);

      if (((duplicate as any).rows ?? []).length > 0) {
        continue;
      }

      const result = await db.execute(sql`
        INSERT INTO election_results_recommendations (
          recommendation_type,
          title,
          rationale,
          priority,
          recommended_owner,
          status
        )
        VALUES (
          ${item.type},
          ${item.title},
          ${item.rationale},
          ${item.priority},
          ${item.owner},
          'proposed'
        )
        RETURNING *
      `);

      created.push((result as any).rows?.[0]);
    }

    res.status(201).json({
      generated: created.length,
      recommendations: created,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to generate executive recommendations",
      detail:
        err instanceof Error
          ? err.message
          : "Unknown recommendation generation error",
    });
  }
});

router.patch("/executive-results-command/recommendations/:id", async (req, res) => {
  try {
    await ensureExecutiveResultsCommandTables();

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid recommendation id" });
      return;
    }

    const body = req.body as any;
    const status = String(body?.status ?? "").trim();

    if (!["proposed", "accepted", "dismissed", "completed"].includes(status)) {
      res.status(400).json({ error: "Invalid recommendation status" });
      return;
    }

    const result = await db.execute(sql`
      UPDATE election_results_recommendations
      SET
        status = ${status},
        accepted_by = CASE
          WHEN ${status} = 'accepted'
          THEN coalesce(${body?.acceptedBy ?? null}, accepted_by)
          ELSE accepted_by
        END,
        accepted_at = CASE
          WHEN ${status} = 'accepted'
          THEN coalesce(accepted_at, now())
          ELSE accepted_at
        END,
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `);

    if (((result as any).rows ?? []).length === 0) {
      res.status(404).json({ error: "Recommendation not found" });
      return;
    }

    res.json((result as any).rows[0]);
  } catch (err) {
    res.status(500).json({
      error: "Failed to update executive recommendation",
      detail:
        err instanceof Error
          ? err.message
          : "Unknown recommendation update error",
    });
  }
});


async function ensureGisFieldTrackingTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS gis_field_assets (
      id bigserial PRIMARY KEY,
      asset_type text NOT NULL DEFAULT 'vehicle',
      name text NOT NULL,
      registration text,
      ward text,
      constituency text,
      latitude numeric,
      longitude numeric,
      status text NOT NULL DEFAULT 'available',
      assigned_to text,
      phone text,
      fuel_level integer NOT NULL DEFAULT 100,
      last_seen_at timestamptz,
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS gis_field_movements (
      id bigserial PRIMARY KEY,
      asset_id bigint NOT NULL REFERENCES gis_field_assets(id) ON DELETE CASCADE,
      latitude numeric,
      longitude numeric,
      ward text,
      constituency text,
      status text,
      recorded_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS gis_field_assets_status_idx
      ON gis_field_assets (status);

    CREATE INDEX IF NOT EXISTS gis_field_assets_ward_idx
      ON gis_field_assets (ward);
  `);
}

router.get("/gis-field-assets", async (_req, res) => {
  try {
    await ensureGisFieldTrackingTables();

    const result = await db.execute(sql`
      SELECT
        id,
        asset_type AS "assetType",
        name,
        registration,
        ward,
        constituency,
        latitude,
        longitude,
        status,
        assigned_to AS "assignedTo",
        phone,
        fuel_level AS "fuelLevel",
        last_seen_at AS "lastSeenAt",
        notes,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM gis_field_assets
      ORDER BY updated_at DESC
    `);

    res.json((result as any).rows ?? []);
  } catch (err) {
    res.status(500).json({
      error: "Failed to load GIS field assets",
      detail: err instanceof Error ? err.message : "Unknown GIS tracking error",
    });
  }
});

router.post("/gis-field-assets", async (req, res) => {
  try {
    await ensureGisFieldTrackingTables();

    const body = req.body as any;
    const name = String(body?.name ?? "").trim();

    if (!name) {
      res.status(400).json({ error: "name required" });
      return;
    }

    const result = await db.execute(sql`
      INSERT INTO gis_field_assets (
        asset_type,
        name,
        registration,
        ward,
        constituency,
        latitude,
        longitude,
        status,
        assigned_to,
        phone,
        fuel_level,
        last_seen_at,
        notes
      )
      VALUES (
        ${body?.assetType ?? "vehicle"},
        ${name},
        ${body?.registration ?? null},
        ${body?.ward ?? null},
        ${body?.constituency ?? null},
        ${body?.latitude ?? null},
        ${body?.longitude ?? null},
        ${body?.status ?? "available"},
        ${body?.assignedTo ?? null},
        ${body?.phone ?? null},
        ${Number(body?.fuelLevel ?? 100)},
        now(),
        ${body?.notes ?? null}
      )
      RETURNING *
    `);

    res.status(201).json((result as any).rows?.[0]);
  } catch (err) {
    res.status(500).json({
      error: "Failed to create GIS field asset",
      detail: err instanceof Error ? err.message : "Unknown GIS asset creation error",
    });
  }
});

router.patch("/gis-field-assets/:id", async (req, res) => {
  try {
    await ensureGisFieldTrackingTables();

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid asset id" });
      return;
    }

    const body = req.body as any;

    const result = await db.execute(sql`
      UPDATE gis_field_assets
      SET
        ward = coalesce(${body?.ward ?? null}, ward),
        constituency = coalesce(${body?.constituency ?? null}, constituency),
        latitude = coalesce(${body?.latitude ?? null}, latitude),
        longitude = coalesce(${body?.longitude ?? null}, longitude),
        status = coalesce(${body?.status ?? null}, status),
        assigned_to = coalesce(${body?.assignedTo ?? null}, assigned_to),
        phone = coalesce(${body?.phone ?? null}, phone),
        fuel_level = coalesce(${body?.fuelLevel ?? null}, fuel_level),
        notes = coalesce(${body?.notes ?? null}, notes),
        last_seen_at = now(),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `);

    if (((result as any).rows ?? []).length === 0) {
      res.status(404).json({ error: "Asset not found" });
      return;
    }

    if (body?.latitude != null || body?.longitude != null) {
      await db.execute(sql`
        INSERT INTO gis_field_movements (
          asset_id,
          latitude,
          longitude,
          ward,
          constituency,
          status
        )
        VALUES (
          ${id},
          ${body?.latitude ?? null},
          ${body?.longitude ?? null},
          ${body?.ward ?? null},
          ${body?.constituency ?? null},
          ${body?.status ?? null}
        )
      `);
    }

    res.json((result as any).rows[0]);
  } catch (err) {
    res.status(500).json({
      error: "Failed to update GIS field asset",
      detail: err instanceof Error ? err.message : "Unknown GIS asset update error",
    });
  }
});


async function ensureAiGisTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS gis_ai_recommendations (
      id bigserial PRIMARY KEY,
      ward text,
      constituency text,
      category text NOT NULL DEFAULT 'operations',
      title text NOT NULL,
      rationale text,
      priority text NOT NULL DEFAULT 'medium',
      recommended_action text,
      recommended_owner text,
      status text NOT NULL DEFAULT 'proposed',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS gis_ai_recommendations_status_idx
      ON gis_ai_recommendations (status);
  `);
}

router.get("/gis-ai-situation", async (_req, res) => {
  try {
    await ensureAiGisTables();

    const [wards, assets, incidents, recommendations] = await Promise.all([
      db.execute(sql`
        WITH ward_base AS (
          SELECT
            ward,
            max(constituency) AS constituency,
            count(*)::integer AS constituents
          FROM members
          WHERE ward IS NOT NULL AND btrim(ward) <> ''
          GROUP BY ward
        ),
        station_base AS (
          SELECT
            ward,
            count(*)::integer AS stations,
            coalesce(sum(registered_voters),0)::bigint AS registered
          FROM polling_stations
          GROUP BY ward
        ),
        turnout_base AS (
          SELECT
            ward,
            coalesce(max(expected_turnout_rate),0)::integer AS turnout_forecast,
            coalesce(max(mule_support_share),0)::integer AS support_share
          FROM turnout_assumptions
          GROUP BY ward
        )
        SELECT
          wb.ward,
          wb.constituency,
          wb.constituents,
          coalesce(sb.stations,0)::integer AS stations,
          coalesce(sb.registered,0)::bigint AS registered,
          coalesce(tb.turnout_forecast,0)::integer AS "turnoutForecast",
          coalesce(tb.support_share,0)::integer AS "supportShare"
        FROM ward_base wb
        LEFT JOIN station_base sb ON sb.ward = wb.ward
        LEFT JOIN turnout_base tb ON tb.ward = wb.ward
        ORDER BY wb.ward
      `),
      db.execute(sql`
        SELECT
          ward,
          count(*)::integer AS assets,
          count(*) FILTER (
            WHERE status IN ('active','deployed','en-route')
          )::integer AS active
        FROM gis_field_assets
        GROUP BY ward
      `),
      db.execute(sql`
        SELECT
          ward,
          count(*) FILTER (
            WHERE status = 'open'
          )::integer AS incidents
        FROM election_events
        GROUP BY ward
      `),
      db.execute(sql`
        SELECT
          id,
          ward,
          constituency,
          category,
          title,
          rationale,
          priority,
          recommended_action AS "recommendedAction",
          recommended_owner AS "recommendedOwner",
          status,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM gis_ai_recommendations
        ORDER BY
          CASE priority
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            ELSE 4
          END,
          updated_at DESC
      `),
    ]);

    const wardRows = (wards as any).rows ?? [];
    const assetRows = (assets as any).rows ?? [];
    const incidentRows = (incidents as any).rows ?? [];
    const recommendationRows = (recommendations as any).rows ?? [];

    const assetMap = new Map(assetRows.map((row:any)=>[String(row.ward),row]));
    const incidentMap = new Map(incidentRows.map((row:any)=>[String(row.ward),row]));

    const computed = wardRows.map((row:any)=>{
      const asset = assetMap.get(String(row.ward)) as any;
      const incident = incidentMap.get(String(row.ward)) as any;
      const registered = Number(row.registered ?? 0);
      const constituents = Number(row.constituents ?? 0);
      const turnoutForecast = Number(row.turnoutForecast ?? 0);
      const supportShare = Number(row.supportShare ?? 0);
      const activeAssets = Number(asset?.active ?? 0);
      const incidents = Number(incident?.incidents ?? 0);

      const logisticsGap = Math.max(0, 3 - activeAssets) * 12;
      const turnoutRisk = Math.max(0, 55 - turnoutForecast);
      const supportRisk = Math.max(0, 50 - supportShare);
      const incidentRisk = incidents * 18;
      const riskScore = Math.min(
        100,
        Math.round(logisticsGap + turnoutRisk * 0.5 + supportRisk * 0.4 + incidentRisk),
      );
      const opportunityScore = Math.min(
        100,
        Math.round(
          Math.min(40, constituents / 100) +
          Math.min(30, registered / 500) +
          Math.max(0, 30 - supportShare * 0.2),
        ),
      );
      const projectedTurnout = Math.round(
        registered * (turnoutForecast / 100),
      );
      const projectedCandidateVotes = Math.round(
        projectedTurnout * (supportShare / 100),
      );

      return {
        ...row,
        activeAssets,
        incidents,
        riskScore,
        opportunityScore,
        projectedTurnout,
        projectedCandidateVotes,
      };
    }).sort((a:any,b:any)=>b.riskScore-a.riskScore);

    res.json({
      generatedAt: new Date().toISOString(),
      summary: {
        wards: computed.length,
        highRiskWards: computed.filter((row:any)=>row.riskScore >= 60).length,
        criticalWards: computed.filter((row:any)=>row.riskScore >= 80).length,
        projectedTurnout: computed.reduce((sum:number,row:any)=>sum+row.projectedTurnout,0),
        projectedCandidateVotes: computed.reduce((sum:number,row:any)=>sum+row.projectedCandidateVotes,0),
      },
      wards: computed,
      recommendations: recommendationRows,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to load GIS AI situation",
      detail: err instanceof Error ? err.message : "Unknown GIS AI error",
    });
  }
});

router.post("/gis-ai-recommendations/generate", async (_req, res) => {
  try {
    await ensureAiGisTables();

    const situation = await db.execute(sql`
      SELECT
        ps.ward,
        max(ps.constituency) AS constituency,
        count(*)::integer AS stations,
        coalesce(sum(ps.registered_voters),0)::bigint AS registered,
        count(*) FILTER (
          WHERE ps.status <> 'open'
        )::integer AS unopened
      FROM polling_stations ps
      GROUP BY ps.ward
      ORDER BY ps.ward
    `);

    const rows = (situation as any).rows ?? [];
    const created = [];

    for (const row of rows) {
      const unopened = Number(row.unopened ?? 0);
      if (unopened <= 0) continue;

      const title = `Restore polling readiness in ${row.ward}`;
      const existing = await db.execute(sql`
        SELECT id
        FROM gis_ai_recommendations
        WHERE title = ${title}
          AND status IN ('proposed','accepted')
        LIMIT 1
      `);

      if (((existing as any).rows ?? []).length > 0) continue;

      const priority =
        unopened >= 5 ? "critical" :
        unopened >= 2 ? "high" :
        "medium";

      const result = await db.execute(sql`
        INSERT INTO gis_ai_recommendations (
          ward,
          constituency,
          category,
          title,
          rationale,
          priority,
          recommended_action,
          recommended_owner
        )
        VALUES (
          ${row.ward},
          ${row.constituency ?? null},
          'readiness',
          ${title},
          ${`${unopened} polling station(s) are not marked open.`},
          ${priority},
          'Deploy field coordinators, confirm agents and verify materials immediately.',
          'Election Operations Lead'
        )
        RETURNING *
      `);

      created.push((result as any).rows?.[0]);
    }

    res.status(201).json({
      generated: created.length,
      recommendations: created,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to generate GIS AI recommendations",
      detail: err instanceof Error ? err.message : "Unknown GIS AI generation error",
    });
  }
});

router.patch("/gis-ai-recommendations/:id", async (req, res) => {
  try {
    await ensureAiGisTables();

    const id = Number(req.params.id);
    const status = String(req.body?.status ?? "").trim();

    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid recommendation id" });
      return;
    }

    if (!["proposed","accepted","dismissed","completed"].includes(status)) {
      res.status(400).json({ error: "Invalid recommendation status" });
      return;
    }

    const result = await db.execute(sql`
      UPDATE gis_ai_recommendations
      SET
        status = ${status},
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `);

    if (((result as any).rows ?? []).length === 0) {
      res.status(404).json({ error: "Recommendation not found" });
      return;
    }

    res.json((result as any).rows[0]);
  } catch (err) {
    res.status(500).json({
      error: "Failed to update GIS AI recommendation",
      detail: err instanceof Error ? err.message : "Unknown GIS AI update error",
    });
  }
});

export default router;
