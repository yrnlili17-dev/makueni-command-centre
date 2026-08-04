import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  MapPinned,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

type ResultRow = Record<string, any>;
type StationRow = Record<string, any>;

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
  return Number(row?.votes ?? 0);
}

function statusOf(row: any) {
  return String(row?.status ?? "submitted").toLowerCase();
}

function stationCodeOf(row: any) {
  return String(
    row?.stationCode ??
      row?.station_code ??
      row?.code ??
      "",
  );
}

function wardOf(row: any) {
  return String(row?.ward ?? "UNASSIGNED");
}

function constituencyOf(row: any) {
  return String(row?.constituency ?? "UNASSIGNED");
}

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export default function CandidateIntelligenceDashboard() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [stations, setStations] = useState<StationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [resultsResponse, stationsResponse] = await Promise.all([
        fetch(`${BASE}api/election-day/results`, {
          credentials: "include",
        }),
        fetch(`${BASE}api/election-day/stations`, {
          credentials: "include",
        }),
      ]);

      if (!resultsResponse.ok || !stationsResponse.ok) {
        throw new Error("Failed to load candidate intelligence data");
      }

      const [resultsPayload, stationsPayload] = await Promise.all([
        resultsResponse.json(),
        stationsResponse.json(),
      ]);

      setResults(
        Array.isArray(resultsPayload)
          ? resultsPayload
          : Array.isArray(resultsPayload?.results)
            ? resultsPayload.results
            : [],
      );

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
          : "Unable to load Candidate Intelligence Dashboard",
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

  const stationMeta = useMemo(() => {
    const map = new Map<string, StationRow>();
    for (const station of stations) {
      const code = stationCodeOf(station);
      if (code) map.set(code, station);
    }
    return map;
  }, [stations]);

  const totalVotes = results.reduce(
    (sum, row) => sum + votesOf(row),
    0,
  );

  const candidates = useMemo(() => {
    const candidateMap = new Map<
      string,
      {
        candidate: string;
        party: string;
        votes: number;
        verifiedVotes: number;
        unverifiedVotes: number;
        stations: Set<string>;
        wards: Map<string, number>;
        constituencies: Map<string, number>;
      }
    >();

    for (const row of results) {
      const candidate = candidateOf(row);
      const party = partyOf(row);
      const key = `${candidate}::${party}`;
      const current = candidateMap.get(key) ?? {
        candidate,
        party,
        votes: 0,
        verifiedVotes: 0,
        unverifiedVotes: 0,
        stations: new Set<string>(),
        wards: new Map<string, number>(),
        constituencies: new Map<string, number>(),
      };

      const votes = votesOf(row);
      current.votes += votes;

      if (statusOf(row) === "verified") {
        current.verifiedVotes += votes;
      } else {
        current.unverifiedVotes += votes;
      }

      const stationCode = stationCodeOf(row);
      if (stationCode) current.stations.add(stationCode);

      const station = stationMeta.get(stationCode);
      const ward =
        wardOf(row) !== "UNASSIGNED"
          ? wardOf(row)
          : wardOf(station);
      const constituency =
        constituencyOf(row) !== "UNASSIGNED"
          ? constituencyOf(row)
          : constituencyOf(station);

      current.wards.set(
        ward,
        Number(current.wards.get(ward) ?? 0) + votes,
      );

      current.constituencies.set(
        constituency,
        Number(current.constituencies.get(constituency) ?? 0) + votes,
      );

      candidateMap.set(key, current);
    }

    const rows = [...candidateMap.values()].sort(
      (a, b) => b.votes - a.votes,
    );

    return rows.map((candidate, index) => {
      const previous = rows[index - 1];
      const next = rows[index + 1];

      const strongestWard = [...candidate.wards.entries()].sort(
        (a, b) => b[1] - a[1],
      )[0];

      const weakestWard = [...candidate.wards.entries()].sort(
        (a, b) => a[1] - b[1],
      )[0];

      const strongestConstituency = [
        ...candidate.constituencies.entries(),
      ].sort((a, b) => b[1] - a[1])[0];

      return {
        ...candidate,
        rank: index + 1,
        voteShare: pct(candidate.votes, totalVotes),
        verifiedShare: pct(candidate.verifiedVotes, candidate.votes),
        margin:
          index === 0
            ? candidate.votes - Number(next?.votes ?? 0)
            : Number(previous?.votes ?? 0) - candidate.votes,
        strongestWard: strongestWard?.[0] ?? "NO DATA",
        strongestWardVotes: strongestWard?.[1] ?? 0,
        weakestWard: weakestWard?.[0] ?? "NO DATA",
        weakestWardVotes: weakestWard?.[1] ?? 0,
        strongestConstituency:
          strongestConstituency?.[0] ?? "NO DATA",
      };
    });
  }, [results, stationMeta, totalVotes]);

  const countyLeader = candidates[0] ?? null;

  const alerts = useMemo(() => {
    const items: Array<{
      severity: string;
      title: string;
      detail: string;
    }> = [];

    for (const candidate of candidates) {
      if (candidate.unverifiedVotes > candidate.verifiedVotes) {
        items.push({
          severity: "high",
          title: `${candidate.candidate} verification exposure`,
          detail:
            `${number(candidate.unverifiedVotes)} votes remain unverified, ` +
            `exceeding verified votes.`,
        });
      }

      if (candidate.voteShare > 0 && candidate.voteShare < 10) {
        items.push({
          severity: "medium",
          title: `${candidate.candidate} low county share`,
          detail: `Current vote share is ${candidate.voteShare}%.`,
        });
      }

      if (
        candidate.strongestWard !== "NO DATA" &&
        candidate.weakestWard !== "NO DATA" &&
        candidate.strongestWardVotes >
          candidate.weakestWardVotes * 5
      ) {
        items.push({
          severity: "medium",
          title: `${candidate.candidate} geographic imbalance`,
          detail:
            `Strongest ward ${candidate.strongestWard}; ` +
            `weakest ward ${candidate.weakestWard}.`,
        });
      }
    }

    if (candidates.length > 1 && candidates[0].margin < 100) {
      items.push({
        severity: "critical",
        title: "County race within narrow margin",
        detail: `Current lead is only ${number(candidates[0].margin)} votes.`,
      });
    }

    return items.slice(0, 20);
  }, [candidates]);

  return (
    <section className="space-y-4 border-b border-border/50 pb-5">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-widest text-primary">
            CANDIDATE INTELLIGENCE DASHBOARD
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Candidate ranking, geographic strength, verification exposure and lead margins.
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
        <div className="border border-red-400/40 bg-red-400/5 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[8px] text-muted-foreground">
              COUNTY LEADER
            </p>
            <Trophy className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 truncate text-lg font-medium">
            {countyLeader?.candidate ?? "NO RESULTS"}
          </p>
          <p className="mt-1 font-mono text-[8px] text-muted-foreground">
            {countyLeader?.party ?? "—"}
          </p>
        </article>

        <article className="border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[8px] text-muted-foreground">
              LEAD MARGIN
            </p>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 font-mono text-xl">
            {number(countyLeader?.margin ?? 0)}
          </p>
        </article>

        <article className="border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[8px] text-muted-foreground">
              CANDIDATES
            </p>
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 font-mono text-xl">{candidates.length}</p>
        </article>

        <article className="border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[8px] text-muted-foreground">
              TOTAL VOTES
            </p>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 font-mono text-xl">{number(totalVotes)}</p>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.2fr_0.8fr]">
        <article className="min-w-0 border border-border bg-card p-4">
          <p className="font-mono text-[10px] tracking-widest">
            CANDIDATE PERFORMANCE RANKING
          </p>

          <div className="mt-4 space-y-3">
            {candidates.map((candidate) => (
              <div
                key={`${candidate.candidate}-${candidate.party}`}
                className="border border-border p-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {candidate.rank}. {candidate.candidate}
                    </p>
                    <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                      {candidate.party} · {candidate.voteShare}% SHARE ·{" "}
                      {candidate.stations.size} STATIONS
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-mono text-xl">
                      {number(candidate.votes)}
                    </p>
                    <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                      MARGIN {number(candidate.margin)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 h-1.5 bg-secondary">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Math.min(100, candidate.voteShare)}%`,
                    }}
                  />
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="border border-border p-3">
                    <p className="font-mono text-[7px] text-muted-foreground">
                      VERIFIED
                    </p>
                    <p className="mt-2 font-mono text-sm">
                      {number(candidate.verifiedVotes)}
                    </p>
                  </div>

                  <div className="border border-border p-3">
                    <p className="font-mono text-[7px] text-muted-foreground">
                      UNVERIFIED
                    </p>
                    <p className="mt-2 font-mono text-sm">
                      {number(candidate.unverifiedVotes)}
                    </p>
                  </div>

                  <div className="border border-border p-3">
                    <p className="font-mono text-[7px] text-muted-foreground">
                      STRONGEST WARD
                    </p>
                    <p className="mt-2 truncate text-xs">
                      {candidate.strongestWard}
                    </p>
                  </div>

                  <div className="border border-border p-3">
                    <p className="font-mono text-[7px] text-muted-foreground">
                      STRONGEST CONSTITUENCY
                    </p>
                    <p className="mt-2 truncate text-xs">
                      {candidate.strongestConstituency}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {!loading && candidates.length === 0 && (
              <div className="border border-dashed border-border py-10 text-center font-mono text-[10px] text-muted-foreground">
                [ NO_CANDIDATE_RESULTS_DATA ]
              </div>
            )}
          </div>
        </article>

        <article className="min-w-0 border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                EXECUTIVE CANDIDATE ALERTS
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Verification, margin and geographic concentration alerts.
              </p>
            </div>
            <AlertTriangle className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-2">
            {alerts.map((alert, index) => (
              <div
                key={`${alert.title}-${index}`}
                className="border border-border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-xs font-medium">
                      {alert.title}
                    </p>
                    <p className="mt-1 break-words text-xs text-muted-foreground">
                      {alert.detail}
                    </p>
                  </div>
                  <span className="shrink-0 border border-border px-2 py-1 font-mono text-[8px]">
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}

            {!loading && alerts.length === 0 && (
              <div className="border border-dashed border-border py-10 text-center font-mono text-[10px] text-muted-foreground">
                [ NO_ACTIVE_CANDIDATE_ALERTS ]
              </div>
            )}
          </div>
        </article>
      </div>

      <article className="min-w-0 border border-border bg-card p-4">
        <p className="font-mono text-[10px] tracking-widest">
          GEOGRAPHIC STRENGTH & WEAKNESS
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-xs">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Candidate</th>
                <th className="px-3 py-2">Party</th>
                <th className="px-3 py-2">Vote Share</th>
                <th className="px-3 py-2">Verified Share</th>
                <th className="px-3 py-2">Strongest Ward</th>
                <th className="px-3 py-2">Weakest Ward</th>
                <th className="px-3 py-2">Strongest Constituency</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr
                  key={`${candidate.candidate}-${candidate.party}`}
                  className="border-b border-border/50"
                >
                  <td className="px-3 py-3 font-medium">
                    {candidate.candidate}
                  </td>
                  <td className="px-3 py-3">{candidate.party}</td>
                  <td className="px-3 py-3">
                    {candidate.voteShare}%
                  </td>
                  <td className="px-3 py-3">
                    {candidate.verifiedShare}%
                  </td>
                  <td className="px-3 py-3">
                    {candidate.strongestWard}
                  </td>
                  <td className="px-3 py-3">
                    {candidate.weakestWard}
                  </td>
                  <td className="px-3 py-3">
                    {candidate.strongestConstituency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
