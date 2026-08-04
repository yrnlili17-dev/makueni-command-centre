import { Router } from "express";
import { db, pollingStationsTable, tallyResultsTable, turnoutAssumptionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod/v4";

const router = Router();

// The campaign principal whose vote share we forecast.
const PRINCIPAL = "Prof. Philip Kaloki";

// Baseline assumptions used for any ward that has no saved override.
// ~65% reflects recent Makueni County general-election turnout; support is
// intentionally neutral (50%) until the team sets ward-level estimates.
const DEFAULT_TURNOUT = 65;
const DEFAULT_SUPPORT = 50;

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// ── Prediction ─────────────────────────────────────────────────────────────
// Transparent model: predictions are derived from real registered-voter counts
// per ward (polling_stations) combined with adjustable turnout/support
// assumptions. `turnoutDelta`/`supportDelta` let the UI run what-if scenarios
// on top of the saved assumptions without persisting them.
router.get("/prediction", async (req, res) => {
  const turnoutDelta = Number(req.query.turnoutDelta) || 0;
  const supportDelta = Number(req.query.supportDelta) || 0;

  const wardRows = await db
    .select({
      ward: pollingStationsTable.ward,
      registered: sql<number>`coalesce(sum(${pollingStationsTable.registeredVoters}), 0)`,
      stations: sql<number>`count(*)`,
    })
    .from(pollingStationsTable)
    .groupBy(pollingStationsTable.ward);

  const assumptions = await db.select().from(turnoutAssumptionsTable);
  const aMap = new Map(assumptions.map((a) => [a.ward, a]));

  // Actual turnout so far (from submitted tallies), for prediction-vs-actual.
  const actualRows = await db
    .select({
      ward: pollingStationsTable.ward,
      totalVotes: sql<number>`coalesce(sum(${tallyResultsTable.votes}), 0)`,
      candidateVotes: sql<number>`coalesce(sum(case when ${tallyResultsTable.candidateName} = ${PRINCIPAL} then ${tallyResultsTable.votes} else 0 end), 0)`,
      reporting: sql<number>`count(distinct ${tallyResultsTable.stationCode})`,
    })
    .from(pollingStationsTable)
    .leftJoin(tallyResultsTable, eq(pollingStationsTable.code, tallyResultsTable.stationCode))
    .groupBy(pollingStationsTable.ward);
  const actMap = new Map(actualRows.map((a) => [a.ward, a]));

  const wards = wardRows.map((w) => {
    const registered = Number(w.registered);
    const asmp = aMap.get(w.ward);
    const baseTurnout = asmp?.expectedTurnoutRate ?? DEFAULT_TURNOUT;
    const baseSupport = asmp?.muleSupportShare ?? DEFAULT_SUPPORT;
    const turnoutRate = clamp(baseTurnout + turnoutDelta);
    const supportShare = clamp(baseSupport + supportDelta);
    const predictedVotes = Math.round((registered * turnoutRate) / 100);
    const predictedCandidateVotes = Math.round((predictedVotes * supportShare) / 100);
    // Mobilization upside: expected supporters who are NOT projected to vote.
    // High values flag where GOTV effort converts to the most extra votes.
    const gotvUpside = Math.round(registered * (supportShare / 100) * (1 - turnoutRate / 100));

    const act = actMap.get(w.ward);
    const actualVotesCast = Number(act?.totalVotes ?? 0);
    const actualCandidateVotes = Number(act?.candidateVotes ?? 0);
    const reportingStations = Number(act?.reporting ?? 0);

    return {
      ward: w.ward,
      stations: Number(w.stations),
      registered,
      expectedTurnoutRate: baseTurnout,
      supportShare: baseSupport,
      turnoutRate,
      effectiveSupportShare: supportShare,
      predictedVotes,
      predictedCandidateVotes,
      gotvUpside,
      actualVotesCast,
      actualCandidateVotes,
      actualTurnoutRate: registered ? Math.round((actualVotesCast / registered) * 100) : 0,
      reportingStations,
    };
  });

  const rankMap = new Map<string, number>();
  [...wards]
    .sort((a, b) => b.gotvUpside - a.gotvUpside)
    .forEach((w, i) => rankMap.set(w.ward, i + 1));

  const wardsOut = wards
    .map((w) => ({ ...w, gotvRank: rankMap.get(w.ward) ?? 0 }))
    .sort((a, b) => b.registered - a.registered);

  const totalRegistered = wardsOut.reduce((s, w) => s + w.registered, 0);
  const totalPredictedVotes = wardsOut.reduce((s, w) => s + w.predictedVotes, 0);
  const totalCandidateVotes = wardsOut.reduce((s, w) => s + w.predictedCandidateVotes, 0);
  const topGotv = [...wardsOut].sort((a, b) => b.gotvUpside - a.gotvUpside)[0];

  res.json({
    principal: PRINCIPAL,
    scenario: { turnoutDelta, supportDelta },
    defaults: { turnout: DEFAULT_TURNOUT, support: DEFAULT_SUPPORT },
    wards: wardsOut,
    totals: {
      registered: totalRegistered,
      predictedVotes: totalPredictedVotes,
      predictedTurnoutRate: totalRegistered ? Math.round((totalPredictedVotes / totalRegistered) * 100) : 0,
      predictedCandidateVotes: totalCandidateVotes,
      predictedCandidateShare: totalPredictedVotes ? Math.round((totalCandidateVotes / totalPredictedVotes) * 100) : 0,
      topGotvWard: topGotv?.ward ?? null,
      topGotvUpside: topGotv?.gotvUpside ?? 0,
    },
  });
});

// ── Assumptions ────────────────────────────────────────────────────────────
router.get("/assumptions", async (_req, res) => {
  const rows = await db.select().from(turnoutAssumptionsTable);
  res.json(rows);
});

const assumptionSchema = z.object({
  ward: z.string().min(1),
  expectedTurnoutRate: z.number().int().min(0).max(100),
  muleSupportShare: z.number().int().min(0).max(100),
});
const putSchema = z.object({ assumptions: z.array(assumptionSchema).min(1) });

router.put("/assumptions", async (req, res) => {
  const parsed = putSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid assumptions", details: parsed.error.issues });
    return;
  }

  for (const a of parsed.data.assumptions) {
    await db
      .insert(turnoutAssumptionsTable)
      .values({
        ward: a.ward,
        expectedTurnoutRate: a.expectedTurnoutRate,
        muleSupportShare: a.muleSupportShare,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: turnoutAssumptionsTable.ward,
        set: {
          expectedTurnoutRate: a.expectedTurnoutRate,
          muleSupportShare: a.muleSupportShare,
          updatedAt: new Date(),
        },
      });
  }

  res.json({ ok: true, count: parsed.data.assumptions.length });
});


async function ensureGotvTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS gotv_household_visits (
      id bigserial PRIMARY KEY,
      ward text NOT NULL,
      household_name text,
      contact_name text,
      phone text,
      visit_status text NOT NULL DEFAULT 'pending',
      support_status text NOT NULL DEFAULT 'unknown',
      follow_up_required boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS gotv_contact_queue (
      id bigserial PRIMARY KEY,
      ward text,
      contact_name text NOT NULL,
      phone text,
      channel text NOT NULL DEFAULT 'call',
      status text NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS gotv_transport_requests (
      id bigserial PRIMARY KEY,
      ward text NOT NULL,
      voter_name text NOT NULL,
      phone text,
      pickup_point text,
      vehicle_registration text,
      status text NOT NULL DEFAULT 'requested',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS gotv_ward_targets (
      id bigserial PRIMARY KEY,
      ward text NOT NULL UNIQUE,
      household_target integer NOT NULL DEFAULT 0,
      contact_target integer NOT NULL DEFAULT 0,
      turnout_target integer NOT NULL DEFAULT 65,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

router.get("/operations-centre", async (_req, res) => {
  try {
    await ensureGotvTables();
    const [households, contacts, transport, targets, volunteers, wards] =
      await Promise.all([
        db.execute(sql`SELECT * FROM gotv_household_visits ORDER BY updated_at DESC`),
        db.execute(sql`SELECT * FROM gotv_contact_queue ORDER BY updated_at DESC`),
        db.execute(sql`SELECT * FROM gotv_transport_requests ORDER BY updated_at DESC`),
        db.execute(sql`SELECT * FROM gotv_ward_targets ORDER BY ward`),
        db.execute(sql`
          SELECT count(*)::integer AS total,
                 count(*) FILTER (WHERE status='active')::integer AS active
          FROM volunteers
        `).catch(() => ({rows:[{total:0,active:0}]} as any)),
        db.execute(sql`
          SELECT ward,
                 count(*)::integer AS stations,
                 coalesce(sum(registered_voters),0)::integer AS registered
          FROM polling_stations
          GROUP BY ward
          ORDER BY registered DESC
        `),
      ]);

    const hs = (households as any).rows ?? [];
    const cs = (contacts as any).rows ?? [];
    const ts = (transport as any).rows ?? [];
    const tg = (targets as any).rows ?? [];
    const targetMap = new Map(tg.map((r:any)=>[String(r.ward),r]));
    const wardRows = ((wards as any).rows ?? []).map((r:any)=>{
      const ward = String(r.ward ?? "UNASSIGNED");
      const wh = hs.filter((x:any)=>x.ward===ward);
      const wc = cs.filter((x:any)=>x.ward===ward);
      const wt = ts.filter((x:any)=>x.ward===ward);
      const target:any = targetMap.get(ward);
      const visited = wh.filter((x:any)=>x.visit_status==="visited").length;
      const contacted = wc.filter((x:any)=>x.status==="completed").length;
      const transported = wt.filter((x:any)=>x.status==="completed").length;
      const hp = target?.household_target ? Math.round(visited/target.household_target*100) : 0;
      const cp = target?.contact_target ? Math.round(contacted/target.contact_target*100) : 0;
      const tp = wt.length ? Math.round(transported/wt.length*100) : 0;
      return {
        ward,
        stations:Number(r.stations??0),
        registered:Number(r.registered??0),
        turnoutTarget:Number(target?.turnout_target??65),
        householdTarget:Number(target?.household_target??0),
        householdsVisited:visited,
        contactTarget:Number(target?.contact_target??0),
        contactsCompleted:contacted,
        transportRequests:wt.length,
        transportCompleted:transported,
        mobilisationScore:Math.max(0,Math.min(100,Math.round(hp*.45+cp*.35+tp*.20))),
      };
    });

    const v = (volunteers as any).rows?.[0] ?? {total:0,active:0};
    res.json({
      generatedAt:new Date().toISOString(),
      summary:{
        households:hs.length,
        householdsVisited:hs.filter((x:any)=>x.visit_status==="visited").length,
        followUps:hs.filter((x:any)=>x.follow_up_required).length,
        contacts:cs.length,
        contactsCompleted:cs.filter((x:any)=>x.status==="completed").length,
        pendingCalls:cs.filter((x:any)=>x.channel==="call"&&x.status==="pending").length,
        pendingSms:cs.filter((x:any)=>x.channel==="sms"&&x.status==="pending").length,
        pendingWhatsapp:cs.filter((x:any)=>x.channel==="whatsapp"&&x.status==="pending").length,
        transportRequests:ts.length,
        transportCompleted:ts.filter((x:any)=>x.status==="completed").length,
        volunteers:Number(v.total??0),
        activeVolunteers:Number(v.active??0),
      },
      wards:wardRows,
      households:hs,
      contacts:cs,
      transport:ts,
      targets:tg,
    });
  } catch (err) {
    res.status(500).json({
      error:"Failed to load GOTV operations centre",
      detail:err instanceof Error ? err.message : "Unknown GOTV error",
    });
  }
});

router.post("/operations-centre/households", async (req,res)=>{
  try {
    await ensureGotvTables();
    const b=req.body as any;
    if(!b?.ward){res.status(400).json({error:"ward required"});return;}
    const out=await db.execute(sql`
      INSERT INTO gotv_household_visits
      (ward,household_name,contact_name,phone,visit_status,support_status,follow_up_required)
      VALUES
      (${b.ward},${b.householdName??null},${b.contactName??null},${b.phone??null},
       ${b.visitStatus??"pending"},${b.supportStatus??"unknown"},${Boolean(b.followUpRequired)})
      RETURNING *
    `);
    res.status(201).json((out as any).rows?.[0]);
  } catch(err) {
    res.status(500).json({error:"Failed to create household visit"});
  }
});

router.post("/operations-centre/contacts", async (req,res)=>{
  try {
    await ensureGotvTables();
    const b=req.body as any;
    if(!b?.contactName){res.status(400).json({error:"contactName required"});return;}
    const out=await db.execute(sql`
      INSERT INTO gotv_contact_queue (ward,contact_name,phone,channel,status)
      VALUES (${b.ward??null},${b.contactName},${b.phone??null},${b.channel??"call"},${b.status??"pending"})
      RETURNING *
    `);
    res.status(201).json((out as any).rows?.[0]);
  } catch(err) {
    res.status(500).json({error:"Failed to create contact"});
  }
});

router.post("/operations-centre/transport", async (req,res)=>{
  try {
    await ensureGotvTables();
    const b=req.body as any;
    if(!b?.ward||!b?.voterName){res.status(400).json({error:"ward and voterName required"});return;}
    const out=await db.execute(sql`
      INSERT INTO gotv_transport_requests
      (ward,voter_name,phone,pickup_point,vehicle_registration,status)
      VALUES (${b.ward},${b.voterName},${b.phone??null},${b.pickupPoint??null},
              ${b.vehicleRegistration??null},${b.status??"requested"})
      RETURNING *
    `);
    res.status(201).json((out as any).rows?.[0]);
  } catch(err) {
    res.status(500).json({error:"Failed to create transport request"});
  }
});

router.put("/operations-centre/targets", async (req,res)=>{
  try {
    await ensureGotvTables();
    const b=req.body as any;
    if(!b?.ward){res.status(400).json({error:"ward required"});return;}
    const out=await db.execute(sql`
      INSERT INTO gotv_ward_targets
      (ward,household_target,contact_target,turnout_target,updated_at)
      VALUES (${b.ward},${Number(b.householdTarget??0)},${Number(b.contactTarget??0)},
              ${Number(b.turnoutTarget??65)},now())
      ON CONFLICT (ward) DO UPDATE SET
        household_target=excluded.household_target,
        contact_target=excluded.contact_target,
        turnout_target=excluded.turnout_target,
        updated_at=now()
      RETURNING *
    `);
    res.json((out as any).rows?.[0]);
  } catch(err) {
    res.status(500).json({error:"Failed to update GOTV targets"});
  }
});


router.patch("/operations-centre/households/:id", async (req, res) => {
  try {
    await ensureGotvTables();
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid household id" });
      return;
    }

    const body = req.body as any;
    const result = await db.execute(sql`
      UPDATE gotv_household_visits
      SET
        visit_status = coalesce(${body?.visitStatus ?? null}, visit_status),
        support_status = coalesce(${body?.supportStatus ?? null}, support_status),
        follow_up_required = coalesce(${body?.followUpRequired ?? null}, follow_up_required),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `);

    if ((result as any).rows?.length === 0) {
      res.status(404).json({ error: "Household record not found" });
      return;
    }

    res.json((result as any).rows[0]);
  } catch (err) {
    res.status(500).json({
      error: "Failed to update household visit",
      detail: err instanceof Error ? err.message : "Unknown household update error",
    });
  }
});

router.patch("/operations-centre/contacts/:id", async (req, res) => {
  try {
    await ensureGotvTables();
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid contact id" });
      return;
    }

    const body = req.body as any;
    const result = await db.execute(sql`
      UPDATE gotv_contact_queue
      SET
        status = coalesce(${body?.status ?? null}, status),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `);

    if ((result as any).rows?.length === 0) {
      res.status(404).json({ error: "Contact item not found" });
      return;
    }

    res.json((result as any).rows[0]);
  } catch (err) {
    res.status(500).json({
      error: "Failed to update contact item",
      detail: err instanceof Error ? err.message : "Unknown contact update error",
    });
  }
});

router.patch("/operations-centre/transport/:id", async (req, res) => {
  try {
    await ensureGotvTables();
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid transport id" });
      return;
    }

    const body = req.body as any;
    const result = await db.execute(sql`
      UPDATE gotv_transport_requests
      SET
        status = coalesce(${body?.status ?? null}, status),
        vehicle_registration = coalesce(
          ${body?.vehicleRegistration ?? null},
          vehicle_registration
        ),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `);

    if ((result as any).rows?.length === 0) {
      res.status(404).json({ error: "Transport request not found" });
      return;
    }

    res.json((result as any).rows[0]);
  } catch (err) {
    res.status(500).json({
      error: "Failed to update transport request",
      detail: err instanceof Error ? err.message : "Unknown transport update error",
    });
  }
});

router.get("/operations-centre/live-command", async (_req, res) => {
  try {
    await ensureGotvTables();

    const [households, contacts, transport, targets, wards] = await Promise.all([
      db.execute(sql`
        SELECT * FROM gotv_household_visits
        ORDER BY updated_at DESC
      `),
      db.execute(sql`
        SELECT * FROM gotv_contact_queue
        ORDER BY updated_at DESC
      `),
      db.execute(sql`
        SELECT * FROM gotv_transport_requests
        ORDER BY updated_at DESC
      `),
      db.execute(sql`
        SELECT * FROM gotv_ward_targets
        ORDER BY ward
      `),
      db.execute(sql`
        SELECT
          ward,
          count(*)::integer AS stations,
          coalesce(sum(registered_voters), 0)::integer AS registered
        FROM polling_stations
        GROUP BY ward
        ORDER BY registered DESC
      `),
    ]);

    const hs = (households as any).rows ?? [];
    const cs = (contacts as any).rows ?? [];
    const ts = (transport as any).rows ?? [];
    const tg = (targets as any).rows ?? [];
    const targetMap = new Map(tg.map((row: any) => [String(row.ward), row]));

    const wardRows = ((wards as any).rows ?? []).map((row: any) => {
      const ward = String(row.ward ?? "UNASSIGNED");
      const wardHouseholds = hs.filter((item: any) => item.ward === ward);
      const wardContacts = cs.filter((item: any) => item.ward === ward);
      const wardTransport = ts.filter((item: any) => item.ward === ward);
      const target: any = targetMap.get(ward);

      const visited = wardHouseholds.filter(
        (item: any) => item.visit_status === "visited",
      ).length;
      const followUps = wardHouseholds.filter(
        (item: any) => item.follow_up_required,
      ).length;
      const completedContacts = wardContacts.filter(
        (item: any) => item.status === "completed",
      ).length;
      const completedTransport = wardTransport.filter(
        (item: any) => item.status === "completed",
      ).length;

      const householdTarget = Number(target?.household_target ?? 0);
      const contactTarget = Number(target?.contact_target ?? 0);

      const householdProgress =
        householdTarget > 0
          ? Math.round((visited / householdTarget) * 100)
          : 0;
      const contactProgress =
        contactTarget > 0
          ? Math.round((completedContacts / contactTarget) * 100)
          : 0;
      const transportProgress =
        wardTransport.length > 0
          ? Math.round((completedTransport / wardTransport.length) * 100)
          : 0;

      const mobilisationScore = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            householdProgress * 0.45 +
            contactProgress * 0.35 +
            transportProgress * 0.2,
          ),
        ),
      );

      const riskScore = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            (100 - mobilisationScore) * 0.65 +
            Math.min(100, followUps * 8) * 0.2 +
            Math.min(
              100,
              wardTransport.filter((item: any) => item.status === "requested").length * 10,
            ) * 0.15,
          ),
        ),
      );

      return {
        ward,
        registered: Number(row.registered ?? 0),
        stations: Number(row.stations ?? 0),
        turnoutTarget: Number(target?.turnout_target ?? 65),
        householdTarget,
        householdsVisited: visited,
        followUps,
        contactTarget,
        contactsCompleted: completedContacts,
        transportRequests: wardTransport.length,
        transportCompleted: completedTransport,
        mobilisationScore,
        riskScore,
      };
    });

    const timeline = [
      ...hs.map((item: any) => ({
        id: `household-${item.id}`,
        type: "household",
        title: `${item.household_name || item.contact_name || "Household"} · ${item.visit_status}`,
        ward: item.ward,
        status: item.visit_status,
        timestamp: item.updated_at,
      })),
      ...cs.map((item: any) => ({
        id: `contact-${item.id}`,
        type: "contact",
        title: `${item.contact_name} · ${item.channel}`,
        ward: item.ward,
        status: item.status,
        timestamp: item.updated_at,
      })),
      ...ts.map((item: any) => ({
        id: `transport-${item.id}`,
        type: "transport",
        title: `${item.voter_name} · ${item.status}`,
        ward: item.ward,
        status: item.status,
        timestamp: item.updated_at,
      })),
    ]
      .sort(
        (a: any, b: any) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime(),
      )
      .slice(0, 100);

    res.json({
      generatedAt: new Date().toISOString(),
      wards: wardRows.sort(
        (a: any, b: any) => b.riskScore - a.riskScore,
      ),
      timeline,
      alerts: wardRows
        .filter((ward: any) => ward.riskScore >= 40)
        .map((ward: any) => ({
          ward: ward.ward,
          severity: ward.riskScore >= 70 ? "critical" : "high",
          title: `${ward.ward} mobilisation risk`,
          detail:
            `Mobilisation ${ward.mobilisationScore}%, ` +
            `${ward.followUps} follow-up(s), ` +
            `${ward.transportRequests - ward.transportCompleted} pending transport request(s).`,
        })),
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to load GOTV live command",
      detail: err instanceof Error ? err.message : "Unknown live command error",
    });
  }
});


async function ensureElectionDispatchTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS gotv_polling_dispatch (
      id bigserial PRIMARY KEY,
      station_code text NOT NULL,
      ward text,
      station_name text,
      agent_name text,
      agent_phone text,
      opening_status text NOT NULL DEFAULT 'not-open',
      queue_status text NOT NULL DEFAULT 'normal',
      materials_status text NOT NULL DEFAULT 'unknown',
      device_status text NOT NULL DEFAULT 'unknown',
      turnout_count integer NOT NULL DEFAULT 0,
      turnout_hour integer,
      notes text,
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (station_code)
    );

    CREATE TABLE IF NOT EXISTS gotv_dispatch_incidents (
      id bigserial PRIMARY KEY,
      station_code text,
      ward text,
      title text NOT NULL,
      description text,
      severity text NOT NULL DEFAULT 'medium',
      status text NOT NULL DEFAULT 'open',
      assigned_to text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

router.get("/operations-centre/election-dispatch", async (_req, res) => {
  try {
    await ensureElectionDispatchTables();

    await db.execute(sql`
      INSERT INTO gotv_polling_dispatch (
        station_code,
        ward,
        station_name,
        agent_name,
        agent_phone
      )
      SELECT
        ps.code,
        ps.ward,
        ps.name,
        ps.agent_name,
        ps.agent_phone
      FROM polling_stations ps
      ON CONFLICT (station_code) DO UPDATE SET
        ward = excluded.ward,
        station_name = excluded.station_name,
        agent_name = coalesce(
          gotv_polling_dispatch.agent_name,
          excluded.agent_name
        ),
        agent_phone = coalesce(
          gotv_polling_dispatch.agent_phone,
          excluded.agent_phone
        )
    `);

    const [stations, incidents] = await Promise.all([
      db.execute(sql`
        SELECT
          id,
          station_code AS "stationCode",
          ward,
          station_name AS "stationName",
          agent_name AS "agentName",
          agent_phone AS "agentPhone",
          opening_status AS "openingStatus",
          queue_status AS "queueStatus",
          materials_status AS "materialsStatus",
          device_status AS "deviceStatus",
          turnout_count AS "turnoutCount",
          turnout_hour AS "turnoutHour",
          notes,
          updated_at AS "updatedAt"
        FROM gotv_polling_dispatch
        ORDER BY ward, station_code
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
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM gotv_dispatch_incidents
        ORDER BY
          CASE severity
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            ELSE 4
          END,
          updated_at DESC
      `),
    ]);

    const rows = (stations as any).rows ?? [];
    const incidentRows = (incidents as any).rows ?? [];

    const wards = [...new Set(rows.map((row: any) => row.ward || "UNASSIGNED"))]
      .map((ward) => {
        const wardStations = rows.filter(
          (row: any) => (row.ward || "UNASSIGNED") === ward,
        );

        return {
          ward,
          stations: wardStations.length,
          opened: wardStations.filter(
            (row: any) => row.openingStatus === "open",
          ).length,
          agentsPresent: wardStations.filter(
            (row: any) => row.agentName,
          ).length,
          deviceReady: wardStations.filter(
            (row: any) => row.deviceStatus === "ready",
          ).length,
          materialsReady: wardStations.filter(
            (row: any) => row.materialsStatus === "received",
          ).length,
          turnout: wardStations.reduce(
            (sum: number, row: any) =>
              sum + Number(row.turnoutCount ?? 0),
            0,
          ),
          openIncidents: incidentRows.filter(
            (incident: any) =>
              incident.ward === ward &&
              incident.status !== "resolved",
          ).length,
        };
      });

    res.json({
      generatedAt: new Date().toISOString(),
      summary: {
        stations: rows.length,
        opened: rows.filter(
          (row: any) => row.openingStatus === "open",
        ).length,
        agentsPresent: rows.filter((row: any) => row.agentName).length,
        devicesReady: rows.filter(
          (row: any) => row.deviceStatus === "ready",
        ).length,
        materialsReady: rows.filter(
          (row: any) => row.materialsStatus === "received",
        ).length,
        turnout: rows.reduce(
          (sum: number, row: any) =>
            sum + Number(row.turnoutCount ?? 0),
          0,
        ),
        openIncidents: incidentRows.filter(
          (incident: any) => incident.status !== "resolved",
        ).length,
      },
      wards,
      stations: rows,
      incidents: incidentRows,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to load election dispatch command",
      detail:
        err instanceof Error
          ? err.message
          : "Unknown dispatch error",
    });
  }
});

router.patch("/operations-centre/election-dispatch/stations/:code", async (req, res) => {
  try {
    await ensureElectionDispatchTables();

    const code = decodeURIComponent(String(req.params.code ?? "")).trim();
    if (!code) {
      res.status(400).json({ error: "station code required" });
      return;
    }

    const body = req.body as any;
    const result = await db.execute(sql`
      UPDATE gotv_polling_dispatch
      SET
        opening_status = coalesce(
          ${body?.openingStatus ?? null},
          opening_status
        ),
        queue_status = coalesce(
          ${body?.queueStatus ?? null},
          queue_status
        ),
        materials_status = coalesce(
          ${body?.materialsStatus ?? null},
          materials_status
        ),
        device_status = coalesce(
          ${body?.deviceStatus ?? null},
          device_status
        ),
        turnout_count = coalesce(
          ${body?.turnoutCount ?? null},
          turnout_count
        ),
        turnout_hour = coalesce(
          ${body?.turnoutHour ?? null},
          turnout_hour
        ),
        notes = coalesce(${body?.notes ?? null}, notes),
        updated_at = now()
      WHERE station_code = ${code}
      RETURNING *
    `);

    if ((result as any).rows?.length === 0) {
      res.status(404).json({ error: "Station dispatch record not found" });
      return;
    }

    res.json((result as any).rows[0]);
  } catch (err) {
    res.status(500).json({
      error: "Failed to update polling station dispatch",
      detail:
        err instanceof Error
          ? err.message
          : "Unknown dispatch update error",
    });
  }
});

router.post("/operations-centre/election-dispatch/incidents", async (req, res) => {
  try {
    await ensureElectionDispatchTables();

    const body = req.body as any;
    const title = String(body?.title ?? "").trim();

    if (!title) {
      res.status(400).json({ error: "title required" });
      return;
    }

    const result = await db.execute(sql`
      INSERT INTO gotv_dispatch_incidents (
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
    res.status(500).json({
      error: "Failed to create election dispatch incident",
      detail:
        err instanceof Error
          ? err.message
          : "Unknown incident error",
    });
  }
});

router.patch("/operations-centre/election-dispatch/incidents/:id", async (req, res) => {
  try {
    await ensureElectionDispatchTables();

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: "Invalid incident id" });
      return;
    }

    const body = req.body as any;
    const result = await db.execute(sql`
      UPDATE gotv_dispatch_incidents
      SET
        status = coalesce(${body?.status ?? null}, status),
        severity = coalesce(${body?.severity ?? null}, severity),
        assigned_to = coalesce(
          ${body?.assignedTo ?? null},
          assigned_to
        ),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `);

    if ((result as any).rows?.length === 0) {
      res.status(404).json({ error: "Incident not found" });
      return;
    }

    res.json((result as any).rows[0]);
  } catch (err) {
    res.status(500).json({
      error: "Failed to update election dispatch incident",
      detail:
        err instanceof Error
          ? err.message
          : "Unknown incident update error",
    });
  }
});


async function ensurePollingCommandTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS polling_command_hourly_turnout (
      id bigserial PRIMARY KEY,
      station_code text NOT NULL,
      ward text,
      report_hour integer NOT NULL,
      turnout_count integer NOT NULL DEFAULT 0,
      reported_by text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (station_code, report_hour)
    );

    CREATE TABLE IF NOT EXISTS polling_command_logistics (
      id bigserial PRIMARY KEY,
      resource_type text NOT NULL,
      resource_name text NOT NULL,
      ward text,
      station_code text,
      quantity integer NOT NULL DEFAULT 1,
      status text NOT NULL DEFAULT 'available',
      assigned_to text,
      notes text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

router.get("/operations-centre/polling-command", async (_req, res) => {
  try {
    await ensureGotvTables();
    await ensureElectionDispatchTables();
    await ensurePollingCommandTables();

    const [stations, incidents, hourly, logistics] = await Promise.all([
      db.execute(sql`
        SELECT
          d.id,
          d.station_code AS "stationCode",
          d.ward,
          d.station_name AS "stationName",
          d.agent_name AS "agentName",
          d.agent_phone AS "agentPhone",
          d.opening_status AS "openingStatus",
          d.queue_status AS "queueStatus",
          d.materials_status AS "materialsStatus",
          d.device_status AS "deviceStatus",
          d.turnout_count AS "turnoutCount",
          d.turnout_hour AS "turnoutHour",
          d.notes,
          d.updated_at AS "updatedAt",
          coalesce(ps.registered_voters, 0)::integer AS "registeredVoters"
        FROM gotv_polling_dispatch d
        LEFT JOIN polling_stations ps
          ON ps.code = d.station_code
        ORDER BY d.ward, d.station_code
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
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM gotv_dispatch_incidents
        ORDER BY updated_at DESC
      `),
      db.execute(sql`
        SELECT
          id,
          station_code AS "stationCode",
          ward,
          report_hour AS "reportHour",
          turnout_count AS "turnoutCount",
          reported_by AS "reportedBy",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM polling_command_hourly_turnout
        ORDER BY report_hour, station_code
      `),
      db.execute(sql`
        SELECT
          id,
          resource_type AS "resourceType",
          resource_name AS "resourceName",
          ward,
          station_code AS "stationCode",
          quantity,
          status,
          assigned_to AS "assignedTo",
          notes,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM polling_command_logistics
        ORDER BY updated_at DESC
      `),
    ]);

    const stationRows = (stations as any).rows ?? [];
    const incidentRows = (incidents as any).rows ?? [];
    const hourlyRows = (hourly as any).rows ?? [];
    const logisticsRows = (logistics as any).rows ?? [];

    const registered = stationRows.reduce(
      (sum: number, row: any) =>
        sum + Number(row.registeredVoters ?? 0),
      0,
    );
    const turnout = stationRows.reduce(
      (sum: number, row: any) =>
        sum + Number(row.turnoutCount ?? 0),
      0,
    );

    const hours = Array.from({ length: 11 }, (_, index) => index + 7).map(
      (hour) => {
        const rows = hourlyRows.filter(
          (row: any) => Number(row.reportHour) === hour,
        );
        return {
          hour,
          turnout: rows.reduce(
            (sum: number, row: any) =>
              sum + Number(row.turnoutCount ?? 0),
            0,
          ),
          reports: rows.length,
        };
      },
    );

    const wardMap = new Map<string, any>();

    for (const station of stationRows) {
      const ward = station.ward || "UNASSIGNED";
      if (!wardMap.has(ward)) {
        wardMap.set(ward, {
          ward,
          stations: 0,
          opened: 0,
          turnout: 0,
          registered: 0,
          longQueues: 0,
          failedDevices: 0,
          missingMaterials: 0,
          activeIncidents: 0,
        });
      }

      const row = wardMap.get(ward);
      row.stations += 1;
      row.registered += Number(station.registeredVoters ?? 0);
      row.turnout += Number(station.turnoutCount ?? 0);
      if (station.openingStatus === "open") row.opened += 1;
      if (station.queueStatus === "long" || station.queueStatus === "blocked") {
        row.longQueues += 1;
      }
      if (station.deviceStatus === "failed") row.failedDevices += 1;
      if (station.materialsStatus === "missing") row.missingMaterials += 1;
    }

    for (const incident of incidentRows) {
      if (incident.status === "resolved") continue;
      const ward = incident.ward || "UNASSIGNED";
      if (wardMap.has(ward)) {
        wardMap.get(ward).activeIncidents += 1;
      }
    }

    const wards = [...wardMap.values()].map((ward) => ({
      ...ward,
      turnoutRate:
        ward.registered > 0
          ? Math.round((ward.turnout / ward.registered) * 100)
          : 0,
      reportingRate:
        ward.stations > 0
          ? Math.round((ward.opened / ward.stations) * 100)
          : 0,
      riskScore: Math.min(
        100,
        ward.activeIncidents * 20 +
          ward.longQueues * 12 +
          ward.failedDevices * 18 +
          ward.missingMaterials * 18 +
          Math.max(0, ward.stations - ward.opened) * 10,
      ),
    }));

    res.json({
      generatedAt: new Date().toISOString(),
      summary: {
        stations: stationRows.length,
        reporting: stationRows.filter(
          (row: any) => row.openingStatus === "open",
        ).length,
        registered,
        turnout,
        turnoutRate:
          registered > 0 ? Math.round((turnout / registered) * 100) : 0,
        activeIncidents: incidentRows.filter(
          (row: any) => row.status !== "resolved",
        ).length,
        longQueues: stationRows.filter(
          (row: any) =>
            row.queueStatus === "long" ||
            row.queueStatus === "blocked",
        ).length,
        failedDevices: stationRows.filter(
          (row: any) => row.deviceStatus === "failed",
        ).length,
        missingMaterials: stationRows.filter(
          (row: any) => row.materialsStatus === "missing",
        ).length,
        logisticsAvailable: logisticsRows
          .filter((row: any) => row.status === "available")
          .reduce(
            (sum: number, row: any) =>
              sum + Number(row.quantity ?? 0),
            0,
          ),
      },
      wards,
      stations: stationRows,
      incidents: incidentRows,
      hourly: hours,
      logistics: logisticsRows,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to load polling station command centre",
      detail:
        err instanceof Error
          ? err.message
          : "Unknown polling command error",
    });
  }
});

router.post("/operations-centre/polling-command/hourly-turnout", async (req, res) => {
  try {
    await ensurePollingCommandTables();

    const body = req.body as any;
    const stationCode = String(body?.stationCode ?? "").trim();
    const reportHour = Number(body?.reportHour);
    const turnoutCount = Number(body?.turnoutCount ?? 0);

    if (!stationCode || !Number.isInteger(reportHour)) {
      res.status(400).json({
        error: "stationCode and integer reportHour required",
      });
      return;
    }

    const result = await db.execute(sql`
      INSERT INTO polling_command_hourly_turnout (
        station_code,
        ward,
        report_hour,
        turnout_count,
        reported_by,
        updated_at
      )
      VALUES (
        ${stationCode},
        ${body?.ward ?? null},
        ${reportHour},
        ${turnoutCount},
        ${body?.reportedBy ?? null},
        now()
      )
      ON CONFLICT (station_code, report_hour)
      DO UPDATE SET
        ward = excluded.ward,
        turnout_count = excluded.turnout_count,
        reported_by = excluded.reported_by,
        updated_at = now()
      RETURNING *
    `);

    await db.execute(sql`
      UPDATE gotv_polling_dispatch
      SET
        turnout_count = greatest(turnout_count, ${turnoutCount}),
        turnout_hour = ${reportHour},
        updated_at = now()
      WHERE station_code = ${stationCode}
    `);

    res.status(201).json((result as any).rows?.[0]);
  } catch (err) {
    res.status(500).json({
      error: "Failed to save hourly turnout",
      detail:
        err instanceof Error
          ? err.message
          : "Unknown hourly turnout error",
    });
  }
});

router.post("/operations-centre/polling-command/logistics", async (req, res) => {
  try {
    await ensurePollingCommandTables();

    const body = req.body as any;
    const resourceName = String(body?.resourceName ?? "").trim();

    if (!resourceName) {
      res.status(400).json({ error: "resourceName required" });
      return;
    }

    const result = await db.execute(sql`
      INSERT INTO polling_command_logistics (
        resource_type,
        resource_name,
        ward,
        station_code,
        quantity,
        status,
        assigned_to,
        notes
      )
      VALUES (
        ${body?.resourceType ?? "general"},
        ${resourceName},
        ${body?.ward ?? null},
        ${body?.stationCode ?? null},
        ${Number(body?.quantity ?? 1)},
        ${body?.status ?? "available"},
        ${body?.assignedTo ?? null},
        ${body?.notes ?? null}
      )
      RETURNING *
    `);

    res.status(201).json((result as any).rows?.[0]);
  } catch (err) {
    res.status(500).json({
      error: "Failed to create logistics item",
      detail:
        err instanceof Error
          ? err.message
          : "Unknown logistics error",
    });
  }
});

export default router;
