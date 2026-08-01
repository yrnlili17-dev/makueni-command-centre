import fs from "node:fs";

const file =
  "artifacts/api-server/src/services/data-import-worker.ts";

let text = fs.readFileSync(file, "utf8");

const oldBlock = `  const statuses = options.importWarnings
    ? ["valid", "warning"]
    : ["valid"];

  const result = await db.execute(sql\`
    SELECT
      id,
      row_number,
      normalized_data,
      duplicate_of
    FROM campaign_import_staging
    WHERE job_id = \${id}::uuid
      AND import_action IS NULL
      AND validation_status = ANY(\${statuses}::text[])
    ORDER BY row_number
    LIMIT \${options.batchSize}
  \`);`;

const newBlock = `  const result = options.importWarnings
    ? await db.execute(sql\`
        SELECT
          id,
          row_number,
          normalized_data,
          duplicate_of
        FROM campaign_import_staging
        WHERE job_id = \${id}::uuid
          AND import_action IS NULL
          AND validation_status IN ('valid', 'warning')
        ORDER BY row_number
        LIMIT \${options.batchSize}
      \`)
    : await db.execute(sql\`
        SELECT
          id,
          row_number,
          normalized_data,
          duplicate_of
        FROM campaign_import_staging
        WHERE job_id = \${id}::uuid
          AND import_action IS NULL
          AND validation_status = 'valid'
        ORDER BY row_number
        LIMIT \${options.batchSize}
      \`);`;

if (!text.includes(oldBlock)) {
  console.error("[FAILED] Could not locate the Phase 8D status query.");
  process.exit(1);
}

fs.copyFileSync(file, \`\${file}.before-status-fix\`);
text = text.replace(oldBlock, newBlock);
fs.writeFileSync(file, text);

console.log("[OK] Phase 8D validation-status query fixed.");
console.log(\`Backup: \${file}.before-status-fix\`);
