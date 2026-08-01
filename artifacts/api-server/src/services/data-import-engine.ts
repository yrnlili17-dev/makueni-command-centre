import { randomUUID } from "node:crypto";
import path from "node:path";
import * as XLSX from "xlsx";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export type CanonicalField =
  | "first_name"
  | "last_name"
  | "full_name"
  | "phone"
  | "email"
  | "ward"
  | "constituency"
  | "county"
  | "national_id"
  | "dob"
  | "gender"
  | "village"
  | "polling_station"
  | "tribe"
  | "education"
  | "source_reference";

export type ColumnMapping = Record<string, CanonicalField | "ignore">;

type ParsedSheet = {
  sheetName: string;
  headerRow: number;
  headers: string[];
  rows: Record<string, unknown>[];
};

const CANONICAL_FIELDS: CanonicalField[] = [
  "first_name",
  "last_name",
  "full_name",
  "phone",
  "email",
  "ward",
  "constituency",
  "county",
  "national_id",
  "dob",
  "gender",
  "village",
  "polling_station",
  "tribe",
  "education",
  "source_reference",
];

const FIELD_ALIASES: Record<CanonicalField, string[]> = {
  first_name: [
    "first_name", "firstname", "first name", "given_name", "given name",
    "fname", "forename",
  ],
  last_name: [
    "last_name", "lastname", "last name", "surname", "family_name",
    "family name", "lname",
  ],
  full_name: [
    "name", "full_name", "full name", "fullname", "names", "member name",
    "voter name",
  ],
  phone: [
    "phone", "phone_number", "phone number", "mobile", "mobile_number",
    "mobile number", "telephone", "tel", "contact", "contact number",
  ],
  email: ["email", "email_address", "email address", "e-mail"],
  ward: ["ward", "ward_name", "ward name"],
  constituency: [
    "constituency", "constituency_name", "constituency name", "sub county",
    "sub_county", "sub-county",
  ],
  county: ["county", "county_name", "county name"],
  national_id: [
    "national_id", "national id", "id_number", "id number", "id/no", "id no",
    "id no.", "idno", "id/no.", "identity number", "national id number",
  ],
  dob: [
    "dob", "date_of_birth", "date of birth", "birth date", "birthdate",
  ],
  gender: ["gender", "sex"],
  village: ["village", "village_name", "village name", "location"],
  polling_station: [
    "polling_station", "polling station", "polling_station_name",
    "polling station name", "polling centre", "polling center",
  ],
  tribe: ["tribe", "ethnicity", "ethnic group"],
  education: [
    "education", "educ", "edu", "education_level", "education level",
    "level of education", "l.o.e", "loe",
  ],
  source_reference: [
    "source_reference", "source reference", "serial", "serial number",
    "s/no", "sno", "d/no", "dno",
  ],
};

function cleanHeader(value: unknown): string {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/\s+/g, " ");
}

function aliasKey(value: unknown): string {
  return cleanHeader(value)
    .toLowerCase()
    .replace(/[._/\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (!text || text === "-" || text.toLowerCase() === "null") return null;
  return text.replace(/\s+/g, " ");
}

function normalizeName(value: unknown): string | null {
  const text = normalizeText(value);
  return text ? text.toUpperCase() : null;
}

function normalizePhone(value: unknown): string | null {
  const raw = normalizeText(value);
  if (!raw) return null;

  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) digits = `254${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 9) digits = `254${digits}`;
  if (digits.startsWith("1") && digits.length === 9) digits = `254${digits}`;
  if (digits.startsWith("254") && digits.length === 12) return digits;
  return digits || null;
}

function normalizeNationalId(value: unknown): string | null {
  const raw = normalizeText(value);
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits || null;
}

function normalizeGender(value: unknown): string | null {
  const raw = normalizeText(value)?.toLowerCase();
  if (!raw) return null;
  if (["m", "male"].includes(raw)) return "male";
  if (["f", "female"].includes(raw)) return "female";
  return raw;
}

function normalizeDate(value: unknown): string | null {
  const raw = normalizeText(value);
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);

  const excelSerial = Number(raw);
  if (Number.isFinite(excelSerial) && excelSerial > 20000 && excelSerial < 80000) {
    const parsed = XLSX.SSF.parse_date_code(excelSerial);
    if (parsed) {
      return `${String(parsed.y).padStart(4, "0")}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }

  const match = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (match && match[1] !== "00" && match[2] !== "00") {
    return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }

  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  return null;
}

function splitFullName(fullName: string | null): {
  firstName: string | null;
  lastName: string | null;
} {
  if (!fullName) return { firstName: null, lastName: null };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? null,
  };
}

function csvRows(buffer: Buffer): unknown[][] {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === "," && !quoted) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value.length || row.length) {
    row.push(value);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }

  return rows;
}

function detectHeaderRow(rows: unknown[][]): number {
  let bestIndex = 0;
  let bestScore = -1;

  for (let index = 0; index < Math.min(rows.length, 25); index += 1) {
    const row = rows[index] ?? [];
    const nonEmpty = row.filter((value) => cleanHeader(value)).length;
    const aliasMatches = row.reduce((score, value) => {
      const key = aliasKey(value);
      return score + (CANONICAL_FIELDS.some((field) =>
        FIELD_ALIASES[field].some((alias) => aliasKey(alias) === key)
      ) ? 4 : 0);
    }, 0);
    const unique = new Set(row.map(aliasKey).filter(Boolean)).size;
    const score = nonEmpty + aliasMatches + unique * 0.25;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function rowsToObjects(rows: unknown[][], headerRow: number): {
  headers: string[];
  records: Record<string, unknown>[];
} {
  const rawHeaders = rows[headerRow] ?? [];
  const seen = new Map<string, number>();
  const headers = rawHeaders.map((value, index) => {
    const base = cleanHeader(value) || `Column ${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count ? `${base} (${count + 1})` : base;
  });

  const records = rows
    .slice(headerRow + 1)
    .filter((row) => row.some((value) => normalizeText(value)))
    .map((row) => {
      const output: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        output[header] = row[index] ?? null;
      });
      return output;
    });

  return { headers, records };
}

export function suggestMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  for (const header of headers) {
    const key = aliasKey(header);
    let suggestion: CanonicalField | "ignore" = "ignore";

    for (const field of CANONICAL_FIELDS) {
      if (FIELD_ALIASES[field].some((alias) => aliasKey(alias) === key)) {
        suggestion = field;
        break;
      }
    }

    mapping[header] = suggestion;
  }

  return mapping;
}

export function parseUploadedFile(
  buffer: Buffer,
  fileName: string,
  requestedSheet?: string,
): {
  fileType: "csv" | "xlsx";
  sheets: ParsedSheet[];
} {
  const extension = path.extname(fileName).toLowerCase();

  if (extension === ".csv") {
    const raw = csvRows(buffer);
    const headerRow = detectHeaderRow(raw);
    const { headers, records } = rowsToObjects(raw, headerRow);

    return {
      fileType: "csv",
      sheets: [{
        sheetName: "CSV",
        headerRow: headerRow + 1,
        headers,
        rows: records,
      }],
    };
  }

  if (extension === ".xlsx" || extension === ".xls") {
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: false,
      raw: false,
      dense: true,
    });

    const selected = requestedSheet
      ? workbook.SheetNames.filter((name) => name === requestedSheet)
      : workbook.SheetNames;

    const sheets = selected.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: null,
        raw: false,
        blankrows: false,
      });
      const headerRow = detectHeaderRow(raw);
      const { headers, records } = rowsToObjects(raw, headerRow);

      return {
        sheetName,
        headerRow: headerRow + 1,
        headers,
        rows: records,
      };
    });

    return { fileType: "xlsx", sheets };
  }

  throw new Error("Unsupported file type. Upload CSV, XLSX or XLS.");
}

export function normalizeRecord(
  raw: Record<string, unknown>,
  mapping: ColumnMapping,
): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const [source, target] of Object.entries(mapping)) {
    if (target === "ignore") continue;
    output[target] = raw[source];
  }

  const suppliedFullName = normalizeName(output.full_name);
  const split = splitFullName(suppliedFullName);

  const firstName = normalizeName(output.first_name) ?? split.firstName;
  const lastName = normalizeName(output.last_name) ?? split.lastName;
  const fullName =
    suppliedFullName ??
    [firstName, lastName].filter(Boolean).join(" ") ??
    null;

  return {
    first_name: firstName,
    last_name: lastName,
    full_name: fullName || null,
    phone: normalizePhone(output.phone),
    email: normalizeText(output.email)?.toLowerCase() ?? null,
    ward: normalizeName(output.ward),
    constituency: normalizeName(output.constituency),
    county: normalizeName(output.county),
    national_id: normalizeNationalId(output.national_id),
    dob: normalizeDate(output.dob),
    gender: normalizeGender(output.gender),
    village: normalizeName(output.village),
    polling_station: normalizeName(output.polling_station),
    tribe: normalizeName(output.tribe),
    education: normalizeText(output.education)?.toUpperCase() ?? null,
    source_reference: normalizeText(output.source_reference),
  };
}

export function validateNormalizedRecord(
  record: Record<string, unknown>,
): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!record.full_name && !record.first_name) errors.push("MISSING_NAME");

  const phone = String(record.phone ?? "");
  if (phone && !/^254[17]\d{8}$/.test(phone)) warnings.push("INVALID_PHONE");

  const id = String(record.national_id ?? "");
  if (id && !/^\d{5,10}$/.test(id)) warnings.push("INVALID_NATIONAL_ID");

  if (!record.ward) warnings.push("MISSING_WARD");
  if (!record.constituency) warnings.push("MISSING_CONSTITUENCY");
  if (!record.county) warnings.push("MISSING_COUNTY");

  if (record.dob === null && record.gender) warnings.push("INVALID_OR_MISSING_DOB");

  return { errors, warnings };
}

async function ensureImportTables(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS campaign_import_jobs (
      id uuid PRIMARY KEY,
      file_name text NOT NULL,
      file_type text NOT NULL,
      sheet_name text,
      header_row integer,
      status text NOT NULL DEFAULT 'uploaded',
      total_rows integer NOT NULL DEFAULT 0,
      mapped_rows integer NOT NULL DEFAULT 0,
      valid_rows integer NOT NULL DEFAULT 0,
      invalid_rows integer NOT NULL DEFAULT 0,
      warning_rows integer NOT NULL DEFAULT 0,
      imported_rows integer NOT NULL DEFAULT 0,
      updated_rows integer NOT NULL DEFAULT 0,
      skipped_rows integer NOT NULL DEFAULT 0,
      duplicate_rows integer NOT NULL DEFAULT 0,
      headers jsonb NOT NULL DEFAULT '[]'::jsonb,
      suggested_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
      active_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
      error_message text,
      created_by text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS campaign_import_staging (
      id bigserial PRIMARY KEY,
      job_id uuid NOT NULL REFERENCES campaign_import_jobs(id) ON DELETE CASCADE,
      row_number integer NOT NULL,
      raw_data jsonb NOT NULL,
      normalized_data jsonb,
      validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb,
      validation_warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
      validation_status text NOT NULL DEFAULT 'pending',
      duplicate_of bigint,
      import_action text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS campaign_import_staging_job_idx
    ON campaign_import_staging (job_id, row_number)
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS campaign_constituents (
      id bigserial PRIMARY KEY,
      first_name text,
      last_name text,
      full_name text,
      phone text,
      email text,
      ward text,
      constituency text,
      county text,
      national_id text,
      dob date,
      gender text,
      village text,
      polling_station text,
      tribe text,
      education text,
      source_reference text,
      source_file text,
      source_job_id uuid,
      import_row_number integer,
      status text NOT NULL DEFAULT 'active',
      sms_consent boolean NOT NULL DEFAULT false,
      whatsapp_consent boolean NOT NULL DEFAULT false,
      email_consent boolean NOT NULL DEFAULT false,
      support_level text,
      tags jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS campaign_constituents_national_id_unique
    ON campaign_constituents (national_id)
    WHERE national_id IS NOT NULL AND national_id <> ''
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS campaign_constituents_phone_idx
    ON campaign_constituents (phone)
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS campaign_constituents_geography_idx
    ON campaign_constituents (county, constituency, ward)
  `);
}

export async function createImportJob(input: {
  fileName: string;
  fileType: string;
  sheetName: string;
  headerRow: number;
  headers: string[];
  rows: Record<string, unknown>[];
  createdBy?: string;
}) {
  await ensureImportTables();

  const id = randomUUID();
  const mapping = suggestMapping(input.headers);

  await db.execute(sql`
    INSERT INTO campaign_import_jobs (
      id, file_name, file_type, sheet_name, header_row, status,
      total_rows, headers, suggested_mapping, active_mapping, created_by
    )
    VALUES (
      ${id}, ${input.fileName}, ${input.fileType}, ${input.sheetName},
      ${input.headerRow}, 'detected', ${input.rows.length},
      ${JSON.stringify(input.headers)}::jsonb,
      ${JSON.stringify(mapping)}::jsonb,
      ${JSON.stringify(mapping)}::jsonb,
      ${input.createdBy ?? "Data Management Centre"}
    )
  `);

  for (let offset = 0; offset < input.rows.length; offset += 500) {
    const chunk = input.rows.slice(offset, offset + 500).map((raw, index) => ({
      row_number: offset + index + input.headerRow + 1,
      raw_data: raw,
    }));

    await db.execute(sql`
      INSERT INTO campaign_import_staging (job_id, row_number, raw_data)
      SELECT
        ${id}::uuid,
        item.row_number,
        item.raw_data
      FROM jsonb_to_recordset(${JSON.stringify(chunk)}::jsonb)
        AS item(row_number integer, raw_data jsonb)
    `);
  }

  return getImportJob(id);
}

export async function getImportJob(id: string) {
  await ensureImportTables();
  const result = await db.execute(sql`
    SELECT *
    FROM campaign_import_jobs
    WHERE id = ${id}::uuid
    LIMIT 1
  `);
  return (result as any).rows?.[0] ?? null;
}

export async function listImportJobs(limit = 25) {
  await ensureImportTables();
  const result = await db.execute(sql`
    SELECT *
    FROM campaign_import_jobs
    ORDER BY created_at DESC
    LIMIT ${Math.min(Math.max(limit, 1), 100)}
  `);
  return (result as any).rows ?? [];
}

export async function mapImportJob(id: string, mapping: ColumnMapping) {
  await ensureImportTables();

  const rows = await db.execute(sql`
    SELECT id, raw_data
    FROM campaign_import_staging
    WHERE job_id = ${id}::uuid
    ORDER BY row_number
  `);

  const items = ((rows as any).rows ?? []).map((row: any) => ({
    id: row.id,
    normalized_data: normalizeRecord(row.raw_data, mapping),
  }));

  for (let offset = 0; offset < items.length; offset += 500) {
    const chunk = items.slice(offset, offset + 500);
    await db.execute(sql`
      UPDATE campaign_import_staging AS staging
      SET
        normalized_data = item.normalized_data,
        validation_status = 'mapped'
      FROM jsonb_to_recordset(${JSON.stringify(chunk)}::jsonb)
        AS item(id bigint, normalized_data jsonb)
      WHERE staging.id = item.id
    `);
  }

  await db.execute(sql`
    UPDATE campaign_import_jobs
    SET
      active_mapping = ${JSON.stringify(mapping)}::jsonb,
      mapped_rows = total_rows,
      status = 'mapped',
      updated_at = now()
    WHERE id = ${id}::uuid
  `);

  return getImportJob(id);
}

export async function validateImportJob(id: string) {
  await ensureImportTables();

  const result = await db.execute(sql`
    SELECT id, normalized_data
    FROM campaign_import_staging
    WHERE job_id = ${id}::uuid
    ORDER BY row_number
  `);

  const seenPhone = new Map<string, number>();
  const seenId = new Map<string, number>();
  const updates: any[] = [];

  for (const row of (result as any).rows ?? []) {
    const normalized = row.normalized_data ?? {};
    const validation = validateNormalizedRecord(normalized);
    let duplicateOf: number | null = null;

    const nationalId = String(normalized.national_id ?? "");
    const phone = String(normalized.phone ?? "");

    if (nationalId) {
      if (seenId.has(nationalId)) duplicateOf = seenId.get(nationalId) ?? null;
      else seenId.set(nationalId, Number(row.id));
    }

    if (!duplicateOf && phone) {
      if (seenPhone.has(phone)) duplicateOf = seenPhone.get(phone) ?? null;
      else seenPhone.set(phone, Number(row.id));
    }

    if (duplicateOf) validation.warnings.push("DUPLICATE_IN_FILE");

    const status = validation.errors.length
      ? "invalid"
      : validation.warnings.length
        ? "warning"
        : "valid";

    updates.push({
      id: row.id,
      validation_errors: validation.errors,
      validation_warnings: validation.warnings,
      validation_status: status,
      duplicate_of: duplicateOf,
    });
  }

  for (let offset = 0; offset < updates.length; offset += 500) {
    const chunk = updates.slice(offset, offset + 500);
    await db.execute(sql`
      UPDATE campaign_import_staging AS staging
      SET
        validation_errors = item.validation_errors,
        validation_warnings = item.validation_warnings,
        validation_status = item.validation_status,
        duplicate_of = item.duplicate_of
      FROM jsonb_to_recordset(${JSON.stringify(chunk)}::jsonb)
        AS item(
          id bigint,
          validation_errors jsonb,
          validation_warnings jsonb,
          validation_status text,
          duplicate_of bigint
        )
      WHERE staging.id = item.id
    `);
  }

  await db.execute(sql`
    UPDATE campaign_import_jobs
    SET
      valid_rows = counts.valid_rows,
      invalid_rows = counts.invalid_rows,
      warning_rows = counts.warning_rows,
      duplicate_rows = counts.duplicate_rows,
      status = 'validated',
      updated_at = now()
    FROM (
      SELECT
        count(*) FILTER (WHERE validation_status = 'valid')::integer AS valid_rows,
        count(*) FILTER (WHERE validation_status = 'invalid')::integer AS invalid_rows,
        count(*) FILTER (WHERE validation_status = 'warning')::integer AS warning_rows,
        count(*) FILTER (WHERE duplicate_of IS NOT NULL)::integer AS duplicate_rows
      FROM campaign_import_staging
      WHERE job_id = ${id}::uuid
    ) AS counts
    WHERE campaign_import_jobs.id = ${id}::uuid
  `);

  return getImportJob(id);
}

export async function previewImportJob(
  id: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: string;
  },
) {
  await ensureImportTables();
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 500);
  const offset = Math.max(options?.offset ?? 0, 0);
  const status = options?.status;

  const result = status
    ? await db.execute(sql`
        SELECT *
        FROM campaign_import_staging
        WHERE job_id = ${id}::uuid
          AND validation_status = ${status}
        ORDER BY row_number
        LIMIT ${limit} OFFSET ${offset}
      `)
    : await db.execute(sql`
        SELECT *
        FROM campaign_import_staging
        WHERE job_id = ${id}::uuid
        ORDER BY row_number
        LIMIT ${limit} OFFSET ${offset}
      `);

  return (result as any).rows ?? [];
}

export async function startImportJob(
  id: string,
  options?: {
    duplicatePolicy?: "skip" | "update";
    importWarnings?: boolean;
  },
) {
  await ensureImportTables();

  const job = await getImportJob(id);
  if (!job) throw new Error("Import job not found");
  if (!["validated", "completed", "failed"].includes(job.status)) {
    throw new Error("Validate the import before starting it.");
  }

  const duplicatePolicy = options?.duplicatePolicy ?? "update";
  const includeWarnings = options?.importWarnings ?? true;

  await db.execute(sql`
    UPDATE campaign_import_jobs
    SET status = 'importing', updated_at = now(), error_message = null
    WHERE id = ${id}::uuid
  `);

  try {
    const staging = await db.execute(sql`
      SELECT id, row_number, normalized_data, validation_status, duplicate_of
      FROM campaign_import_staging
      WHERE job_id = ${id}::uuid
        AND validation_status IN (
          'valid'
          ${includeWarnings ? sql`, 'warning'` : sql``}
        )
      ORDER BY row_number
    `);

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of (staging as any).rows ?? []) {
      if (row.duplicate_of) {
        await db.execute(sql`
          UPDATE campaign_import_staging
          SET import_action = 'skipped_file_duplicate'
          WHERE id = ${row.id}
        `);
        skipped += 1;
        continue;
      }

      const data = row.normalized_data ?? {};
      const nationalId = data.national_id || null;
      const phone = data.phone || null;

      const existing = await db.execute(sql`
        SELECT id
        FROM campaign_constituents
        WHERE
          (${nationalId}::text IS NOT NULL AND national_id = ${nationalId})
          OR (
            ${nationalId}::text IS NULL
            AND ${phone}::text IS NOT NULL
            AND phone = ${phone}
          )
        LIMIT 1
      `);

      const existingId = (existing as any).rows?.[0]?.id;

      if (existingId && duplicatePolicy === "skip") {
        await db.execute(sql`
          UPDATE campaign_import_staging
          SET import_action = 'skipped_existing'
          WHERE id = ${row.id}
        `);
        skipped += 1;
        continue;
      }

      if (existingId) {
        await db.execute(sql`
          UPDATE campaign_constituents
          SET
            first_name = COALESCE(${data.first_name ?? null}, first_name),
            last_name = COALESCE(${data.last_name ?? null}, last_name),
            full_name = COALESCE(${data.full_name ?? null}, full_name),
            phone = COALESCE(${phone}, phone),
            email = COALESCE(${data.email ?? null}, email),
            ward = COALESCE(${data.ward ?? null}, ward),
            constituency = COALESCE(${data.constituency ?? null}, constituency),
            county = COALESCE(${data.county ?? null}, county),
            national_id = COALESCE(${nationalId}, national_id),
            dob = COALESCE(${data.dob ?? null}::date, dob),
            gender = COALESCE(${data.gender ?? null}, gender),
            village = COALESCE(${data.village ?? null}, village),
            polling_station = COALESCE(${data.polling_station ?? null}, polling_station),
            tribe = COALESCE(${data.tribe ?? null}, tribe),
            education = COALESCE(${data.education ?? null}, education),
            source_reference = COALESCE(${data.source_reference ?? null}, source_reference),
            source_file = ${job.file_name},
            source_job_id = ${id}::uuid,
            import_row_number = ${row.row_number},
            updated_at = now()
          WHERE id = ${existingId}
        `);

        await db.execute(sql`
          UPDATE campaign_import_staging
          SET import_action = 'updated'
          WHERE id = ${row.id}
        `);
        updated += 1;
      } else {
        await db.execute(sql`
          INSERT INTO campaign_constituents (
            first_name, last_name, full_name, phone, email, ward,
            constituency, county, national_id, dob, gender, village,
            polling_station, tribe, education, source_reference,
            source_file, source_job_id, import_row_number
          )
          VALUES (
            ${data.first_name ?? null},
            ${data.last_name ?? null},
            ${data.full_name ?? null},
            ${phone},
            ${data.email ?? null},
            ${data.ward ?? null},
            ${data.constituency ?? null},
            ${data.county ?? null},
            ${nationalId},
            ${data.dob ?? null}::date,
            ${data.gender ?? null},
            ${data.village ?? null},
            ${data.polling_station ?? null},
            ${data.tribe ?? null},
            ${data.education ?? null},
            ${data.source_reference ?? null},
            ${job.file_name},
            ${id}::uuid,
            ${row.row_number}
          )
        `);

        await db.execute(sql`
          UPDATE campaign_import_staging
          SET import_action = 'imported'
          WHERE id = ${row.id}
        `);
        imported += 1;
      }
    }

    await db.execute(sql`
      UPDATE campaign_import_jobs
      SET
        status = 'completed',
        imported_rows = ${imported},
        updated_rows = ${updated},
        skipped_rows = ${skipped},
        completed_at = now(),
        updated_at = now()
      WHERE id = ${id}::uuid
    `);

    return getImportJob(id);
  } catch (error) {
    await db.execute(sql`
      UPDATE campaign_import_jobs
      SET
        status = 'failed',
        error_message = ${
          error instanceof Error ? error.message : "Unknown import error"
        },
        updated_at = now()
      WHERE id = ${id}::uuid
    `);
    throw error;
  }
}

export async function importReport(id: string) {
  const job = await getImportJob(id);
  if (!job) return null;

  const issueResult = await db.execute(sql`
    SELECT
      validation_status,
      validation_errors,
      validation_warnings,
      count(*)::integer AS rows
    FROM campaign_import_staging
    WHERE job_id = ${id}::uuid
    GROUP BY validation_status, validation_errors, validation_warnings
    ORDER BY rows DESC
  `);

  return {
    job,
    issues: (issueResult as any).rows ?? [],
  };
}

export async function importHealth() {
  await ensureImportTables();
  const result = await db.execute(sql`
    SELECT
      (SELECT count(*)::integer FROM campaign_import_jobs) AS jobs,
      (SELECT count(*)::integer FROM campaign_constituents) AS constituents
  `);

  return {
    status: "ok",
    engine: "phase8a-enterprise-import",
    supportedFiles: ["csv", "xlsx", "xls"],
    maxUploadMb: 120,
    ...(result as any).rows?.[0],
  };
}
