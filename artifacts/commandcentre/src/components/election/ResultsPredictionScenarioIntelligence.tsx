import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  Gauge,
  Pause,
  Play,
  RefreshCw,
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

export default function ResultsPredictionScenarioIntelligence() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [stations, setStations] = useState<StationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState("");
  const [turnoutScenario, setTurnoutScenario] = useState(65);
  const [reportingScenario, setReportingScenario] = useState(100);

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
        throw new Error("Failed to load projection data");
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
          : "Unable to load Results Projection & Scenario Intelligence",
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
        results.map(stationCodeOf).filter(Boolean),
      ),
    [results],
  );

  const totalStations = stations.length;
  const reportedStations = stationCodes.size;
  const reportingRate = pct(reportedStations, totalStations);

  const registeredVoters = stations.reduce(
    (sum, station) => sum + registeredOf(station),
    0,
  );

  const candidateRows = useMemo(() => {
    const map = new Map<
      string,
      {
        candidate: string;
        party: string;
        currentVotes: number;
        verifiedVotes: number;
      }
    >();

    for (const row of results) {
      const candidate = candidateOf(row);
      const party = partyOf(row);
      const key = `${candidate}::${party}`;

      const current = map.get(key) ?? {
        candidate,
        party,
        currentVotes: 0,
        verifiedVotes: 0,
      };

      const votes = votesOf(row);
      current.currentVotes += votes;

      if (statusOf(row) === "verified") {
        current.verifiedVotes += votes;
      }

      map.set(key, current);
    }

    const totalCurrentVotes = [...map.values()].reduce(
      (sum, row) => sum + row.currentVotes,
      0,
    );

    const projectedElectorate = Math.round(
      registeredVoters * (turnoutScenario / 100),
    );

    const effectiveReporting =
      reportingRate > 0 ? reportingRate : reportingScenario;

    return [...map.values()]
      .map((row) => {
        const currentShare = pct(row.currentVotes, totalCurrentVotes);
        const confidenceBase =
          totalStations > 0
            ? Math.min(100, reportingRate)
            : 0;
        const verificationShare = pct(
          row.verifiedVotes,
          row.currentVotes,
        );

        const projectedVotes = Math.round(
          projectedElectorate * (currentShare / 100),
        );

        const lowProjection = Math.round(
          projectedVotes *
            Math.max(0.7, effectiveReporting / 100),
        );

        const highProjection = Math.round(
          projectedVotes *
            Math.min(1.3, 1 + (100 - effectiveReporting) / 200),
        );

        const confidence = Math.round(
          confidenceBase * 0.65 +
            verificationShare * 0.35,
        );

        return {
          ...row,
          currentShare,
          projectedVotes,
          lowProjection,
          highProjection,
          confidence,
        };
      })
      .sort((a, b) => b.projectedVotes - a.projectedVotes);
  }, [
    registeredVoters,
    reportingRate,
    reportingScenario,
    results,
    stations,
    totalStations,
    turnoutScenario,
  ]);

  const projectedTotal = candidateRows.reduce(
    (sum, row) => sum + row.projectedVotes,
    0,
  );

  const projectedLeader = candidateRows[0] ?? null;
  const projectedRunnerUp = candidateRows[1] ?? null;

  const leadMargin = projectedLeader
    ? projectedLeader.projectedVotes -
      Number(projectedRunnerUp?.projectedVotes ?? 0)
    : 0;

  const alerts = useMemo(() => {
    const items: Array<{
      title: string;
      detail: string;
      severity: string;
    }> = [];

    if (reportingRate < 30) {
      items.push({
        title: "Low reporting confidence",
        detail:
          "Less than 30% of polling stations are reporting. Projections may change substantially.",
        severity: "critical",
      });
    } else if (reportingRate < 60) {
      items.push({
        title: "Moderate reporting confidence",
        detail:
          "Projection confidence remains limited until more stations report.",
        severity: "high",
      });
    }

    if (projectedLeader && leadMargin < projectedTotal * 0.02) {
      items.push({
        title: "Projected race remains very close",
        detail: `Projected margin is ${number(leadMargin)} votes.`,
        severity: "critical",
      });
    }

    for (const row of candidateRows) {
      if (row.confidence < 50) {
        items.push({
          title: `${row.candidate} projection confidence is low`,
          detail: `Current confidence score is ${row.confidence}%.`,
          severity: "medium",
        });
      }
    }

    return items.slice(0, 20);
  }, [candidateRows, leadMargin, projectedLeader, projectedTotal, reportingRate]);

  return (
    <section className="space-y-4 border-b border-border/50 pb-5">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-widest text-primary">
            RESULTS PROJECTION & SCENARIO INTELLIGENCE
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Statistical projection using live vote share, reporting progress and verified-result confidence.
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

      <article className="border border-border bg-card p-4">
        <p className="font-mono text-[10px] tracking-widest">
          SCENARIO CONTROLS
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[8px] text-muted-foreground">
                PROJECTED TURNOUT
              </span>
              <span className="font-mono text-sm">
                {turnoutScenario}%
              </span>
            </div>

            <input
              type="range"
              min="20"
              max="100"
              value={turnoutScenario}
              onChange={(event) =>
                setTurnoutScenario(Number(event.target.value))
              }
              className="mt-3 w-full"
            />
          </label>

          <label className="border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[8px] text-muted-foreground">
                TARGET REPORTING
              </span>
              <span className="font-mono text-sm">
                {reportingScenario}%
              </span>
            </div>

            <input
              type="range"
              min="10"
              max="100"
              value={reportingScenario}
              onChange={(event) =>
                setReportingScenario(Number(event.target.value))
              }
              className="mt-3 w-full"
            />
          </label>
        </div>
      </article>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["REPORTING", `${reportingRate}%`, BarChart3],
          ["REGISTERED", number(registeredVoters), Gauge],
          ["PROJECTED TURNOUT", number(projectedTotal), TrendingUp],
          ["PROJECTED LEADER", projectedLeader?.candidate ?? "NO DATA", BrainCircuit],
          ["PROJECTED MARGIN", number(leadMargin), Trophy],
        ].map(([label, value, Icon]) => (
          <article key={String(label)} className="min-w-0 border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[8px] text-muted-foreground">
                {label}
              </p>
              <Icon className="h-4 w-4 shrink-0 text-primary" />
            </div>
            <p className="mt-3 truncate font-mono text-lg">
              {value}
            </p>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.2fr_0.8fr]">
        <article className="min-w-0 border border-border bg-card p-4">
          <p className="font-mono text-[10px] tracking-widest">
            CANDIDATE PROJECTION RANGE
          </p>

          <div className="mt-4 space-y-3">
            {candidateRows.map((row, index) => (
              <div
                key={`${row.candidate}-${row.party}`}
                className="border border-border p-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {index + 1}. {row.candidate}
                    </p>
                    <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                      {row.party} · CURRENT SHARE {row.currentShare}% · CONFIDENCE{" "}
                      {row.confidence}%
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-mono text-xl">
                      {number(row.projectedVotes)}
                    </p>
                    <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                      RANGE {number(row.lowProjection)}–{number(row.highProjection)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 h-1.5 bg-secondary">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Math.min(100, row.currentShare)}%`,
                    }}
                  />
                </div>
              </div>
            ))}

            {!loading && candidateRows.length === 0 && (
              <div className="border border-dashed border-border py-10 text-center font-mono text-[10px] text-muted-foreground">
                [ NO_RESULTS_AVAILABLE_FOR_PROJECTION ]
              </div>
            )}
          </div>
        </article>

        <article className="min-w-0 border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                PROJECTION ALERTS
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Confidence, reporting and close-race warnings.
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
                [ NO_ACTIVE_PROJECTION_ALERTS ]
              </div>
            )}
          </div>
        </article>
      </div>

      <div className="border border-border bg-card p-4">
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          Projections are scenario estimates, not certified results. They depend on current vote share,
          polling-station reporting and verification coverage.
        </p>
      </div>
    </section>
  );
}
