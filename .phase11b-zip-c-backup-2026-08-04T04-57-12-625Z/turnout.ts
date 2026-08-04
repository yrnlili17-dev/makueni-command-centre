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

export default router;
