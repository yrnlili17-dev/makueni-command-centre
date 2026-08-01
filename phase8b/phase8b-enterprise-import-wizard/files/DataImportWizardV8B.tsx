import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Database,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Search,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type CanonicalField =
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

type MappingValue = CanonicalField | "ignore";

type ImportJob = {
  id: string;
  file_name: string;
  file_type: string;
  sheet_name?: string | null;
  header_row?: number | null;
  status: string;
  total_rows: number;
  mapped_rows: number;
  valid_rows: number;
  invalid_rows: number;
  warning_rows: number;
  imported_rows: number;
  updated_rows: number;
  skipped_rows: number;
  duplicate_rows: number;
  headers: string[];
  suggested_mapping: Record<string, MappingValue>;
  active_mapping: Record<string, MappingValue>;
  error_message?: string | null;
  created_at?: string;
  completed_at?: string | null;
};

type StagingRow = {
  id: string;
  row_number: number;
  raw_data: Record<string, unknown>;
  normalized_data?: Record<string, unknown> | null;
  validation_errors: string[];
  validation_warnings: string[];
  validation_status: string;
  duplicate_of?: string | null;
  import_action?: string | null;
};

type Health = {
  status: string;
  engine: string;
  supportedFiles: string[];
  maxUploadMb: number;
  jobs: number;
  constituents: number;
};

const FIELD_LABELS: Record<MappingValue, string> = {
  ignore: "Ignore column",
  first_name: "First name",
  last_name: "Last name",
  full_name: "Full name",
  phone: "Phone",
  email: "Email",
  ward: "Ward",
  constituency: "Constituency",
  county: "County",
  national_id: "National ID",
  dob: "Date of birth",
  gender: "Gender",
  village: "Village",
  polling_station: "Polling station",
  tribe: "Tribe",
  education: "Education",
  source_reference: "Source reference",
};

const CANONICAL_FIELDS = Object.keys(FIELD_LABELS) as MappingValue[];

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      ...(options?.body instanceof ArrayBuffer
        ? {}
        : { "Content-Type": "application/json" }),
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error ?? `Request failed (${response.status})`);
  }

  return data as T;
}

function formatNumber(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-KE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function statusClass(status: string) {
  if (status === "completed") return "border-green-400/40 text-green-400";
  if (status === "failed") return "border-red-400/40 text-red-400";
  if (status === "validated") return "border-blue-400/40 text-blue-400";
  if (status === "mapped") return "border-yellow-400/40 text-yellow-400";
  return "border-border text-muted-foreground";
}

export default function DataImportWizardV8B() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [health, setHealth] = useState<Health | null>(null);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [activeJob, setActiveJob] = useState<ImportJob | null>(null);
  const [mapping, setMapping] = useState<Record<string, MappingValue>>({});
  const [preview, setPreview] = useState<StagingRow[]>([]);
  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [duplicatePolicy, setDuplicatePolicy] = useState<"update" | "skip">("update");
  const [importWarnings, setImportWarnings] = useState(true);
  const [previewFilter, setPreviewFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const loadOverview = useCallback(async () => {
    try {
      const [healthData, jobData] = await Promise.all([
        requestJson<Health>("/api/data-import/health"),
        requestJson<ImportJob[]>("/api/data-import/jobs"),
      ]);
      setHealth(healthData);
      setJobs(jobData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load import centre");
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const loadPreview = useCallback(
    async (jobId: string, status = previewFilter) => {
      const query = new URLSearchParams({ limit: "100" });
      if (status !== "all") query.set("status", status);

      const rows = await requestJson<StagingRow[]>(
        `/api/data-import/jobs/${jobId}/preview?${query.toString()}`,
      );
      setPreview(rows);
    },
    [previewFilter],
  );

  async function uploadFile(file: File) {
    const allowed = [".csv", ".xlsx", ".xls"];
    const lower = file.name.toLowerCase();

    if (!allowed.some((extension) => lower.endsWith(extension))) {
      setError("Upload a CSV, XLSX or XLS file.");
      return;
    }

    setBusy(true);
    setError(null);
    setSelectedFile(file);

    try {
      const buffer = await file.arrayBuffer();
      const contentType = lower.endsWith(".csv")
        ? "text/csv"
        : lower.endsWith(".xls")
          ? "application/vnd.ms-excel"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

      const result = await requestJson<{
        fileName: string;
        fileType: string;
        jobs: ImportJob[];
      }>("/api/data-import/upload", {
        method: "POST",
        headers: {
          "Content-Type": contentType,
          "x-file-name": file.name,
          "x-created-by": "Data Management Centre",
        },
        body: buffer,
      });

      const job = result.jobs[0];
      if (!job) throw new Error("No non-empty worksheet was detected.");

      setActiveJob(job);
      setMapping(job.suggested_mapping ?? {});
      setStep(2);
      await loadOverview();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function applyMapping() {
    if (!activeJob) return;
    setBusy(true);
    setError(null);

    try {
      const updated = await requestJson<ImportJob>(
        `/api/data-import/jobs/${activeJob.id}/map`,
        {
          method: "PUT",
          body: JSON.stringify({ mapping }),
        },
      );

      setActiveJob(updated);
      setStep(4);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Column mapping failed");
    } finally {
      setBusy(false);
    }
  }

  async function validateJob() {
    if (!activeJob) return;
    setBusy(true);
    setError(null);

    try {
      const updated = await requestJson<ImportJob>(
        `/api/data-import/jobs/${activeJob.id}/validate`,
        {
          method: "POST",
          body: "{}",
        },
      );

      setActiveJob(updated);
      await loadPreview(updated.id, "all");
      setStep(5);
      await loadOverview();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Validation failed");
    } finally {
      setBusy(false);
    }
  }

  async function importJob() {
    if (!activeJob) return;
    setBusy(true);
    setError(null);

    try {
      const updated = await requestJson<ImportJob>(
        `/api/data-import/jobs/${activeJob.id}/start`,
        {
          method: "POST",
          body: JSON.stringify({
            duplicatePolicy,
            importWarnings,
          }),
        },
      );

      setActiveJob(updated);
      setStep(6);
      await loadOverview();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function openExistingJob(job: ImportJob) {
    setBusy(true);
    setError(null);

    try {
      const full = await requestJson<ImportJob>(
        `/api/data-import/jobs/${job.id}`,
      );

      setActiveJob(full);
      setMapping(full.active_mapping ?? full.suggested_mapping ?? {});
      setSelectedFile(null);

      if (full.status === "completed") {
        setStep(6);
      } else if (full.status === "validated") {
        await loadPreview(full.id, "all");
        setStep(5);
      } else if (full.status === "mapped") {
        setStep(4);
      } else {
        setStep(3);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to open import job");
    } finally {
      setBusy(false);
    }
  }

  const filteredPreview = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return preview;

    return preview.filter((row) =>
      JSON.stringify(row.normalized_data ?? row.raw_data)
        .toLowerCase()
        .includes(query),
    );
  }, [preview, search]);

  const previewHeaders = useMemo(() => {
    const set = new Set<string>();
    for (const row of filteredPreview.slice(0, 20)) {
      const data = row.normalized_data ?? row.raw_data;
      Object.keys(data).forEach((key) => set.add(key));
    }
    return Array.from(set).slice(0, 10);
  }, [filteredPreview]);

  const steps = [
    ["1", "UPLOAD"],
    ["2", "DETECT"],
    ["3", "MAP"],
    ["4", "VALIDATE"],
    ["5", "PREVIEW"],
    ["6", "IMPORT"],
  ];

  function resetWizard() {
    setActiveJob(null);
    setSelectedFile(null);
    setMapping({});
    setPreview([]);
    setStep(1);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <section className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">
            PHASE 8B CAMPAIGN DATA INTELLIGENCE
          </p>
          <h1 className="mt-1 text-xl font-semibold">Enterprise Import Centre</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload, map, validate, preview and import campaign constituent data.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="border border-green-400/30 px-3 py-2 font-mono text-[9px] text-green-400">
            ENGINE {health?.status?.toUpperCase() ?? "UNKNOWN"}
          </span>
          <span className="border border-border px-3 py-2 font-mono text-[9px]">
            {formatNumber(health?.constituents)} CONSTITUENTS
          </span>
          <button
            onClick={() => void loadOverview()}
            className="flex items-center gap-1 border border-border px-3 py-2 font-mono text-[9px]"
          >
            <RefreshCw className="h-3 w-3" />
            REFRESH
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 border border-border bg-card p-3 sm:grid-cols-3 lg:grid-cols-6">
        {steps.map(([number, label], index) => {
          const active = step === index + 1;
          const complete = step > index + 1;

          return (
            <div
              key={label}
              className={`border px-3 py-3 ${
                active
                  ? "border-primary bg-primary/5"
                  : complete
                    ? "border-green-400/30"
                    : "border-border"
              }`}
            >
              <p className={`font-mono text-[9px] ${active ? "text-primary" : "text-muted-foreground"}`}>
                {number}
              </p>
              <p className="mt-1 font-mono text-[10px]">{label}</p>
            </div>
          );
        })}
      </section>

      {error && (
        <div className="border border-red-400/30 bg-red-400/10 p-3 font-mono text-xs text-red-400">
          {error}
        </div>
      )}

      {step === 1 && (
        <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files?.[0];
              if (file) void uploadFile(file);
            }}
            className={`flex min-h-[420px] flex-col items-center justify-center border border-dashed p-6 text-center ${
              dragging ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
          >
            {busy ? (
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            ) : (
              <UploadCloud className="h-10 w-10 text-primary" />
            )}

            <h2 className="mt-4 text-lg font-semibold">
              Drop a campaign data file here
            </h2>
            <p className="mt-2 max-w-md text-xs text-muted-foreground">
              Supported formats: CSV, XLSX and XLS. Files are detected,
              staged and validated before any constituent is imported.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadFile(file);
              }}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="mt-5 bg-primary px-5 py-2.5 font-mono text-[10px] text-primary-foreground disabled:opacity-50"
            >
              SELECT DATA FILE
            </button>

            <p className="mt-4 font-mono text-[9px] text-muted-foreground">
              MAXIMUM SIZE: {health?.maxUploadMb ?? 120} MB
            </p>
          </div>

          <aside className="border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[10px] tracking-widest">
                RECENT IMPORTS
              </p>
              <Database className="h-4 w-4 text-primary" />
            </div>

            <div className="space-y-2">
              {jobs.slice(0, 8).map((job) => (
                <button
                  key={job.id}
                  onClick={() => void openExistingJob(job)}
                  className="w-full border border-border p-3 text-left hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs">{job.file_name}</span>
                    <span className={`border px-2 py-1 font-mono text-[8px] ${statusClass(job.status)}`}>
                      {job.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-[8px] text-muted-foreground">
                    <span>{formatNumber(job.total_rows)} ROWS</span>
                    <span>{formatDate(job.created_at)}</span>
                  </div>
                </button>
              ))}

              {jobs.length === 0 && (
                <p className="py-10 text-center font-mono text-[10px] text-muted-foreground">
                  [ NO_IMPORT_HISTORY ]
                </p>
              )}
            </div>
          </aside>
        </section>
      )}

      {step === 2 && activeJob && (
        <section className="border border-border bg-card p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest text-primary">
                FILE DETECTED
              </p>
              <h2 className="mt-1 text-lg font-semibold">{activeJob.file_name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Sheet: {activeJob.sheet_name ?? "CSV"} · Header row:{" "}
                {activeJob.header_row ?? 1}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["TYPE", activeJob.file_type.toUpperCase()],
                ["ROWS", formatNumber(activeJob.total_rows)],
                ["COLUMNS", String(activeJob.headers.length)],
                ["SHEET", activeJob.sheet_name ?? "CSV"],
              ].map(([label, value]) => (
                <div key={label} className="border border-border p-3">
                  <p className="font-mono text-[8px] text-muted-foreground">{label}</p>
                  <p className="mt-1 truncate font-mono text-[10px]">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {activeJob.headers.map((header) => (
              <div key={header} className="border border-border bg-secondary/20 p-3">
                <p className="truncate font-mono text-[10px]">{header}</p>
                <p className="mt-1 text-[9px] text-muted-foreground">
                  Suggested: {FIELD_LABELS[activeJob.suggested_mapping?.[header] ?? "ignore"]}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-between">
            <button
              onClick={resetWizard}
              className="flex items-center gap-1 border border-border px-4 py-2 font-mono text-[10px]"
            >
              <ArrowLeft className="h-3 w-3" />
              NEW FILE
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-1 bg-primary px-4 py-2 font-mono text-[10px] text-primary-foreground"
            >
              REVIEW MAPPING
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </section>
      )}

      {step === 3 && activeJob && (
        <section className="border border-border bg-card p-4">
          <p className="font-mono text-[10px] tracking-widest text-primary">
            COLUMN MAPPING
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Confirm where each spreadsheet column belongs in the campaign database.
          </p>

          <div className="mt-4 overflow-x-auto border border-border">
            <table className="w-full min-w-[680px]">
              <thead className="border-b border-border bg-secondary/40">
                <tr className="font-mono text-[9px] text-muted-foreground">
                  <th className="px-4 py-3 text-left">SOURCE COLUMN</th>
                  <th className="px-4 py-3 text-left">CAMPAIGN FIELD</th>
                  <th className="px-4 py-3 text-left">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {activeJob.headers.map((header) => {
                  const value = mapping[header] ?? "ignore";
                  return (
                    <tr key={header} className="border-b border-border">
                      <td className="px-4 py-3 font-mono text-xs">{header}</td>
                      <td className="px-4 py-3">
                        <select
                          value={value}
                          onChange={(event) =>
                            setMapping((current) => ({
                              ...current,
                              [header]: event.target.value as MappingValue,
                            }))
                          }
                          className="w-full border border-border bg-secondary px-3 py-2 text-xs"
                        >
                          {CANONICAL_FIELDS.map((field) => (
                            <option key={field} value={field}>
                              {FIELD_LABELS[field]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-[9px] ${value === "ignore" ? "text-muted-foreground" : "text-green-400"}`}>
                          {value === "ignore" ? "IGNORED" : "MAPPED"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1 border border-border px-4 py-2 font-mono text-[10px]"
            >
              <ArrowLeft className="h-3 w-3" />
              BACK
            </button>
            <button
              onClick={() => void applyMapping()}
              disabled={busy}
              className="flex items-center gap-1 bg-primary px-4 py-2 font-mono text-[10px] text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
              APPLY MAPPING
            </button>
          </div>
        </section>
      )}

      {step === 4 && activeJob && (
        <section className="border border-border bg-card p-4">
          <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
            {busy ? (
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            ) : (
              <AlertTriangle className="h-10 w-10 text-yellow-400" />
            )}

            <h2 className="mt-4 text-lg font-semibold">Validate staged records</h2>
            <p className="mt-2 max-w-xl text-xs text-muted-foreground">
              The engine will check names, Kenyan phone formats, National IDs,
              geography fields, dates and duplicates before import.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["ROWS", activeJob.total_rows],
                ["MAPPED", activeJob.mapped_rows],
                ["FILE", activeJob.file_type.toUpperCase()],
                ["SHEET", activeJob.sheet_name ?? "CSV"],
              ].map(([label, value]) => (
                <div key={String(label)} className="border border-border px-5 py-3">
                  <p className="font-mono text-[8px] text-muted-foreground">{label}</p>
                  <p className="mt-1 font-mono text-sm">{value}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => void validateJob()}
              disabled={busy}
              className="mt-6 bg-primary px-5 py-2.5 font-mono text-[10px] text-primary-foreground disabled:opacity-50"
            >
              RUN VALIDATION
            </button>
          </div>
        </section>
      )}

      {step === 5 && activeJob && (
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["TOTAL", activeJob.total_rows, FileSpreadsheet, "text-foreground"],
              ["VALID", activeJob.valid_rows, CheckCircle, "text-green-400"],
              ["WARNINGS", activeJob.warning_rows, AlertTriangle, "text-yellow-400"],
              ["INVALID", activeJob.invalid_rows, XCircle, "text-red-400"],
              ["DUPLICATES", activeJob.duplicate_rows, Database, "text-orange-400"],
            ].map(([label, value, Icon, color]) => (
              <div key={String(label)} className="border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[9px] text-muted-foreground">{label}</p>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <p className="mt-3 font-mono text-xl">{formatNumber(Number(value))}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 border border-border bg-card p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {["all", "valid", "warning", "invalid"].map((status) => (
                <button
                  key={status}
                  onClick={async () => {
                    setPreviewFilter(status);
                    await loadPreview(activeJob.id, status);
                  }}
                  className={`border px-3 py-2 font-mono text-[9px] ${
                    previewFilter === status
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {status.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3 w-3 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search preview"
                className="border border-border bg-secondary py-2 pl-9 pr-3 text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-border bg-card">
            <table className="w-full min-w-[1000px]">
              <thead className="border-b border-border bg-secondary/40">
                <tr className="font-mono text-[8px] text-muted-foreground">
                  <th className="px-3 py-3 text-left">ROW</th>
                  <th className="px-3 py-3 text-left">STATUS</th>
                  {previewHeaders.map((header) => (
                    <th key={header} className="px-3 py-3 text-left">
                      {header.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPreview.map((row) => {
                  const data = row.normalized_data ?? row.raw_data;
                  return (
                    <tr key={row.id} className="border-b border-border text-xs">
                      <td className="px-3 py-3 font-mono">{row.row_number}</td>
                      <td className="px-3 py-3">
                        <span className={`font-mono text-[8px] ${
                          row.validation_status === "valid"
                            ? "text-green-400"
                            : row.validation_status === "warning"
                              ? "text-yellow-400"
                              : "text-red-400"
                        }`}>
                          {row.validation_status.toUpperCase()}
                        </span>
                      </td>
                      {previewHeaders.map((header) => (
                        <td key={header} className="max-w-[180px] truncate px-3 py-3">
                          {String(data[header] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredPreview.length === 0 && (
              <p className="py-12 text-center font-mono text-xs text-muted-foreground">
                [ NO_ROWS_FOR_SELECTED_FILTER ]
              </p>
            )}
          </div>

          <section className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs">
                <span className="mb-1 block font-mono text-[9px] text-muted-foreground">
                  EXISTING RECORD POLICY
                </span>
                <select
                  value={duplicatePolicy}
                  onChange={(event) =>
                    setDuplicatePolicy(event.target.value as "update" | "skip")
                  }
                  className="w-full border border-border bg-secondary px-3 py-2"
                >
                  <option value="update">Update existing records</option>
                  <option value="skip">Skip existing records</option>
                </select>
              </label>

              <label className="flex items-center gap-2 border border-border px-3 py-2 text-xs">
                <input
                  type="checkbox"
                  checked={importWarnings}
                  onChange={(event) => setImportWarnings(event.target.checked)}
                />
                Import warning rows
              </label>
            </div>

            <button
              onClick={() => void importJob()}
              disabled={busy}
              className="bg-primary px-5 py-2.5 font-mono text-[10px] text-primary-foreground disabled:opacity-50"
            >
              START IMPORT
            </button>
          </section>
        </section>
      )}

      {step === 6 && activeJob && (
        <section className="border border-border bg-card p-5">
          <div className="flex flex-col items-center py-8 text-center">
            {activeJob.status === "completed" ? (
              <CheckCircle className="h-12 w-12 text-green-400" />
            ) : activeJob.status === "failed" ? (
              <XCircle className="h-12 w-12 text-red-400" />
            ) : (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}

            <h2 className="mt-4 text-xl font-semibold">
              {activeJob.status === "completed"
                ? "Import completed"
                : activeJob.status === "failed"
                  ? "Import failed"
                  : "Import in progress"}
            </h2>

            <p className="mt-2 text-xs text-muted-foreground">
              {activeJob.file_name} · {formatDate(activeJob.completed_at)}
            </p>

            <div className="mt-6 grid w-full max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["READ", activeJob.total_rows],
                ["IMPORTED", activeJob.imported_rows],
                ["UPDATED", activeJob.updated_rows],
                ["SKIPPED", activeJob.skipped_rows],
                ["DUPLICATES", activeJob.duplicate_rows],
              ].map(([label, value]) => (
                <div key={String(label)} className="border border-border p-4">
                  <p className="font-mono text-[8px] text-muted-foreground">{label}</p>
                  <p className="mt-2 font-mono text-xl">{formatNumber(Number(value))}</p>
                </div>
              ))}
            </div>

            {activeJob.error_message && (
              <div className="mt-4 border border-red-400/30 bg-red-400/10 p-3 text-xs text-red-400">
                {activeJob.error_message}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button
                onClick={resetWizard}
                className="border border-border px-4 py-2 font-mono text-[10px]"
              >
                IMPORT ANOTHER FILE
              </button>
              <button
                onClick={() => void loadOverview()}
                className="bg-primary px-4 py-2 font-mono text-[10px] text-primary-foreground"
              >
                REFRESH TOTALS
              </button>
            </div>
          </div>
        </section>
      )}

      {busy && step !== 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="border border-border bg-card p-6 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 font-mono text-[10px]">PROCESSING DATA...</p>
          </div>
        </div>
      )}
    </div>
  );
}
