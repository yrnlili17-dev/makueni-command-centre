import {
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FilePlus2,
  FileWarning,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

type FormRecord = Record<string, any>;
type StationRecord = Record<string, any>;

function stationCodeOf(row: any) {
  return String(row?.code ?? row?.stationCode ?? row?.station_code ?? "");
}

function stationNameOf(row: any) {
  return String(row?.name ?? row?.stationName ?? row?.station_name ?? "Unnamed station");
}

function wardOf(row: any) {
  return String(row?.ward ?? "UNASSIGNED");
}

function constituencyOf(row: any) {
  return String(row?.constituency ?? "UNASSIGNED");
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "No timestamp";
  return date.toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ResultsFormsEvidenceCentre() {
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [stations, setStations] = useState<StationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewer, setReviewer] = useState("HQ Evidence Desk");
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    stationCode: "",
    documentUrl: "",
    fileName: "",
    checksum: "",
    submittedBy: "",
    formType: "polling-station-result",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [formsResponse, stationsResponse] = await Promise.all([
        fetch(`${BASE}api/election-day/result-forms`, {
          credentials: "include",
        }),
        fetch(`${BASE}api/election-day/stations`, {
          credentials: "include",
        }),
      ]);

      if (!formsResponse.ok || !stationsResponse.ok) {
        throw new Error("Failed to load result-form evidence");
      }

      const [formsPayload, stationsPayload] = await Promise.all([
        formsResponse.json(),
        stationsResponse.json(),
      ]);

      setForms(Array.isArray(formsPayload) ? formsPayload : []);
      setStations(
        Array.isArray(stationsPayload)
          ? stationsPayload
          : Array.isArray(stationsPayload?.stations)
            ? stationsPayload.stations
            : [],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Results Forms & Evidence Centre",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedStation = stations.find(
    (station) => stationCodeOf(station) === form.stationCode,
  );

  const counts = useMemo(
    () => ({
      total: forms.length,
      pending: forms.filter((item) => item.reviewStatus === "pending").length,
      accepted: forms.filter((item) => item.reviewStatus === "accepted").length,
      rejected: forms.filter((item) => item.reviewStatus === "rejected").length,
    }),
    [forms],
  );

  const filteredForms = useMemo(() => {
    const query = search.trim().toLowerCase();

    return forms.filter((item) => {
      const matchesStatus =
        statusFilter === "all" || item.reviewStatus === statusFilter;

      const haystack = [
        item.stationCode,
        item.ward,
        item.constituency,
        item.fileName,
        item.submittedBy,
        item.formType,
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!query || haystack.includes(query));
    });
  }, [forms, search, statusFilter]);

  async function submitForm() {
    if (!form.stationCode || !form.documentUrl.trim()) {
      setError("Select a polling station and enter the document URL.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${BASE}api/election-day/result-forms`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            ward: wardOf(selectedStation),
            constituency: constituencyOf(selectedStation),
          }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Result-form registration failed");
      }

      setForm({
        stationCode: "",
        documentUrl: "",
        fileName: "",
        checksum: "",
        submittedBy: "",
        formType: "polling-station-result",
      });

      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Result-form registration failed",
      );
    } finally {
      setSaving(false);
    }
  }

  async function reviewForm(id: number, reviewStatus: string) {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${BASE}api/election-day/result-forms/${id}/review`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewStatus,
            reviewNotes: reviewNotes[id] ?? "",
            reviewedBy: reviewer,
          }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Evidence review failed");
      }

      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Evidence review failed",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4 border-b border-border/50 pb-5">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-widest text-primary">
            RESULTS FORMS & EVIDENCE CENTRE
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Register, review and audit polling-station result documents.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="flex min-h-10 items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          REFRESH
        </button>
      </header>

      {error && (
        <div className="border border-red-400/40 bg-red-400/5 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["TOTAL FORMS", counts.total, FileCheck2],
          ["PENDING", counts.pending, FileWarning],
          ["ACCEPTED", counts.accepted, CheckCircle2],
          ["REJECTED", counts.rejected, XCircle],
        ].map(([label, value, Icon]) => (
          <article key={String(label)} className="border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[8px] text-muted-foreground">{label}</p>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 font-mono text-xl">{value}</p>
          </article>
        ))}
      </div>

      <article className="border border-border bg-card p-4">
        <p className="font-mono text-[10px] tracking-widest">
          REGISTER RESULT DOCUMENT
        </p>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <select
            value={form.stationCode}
            onChange={(event) =>
              setForm({ ...form, stationCode: event.target.value })
            }
            className="min-h-10 min-w-0 border border-border bg-background px-3 py-2 text-xs"
          >
            <option value="">Select polling station</option>
            {stations.map((station) => (
              <option key={stationCodeOf(station)} value={stationCodeOf(station)}>
                {stationCodeOf(station)} · {stationNameOf(station)}
              </option>
            ))}
          </select>

          <input
            value={form.documentUrl}
            onChange={(event) =>
              setForm({ ...form, documentUrl: event.target.value })
            }
            placeholder="Document URL"
            className="min-h-10 min-w-0 border border-border bg-background px-3 py-2 text-xs"
          />

          <input
            value={form.fileName}
            onChange={(event) =>
              setForm({ ...form, fileName: event.target.value })
            }
            placeholder="File name"
            className="min-h-10 min-w-0 border border-border bg-background px-3 py-2 text-xs"
          />

          <input
            value={form.checksum}
            onChange={(event) =>
              setForm({ ...form, checksum: event.target.value })
            }
            placeholder="Checksum / hash"
            className="min-h-10 min-w-0 border border-border bg-background px-3 py-2 text-xs"
          />

          <input
            value={form.submittedBy}
            onChange={(event) =>
              setForm({ ...form, submittedBy: event.target.value })
            }
            placeholder="Submitted by"
            className="min-h-10 min-w-0 border border-border bg-background px-3 py-2 text-xs"
          />

          <button
            type="button"
            onClick={submitForm}
            disabled={saving || !form.stationCode || !form.documentUrl}
            className="flex min-h-10 items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <FilePlus2 className="h-3 w-3" />
            )}
            REGISTER FORM
          </button>
        </div>
      </article>

      <article className="border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_220px_260px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search station, ward, file or submitter"
              className="min-h-10 w-full border border-border bg-background py-2 pl-10 pr-3 text-xs"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-10 border border-border bg-background px-3 py-2 font-mono text-[8px]"
          >
            <option value="all">ALL STATUSES</option>
            <option value="pending">PENDING</option>
            <option value="accepted">ACCEPTED</option>
            <option value="rejected">REJECTED</option>
            <option value="under-review">UNDER REVIEW</option>
          </select>

          <input
            value={reviewer}
            onChange={(event) => setReviewer(event.target.value)}
            placeholder="Evidence reviewer"
            className="min-h-10 border border-border bg-background px-3 py-2 text-xs"
          />
        </div>
      </article>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3">
        {filteredForms.map((item) => (
          <article key={item.id} className="min-w-0 border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {item.stationCode} · {item.fileName || item.formType}
                </p>
                <p className="mt-1 break-words font-mono text-[8px] text-muted-foreground">
                  {(item.ward || "UNASSIGNED").toUpperCase()} ·{" "}
                  {(item.submittedBy || "UNKNOWN").toUpperCase()}
                </p>
              </div>

              <span className="shrink-0 border border-border px-2 py-1 font-mono text-[8px]">
                {String(item.reviewStatus).toUpperCase()}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="border border-border p-3">
                <p className="font-mono text-[7px] text-muted-foreground">TYPE</p>
                <p className="mt-2 truncate text-xs">{item.formType}</p>
              </div>
              <div className="border border-border p-3">
                <p className="font-mono text-[7px] text-muted-foreground">CREATED</p>
                <p className="mt-2 text-xs">{formatTime(item.createdAt)}</p>
              </div>
            </div>

            <a
              href={item.documentUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex min-h-10 items-center justify-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
            >
              <ExternalLink className="h-3 w-3" />
              OPEN DOCUMENT
            </a>

            <input
              value={reviewNotes[item.id] ?? ""}
              onChange={(event) =>
                setReviewNotes((current) => ({
                  ...current,
                  [item.id]: event.target.value,
                }))
              }
              placeholder="Review notes"
              className="mt-3 min-h-10 w-full border border-border bg-background px-3 py-2 text-xs"
            />

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => void reviewForm(item.id, "accepted")}
                disabled={saving}
                className="flex min-h-10 items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
              >
                <CheckCircle2 className="h-3 w-3" />
                ACCEPT
              </button>

              <button
                type="button"
                onClick={() => void reviewForm(item.id, "under-review")}
                disabled={saving}
                className="flex min-h-10 items-center justify-center gap-2 border border-border px-3 py-2 font-mono text-[8px] disabled:opacity-50"
              >
                <ShieldAlert className="h-3 w-3" />
                REVIEW
              </button>

              <button
                type="button"
                onClick={() => void reviewForm(item.id, "rejected")}
                disabled={saving}
                className="flex min-h-10 items-center justify-center gap-2 border border-red-400/40 px-3 py-2 font-mono text-[8px] text-red-400 disabled:opacity-50"
              >
                <XCircle className="h-3 w-3" />
                REJECT
              </button>
            </div>
          </article>
        ))}
      </div>

      {!loading && filteredForms.length === 0 && (
        <div className="border border-dashed border-border bg-card py-12 text-center font-mono text-[10px] text-muted-foreground">
          [ NO_RESULT_FORMS_MATCH_CURRENT_FILTER ]
        </div>
      )}
    </section>
  );
}
