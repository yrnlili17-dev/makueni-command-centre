import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();
const SAFE = new Set(["campaign_volunteers","volunteers","campaign_messages","messages","campaign_events","events","door_knocks","field_visits","narrative_mentions"]);
const n = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;

async function exists(name: string) {
  const r = await db.execute(sql`SELECT to_regclass(${`public.${name}`}) IS NOT NULL AS exists`);
  return Boolean((r as any).rows?.[0]?.exists);
}

async function count(name: string, where = "") {
  if (!SAFE.has(name) || !(await exists(name))) return 0;
  try {
    const r = await db.execute(sql.raw(`SELECT count(*)::integer AS count FROM "${name}" ${where}`));
    return n((r as any).rows?.[0]?.count);
  } catch { return 0; }
}

async function first(candidates: Array<{table:string;where?:string}>) {
  for (const c of candidates) if (await exists(c.table)) return count(c.table, c.where ?? "");
  return 0;
}

router.get("/health", async (_req, res) => {
  const campaignDatabase = await exists("campaign_constituents");
  res.status(campaignDatabase ? 200 : 503).json({status: campaignDatabase ? "ok" : "degraded", module:"phase9a-live-dashboard-intelligence", campaignDatabase, checkedAt:new Date().toISOString()});
});

router.get("/overview", async (_req, res) => {
  if (!(await exists("campaign_constituents"))) {
    res.status(503).json({error:"Campaign constituent database unavailable. Complete Phase 8 first."});
    return;
  }

  const cr = await db.execute(sql`
    WITH base AS (
      SELECT *, CASE WHEN dob IS NULL THEN NULL ELSE date_part('year', age(current_date, dob))::integer END AS age_years
      FROM campaign_constituents
    )
    SELECT
      count(*)::integer AS total,
      count(*) FILTER (WHERE phone IS NOT NULL AND phone <> '')::integer AS phone_ready,
      count(*) FILTER (WHERE email IS NOT NULL AND email <> '')::integer AS email_ready,
      count(*) FILTER (WHERE sms_consent)::integer AS sms_consented,
      count(*) FILTER (WHERE whatsapp_consent)::integer AS whatsapp_consented,
      count(*) FILTER (WHERE email_consent)::integer AS email_consented,
      count(*) FILTER (WHERE gender='female')::integer AS women,
      count(*) FILTER (WHERE gender='male')::integer AS men,
      count(*) FILTER (WHERE age_years BETWEEN 18 AND 35)::integer AS youth,
      count(*) FILTER (WHERE age_years >= 60)::integer AS seniors,
      count(DISTINCT ward) FILTER (WHERE ward IS NOT NULL AND ward <> '')::integer AS wards,
      count(DISTINCT constituency) FILTER (WHERE constituency IS NOT NULL AND constituency <> '')::integer AS constituencies,
      count(DISTINCT polling_station) FILTER (WHERE polling_station IS NOT NULL AND polling_station <> '')::integer AS polling_stations,
      count(*) FILTER (WHERE phone IS NULL OR phone='')::integer AS missing_phone,
      count(*) FILTER (WHERE ward IS NULL OR ward='')::integer AS missing_ward,
      count(*) FILTER (WHERE support_level='strong')::integer AS strong_support,
      count(*) FILTER (WHERE support_level='leaning')::integer AS leaning_support,
      count(*) FILTER (WHERE support_level='undecided')::integer AS undecided,
      count(*) FILTER (WHERE support_level='opposed')::integer AS opposed
    FROM base
  `);
  const m = (cr as any).rows?.[0] ?? {};

  const wr = await db.execute(sql`
    SELECT ward, count(*)::integer AS constituents,
      count(*) FILTER (WHERE phone IS NOT NULL AND phone <> '')::integer AS phone_ready,
      count(*) FILTER (WHERE gender='female')::integer AS women
    FROM campaign_constituents
    WHERE ward IS NOT NULL AND ward <> ''
    GROUP BY ward ORDER BY constituents DESC, ward LIMIT 12
  `);

  const ir = await db.execute(sql`
    SELECT id,file_name,status,total_rows,imported_rows,updated_rows,skipped_rows,duplicate_rows,created_at,completed_at
    FROM campaign_import_jobs ORDER BY created_at DESC LIMIT 5
  `).catch(() => ({rows:[]} as any));

  const [openThreats,activeVolunteers,messagesSent,upcomingEvents,doorsKnocked] = await Promise.all([
    first([{table:"narrative_mentions",where:"WHERE coalesce(status,'open') NOT IN ('resolved','closed','dismissed')"}]),
    first([{table:"campaign_volunteers",where:"WHERE coalesce(status,'active')='active'"},{table:"volunteers",where:"WHERE coalesce(status,'active')='active'"}]),
    first([{table:"campaign_messages",where:"WHERE coalesce(status,'sent')='sent'"},{table:"messages",where:"WHERE coalesce(status,'sent')='sent'"}]),
    first([{table:"campaign_events"},{table:"events"}]),
    first([{table:"door_knocks"},{table:"field_visits"}]),
  ]);

  const total=n(m.total), phoneReady=n(m.phone_ready), wardReady=total-n(m.missing_ward);
  const dataReadiness=total?Math.round((phoneReady/total)*60+(wardReady/total)*40):0;
  const operationalReadiness=[total?25:0,phoneReady?20:0,n(m.wards)?20:0,activeVolunteers?15:0,messagesSent?10:0,upcomingEvents?10:0].reduce((a,b)=>a+b,0);

  res.json({
    generatedAt:new Date().toISOString(),
    metrics:{
      totalConstituents:total, phoneReady, emailReady:n(m.email_ready), smsConsented:n(m.sms_consented), whatsappConsented:n(m.whatsapp_consented), emailConsented:n(m.email_consented), women:n(m.women), men:n(m.men), youth:n(m.youth), seniors:n(m.seniors), wardsCovered:n(m.wards), constituenciesCovered:n(m.constituencies), pollingStations:n(m.polling_stations), missingPhone:n(m.missing_phone), missingWard:n(m.missing_ward), strongSupport:n(m.strong_support), leaningSupport:n(m.leaning_support), undecided:n(m.undecided), opposed:n(m.opposed), activeVolunteers,messagesSent,upcomingEvents,doorsKnocked,openThreats,dataReadiness,operationalReadiness
    },
    wards:(wr as any).rows ?? [], recentImports:(ir as any).rows ?? [],
    availability:{
      volunteers:(await exists("campaign_volunteers"))||(await exists("volunteers")),
      messaging:(await exists("campaign_messages"))||(await exists("messages")),
      events:(await exists("campaign_events"))||(await exists("events")),
      fieldOperations:(await exists("door_knocks"))||(await exists("field_visits")),
      intelligence:await exists("narrative_mentions")
    }
  });
});

export default router;
