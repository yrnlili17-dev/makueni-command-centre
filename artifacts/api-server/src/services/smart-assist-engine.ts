import { and, count, eq, ilike, or, sql } from "drizzle-orm";
import { db, membersTable, voterRegistryTable } from "@workspace/db";

type AssistInput = {
  message: string;
  module?: string;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function listLines(rows: Array<Record<string, unknown>>, limit = 8): string {
  if (!rows.length) return "No matching records were found.";
  return rows.slice(0, limit).map((row, index) => {
    const name = clean(row.fullName || `${clean(row.firstName)} ${clean(row.lastName)}`);
    const ward = clean(row.ward) || "Ward not recorded";
    const station = clean(row.pollingStation);
    const phone = clean(row.phone);
    return `${index + 1}. ${name}${phone ? ` · ${phone}` : ""} · ${ward}${station ? ` · ${station}` : ""}`;
  }).join("\n");
}

export async function getCampaignSnapshot() {
  const [[voters], [members], wardRows] = await Promise.all([
    db.select({ total: count() }).from(voterRegistryTable),
    db.select({ total: count() }).from(membersTable),
    db.select({
      ward: voterRegistryTable.ward,
      total: count(),
    })
      .from(voterRegistryTable)
      .groupBy(voterRegistryTable.ward)
      .orderBy(sql`count(*) desc`)
      .limit(10),
  ]);

  return {
    voters: Number(voters?.total ?? 0),
    members: Number(members?.total ?? 0),
    wards: wardRows
      .filter((row) => row.ward)
      .map((row) => ({ ward: row.ward!, total: Number(row.total) })),
  };
}

async function searchCampaignData(query: string) {
  const pattern = `%${query}%`;
  const [voters, members] = await Promise.all([
    db.select({
      fullName: voterRegistryTable.fullName,
      phone: voterRegistryTable.phone,
      ward: voterRegistryTable.ward,
      pollingStation: voterRegistryTable.pollingStation,
    })
      .from(voterRegistryTable)
      .where(or(
        ilike(voterRegistryTable.fullName, pattern),
        ilike(voterRegistryTable.ward, pattern),
        ilike(voterRegistryTable.pollingStation, pattern),
        ilike(voterRegistryTable.phone, pattern),
      ))
      .limit(20),
    db.select({
      firstName: membersTable.firstName,
      lastName: membersTable.lastName,
      phone: membersTable.phone,
      ward: membersTable.ward,
    })
      .from(membersTable)
      .where(or(
        ilike(membersTable.firstName, pattern),
        ilike(membersTable.lastName, pattern),
        ilike(membersTable.ward, pattern),
        ilike(membersTable.phone, pattern),
      ))
      .limit(20),
  ]);

  return { voters, members };
}

export async function buildPhase16Response({ message, module = "dashboard" }: AssistInput): Promise<string> {
  const query = message.trim();
  const lower = query.toLowerCase();
  const snapshot = await getCampaignSnapshot();
  const wardSummary = snapshot.wards.length
    ? snapshot.wards.map((row) => `• ${row.ward}: ${row.total}`).join("\n")
    : "• No ward records available yet.";

  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(lower)) {
    return `Hello! I am Smart Assist — Chief Strategist.

Your Makueni database is connected.

CURRENT DATABASE
• Registered voter/contact records: ${snapshot.voters.toLocaleString()}
• Campaign members/contacts: ${snapshot.members.toLocaleString()}
• Wards represented: ${snapshot.wards.length}

You can ask:
• “Show contacts in Ilima”
• “Find Alex Zawadi”
• “Show polling station Ndolo”
• “What are our top priorities?”
• “Research water issues in Makueni”`;
  }

  if (lower.includes("top") && lower.includes("priorit") || lower.includes("what next") || lower.includes("priority")) {
    const dataPriority = snapshot.voters === 0
      ? "Import and validate the Makueni contact database."
      : `Verify and classify the ${snapshot.voters.toLocaleString()} imported records by support level and field ownership.`;

    return `SMART ASSIST — CHIEF STRATEGIST

TOP 3 STRATEGIC PRIORITIES

1. DATA ACTIVATION
${dataPriority}

2. WARD ORGANIZATION
Assign a coordinator, weekly contact target and field-reporting responsibility to every represented ward.

3. CONTACT CONVERSION
Move contacts from stored records into verified supporters, volunteers, event attendees and polling-station agents.

WARD COVERAGE
${wardSummary}

Recommended next command: “Show contacts in [ward name]”.`;
  }

  if (lower.includes("database") || lower.includes("snapshot") || lower.includes("how many contact") || lower.includes("how many voter")) {
    return `MAKUENI DATABASE SNAPSHOT

• Voter/contact records: ${snapshot.voters.toLocaleString()}
• Members/contacts: ${snapshot.members.toLocaleString()}
• Wards represented: ${snapshot.wards.length}

WARD DISTRIBUTION
${wardSummary}`;
  }

  const searchPrefixes = [
    "show contacts in ", "find contacts in ", "contacts in ", "show ward ",
    "find ", "search ", "show polling station ", "polling station "
  ];
  let searchTerm = "";
  for (const prefix of searchPrefixes) {
    if (lower.startsWith(prefix)) {
      searchTerm = query.slice(prefix.length).trim();
      break;
    }
  }

  if (!searchTerm && (lower.includes("ward") || lower.includes("polling station") || lower.includes("contact"))) {
    searchTerm = query
      .replace(/show|find|search|contacts?|ward|polling station|in|for/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (searchTerm) {
    const results = await searchCampaignData(searchTerm);
    const combined = [...results.voters, ...results.members];
    return `CAMPAIGN DATABASE SEARCH

Query: ${searchTerm}
Matches: ${combined.length}

${listLines(combined)}

Next actions:
• Verify phone and location details
• Assign an outreach owner
• Record support level and follow-up date`;
  }

  if (lower.includes("research") || lower.includes("news") || lower.includes("social listening") || lower.includes("what are people saying")) {
    const topic = query.replace(/research|news|social listening|what are people saying about/gi, "").trim() || "Makueni development";
    const encoded = encodeURIComponent(topic);
    return `SMART RESEARCH — ${topic.toUpperCase()}

Public searches:
• Google News: https://news.google.com/search?q=${encoded}
• Google: https://www.google.com/search?q=${encoded}
• YouTube: https://www.youtube.com/results?search_query=${encoded}
• X: https://x.com/search?q=${encoded}&src=typed_query

Save useful evidence into a Campaign Workspace with the source, date, ward, issue and recommended action.`;
  }

  return `SMART ASSIST — CHIEF STRATEGIST

I understood your request as: “${query}”.

The Makueni database currently contains ${snapshot.voters.toLocaleString()} voter/contact records and ${snapshot.members.toLocaleString()} campaign contacts.

Ask a specific question about a person, ward, polling station, campaign priority or public issue.

Examples:
• “Show contacts in Ilima”
• “Find Christine Mutungi”
• “Show polling station Kyamuoso”
• “What are our top priorities?”
• “Research youth employment in Makueni”`;
}
