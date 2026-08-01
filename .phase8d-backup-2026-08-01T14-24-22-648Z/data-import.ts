import express, { Router, type IRouter } from "express";
import {
  createImportJob,
  getImportJob,
  importHealth,
  importReport,
  listImportJobs,
  mapImportJob,
  parseUploadedFile,
  previewImportJob,
  startImportJob,
  validateImportJob,
  type ColumnMapping,
} from "../services/data-import-engine";

const router: IRouter = Router();

const uploadBody = express.raw({
  type: [
    "application/octet-stream",
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  limit: "120mb",
});

router.get("/health", async (_req, res) => {
  res.json(await importHealth());
});

router.get("/jobs", async (req, res) => {
  const limit = Number(req.query.limit ?? 25);
  res.json(await listImportJobs(limit));
});

router.post("/upload", uploadBody, async (req, res) => {
  try {
    const fileName = String(req.header("x-file-name") ?? "").trim();
    const requestedSheet =
      String(req.header("x-sheet-name") ?? "").trim() || undefined;
    const createdBy =
      String(req.header("x-created-by") ?? "").trim() ||
      "Data Management Centre";

    if (!fileName) {
      res.status(400).json({
        error: "x-file-name header is required",
      });
      return;
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Upload body is empty" });
      return;
    }

    const parsed = parseUploadedFile(req.body, fileName, requestedSheet);

    if (!parsed.sheets.length) {
      res.status(400).json({
        error: "No readable worksheets were found",
      });
      return;
    }

    const jobs = [];

    for (const sheet of parsed.sheets) {
      if (!sheet.rows.length) continue;

      jobs.push(
        await createImportJob({
          fileName,
          fileType: parsed.fileType,
          sheetName: sheet.sheetName,
          headerRow: sheet.headerRow,
          headers: sheet.headers,
          rows: sheet.rows,
          createdBy,
        }),
      );
    }

    res.status(201).json({
      fileName,
      fileType: parsed.fileType,
      jobs,
    });
  } catch (error) {
    req.log?.error?.({ error }, "data import upload failed");
    res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to process uploaded file",
    });
  }
});

router.get("/jobs/:id", async (req, res) => {
  const job = await getImportJob(String(req.params.id));
  if (!job) {
    res.status(404).json({ error: "Import job not found" });
    return;
  }
  res.json(job);
});

router.put("/jobs/:id/map", async (req, res) => {
  const mapping = req.body?.mapping as ColumnMapping | undefined;

  if (!mapping || typeof mapping !== "object") {
    res.status(400).json({ error: "mapping object is required" });
    return;
  }

  res.json(await mapImportJob(String(req.params.id), mapping));
});

router.post("/jobs/:id/validate", async (req, res) => {
  res.json(await validateImportJob(String(req.params.id)));
});

router.get("/jobs/:id/preview", async (req, res) => {
  res.json(
    await previewImportJob(String(req.params.id), {
      limit: Number(req.query.limit ?? 100),
      offset: Number(req.query.offset ?? 0),
      status: req.query.status
        ? String(req.query.status)
        : undefined,
    }),
  );
});

router.post("/jobs/:id/start", async (req, res) => {
  try {
    res.json(
      await startImportJob(String(req.params.id), {
        duplicatePolicy:
          req.body?.duplicatePolicy === "skip" ? "skip" : "update",
        importWarnings: req.body?.importWarnings !== false,
      }),
    );
  } catch (error) {
    res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to start import",
    });
  }
});

router.get("/jobs/:id/status", async (req, res) => {
  const job = await getImportJob(String(req.params.id));
  if (!job) {
    res.status(404).json({ error: "Import job not found" });
    return;
  }
  res.json(job);
});

router.get("/jobs/:id/report", async (req, res) => {
  const report = await importReport(String(req.params.id));
  if (!report) {
    res.status(404).json({ error: "Import job not found" });
    return;
  }
  res.json(report);
});

export default router;
