import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  MapPinned,
  Pause,
  Play,
  RefreshCw,
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

function registeredOf(row: any) {
  return Number(
    row?.registeredVoters ??
      row?.registered_voters ??
      row?.registered ??
      0,
  );
}

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export default function ConstituencyWardResultsDashboard() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [stations, setStations] = useState<StationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
        throw new Error("Failed to load constituency and ward results");
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
          : "Unable to load constituency and ward results",
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

  const constituencies = useMemo(() => {
    const constituencyMap = new Map<
      string,
      {
        constituency: string;
        wards: Map<
          string,
          {
            ward: string;
            stations: Set<string>;
            registered: number;
            votes: number;
            candidates: Map<
              string,
              { candidate: string; party: string; votes: number }
            >;
          }
        >;
      }
    >();

    for (const station of stations) {
      const constituency = constituencyOf(station);
      const ward = wardOf(station);

      if (!constituencyMap.has(constituency)) {
        constituencyMap.set(constituency, {
          constituency,
          wards: new Map(),
        });
      }

      const constituencyRow = constituencyMap.get(constituency)!;

      if (!constituencyRow.wards.has(ward)) {
        constituencyRow.wards.set(ward, {
          ward,
          stations: new Set(),
          registered: 0,
          votes: 0,
          candidates: new Map(),
        });
      }

      const wardRow = constituencyRow.wards.get(ward)!;
      const code = stationCodeOf(station);

      if (code && !wardRow.stations.has(code)) {
        wardRow.stations.add(code);
        wardRow.registered += registeredOf(station);
      }
    }

    for (const result of results) {
      const station = stationMeta.get(stationCodeOf(result));
      const constituency = constituencyOf(result) !== "UNASSIGNED"
        ? constituencyOf(result)
        : constituencyOf(station);
      const ward = wardOf(result) !== "UNASSIGNED"
        ? wardOf(result)
        : wardOf(station);

      if (!constituencyMap.has(constituency)) {
        constituencyMap.set(constituency, {
          constituency,
          wards: new Map(),
        });
      }

      const constituencyRow = constituencyMap.get(constituency)!;

      if (!constituencyRow.wards.has(ward)) {
        constituencyRow.wards.set(ward, {
          ward,
          stations: new Set(),
          registered: 0,
          votes: 0,
          candidates: new Map(),
        });
      }

      const wardRow = constituencyRow.wards.get(ward)!;
      const code = stationCodeOf(result);
      if (code) wardRow.stations.add(code);

      const votes = votesOf(result);
      wardRow.votes += votes;

      const candidate = candidateOf(result);
      const party = partyOf(result);
      const key = `${candidate}::${party}`;

      const current = wardRow.candidates.get(key) ?? {
        candidate,
        party,
        votes: 0,
      };

      current.votes += votes;
      wardRow.candidates.set(key, current);
    }

    return [...constituencyMap.values()]
      .map((constituency) => {
        const wards = [...constituency.wards.values()].map((ward) => {
          const candidates = [...ward.candidates.values()].sort(
            (a, b) => b.votes - a.votes,
          );

          return {
            ward: ward.ward,
            stations: ward.stations.size,
            registered: ward.registered,
            votes: ward.votes,
            turnout: pct(ward.votes, ward.registered),
            candidates,
            leader: candidates[0] ?? null,
          };
        });

        const candidateMap = new Map<
          string,
          { candidate: string; party: string; votes: number }
        >();

        for (const ward of wards) {
          for (const candidate of ward.candidates) {
            const key = `${candidate.candidate}::${candidate.party}`;
            const current = candidateMap.get(key) ?? {
              candidate: candidate.candidate,
              party: candidate.party,
              votes: 0,
            };
            current.votes += candidate.votes;
            candidateMap.set(key, current);
          }
        }

        const candidates = [...candidateMap.values()].sort(
          (a, b) => b.votes - a.votes,
        );

        const registered = wards.reduce(
          (sum, ward) => sum + ward.registered,
          0,
        );
        const votes = wards.reduce(
          (sum, ward) => sum + ward.votes,
          0,
        );
        const stationCount = wards.reduce(
          (sum, ward) => sum + ward.stations,
          0,
        );

        return {
          constituency: constituency.constituency,
          wards,
          candidates,
          registered,
          votes,
          stationCount,
          turnout: pct(votes, registered),
          leader: candidates[0] ?? null,
        };
      })
      .sort((a, b) => b.votes - a.votes);
  }, [results, stationMeta, stations]);

  const countyTotals = useMemo(() => {
    const registered = constituencies.reduce(
      (sum, row) => sum + row.registered,
      0,
    );
    const votes = constituencies.reduce(
      (sum, row) => sum + row.votes,
      0,
    );
    const wards = constituencies.reduce(
      (sum, row) => sum + row.wards.length,
      0,
    );

    return {
      constituencies: constituencies.length,
      wards,
      registered,
      votes,
      turnout: pct(votes, registered),
    };
  }, [constituencies]);

  return (
    <section className="space-y-4 border-b border-border/50 pb-5">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-widest text-primary">
            CONSTITUENCY & WARD RESULTS DASHBOARD
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Geographic result aggregation, ward leaders and turnout progress.
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["CONSTITUENCIES", countyTotals.constituencies, MapPinned],
          ["WARDS", countyTotals.wards, MapPinned],
          ["REGISTERED", number(countyTotals.registered), BarChart3],
          ["VOTES", number(countyTotals.votes), Trophy],
          ["TURNOUT", `${countyTotals.turnout}%`, BarChart3],
        ].map(([label, value, Icon]) => (
          <article key={String(label)} className="border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[8px] text-muted-foreground">{label}</p>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 truncate font-mono text-xl">{value}</p>
          </article>
        ))}
      </div>

      <div className="space-y-4">
        {constituencies.map((constituency) => {
          const isExpanded = expanded[constituency.constituency] ?? true;

          return (
            <article
              key={constituency.constituency}
              className="min-w-0 border border-border bg-card"
            >
              <button
                type="button"
                onClick={() =>
                  setExpanded((current) => ({
                    ...current,
                    [constituency.constituency]: !isExpanded,
                  }))
                }
                className="flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {constituency.constituency}
                  </p>
                  <p className="mt-1 break-words font-mono text-[8px] text-muted-foreground">
                    {constituency.wards.length} WARDS ·{" "}
                    {constituency.stationCount} STATIONS ·{" "}
                    {number(constituency.votes)} VOTES ·{" "}
                    {constituency.turnout}% TURNOUT
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="font-mono text-[8px] text-muted-foreground">
                      LEADER
                    </p>
                    <p className="mt-1 text-xs font-medium">
                      {constituency.leader?.candidate ?? "NO RESULTS"}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border p-4">
                  <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[0.75fr_1.25fr]">
                    <div className="space-y-3">
                      <p className="font-mono text-[9px] tracking-widest">
                        CONSTITUENCY LEADERBOARD
                      </p>

                      {constituency.candidates.map((candidate, index) => (
                        <div
                          key={`${candidate.candidate}-${candidate.party}`}
                          className="border border-border p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium">
                                {index + 1}. {candidate.candidate}
                              </p>
                              <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                                {candidate.party}
                              </p>
                            </div>
                            <p className="shrink-0 font-mono text-lg">
                              {number(candidate.votes)}
                            </p>
                          </div>

                          <div className="mt-3 h-1.5 bg-secondary">
                            <div
                              className="h-full bg-primary"
                              style={{
                                width: `${Math.min(
                                  100,
                                  pct(candidate.votes, constituency.votes),
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}

                      {constituency.candidates.length === 0 && (
                        <div className="border border-dashed border-border py-8 text-center font-mono text-[9px] text-muted-foreground">
                          [ NO_CONSTITUENCY_RESULTS ]
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="font-mono text-[9px] tracking-widest">
                        WARD RESULTS
                      </p>

                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-xs">
                          <thead className="border-b border-border text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2">Ward</th>
                              <th className="px-3 py-2">Stations</th>
                              <th className="px-3 py-2">Registered</th>
                              <th className="px-3 py-2">Votes</th>
                              <th className="px-3 py-2">Turnout</th>
                              <th className="px-3 py-2">Leader</th>
                              <th className="px-3 py-2">Party</th>
                            </tr>
                          </thead>
                          <tbody>
                            {constituency.wards.map((ward) => (
                              <tr
                                key={ward.ward}
                                className="border-b border-border/50"
                              >
                                <td className="px-3 py-3 font-medium">
                                  {ward.ward}
                                </td>
                                <td className="px-3 py-3">{ward.stations}</td>
                                <td className="px-3 py-3">
                                  {number(ward.registered)}
                                </td>
                                <td className="px-3 py-3">
                                  {number(ward.votes)}
                                </td>
                                <td className="px-3 py-3">
                                  {ward.turnout}%
                                </td>
                                <td className="px-3 py-3">
                                  {ward.leader?.candidate ?? "—"}
                                </td>
                                <td className="px-3 py-3">
                                  {ward.leader?.party ?? "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {!loading && constituencies.length === 0 && (
          <div className="border border-dashed border-border bg-card py-12 text-center font-mono text-[10px] text-muted-foreground">
            [ NO_CONSTITUENCY_OR_WARD_RESULTS ]
          </div>
        )}
      </div>
    </section>
  );
}
