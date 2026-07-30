import { count, sql } from "drizzle-orm";
import {
  db,
  voterRegistryTable,
  membersTable,
  volunteersTable,
  eventsTable,
} from "@workspace/db";

export type WardMetric = {
  ward: string;
  constituency: string;
  contacts: number;
  volunteers: number;
  events: number;
  incidents: number;
  pollingStations: number;
  coverageScore: number;
  riskLevel: "low" | "medium" | "high";
};

function riskFromCoverage(coverage: number): "low" | "medium" | "high" {
  if (coverage < 35) return "high";
  if (coverage < 65) return "medium";
  return "low";
}

export async function getWardMetrics(): Promise<WardMetric[]> {
  const contactRows = await db
    .select({
      ward: voterRegistryTable.ward,
      constituency: voterRegistryTable.subCounty,
      contacts: count(),
      pollingStations: sql<number>`
        count(distinct ${voterRegistryTable.pollingStation})
      `,
    })
    .from(voterRegistryTable)
    .groupBy(voterRegistryTable.ward, voterRegistryTable.subCounty);

  const volunteerRows = await db
    .select({
      ward: volunteersTable.ward,
      volunteers: count(),
    })
    .from(volunteersTable)
    .groupBy(volunteersTable.ward);

  const eventRows = await db
    .select({
      ward: eventsTable.ward,
      events: count(),
    })
    .from(eventsTable)
    .groupBy(eventsTable.ward);

  const volunteersByWard = new Map(
    volunteerRows.map((row) => [row.ward ?? "", Number(row.volunteers)]),
  );
  const eventsByWard = new Map(
    eventRows.map((row) => [row.ward ?? "", Number(row.events)]),
  );

  const maxContacts = Math.max(
    1,
    ...contactRows.map((row) => Number(row.contacts)),
  );

  return contactRows
    .filter((row) => row.ward)
    .map((row) => {
      const ward = row.ward ?? "Unassigned";
      const contacts = Number(row.contacts);
      const volunteers = volunteersByWard.get(ward) ?? 0;
      const events = eventsByWard.get(ward) ?? 0;
      const pollingStations = Number(row.pollingStations ?? 0);

      const contactScore = Math.min(50, Math.round((contacts / maxContacts) * 50));
      const volunteerScore = Math.min(25, volunteers * 5);
      const eventScore = Math.min(15, events * 3);
      const stationScore = Math.min(10, pollingStations);
      const coverageScore = Math.min(
        100,
        contactScore + volunteerScore + eventScore + stationScore,
      );

      return {
        ward,
        constituency: row.constituency ?? "Unassigned",
        contacts,
        volunteers,
        events,
        incidents: 0,
        pollingStations,
        coverageScore,
        riskLevel: riskFromCoverage(coverageScore),
      };
    })
    .sort((a, b) => b.contacts - a.contacts);
}

export async function getGisSummary() {
  const rows = await getWardMetrics();
  const contacts = rows.reduce((sum, row) => sum + row.contacts, 0);
  const volunteers = rows.reduce((sum, row) => sum + row.volunteers, 0);
  const pollingStations = rows.reduce(
    (sum, row) => sum + row.pollingStations,
    0,
  );
  const averageCoverage = rows.length
    ? Math.round(
        rows.reduce((sum, row) => sum + row.coverageScore, 0) / rows.length,
      )
    : 0;

  return {
    wards: rows.length,
    contacts,
    volunteers,
    pollingStations,
    averageCoverage,
    highRiskWards: rows.filter((row) => row.riskLevel === "high").length,
  };
}
