import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getImportJob } from "./data-import-engine";

const runningJobs = new Set<string>();

type WorkerOptions = {
  duplicatePolicy?: "skip" | "update";
  importWarnings?: boolean;
  batchSize?: number;
};

function batchSize(value?: number) {
  const parsed = Number(value ?? 1000);
  if (!Number.isFinite(parsed)) return 1000;
  return Math.min(Math.max(Math.trunc(parsed), 100), 5000);
}

async function getJobStatus(id: string): Promise<string | null> {
  const result = await db.execute(sql`
    SELECT status
    FROM campaign_import_jobs
    WHERE id = ${id}::uuid
    LIMIT 1
  `);

  return (result as any).rows?.[0]?.status ?? null;
}

async function markJob(
  id: string,
  status: string,
  errorMessage?: string | null,
) {
  await db.execute(sql`
    UPDATE campaign_import_jobs
    SET
      status = ${status},
      error_message = ${errorMessage ?? null},
      updated_at = now(),
      completed_at = CASE
        WHEN ${status} IN ('completed', 'cancelled', 'failed') THEN now()
        ELSE completed_at
      END
    WHERE id = ${id}::uuid
  `);
}

async function refreshCounters(id: string) {
  await db.execute(sql`
    UPDATE campaign_import_jobs
    SET
      imported_rows = counts.imported_rows,
      updated_rows = counts.updated_rows,
      skipped_rows = counts.skipped_rows,
      updated_at = now()
    FROM (
      SELECT
        count(*) FILTER (WHERE import_action = 'imported')::integer AS imported_rows,
        count(*) FILTER (WHERE import_action = 'updated')::integer AS updated_rows,
        count(*) FILTER (
          WHERE import_action IN (
            'skipped_existing',
            'skipped_file_duplicate'
          )
        )::integer AS skipped_rows
      FROM campaign_import_staging
      WHERE job_id = ${id}::uuid
    ) AS counts
    WHERE campaign_import_jobs.id = ${id}::uuid
  `);
}

async function processBatch(
  id: string,
  options: Required<WorkerOptions>,
): Promise<number> {
  const result = options.importWarnings
    ? await db.execute(sql`
        SELECT
          id,
          row_number,
          normalized_data,
          duplicate_of
        FROM campaign_import_staging
        WHERE job_id = ${id}::uuid
          AND import_action IS NULL
          AND validation_status IN ('valid', 'warning')
        ORDER BY row_number
        LIMIT ${options.batchSize}
      `)
    : await db.execute(sql`
        SELECT
          id,
          row_number,
          normalized_data,
          duplicate_of
        FROM campaign_import_staging
        WHERE job_id = ${id}::uuid
          AND import_action IS NULL
          AND validation_status = 'valid'
        ORDER BY row_number
        LIMIT ${options.batchSize}
      `);

  const rows = (result as any).rows ?? [];
  if (!rows.length) return 0;

  const duplicates = rows.filter((row: any) => row.duplicate_of);
  const candidates = rows.filter((row: any) => !row.duplicate_of);

  if (duplicates.length) {
    const duplicateIds = duplicates.map((row: any) => Number(row.id));

    await db.execute(sql`
      UPDATE campaign_import_staging
      SET import_action = 'skipped_file_duplicate'
      WHERE id IN (
        SELECT value::bigint
        FROM jsonb_array_elements_text(
          ${JSON.stringify(duplicateIds)}::jsonb
        )
      )
    `);
  }

  if (!candidates.length) {
    await refreshCounters(id);
    return rows.length;
  }

  const nationalIds = candidates
    .map((row: any) => String(row.normalized_data?.national_id ?? ""))
    .filter(Boolean);

  const phones = candidates
    .map((row: any) => String(row.normalized_data?.phone ?? ""))
    .filter(Boolean);

  const existingResult = await db.execute(sql`
    SELECT id, national_id, phone
    FROM campaign_constituents
    WHERE
      national_id IN (
        SELECT value
        FROM jsonb_array_elements_text(
          ${JSON.stringify(nationalIds)}::jsonb
        )
      )
      OR phone IN (
        SELECT value
        FROM jsonb_array_elements_text(
          ${JSON.stringify(phones)}::jsonb
        )
      )
  `);

  const existingByNationalId = new Map<string, number>();
  const existingByPhone = new Map<string, number>();

  for (const row of (existingResult as any).rows ?? []) {
    if (row.national_id) {
      existingByNationalId.set(String(row.national_id), Number(row.id));
    }
    if (row.phone) {
      existingByPhone.set(String(row.phone), Number(row.id));
    }
  }

  const updateRows: any[] = [];
  const insertRows: any[] = [];
  const actionRows: any[] = [];

  for (const row of candidates) {
    const data = row.normalized_data ?? {};
    const nationalId = String(data.national_id ?? "");
    const phone = String(data.phone ?? "");

    const existingId =
      (nationalId ? existingByNationalId.get(nationalId) : undefined) ??
      (phone ? existingByPhone.get(phone) : undefined);

    if (existingId && options.duplicatePolicy === "skip") {
      actionRows.push({
        staging_id: Number(row.id),
        action: "skipped_existing",
      });
      continue;
    }

    const common = {
      staging_id: Number(row.id),
      existing_id: existingId ?? null,
      row_number: Number(row.row_number),
      first_name: data.first_name ?? null,
      last_name: data.last_name ?? null,
      full_name: data.full_name ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      ward: data.ward ?? null,
      constituency: data.constituency ?? null,
      county: data.county ?? null,
      national_id: data.national_id ?? null,
      dob: data.dob ?? null,
      gender: data.gender ?? null,
      village: data.village ?? null,
      polling_station: data.polling_station ?? null,
      tribe: data.tribe ?? null,
      education: data.education ?? null,
      source_reference: data.source_reference ?? null,
    };

    if (existingId) {
      updateRows.push(common);
      actionRows.push({
        staging_id: Number(row.id),
        action: "updated",
      });
    } else {
      insertRows.push(common);
      actionRows.push({
        staging_id: Number(row.id),
        action: "imported",
      });
    }
  }

  if (updateRows.length) {
    await db.execute(sql`
      UPDATE campaign_constituents AS target
      SET
        first_name = COALESCE(source.first_name, target.first_name),
        last_name = COALESCE(source.last_name, target.last_name),
        full_name = COALESCE(source.full_name, target.full_name),
        phone = COALESCE(source.phone, target.phone),
        email = COALESCE(source.email, target.email),
        ward = COALESCE(source.ward, target.ward),
        constituency = COALESCE(source.constituency, target.constituency),
        county = COALESCE(source.county, target.county),
        national_id = COALESCE(source.national_id, target.national_id),
        dob = COALESCE(source.dob::date, target.dob),
        gender = COALESCE(source.gender, target.gender),
        village = COALESCE(source.village, target.village),
        polling_station = COALESCE(
          source.polling_station,
          target.polling_station
        ),
        tribe = COALESCE(source.tribe, target.tribe),
        education = COALESCE(source.education, target.education),
        source_reference = COALESCE(
          source.source_reference,
          target.source_reference
        ),
        source_file = job.file_name,
        source_job_id = ${id}::uuid,
        import_row_number = source.row_number,
        updated_at = now()
      FROM jsonb_to_recordset(${JSON.stringify(updateRows)}::jsonb)
        AS source(
          staging_id bigint,
          existing_id bigint,
          row_number integer,
          first_name text,
          last_name text,
          full_name text,
          phone text,
          email text,
          ward text,
          constituency text,
          county text,
          national_id text,
          dob text,
          gender text,
          village text,
          polling_station text,
          tribe text,
          education text,
          source_reference text
        ),
        campaign_import_jobs AS job
      WHERE target.id = source.existing_id
        AND job.id = ${id}::uuid
    `);
  }

  if (insertRows.length) {
    await db.execute(sql`
      INSERT INTO campaign_constituents (
        first_name,
        last_name,
        full_name,
        phone,
        email,
        ward,
        constituency,
        county,
        national_id,
        dob,
        gender,
        village,
        polling_station,
        tribe,
        education,
        source_reference,
        source_file,
        source_job_id,
        import_row_number
      )
      SELECT
        source.first_name,
        source.last_name,
        source.full_name,
        source.phone,
        source.email,
        source.ward,
        source.constituency,
        source.county,
        source.national_id,
        source.dob::date,
        source.gender,
        source.village,
        source.polling_station,
        source.tribe,
        source.education,
        source.source_reference,
        job.file_name,
        ${id}::uuid,
        source.row_number
      FROM jsonb_to_recordset(${JSON.stringify(insertRows)}::jsonb)
        AS source(
          staging_id bigint,
          existing_id bigint,
          row_number integer,
          first_name text,
          last_name text,
          full_name text,
          phone text,
          email text,
          ward text,
          constituency text,
          county text,
          national_id text,
          dob text,
          gender text,
          village text,
          polling_station text,
          tribe text,
          education text,
          source_reference text
        ),
        campaign_import_jobs AS job
      WHERE job.id = ${id}::uuid
      ON CONFLICT DO NOTHING
    `);
  }

  if (actionRows.length) {
    await db.execute(sql`
      UPDATE campaign_import_staging AS staging
      SET import_action = source.action
      FROM jsonb_to_recordset(${JSON.stringify(actionRows)}::jsonb)
        AS source(staging_id bigint, action text)
      WHERE staging.id = source.staging_id
    `);
  }

  await refreshCounters(id);
  return rows.length;
}

export async function runImportWorker(
  id: string,
  supplied?: WorkerOptions,
): Promise<void> {
  if (runningJobs.has(id)) return;

  const options: Required<WorkerOptions> = {
    duplicatePolicy:
      supplied?.duplicatePolicy === "skip" ? "skip" : "update",
    importWarnings: supplied?.importWarnings !== false,
    batchSize: batchSize(supplied?.batchSize),
  };

  const job = await getImportJob(id);
  if (!job) throw new Error("Import job not found");

  if (
    ![
      "validated",
      "queued",
      "paused",
      "failed",
      "importing",
      "completed",
    ].includes(job.status)
  ) {
    throw new Error("Validate the import before starting it.");
  }

  runningJobs.add(id);
  await markJob(id, "importing", null);

  try {
    while (true) {
      const status = await getJobStatus(id);

      if (status === "paused" || status === "cancelled") break;
      if (!status) throw new Error("Import job disappeared");

      const processed = await processBatch(id, options);
      if (processed === 0) {
        await refreshCounters(id);
        await markJob(id, "completed", null);
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  } catch (error) {
    await markJob(
      id,
      "failed",
      error instanceof Error ? error.message : "Unknown worker failure",
    );
    throw error;
  } finally {
    runningJobs.delete(id);
  }
}

export async function queueImportWorker(
  id: string,
  options?: WorkerOptions,
) {
  if (runningJobs.has(id)) {
    return getImportJob(id);
  }

  await markJob(id, "queued", null);

  void runImportWorker(id, options).catch((error) => {
    console.error("Phase 8D import worker failed:", error);
  });

  return getImportJob(id);
}

export async function pauseImportWorker(id: string) {
  const job = await getImportJob(id);
  if (!job) throw new Error("Import job not found");

  if (!["queued", "importing"].includes(job.status)) {
    throw new Error("Only queued or importing jobs can be paused.");
  }

  await markJob(id, "paused", null);
  return getImportJob(id);
}

export async function resumeImportWorker(
  id: string,
  options?: WorkerOptions,
) {
  const job = await getImportJob(id);
  if (!job) throw new Error("Import job not found");

  if (!["paused", "failed", "importing", "validated"].includes(job.status)) {
    throw new Error("This job cannot be resumed.");
  }

  return queueImportWorker(id, options);
}

export async function cancelImportWorker(id: string) {
  const job = await getImportJob(id);
  if (!job) throw new Error("Import job not found");

  await markJob(id, "cancelled", null);
  return getImportJob(id);
}

export function importWorkerState(id: string) {
  return {
    running: runningJobs.has(id),
  };
}
