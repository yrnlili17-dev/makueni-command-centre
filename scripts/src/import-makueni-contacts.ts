import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, voterRegistryTable, voterSyncLogsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultFile = path.resolve(__dirname, "../../data/makueni-contacts-master.csv");
const filePath = process.argv[2] ? path.resolve(process.argv[2]) : defaultFile;
const batchId = `MAKUENI-CONTACTS-${new Date().toISOString().slice(0, 10)}`;

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(value.trim()); value = "";
    } else value += char;
  }
  cells.push(value.trim());
  return cells;
}

function normalizePhone(value: string): string | undefined {
  const digits = value.replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.startsWith("254") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+254${digits.slice(1)}`;
  if (digits.length === 9 && /^[17]/.test(digits)) return `+254${digits}`;
  return value || undefined;
}

async function main() {
  if (!fs.existsSync(filePath)) throw new Error(`Contacts file not found: ${filePath}`);
  const lines = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("Contacts CSV contains no records");

  const headers = parseCsvLine(lines[0]!).map(h => h.trim());
  let inserted = 0;
  let duplicates = 0;
  let skipped = 0;

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
    const fullName = row.full_name?.trim();
    const nationalId = row.national_id?.replace(/\D/g, "") || undefined;
    const voterNumber = row.voter_number?.trim() || undefined;
    const phone = normalizePhone(row.phone ?? "");
    if (!fullName) { skipped++; continue; }

    const checks = [];
    if (nationalId) checks.push(eq(voterRegistryTable.nationalId, nationalId));
    if (voterNumber) checks.push(eq(voterRegistryTable.voterNumber, voterNumber));
    if (phone) checks.push(eq(voterRegistryTable.phone, phone));
    if (checks.length) {
      const [existing] = await db.select({ id: voterRegistryTable.id })
        .from(voterRegistryTable).where(or(...checks)).limit(1);
      if (existing) { duplicates++; continue; }
    }

    await db.insert(voterRegistryTable).values({
      fullName,
      nationalId,
      voterNumber,
      phone,
      gender: row.gender || undefined,
      dateOfBirth: row.date_of_birth || undefined,
      ward: row.ward || undefined,
      subCounty: row.sub_county || undefined,
      pollingStation: row.polling_station || undefined,
      pollingStationCode: row.polling_station_code || undefined,
      stream: row.stream || undefined,
      status: "verified",
      source: "upload",
      importBatch: batchId,
      reviewNotes: "Imported from cleaned Makueni contacts master dataset",
    });
    inserted++;
  }

  await db.insert(voterSyncLogsTable).values({
    source: `script:${path.basename(filePath)}`,
    status: "completed",
    recordsProcessed: lines.length - 1,
    recordsNew: inserted,
    recordsDuplicate: duplicates,
    details: `Makueni contacts import completed. Inserted: ${inserted}; duplicates: ${duplicates}; skipped: ${skipped}`,
  });

  console.log(JSON.stringify({ filePath, batchId, processed: lines.length - 1, inserted, duplicates, skipped }, null, 2));
  process.exit(0);
}

main().catch(error => { console.error(error); process.exit(1); });
