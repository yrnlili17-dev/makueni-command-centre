import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileWarning,
  MapPin,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

type SummaryPayload = Record<string, any>;
type ResultRow = Record<string, any>;
type WorkQueuePayload = Record<string, any>;
type StationRow = Record<string, any>;

function number(value?: number | string | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function readCount(value: any): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value || 0);
  if (value && typeof value === "object") {
    if ("count" in value) return Number(value.count ?? 0);
    if ("total" in value) return Number(value.total ?? 0);
  }
  return 0;
}

function statusOf(row: any) {
  return String(row?.status ?? "submitted").toLowerCase();
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

function votesOf(row: any) {
  return Number(row?.votes ?? row?.candidateVotes ?? 0);
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
      row?.name ??
      "Unknown station",
  );
}

function wardOf(row: any) {
  return String(row?.ward ?? "UNASSIGNED");
}

function timeOf(row: any) {
  return String(
    row?.submittedAt ??
      row?.submitted_at ??
      row?.verifiedAt ??
      row?.updatedAt ??
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

export default function ResultsIntelligenceCentre() {
  const [summary, setSummary] = useState<SummaryPayload | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [workQueue, setWorkQueue] = useState<WorkQueuePayload | null>(null);
  const [stations, setStations] = useState<StationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const endpoints = [
        `${BASE}api/election-day/summary`,
        `${BASE}api/election-day/results`,
        `${BASE}api/election-day/workqueue`,
        `${BASE}api/election-day/stations`,
      ];

      const responses = await Promise.all(
        endpoints.map((url) =>
          fetch(url, { credentials: "include" }),
        ),
      );

      for (const response of responses) {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(
            body.error ?? `Request failed with ${response.status}`,
          );
        }
      }

      const [summaryData, resultsData, workQueueData, stationsData] =
        await Promise.all(responses.map((response) => response.json()));

      setSummary(summaryData ?? {});
      setResults(
        Array.isArray(resultsData)
          ? resultsData
          : Array.isArray(resultsData?.results)
            ? resultsData.results
            : [],
      );
      setWorkQueue(workQueueData ?? {});
      setStations(
        Array.isArray(stationsData)
          ? stationsData
          : Array.isArray(stationsData?.stations)
            ? stationsData.stations
            : [],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Results Intelligence Centre",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, load]);

  const stationCodes = useMemo(
    () =>
      new Set(
        results
          .map(stationCodeOf)
          .filter(Boolean),
      ),
    [results],
  );

  const totalStations =
    readCount(summary?.totalStations) ||
    readCount(summary?.stations) ||
    stations.length;

  const reportedStations =
    readCount(summary?.submittedStations) ||
    readCount(summary?.reportingStations) ||
    stationCodes.size;

  const verifiedStations =
    readCount(summary?.verifiedStations) ||
    new Set(
      results
        .filter((row) => statusOf(row) === "verified")
        .map(stationCodeOf)
        .filter(Boolean),
    ).size;

  const disputedStations = new Set(
    results
      .filter((row) =>
        ["disputed", "rejected", "under-review"].includes(statusOf(row)),
      )
      .map(stationCodeOf)
      .filter(Boolean),
  ).size;

  const pendingVerification =
    Array.isArray(workQueue?.pendingVerification)
      ? workQueue.pendingVerification.length
      : results.filter((row) => statusOf(row) === "submitted").length;

  const totalVotes = results.reduce(
    (sum, row) => sum + votesOf(row),
    0,
  );

  const reportingRate = percent(reportedStations, totalStations);
  const verificationRate = percent(verifiedStations, reportedStations);

  const candidateRows = useMemo(() => {
    const map = new Map<
      string,
      { candidate: string; party: string; votes: number }
    >();

    for (const row of results) {
      const candidate = candidateOf(row);
      const party = partyOf(row);
      const key = `${candidate}::${party}`;
      const current = map.get(key) ?? {
        candidate,
        party,
        votes: 0,
      };
      current.votes += votesOf(row);
      map.set(key, current);
    }

    return [...map.values()]
      .sort((a, b) => b.votes - a.votes)
      .map((row, index, all) => ({
        ...row,
        rank: index + 1,
        percentage:
          totalVotes > 0
            ? Math.round((row.votes / totalVotes) * 1000) / 10
            : 0,
        margin:
          index === 0
            ? row.votes - Number(all[1]?.votes ?? 0)
            : Number(all[index - 1]?.votes ?? 0) - row.votes,
      }));
  }, [results, totalVotes]);

  const wardRows = useMemo(() => {
    const map = new Map<
      string,
      {
        ward: string;
        stations: Set<string>;
        results: number;
        verified: number;
        votes: number;
      }
    >();

    for (const row of results) {
      const ward = wardOf(row);
      const current = map.get(ward) ?? {
        ward,
        stations: new Set<string>(),
        results: 0,
        verified: 0,
        votes: 0,
      };

      const code = stationCodeOf(row);
      if (code) current.stations.add(code);
      current.results += 1;
      current.votes += votesOf(row);
      if (statusOf(row) === "verified") current.verified += 1;
      map.set(ward, current);
    }

    return [...map.values()]
      .map((row) => ({
        ward: row.ward,
        stations: row.stations.size,
        results: row.results,
        verified: row.verified,
        votes: row.votes,
      }))
      .sort((a, b) => b.votes - a.votes);
  }, [results]);

  const anomalies = useMemo(() => {
    const items: Array<{
      title: string;
      detail: string;
      severity: string;
    }> = [];

    const stationCandidateKeys = new Set<string>();
    for (const row of results) {
      const key = `${stationCodeOf(row)}::${candidateOf(row)}`;
      if (stationCandidateKeys.has(key)) {
        items.push({
          title: "Possible duplicate candidate result",
          detail: `${stationCodeOf(row)} · ${candidateOf(row)}`,
          severity: "high",
        });
      }
      stationCandidateKeys.add(key);

      if (votesOf(row) < 0) {
        items.push({
          title: "Negative vote count detected",
          detail: `${stationCodeOf(row)} · ${candidateOf(row)}`,
          severity: "critical",
        });
      }

      if (!stationCodeOf(row)) {
        items.push({
          title: "Result missing polling-station code",
          detail: candidateOf(row),
          severity: "high",
        });
      }
    }

    if (disputedStations > 0) {
      items.push({
        title: "Disputed polling stations require review",
        detail: `${disputedStations} station(s) currently disputed or rejected.`,
        severity: "critical",
      });
    }

    if (pendingVerification > 0) {
      items.push({
        title: "Verification queue pending",
        detail: `${pendingVerification} result item(s) awaiting verification.`,
        severity: "medium",
      });
    }

    if (totalStations > reportedStations) {
      items.push({
        title: "Outstanding polling stations",
        detail: `${Math.max(
          0,
          totalStations - reportedStations,
        )} station(s) have not reported.`,
        severity: "high",
      });
    }

    return items.slice(0, 20);
  }, [
    disputedStations,
    pendingVerification,
    reportedStations,
    results,
    totalStations,
  ]);

  const recentTimeline = useMemo(
    () =>
      [...results]
        .filter((row) => timeOf(row))
        .sort(
          (a, b) =>
            new Date(timeOf(b)).getTime() -
            new Date(timeOf(a)).getTime(),
        )
        .slice(0, 30),
    [results],
  );

  return (
    <section className="space-y-4 border-b border-border/50 pb-5">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-widest text-primary">
            RESULTS INTELLIGENCE CENTRE
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Live tally, reporting progress, candidate ranking, verification and anomaly monitoring.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh((value) => !value)}
            className="flex min-h-10 items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
          >
            {autoRefresh ? (
              <Pause className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            AUTO {autoRefresh ? "ON" : "OFF"}
          </button>

          <button
            type="button"
            onClick={() => void load()}
            className="flex min-h-10 items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            REFRESH
          </button>
        </div>
      </header>

      {error && (
        <div className="border border-red-400/40 bg-red-400/5 p-3 font-mono text-[9px] text-red-400">
          [ RESULTS_INTELLIGENCE_ERROR ] {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
        {[
          ["REPORTING", `${reportingRate}%`, BarChart3],
          ["STATIONS", totalStations, MapPin],
          ["REPORTED", reportedStations, CheckCircle2],
          ["VERIFIED", verifiedStations, ShieldCheck],
          ["VERIFY RATE", `${verificationRate}%`, ShieldCheck],
          ["PENDING", pendingVerification, Clock3],
          ["DISPUTED", disputedStations, FileWarning],
          ["TOTAL VOTES", number(totalVotes), Users],
        ].map(([label, value, Icon]) => (
          <article key={String(label)} className="min-w-0 border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[7px] text-muted-foreground 2xl:text-[9px]">
                {label}
              </p>
              <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
            </div>
            <p className="mt-3 truncate font-mono text-lg 2xl:text-xl">
              {value}
            </p>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.1fr_0.9fr]">
        <article className="min-w-0 border border-border bg-card p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                CANDIDATE LEADERBOARD
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Aggregated from the existing tally results table.
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-3">
            {candidateRows.map((row) => (
              <div key={`${row.candidate}-${row.party}`} className="border border-border p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {row.rank}. {row.candidate}
                    </p>
                    <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                      {row.party} · {row.percentage}% · MARGIN{" "}
                      {number(row.margin)}
                    </p>
                  </div>
                  <p className="shrink-0 font-mono text-xl">
                    {number(row.votes)}
                  </p>
                </div>

                <div className="mt-3 h-1.5 bg-secondary">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(100, row.percentage)}%` }}
                  />
                </div>
              </div>
            ))}

            {!loading && candidateRows.length === 0 && (
              <div className="border border-dashed border-border py-10 text-center font-mono text-[10px] text-muted-foreground">
                [ NO_RESULTS_SUBMITTED ]
              </div>
            )}
          </div>
        </article>

        <article className="min-w-0 border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                RESULTS ALERTS
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Duplicate, missing, disputed and verification warnings.
              </p>
            </div>
            <AlertTriangle className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-2">
            {anomalies.map((item, index) => (
              <div
                key={`${item.title}-${index}`}
                className="grid grid-cols-[28px_1fr] gap-3 border border-border p-3 sm:grid-cols-[28px_1fr_auto]"
              >
                <span className="flex h-7 w-7 items-center justify-center border border-border font-mono text-[8px] text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0">
                  <p className="break-words text-xs font-medium">
                    {item.title}
                  </p>
                  <p className="mt-1 break-words text-xs text-muted-foreground">
                    {item.detail}
                  </p>
                </div>

                <span className="col-span-2 h-fit justify-self-start border border-border px-2 py-1 font-mono text-[8px] sm:col-span-1 sm:justify-self-end">
                  {item.severity.toUpperCase()}
                </span>
              </div>
            ))}

            {!loading && anomalies.length === 0 && (
              <div className="border border-dashed border-border py-10 text-center font-mono text-[10px] text-muted-foreground">
                [ NO_ACTIVE_RESULTS_ALERTS ]
              </div>
            )}
          </div>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="min-w-0 border border-border bg-card p-4">
          <p className="font-mono text-[10px] tracking-widest">
            WARD RESULTS PROGRESS
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Ward</th>
                  <th className="px-3 py-2">Stations</th>
                  <th className="px-3 py-2">Rows</th>
                  <th className="px-3 py-2">Verified</th>
                  <th className="px-3 py-2">Votes</th>
                </tr>
              </thead>
              <tbody>
                {wardRows.map((row) => (
                  <tr key={row.ward} className="border-b border-border/50">
                    <td className="px-3 py-3 font-medium">{row.ward}</td>
                    <td className="px-3 py-3">{row.stations}</td>
                    <td className="px-3 py-3">{row.results}</td>
                    <td className="px-3 py-3">{row.verified}</td>
                    <td className="px-3 py-3">{number(row.votes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="min-w-0 border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                LIVE RESULTS TIMELINE
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Most recent tally submissions and verification events.
              </p>
            </div>
            <Clock3 className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-2">
            {recentTimeline.map((row, index) => (
              <div
                key={`${stationCodeOf(row)}-${candidateOf(row)}-${index}`}
                className="grid grid-cols-[34px_1fr] gap-3 border border-border p-3 sm:grid-cols-[34px_1fr_auto]"
              >
                <div className="flex h-8 w-8 items-center justify-center border border-border">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">
                    {candidateOf(row)} · {number(votesOf(row))} votes
                  </p>
                  <p className="mt-1 break-words font-mono text-[8px] text-muted-foreground">
                    {stationCodeOf(row) || "NO CODE"} ·{" "}
                    {stationNameOf(row)} · {statusOf(row).toUpperCase()}
                  </p>
                </div>

                <p className="col-span-2 font-mono text-[8px] text-muted-foreground sm:col-span-1">
                  {formatTime(timeOf(row))}
                </p>
              </div>
            ))}

            {!loading && recentTimeline.length === 0 && (
              <div className="border border-dashed border-border py-10 text-center font-mono text-[10px] text-muted-foreground">
                [ NO_RESULTS_ACTIVITY ]
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
