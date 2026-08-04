import {
  AlertTriangle,
  BarChart3,
  Clock3,
  Gauge,
  MapPinned,
  Pause,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
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

function registeredOf(row: any) {
  return Number(
    row?.registeredVoters ??
      row?.registered_voters ??
      row?.registered ??
      0,
  );
}

function submittedAtOf(row: any) {
  return String(
    row?.submittedAt ??
      row?.submitted_at ??
      row?.createdAt ??
      row?.updatedAt ??
      "",
  );
}

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function severityTone(severity: string) {
  if (severity === "critical") return "text-red-400 border-red-400/40";
  if (severity === "high") return "text-orange-400 border-orange-400/40";
  if (severity === "medium") return "text-yellow-400 border-yellow-400/40";
  return "text-muted-foreground border-border";
}

export default function StatisticalAnomalyDetectionCentre() {
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
        throw new Error("Failed to load anomaly detection data");
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
          : "Unable to load Statistical Anomaly Detection Centre",
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

  const stationAnalysis = useMemo(() => {
    const map = new Map<
      string,
      {
        stationCode: string;
        ward: string;
        registered: number;
        totalVotes: number;
        verifiedVotes: number;
        candidateTotals: Map<string, number>;
        timestamps: number[];
        duplicateKeys: Set<string>;
        duplicateCount: number;
      }
    >();

    for (const row of results) {
      const stationCode = stationCodeOf(row) || `UNKNOWN-${row.id}`;
      const station = stationMeta.get(stationCode);
      const current = map.get(stationCode) ?? {
        stationCode,
        ward:
          wardOf(row) !== "UNASSIGNED"
            ? wardOf(row)
            : wardOf(station),
        registered: registeredOf(station),
        totalVotes: 0,
        verifiedVotes: 0,
        candidateTotals: new Map<string, number>(),
        timestamps: [],
        duplicateKeys: new Set<string>(),
        duplicateCount: 0,
      };

      const votes = votesOf(row);
      current.totalVotes += votes;

      if (statusOf(row) === "verified") {
        current.verifiedVotes += votes;
      }

      const candidate = candidateOf(row);
      current.candidateTotals.set(
        candidate,
        Number(current.candidateTotals.get(candidate) ?? 0) + votes,
      );

      const duplicateKey = `${candidate.toLowerCase()}::${votes}`;
      if (current.duplicateKeys.has(duplicateKey)) {
        current.duplicateCount += 1;
      }
      current.duplicateKeys.add(duplicateKey);

      const timestamp = new Date(submittedAtOf(row)).getTime();
      if (Number.isFinite(timestamp)) {
        current.timestamps.push(timestamp);
      }

      map.set(stationCode, current);
    }

    return [...map.values()].map((station) => {
      const candidateTotals = [...station.candidateTotals.entries()].sort(
        (a, b) => b[1] - a[1],
      );

      const leaderVotes = candidateTotals[0]?.[1] ?? 0;
      const concentration = pct(leaderVotes, station.totalVotes);
      const turnoutRate = pct(station.totalVotes, station.registered);
      const verificationRate = pct(
        station.verifiedVotes,
        station.totalVotes,
      );

      const sortedTimes = [...station.timestamps].sort((a, b) => a - b);
      const reportingSpanMinutes =
        sortedTimes.length > 1
          ? Math.round(
              (sortedTimes[sortedTimes.length - 1] - sortedTimes[0]) /
                60000,
            )
          : 0;

      let riskScore = 0;
      const reasons: string[] = [];

      if (station.registered > 0 && turnoutRate > 100) {
        riskScore += 45;
        reasons.push("Votes exceed registered voters");
      } else if (turnoutRate > 90) {
        riskScore += 20;
        reasons.push("Unusually high turnout");
      }

      if (concentration > 95 && station.totalVotes > 50) {
        riskScore += 20;
        reasons.push("Extreme candidate concentration");
      }

      if (station.duplicateCount > 0) {
        riskScore += Math.min(25, station.duplicateCount * 10);
        reasons.push("Possible duplicate result rows");
      }

      if (
        sortedTimes.length > 4 &&
        reportingSpanMinutes <= 1
      ) {
        riskScore += 15;
        reasons.push("Results submitted unusually quickly");
      }

      if (verificationRate < 25 && station.totalVotes > 0) {
        riskScore += 15;
        reasons.push("Low verification coverage");
      }

      return {
        ...station,
        candidateTotals,
        turnoutRate,
        concentration,
        verificationRate,
        reportingSpanMinutes,
        riskScore: Math.min(100, riskScore),
        reasons,
      };
    });
  }, [results, stationMeta]);

  const anomalies = useMemo(
    () =>
      stationAnalysis
        .filter((station) => station.riskScore > 0)
        .sort((a, b) => b.riskScore - a.riskScore),
    [stationAnalysis],
  );

  const wardRisk = useMemo(() => {
    const map = new Map<
      string,
      {
        ward: string;
        stations: number;
        anomalousStations: number;
        riskTotal: number;
        totalVotes: number;
      }
    >();

    for (const station of stationAnalysis) {
      const current = map.get(station.ward) ?? {
        ward: station.ward,
        stations: 0,
        anomalousStations: 0,
        riskTotal: 0,
        totalVotes: 0,
      };

      current.stations += 1;
      current.totalVotes += station.totalVotes;
      current.riskTotal += station.riskScore;
      if (station.riskScore > 0) current.anomalousStations += 1;
      map.set(station.ward, current);
    }

    return [...map.values()]
      .map((ward) => ({
        ...ward,
        averageRisk:
          ward.stations > 0
            ? Math.round(ward.riskTotal / ward.stations)
            : 0,
      }))
      .sort((a, b) => b.averageRisk - a.averageRisk);
  }, [stationAnalysis]);

  const criticalCount = anomalies.filter(
    (station) => station.riskScore >= 70,
  ).length;

  const highCount = anomalies.filter(
    (station) =>
      station.riskScore >= 40 && station.riskScore < 70,
  ).length;

  const averageRisk =
    stationAnalysis.length > 0
      ? Math.round(
          stationAnalysis.reduce(
            (sum, station) => sum + station.riskScore,
            0,
          ) / stationAnalysis.length,
        )
      : 0;

  return (
    <section className="space-y-4 border-b border-border/50 pb-5">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-widest text-primary">
            STATISTICAL ANOMALY DETECTION CENTRE
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Turnout outliers, duplicate patterns, vote concentration, reporting speed and verification risk.
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
            <RefreshCw
              className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
            />
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
          ["ANOMALOUS STATIONS", anomalies.length, AlertTriangle],
          ["CRITICAL", criticalCount, ShieldAlert],
          ["HIGH RISK", highCount, ShieldAlert],
          ["AVERAGE RISK", `${averageRisk}%`, Gauge],
          ["STATIONS ANALYSED", stationAnalysis.length, ShieldCheck],
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
            <p className="mt-3 truncate font-mono text-xl">{value}</p>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.2fr_0.8fr]">
        <article className="min-w-0 border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                STATION ANOMALY RANKING
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Stations ranked by combined statistical risk.
              </p>
            </div>
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-3">
            {anomalies.map((station, index) => {
              const severity =
                station.riskScore >= 70
                  ? "critical"
                  : station.riskScore >= 40
                    ? "high"
                    : "medium";

              return (
                <div
                  key={station.stationCode}
                  className="border border-border p-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {String(index + 1).padStart(2, "0")} ·{" "}
                        {station.stationCode}
                      </p>
                      <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                        {station.ward} · {number(station.totalVotes)} VOTES ·{" "}
                        {station.turnoutRate}% TURNOUT
                      </p>
                    </div>

                    <span
                      className={`shrink-0 border px-2 py-1 font-mono text-[8px] ${severityTone(
                        severity,
                      )}`}
                    >
                      RISK {station.riskScore}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="border border-border p-3">
                      <p className="font-mono text-[7px] text-muted-foreground">
                        CONCENTRATION
                      </p>
                      <p className="mt-2 font-mono text-sm">
                        {station.concentration}%
                      </p>
                    </div>

                    <div className="border border-border p-3">
                      <p className="font-mono text-[7px] text-muted-foreground">
                        VERIFIED
                      </p>
                      <p className="mt-2 font-mono text-sm">
                        {station.verificationRate}%
                      </p>
                    </div>

                    <div className="border border-border p-3">
                      <p className="font-mono text-[7px] text-muted-foreground">
                        REPORTING SPAN
                      </p>
                      <p className="mt-2 font-mono text-sm">
                        {station.reportingSpanMinutes} MIN
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    {station.reasons.map((reason) => (
                      <p
                        key={reason}
                        className="flex gap-2 text-xs text-muted-foreground"
                      >
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        {reason}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}

            {!loading && anomalies.length === 0 && (
              <div className="border border-dashed border-border py-10 text-center font-mono text-[10px] text-muted-foreground">
                [ NO_ACTIVE_STATISTICAL_ANOMALIES ]
              </div>
            )}
          </div>
        </article>

        <article className="min-w-0 border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                WARD RISK INDEX
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Aggregated anomaly risk by ward.
              </p>
            </div>
            <MapPinned className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-3">
            {wardRisk.map((ward) => (
              <div
                key={ward.ward}
                className="border border-border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">
                      {ward.ward}
                    </p>
                    <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                      {ward.anomalousStations}/{ward.stations} ANOMALOUS ·{" "}
                      {number(ward.totalVotes)} VOTES
                    </p>
                  </div>

                  <span className="shrink-0 font-mono text-sm">
                    {ward.averageRisk}%
                  </span>
                </div>

                <div className="mt-3 h-1.5 bg-secondary">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Math.min(100, ward.averageRisk)}%`,
                    }}
                  />
                </div>
              </div>
            ))}

            {!loading && wardRisk.length === 0 && (
              <div className="border border-dashed border-border py-10 text-center font-mono text-[10px] text-muted-foreground">
                [ NO_WARD_RISK_DATA ]
              </div>
            )}
          </div>
        </article>
      </div>

      <div className="border border-border bg-card p-4">
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          Anomaly scores are investigative indicators. They do not establish misconduct and must be reviewed alongside official forms, agent reports and verification records.
        </p>
      </div>
    </section>
  );
}
