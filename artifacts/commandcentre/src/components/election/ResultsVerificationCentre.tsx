import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileWarning,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

type ResultRow = Record<string, any>;
type WorkQueuePayload = Record<string, any>;

function number(value?: number | string | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function candidateOf(row: any) {
  return String(
    row?.candidateName ??
      row?.candidate_name ??
      row?.candidate ??
      "UNKNOWN",
  );
}

function partyOf(row: any) {
  return String(row?.party ?? "—");
}

function stationCodeOf(row: any) {
  return String(
    row?.stationCode ??
      row?.station_code ??
      row?.pollingStationCode ??
      "",
  );
}

function stationNameOf(row: any) {
  return String(
    row?.stationName ??
      row?.station_name ??
      row?.pollingStation ??
      "Unknown station",
  );
}

function wardOf(row: any) {
  return String(row?.ward ?? "UNASSIGNED");
}

function statusOf(row: any) {
  return String(row?.status ?? "submitted").toLowerCase();
}

function submittedByOf(row: any) {
  return String(
    row?.submittedBy ??
      row?.submitted_by ??
      "UNASSIGNED",
  );
}

function submittedAtOf(row: any) {
  return String(
    row?.submittedAt ??
      row?.submitted_at ??
      row?.createdAt ??
      "",
  );
}

function formatTime(value: string) {
  if (!value) return "No timestamp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ResultsVerificationCentre() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [workQueue, setWorkQueue] = useState<WorkQueuePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("submitted");
  const [reviewer, setReviewer] = useState("HQ Verification Desk");
  const [notesById, setNotesById] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [resultsResponse, workQueueResponse] = await Promise.all([
        fetch(`${BASE}api/election-day/results`, {
          credentials: "include",
        }),
        fetch(`${BASE}api/election-day/workqueue`, {
          credentials: "include",
        }),
      ]);

      if (!resultsResponse.ok || !workQueueResponse.ok) {
        throw new Error("Failed to load verification data");
      }

      const [resultsPayload, queuePayload] = await Promise.all([
        resultsResponse.json(),
        workQueueResponse.json(),
      ]);

      setResults(
        Array.isArray(resultsPayload)
          ? resultsPayload
          : Array.isArray(resultsPayload?.results)
            ? resultsPayload.results
            : [],
      );
      setWorkQueue(queuePayload ?? {});
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Results Verification Centre",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = results.filter(
    (row) => statusOf(row) === "submitted",
  ).length;

  const verified = results.filter(
    (row) => statusOf(row) === "verified",
  ).length;

  const disputed = results.filter((row) =>
    ["disputed", "rejected", "under-review"].includes(statusOf(row)),
  ).length;

  const stationGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        stationCode: string;
        stationName: string;
        ward: string;
        rows: ResultRow[];
        totalVotes: number;
        statuses: Set<string>;
      }
    >();

    for (const row of results) {
      const stationCode = stationCodeOf(row) || `UNKNOWN-${row.id}`;
      const current = map.get(stationCode) ?? {
        stationCode,
        stationName: stationNameOf(row),
        ward: wardOf(row),
        rows: [],
        totalVotes: 0,
        statuses: new Set<string>(),
      };

      current.rows.push(row);
      current.totalVotes += Number(row?.votes ?? 0);
      current.statuses.add(statusOf(row));
      map.set(stationCode, current);
    }

    return [...map.values()];
  }, [results]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();

    return stationGroups.filter((group) => {
      const groupStatus = group.statuses.has("disputed")
        ? "disputed"
        : group.statuses.has("submitted")
          ? "submitted"
          : group.statuses.has("verified")
            ? "verified"
            : [...group.statuses][0] ?? "submitted";

      const matchesStatus =
        statusFilter === "all" || groupStatus === statusFilter;

      const haystack = [
        group.stationCode,
        group.stationName,
        group.ward,
        ...group.rows.map(candidateOf),
        ...group.rows.map(partyOf),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || haystack.includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [search, stationGroups, statusFilter]);

  async function verifyResult(row: ResultRow) {
    const id = Number(row?.id);
    if (!Number.isInteger(id)) return;

    setSavingId(id);
    setError("");

    try {
      const response = await fetch(
        `${BASE}api/election-day/results/${id}/verify`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verifiedBy: reviewer.trim() || "HQ",
          }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Verification failed");
      }

      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Verification failed",
      );
    } finally {
      setSavingId(null);
    }
  }

  async function disputeResult(row: ResultRow) {
    const id = Number(row?.id);
    if (!Number.isInteger(id)) return;

    const notes =
      notesById[id]?.trim() ||
      "Flagged for review by verification desk";

    setSavingId(id);
    setError("");

    try {
      const response = await fetch(
        `${BASE}api/election-day/results/${id}/dispute`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Dispute action failed");
      }

      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Dispute action failed",
      );
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="space-y-4 border-b border-border/50 pb-5">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-widest text-primary">
            RESULTS VERIFICATION CENTRE
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Verify, dispute and review polling-station tally submissions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="flex min-h-10 items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
        >
          <RefreshCw
            className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
          />
          REFRESH
        </button>
      </header>

      {error && (
        <div className="border border-red-400/40 bg-red-400/5 p-3 text-xs text-red-400">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["PENDING", pending, Clock3],
          ["VERIFIED", verified, ShieldCheck],
          ["DISPUTED", disputed, FileWarning],
          ["STATIONS", stationGroups.length, CheckCircle2],
        ].map(([label, value, Icon]) => (
          <article
            key={String(label)}
            className="min-w-0 border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[8px] text-muted-foreground">
                {label}
              </p>
              <Icon className="h-4 w-4 shrink-0 text-primary" />
            </div>
            <p className="mt-3 font-mono text-xl">{value}</p>
          </article>
        ))}
      </div>

      <article className="min-w-0 border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_220px_260px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search station, ward, candidate or party"
              className="min-h-10 w-full min-w-0 border border-border bg-background py-2 pl-10 pr-3 text-xs"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-10 border border-border bg-background px-3 py-2 font-mono text-[8px]"
          >
            <option value="submitted">PENDING REVIEW</option>
            <option value="verified">VERIFIED</option>
            <option value="disputed">DISPUTED</option>
            <option value="all">ALL STATUSES</option>
          </select>

          <input
            value={reviewer}
            onChange={(event) => setReviewer(event.target.value)}
            placeholder="Verification officer"
            className="min-h-10 min-w-0 border border-border bg-background px-3 py-2 text-xs"
          />
        </div>
      </article>

      <div className="space-y-4">
        {filteredGroups.map((group) => (
          <article
            key={group.stationCode}
            className="min-w-0 border border-border bg-card p-4"
          >
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <p className="break-words text-sm font-medium">
                  {group.stationCode} · {group.stationName}
                </p>
                <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                  {group.ward.toUpperCase()} ·{" "}
                  {group.rows.length} RESULT ROW(S) ·{" "}
                  {number(group.totalVotes)} VOTES
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[...group.statuses].map((status) => (
                  <span
                    key={status}
                    className="border border-border px-2 py-1 font-mono text-[8px]"
                  >
                    {status.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {group.rows.map((row) => {
                const id = Number(row?.id);
                const saving = savingId === id;

                return (
                  <div
                    key={id}
                    className="grid grid-cols-1 gap-3 border border-border p-3 xl:grid-cols-[1fr_0.5fr_0.45fr_1fr_auto]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">
                        {candidateOf(row)}
                      </p>
                      <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                        {partyOf(row)} · SUBMITTED BY{" "}
                        {submittedByOf(row).toUpperCase()}
                      </p>
                      <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                        {formatTime(submittedAtOf(row))}
                      </p>
                    </div>

                    <div className="border border-border p-3">
                      <p className="font-mono text-[7px] text-muted-foreground">
                        VOTES
                      </p>
                      <p className="mt-2 font-mono text-lg">
                        {number(row?.votes)}
                      </p>
                    </div>

                    <div className="border border-border p-3">
                      <p className="font-mono text-[7px] text-muted-foreground">
                        STATUS
                      </p>
                      <p className="mt-2 font-mono text-[8px]">
                        {statusOf(row).toUpperCase()}
                      </p>
                    </div>

                    <input
                      value={notesById[id] ?? ""}
                      onChange={(event) =>
                        setNotesById((current) => ({
                          ...current,
                          [id]: event.target.value,
                        }))
                      }
                      placeholder="Reviewer notes or dispute reason"
                      className="min-h-10 min-w-0 border border-border bg-background px-3 py-2 text-xs"
                    />

                    <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
                      <button
                        type="button"
                        onClick={() => void verifyResult(row)}
                        disabled={
                          saving || statusOf(row) === "verified"
                        }
                        className="flex min-h-10 items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-40"
                      >
                        {saving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        VERIFY
                      </button>

                      <button
                        type="button"
                        onClick={() => void disputeResult(row)}
                        disabled={saving}
                        className="flex min-h-10 items-center justify-center gap-2 border border-red-400/40 px-3 py-2 font-mono text-[8px] text-red-400 disabled:opacity-40"
                      >
                        {saving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        DISPUTE
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}

        {!loading && filteredGroups.length === 0 && (
          <div className="border border-dashed border-border bg-card py-12 text-center font-mono text-[10px] text-muted-foreground">
            [ NO_RESULTS_MATCH_CURRENT_FILTER ]
          </div>
        )}
      </div>
    </section>
  );
}
