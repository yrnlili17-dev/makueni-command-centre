import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;
const root = process.cwd();
const csvFile = path.join(root, "phase16-files", "data", "makueni_contacts_phase16.csv");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Run: source .env");
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = []; field = "";
    } else field += char;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift().map((h) => h.trim());
  return rows.filter((r) => r.some(Boolean)).map((r) =>
    Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()]))
  );
}

function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts.shift() || "Unknown",
    lastName: parts.join(" ") || "Unknown",
  };
}

const records = parseCsv(fs.readFileSync(csvFile, "utf8"));
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

let votersInserted = 0;
let membersInserted = 0;
let skipped = 0;

try {
  for (const record of records) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const existing = await client.query(
        `select id from voter_registry
         where ($1 <> '' and national_id = $1)
            or ($2 <> '' and phone = $2)
         limit 1`,
        [record.national_id, record.phone]
      );

      if (existing.rowCount === 0) {
        await client.query(
          `insert into voter_registry
           (national_id, full_name, phone, gender, date_of_birth, ward, sub_county,
            polling_station, status, source, import_batch, created_at, updated_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,'verified',$9,'phase16-makueni',now(),now())`,
          [
            record.national_id || null,
            record.full_name,
            record.phone || null,
            record.gender || null,
            record.date_of_birth || null,
            record.ward || null,
            record.constituency || null,
            record.polling_station || null,
            record.source || "Makueni database",
          ]
        );
        votersInserted++;
      } else {
        skipped++;
      }

      const memberExists = await client.query(
        `select id from members where ($1 <> '' and phone = $1) limit 1`,
        [record.phone]
      );
      if (memberExists.rowCount === 0) {
        const { firstName, lastName } = splitName(record.full_name);
        await client.query(
          `insert into members
           (first_name,last_name,email,phone,ward,status,support_level,
            sms_consent,whatsapp_consent,email_consent,notes,created_at,updated_at)
           values ($1,$2,$3,$4,$5,'active',null,false,false,false,$6,now(),now())`,
          [
            firstName, lastName, record.email || null, record.phone || null,
            record.ward || null,
            `Imported by Phase 16 from ${record.source || "Makueni database"}`,
          ]
        );
        membersInserted++;
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  console.log(`Phase 16 database import complete.`);
  console.log(`Voter/contact records inserted: ${votersInserted}`);
  console.log(`Member/contact records inserted: ${membersInserted}`);
  console.log(`Existing voter records skipped: ${skipped}`);
} finally {
  await pool.end();
}
