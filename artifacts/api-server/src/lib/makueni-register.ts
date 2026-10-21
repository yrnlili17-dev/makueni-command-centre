import { db, pollingStationsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import register from "../data/makueni-polling-stations-2022.json";
import { MAKUENI_WARDS } from "../data/makueni-geography";

/**
 * Keeps the polling_stations table identical to the IEBC 2022 register for
 * Makueni County (county code 017): 6 constituencies, 30 wards, 877
 * registration centres, 1,129 polling stations, 479,401 registered voters.
 *
 * Runs at every boot and is idempotent:
 *  - adds the register columns if the table predates them,
 *  - removes any station (and its tallies and election-day log entries) whose
 *    code is not in the Makueni register, e.g. old Tala/Kyeleni demo stations,
 *  - removes turnout assumptions for wards outside Makueni,
 *  - upserts every Makueni station by its IEBC code, refreshing name, ward and
 *    registered voters while keeping agent details and status entered by staff.
 */
type RegisterStation = {
  code: string;
  name: string;
  centreCode: string;
  centreName: string;
  ward: string;
  wardCode: string;
  constituency: string;
  constituencyCode: string;
  registeredVoters: number;
};

export const MAKUENI_REGISTER = register as {
  source: string;
  sourceUrl: string;
  registerYear: number;
  county: string;
  countyCode: string;
  stations: RegisterStation[];
};

export async function ensureMakueniPollingStations(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "polling_stations" (
      "id" serial PRIMARY KEY,
      "code" text NOT NULL UNIQUE,
      "name" text NOT NULL,
      "ward" text NOT NULL,
      "registered_voters" integer NOT NULL DEFAULT 0,
      "stream_count" integer NOT NULL DEFAULT 1,
      "agent_name" text,
      "agent_phone" text,
      "status" text NOT NULL DEFAULT 'pending',
      "notes" text,
      "created_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  for (const col of ["ward_code", "constituency", "constituency_code", "centre_code", "centre_name"]) {
    await db.execute(sql.raw(`ALTER TABLE "polling_stations" ADD COLUMN IF NOT EXISTS "${col}" text`));
  }
  await db.execute(sql`ALTER TABLE "polling_stations" ADD COLUMN IF NOT EXISTS "register_year" integer`);

  const codes = MAKUENI_REGISTER.stations.map((s) => s.code);
  const codeList = sql.join(codes.map((c) => sql`${c}`), sql`, `);
  const wardList = sql.join(MAKUENI_WARDS.map(({ ward }) => sql`${ward}`), sql`, `);

  await db.execute(sql`DELETE FROM "tally_results" WHERE "station_code" NOT IN (${codeList})`).catch(() => undefined);
  await db.execute(sql`DELETE FROM "election_events_log" WHERE "station_code" IS NOT NULL AND "station_code" NOT IN (${codeList})`).catch(() => undefined);
  await db.execute(sql`DELETE FROM "election_events_log" WHERE "ward" IS NOT NULL AND "ward" NOT IN (${wardList})`).catch(() => undefined);
  await db.execute(sql`DELETE FROM "polling_stations" WHERE "code" NOT IN (${codeList})`);
  await db.execute(sql`DELETE FROM "turnout_assumptions" WHERE "ward" NOT IN (${wardList})`).catch(() => undefined);

  const CHUNK = 250;
  for (let i = 0; i < MAKUENI_REGISTER.stations.length; i += CHUNK) {
    const chunk = MAKUENI_REGISTER.stations.slice(i, i + CHUNK);
    await db
      .insert(pollingStationsTable)
      .values(
        chunk.map((s) => ({
          code: s.code,
          name: s.name,
          ward: s.ward,
          wardCode: s.wardCode,
          constituency: s.constituency,
          constituencyCode: s.constituencyCode,
          centreCode: s.centreCode,
          centreName: s.centreName,
          registerYear: MAKUENI_REGISTER.registerYear,
          registeredVoters: s.registeredVoters,
          streamCount: 1,
        })),
      )
      .onConflictDoUpdate({
        target: pollingStationsTable.code,
        set: {
          name: sql`excluded.name`,
          ward: sql`excluded.ward`,
          wardCode: sql`excluded.ward_code`,
          constituency: sql`excluded.constituency`,
          constituencyCode: sql`excluded.constituency_code`,
          centreCode: sql`excluded.centre_code`,
          centreName: sql`excluded.centre_name`,
          registerYear: sql`excluded.register_year`,
          registeredVoters: sql`excluded.registered_voters`,
        },
      });
  }
}
