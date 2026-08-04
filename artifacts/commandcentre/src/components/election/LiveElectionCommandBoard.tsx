import {
  Activity,
  AlertTriangle,
  Bus,
  CheckCircle2,
  Clock3,
  MapPin,
  Pause,
  Play,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

type OperationsPayload = {
  generatedAt: string;
  summary: {
    pollingStations: number;
    readyStations: number;
    openedStations: number;
    agents: number;
    agentsCheckedIn: number;
    vehicles: number;
    activeVehicles: number;
    observers: number;
    openEscalations: number;
  };
  wards: Array<{
    ward: string;
    totalStations: number;
    readyStations: number;
    openedStations: number;
    missingAgents: number;
    readiness: number;
    openingRate: number;
    riskScore: number;
  }>;
  stations: Array<any>;
  agents: Array<any>;
  vehicles: Array<any>;
  observers: Array<any>;
  escalations: Array<any>;
};

type TimelineItem = {
  id: string;
  type: string;
  title: string;
  detail: string;
  severity: string;
  timestamp: string;
};

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function tone(score: number) {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function severityClass(severity: string) {
  if (severity === "critical") return "text-red-400 border-red-400/40";
  if (severity === "high") return "text-orange-400 border-orange-400/40";
  if (severity === "medium") return "text-yellow-400 border-yellow-400/40";
  return "text-blue-400 border-blue-400/40";
}

function formatTime(value?: string | null) {
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

export default function LiveElectionCommandBoard() {
  const [data, setData] = useState<OperationsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${BASE}api/election-day/operations-centre`,
        { credentials: "include" },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load live election command board");
      }

      setData(await response.json());
      setLastUpdated(new Date().toLocaleTimeString("en-KE"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load live election command board",
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

  const summary = data?.summary ?? {
    pollingStations: 0,
    readyStations: 0,
    openedStations: 0,
    agents: 0,
    agentsCheckedIn: 0,
    vehicles: 0,
    activeVehicles: 0,
    observers: 0,
    openEscalations: 0,
  };

  const stationReadiness = percent(
    summary.readyStations,
    summary.pollingStations,
  );
  const openingRate = percent(
    summary.openedStations,
    summary.pollingStations,
  );
  const agentCoverage = percent(
    summary.agentsCheckedIn,
    Math.max(summary.agents, summary.pollingStations),
  );
  const vehicleReadiness = percent(
    summary.activeVehicles,
    summary.vehicles,
  );
  const observerCoverage = percent(
    summary.observers,
    summary.pollingStations,
  );

  const incidentHealth =
    summary.openEscalations === 0
      ? 100
      : clamp(100 - summary.openEscalations * 12);

  const operationsHealth = clamp(
    stationReadiness * 0.3 +
      openingRate * 0.25 +
      agentCoverage * 0.2 +
      vehicleReadiness * 0.1 +
      observerCoverage * 0.05 +
      incidentHealth * 0.1,
  );

  const highRiskWards = useMemo(
    () =>
      [...(data?.wards ?? [])]
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 8),
    [data?.wards],
  );

  const alerts = useMemo(() => {
    const items: Array<{
      title: string;
      detail: string;
      severity: string;
    }> = [];

    for (const ward of data?.wards ?? []) {
      if (ward.openingRate < 100) {
        items.push({
          title: `${ward.ward}: polling stations not fully opened`,
          detail: `${ward.openedStations}/${ward.totalStations} stations opened.`,
          severity: ward.openingRate < 60 ? "critical" : "high",
        });
      }

      if (ward.missingAgents > 0) {
        items.push({
          title: `${ward.ward}: missing polling agents`,
          detail: `${ward.missingAgents} station assignment gap(s).`,
          severity: ward.missingAgents > 2 ? "critical" : "high",
        });
      }

      if (ward.readiness < 60) {
        items.push({
          title: `${ward.ward}: readiness below threshold`,
          detail: `Ward readiness is ${ward.readiness}%.`,
          severity: ward.readiness < 40 ? "critical" : "high",
        });
      }
    }

    for (const incident of data?.escalations ?? []) {
      if (incident.status !== "resolved") {
        items.push({
          title: incident.title,
          detail:
            incident.description ||
            `${incident.ward || incident.stationCode || "County"} incident`,
          severity: incident.severity || "medium",
        });
      }
    }

    if (summary.vehicles > 0 && summary.activeVehicles === 0) {
      items.push({
        title: "No election vehicles are deployed",
        detail: `${summary.vehicles} vehicle(s) are registered but none are active.`,
        severity: "high",
      });
    }

    if (summary.observers < summary.pollingStations) {
      items.push({
        title: "Observer coverage is incomplete",
        detail: `${summary.observers}/${summary.pollingStations} station-equivalent observer assignments.`,
        severity: "medium",
      });
    }

    return items
      .sort((a, b) => {
        const order: Record<string, number> = {
          critical: 1,
          high: 2,
          medium: 3,
          low: 4,
        };
        return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
      })
      .slice(0, 20);
  }, [data, summary]);

  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];

    for (const station of data?.stations ?? []) {
      if (station.readinessUpdatedAt) {
        items.push({
          id: `station-${station.code}`,
          type: "readiness",
          title: `${station.name} readiness updated`,
          detail: `${station.ward} · ${station.code}`,
          severity:
            station.opened &&
            station.materialsReceived &&
            station.deviceReady &&
            station.connectivityReady &&
            station.presidingOfficerConfirmed
              ? "low"
              : "medium",
          timestamp: station.readinessUpdatedAt,
        });
      }
    }

    for (const agent of data?.agents ?? []) {
      items.push({
        id: `agent-${agent.id}`,
        type: "agent",
        title: `${agent.agentName} · ${agent.status}`,
        detail: `${agent.stationCode} · ${agent.role}`,
        severity: agent.status === "missing" ? "high" : "low",
        timestamp: agent.updatedAt || agent.createdAt,
      });
    }

    for (const vehicle of data?.vehicles ?? []) {
      items.push({
        id: `vehicle-${vehicle.id}`,
        type: "vehicle",
        title: `${vehicle.registrationNumber} · ${vehicle.status}`,
        detail: `${vehicle.ward || "No ward"} · ${vehicle.driverName || "No driver"}`,
        severity: vehicle.status === "deployed" ? "low" : "medium",
        timestamp: vehicle.updatedAt || vehicle.createdAt,
      });
    }

    for (const observer of data?.observers ?? []) {
      items.push({
        id: `observer-${observer.id}`,
        type: "observer",
        title: `${observer.observerName} · ${observer.status}`,
        detail:
          observer.ward ||
          observer.stationCode ||
          "No assignment",
        severity: observer.status === "missing" ? "high" : "low",
        timestamp: observer.updatedAt || observer.createdAt,
      });
    }

    for (const incident of data?.escalations ?? []) {
      items.push({
        id: `incident-${incident.id}`,
        type: "incident",
        title: incident.title,
        detail: `${incident.ward || incident.stationCode || "County"} · ${incident.status}`,
        severity: incident.severity || "medium",
        timestamp: incident.updatedAt || incident.createdAt,
      });
    }

    return items
      .filter((item) => item.timestamp)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime(),
      )
      .slice(0, 40);
  }, [data]);

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">
            PHASE 11A · LIVE ELECTION COMMAND BOARD
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Real-time election readiness, alerts, ward risk and operations timeline.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {lastUpdated && (
            <div className="border border-border px-3 py-2 font-mono text-[8px] text-muted-foreground">
              UPDATED {lastUpdated}
            </div>
          )}

          <button
            type="button"
            onClick={() => setAutoRefresh((value) => !value)}
            className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
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
            className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            REFRESH
          </button>
        </div>
      </header>

      {error && (
        <div className="border border-red-400/40 bg-red-400/5 p-3 font-mono text-[9px] text-red-400">
          [ LIVE_COMMAND_BOARD_ERROR ] {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {[
          ["OPERATIONS HEALTH", `${operationsHealth}%`, Activity, operationsHealth],
          ["STATION READINESS", `${stationReadiness}%`, CheckCircle2, stationReadiness],
          ["POLL OPENING", `${openingRate}%`, MapPin, openingRate],
          ["AGENT COVERAGE", `${agentCoverage}%`, UserCheck, agentCoverage],
          ["VEHICLE READINESS", `${vehicleReadiness}%`, Bus, vehicleReadiness],
          ["OBSERVER COVERAGE", `${observerCoverage}%`, Users, observerCoverage],
          ["OPEN ESCALATIONS", number(summary.openEscalations), ShieldAlert, incidentHealth],
        ].map(([label, value, Icon, score]) => (
          <article key={String(label)} className="border border-border bg-card p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-[7px] text-muted-foreground">
                {label}
              </p>
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className={`mt-3 font-mono text-lg ${tone(Number(score))}`}>
              {value}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                EXECUTIVE ALERT BANNER
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Automatic alerts generated from live election operations.
              </p>
            </div>
            <AlertTriangle className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-2">
            {alerts.map((alert, index) => (
              <div
                key={`${alert.title}-${index}`}
                className="grid gap-3 border border-border p-3 md:grid-cols-[28px_1fr_auto]"
              >
                <span className="flex h-7 w-7 items-center justify-center border border-border font-mono text-[8px] text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-xs font-medium">{alert.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {alert.detail}
                  </p>
                </div>
                <span
                  className={`h-fit border px-2 py-1 font-mono text-[8px] ${severityClass(
                    alert.severity,
                  )}`}
                >
                  {alert.severity.toUpperCase()}
                </span>
              </div>
            ))}

            {!loading && alerts.length === 0 && (
              <div className="border border-dashed border-border py-10 text-center font-mono text-[10px] text-muted-foreground">
                [ NO_CRITICAL_ELECTION_ALERTS ]
              </div>
            )}
          </div>
        </article>

        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                WARD READINESS HEAT TABLE
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Highest-risk wards ranked for command intervention.
              </p>
            </div>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-2">
            {highRiskWards.map((ward, index) => (
              <div
                key={ward.ward}
                className="border border-border p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px]">
                      {String(index + 1).padStart(2, "0")} ·{" "}
                      {ward.ward.toUpperCase()}
                    </p>
                    <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                      READY {ward.readiness}% · OPEN {ward.openingRate}% ·{" "}
                      {ward.missingAgents} AGENT GAP(S)
                    </p>
                  </div>
                  <span className={`font-mono text-sm ${tone(100 - ward.riskScore)}`}>
                    RISK {ward.riskScore}
                  </span>
                </div>
                <div className="mt-2 h-1.5 bg-secondary">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${ward.readiness}%` }}
                  />
                </div>
              </div>
            ))}

            {!loading && highRiskWards.length === 0 && (
              <div className="border border-dashed border-border py-10 text-center font-mono text-[10px] text-muted-foreground">
                [ NO_WARD_READINESS_DATA ]
              </div>
            )}
          </div>
        </article>
      </section>

      <article className="border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-widest">
              LIVE OPERATIONS TIMELINE
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Readiness updates, agent activity, vehicles, observers and incidents.
            </p>
          </div>
          <Clock3 className="h-4 w-4 text-primary" />
        </div>

        <div className="mt-4 space-y-2">
          {timeline.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 border border-border p-3 md:grid-cols-[34px_1fr_auto]"
            >
              <div className="flex h-8 w-8 items-center justify-center border border-border">
                {item.type === "incident" ? (
                  <AlertTriangle className="h-4 w-4 text-primary" />
                ) : item.type === "vehicle" ? (
                  <Bus className="h-4 w-4 text-primary" />
                ) : item.type === "agent" ? (
                  <UserCheck className="h-4 w-4 text-primary" />
                ) : (
                  <Activity className="h-4 w-4 text-primary" />
                )}
              </div>

              <div>
                <p className="text-xs font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.detail}
                </p>
              </div>

              <div className="text-right">
                <span
                  className={`border px-2 py-1 font-mono text-[8px] ${severityClass(
                    item.severity,
                  )}`}
                >
                  {item.severity.toUpperCase()}
                </span>
                <p className="mt-2 font-mono text-[7px] text-muted-foreground">
                  {formatTime(item.timestamp)}
                </p>
              </div>
            </div>
          ))}

          {!loading && timeline.length === 0 && (
            <div className="border border-dashed border-border py-12 text-center font-mono text-[10px] text-muted-foreground">
              [ NO_ELECTION_OPERATIONS_ACTIVITY ]
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
