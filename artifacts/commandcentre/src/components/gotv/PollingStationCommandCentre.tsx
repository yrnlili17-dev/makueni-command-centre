import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Clock3,
  Loader2,
  MapPin,
  Pause,
  Play,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

type PollingCommandPayload = {
  generatedAt: string;
  summary: {
    stations: number;
    reporting: number;
    registered: number;
    turnout: number;
    turnoutRate: number;
    activeIncidents: number;
    longQueues: number;
    failedDevices: number;
    missingMaterials: number;
    logisticsAvailable: number;
  };
  wards: Array<any>;
  stations: Array<any>;
  incidents: Array<any>;
  hourly: Array<{
    hour: number;
    turnout: number;
    reports: number;
  }>;
  logistics: Array<any>;
};

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function tone(score: number) {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

export default function PollingStationCommandCentre() {
  const [data, setData] = useState<PollingCommandPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [panel, setPanel] = useState<
    "overview" | "stations" | "hourly" | "logistics"
  >("overview");
  const [error, setError] = useState("");

  const [hourlyForm, setHourlyForm] = useState({
    stationCode: "",
    ward: "",
    reportHour: "7",
    turnoutCount: "",
    reportedBy: "",
  });

  const [logisticsForm, setLogisticsForm] = useState({
    resourceType: "vehicle",
    resourceName: "",
    ward: "",
    stationCode: "",
    quantity: "1",
    status: "available",
    assignedTo: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${BASE}api/turnout/operations-centre/polling-command`,
        { credentials: "include" },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.error ?? "Failed to load Polling Station Command Centre",
        );
      }

      setData(await response.json());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Polling Station Command Centre",
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
    stations: 0,
    reporting: 0,
    registered: 0,
    turnout: 0,
    turnoutRate: 0,
    activeIncidents: 0,
    longQueues: 0,
    failedDevices: 0,
    missingMaterials: 0,
    logisticsAvailable: 0,
  };

  const wards = useMemo(
    () =>
      [...(data?.wards ?? [])].sort(
        (a, b) => b.riskScore - a.riskScore,
      ),
    [data?.wards],
  );

  async function saveHourly() {
    if (!hourlyForm.stationCode) return;
    setSaving(true);

    try {
      const response = await fetch(
        `${BASE}api/turnout/operations-centre/polling-command/hourly-turnout`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...hourlyForm,
            reportHour: Number(hourlyForm.reportHour),
            turnoutCount: Number(hourlyForm.turnoutCount || 0),
          }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save hourly turnout");
      }

      setHourlyForm({
        stationCode: "",
        ward: "",
        reportHour: "7",
        turnoutCount: "",
        reportedBy: "",
      });

      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Hourly turnout failed");
    } finally {
      setSaving(false);
    }
  }

  async function addLogistics() {
    if (!logisticsForm.resourceName) return;
    setSaving(true);

    try {
      const response = await fetch(
        `${BASE}api/turnout/operations-centre/polling-command/logistics`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...logisticsForm,
            quantity: Number(logisticsForm.quantity || 1),
          }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create logistics item");
      }

      setLogisticsForm({
        resourceType: "vehicle",
        resourceName: "",
        ward: "",
        stationCode: "",
        quantity: "1",
        status: "available",
        assignedTo: "",
      });

      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Logistics creation failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4 border-b border-border/50 pb-5">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">
            POLLING STATION COMMAND CENTRE
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Live turnout, polling-station reporting, queues, incidents and logistics.
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
        <div className="border border-red-400/40 p-3 font-mono text-[9px] text-red-400">
          [ POLLING_COMMAND_ERROR ] {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-10">
        {[
          ["STATIONS", summary.stations, MapPin],
          ["REPORTING", summary.reporting, BarChart3],
          ["REGISTERED", number(summary.registered), Users],
          ["TURNOUT", number(summary.turnout), Users],
          ["TURNOUT RATE", `${summary.turnoutRate}%`, BarChart3],
          ["INCIDENTS", summary.activeIncidents, AlertTriangle],
          ["LONG QUEUES", summary.longQueues, Clock3],
          ["DEVICE FAILURES", summary.failedDevices, ShieldAlert],
          ["MISSING MATERIALS", summary.missingMaterials, Boxes],
          ["LOGISTICS AVAILABLE", summary.logisticsAvailable, Boxes],
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

      <div className="flex flex-wrap gap-2">
        {[
          ["overview", "COUNTY OVERVIEW"],
          ["stations", "POLLING STATIONS"],
          ["hourly", "HOURLY TURNOUT"],
          ["logistics", "LOGISTICS"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setPanel(value as any)}
            className={`min-h-10 border px-3 py-2 font-mono text-[8px] ${
              panel === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {panel === "overview" && (
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.15fr_0.85fr]">
          <article className="min-w-0 border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest">
              WARD POLLING RISK
            </p>

            <div className="mt-4 space-y-3">
              {wards.map((ward, index) => (
                <div key={ward.ward} className="min-w-0 border border-border p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[9px]">
                        {String(index + 1).padStart(2, "0")} ·{" "}
                        {String(ward.ward).toUpperCase()}
                      </p>
                      <p className="mt-1 break-words font-mono text-[8px] text-muted-foreground">
                        TURNOUT {ward.turnoutRate}% · REPORTING{" "}
                        {ward.reportingRate}% · INCIDENTS{" "}
                        {ward.activeIncidents} · LONG QUEUES{" "}
                        {ward.longQueues}
                      </p>
                    </div>
                    <span className={`shrink-0 font-mono text-sm ${tone(100 - ward.riskScore)}`}>
                      RISK {ward.riskScore}
                    </span>
                  </div>

                  <div className="mt-3 h-1.5 bg-secondary">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${ward.reportingRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="min-w-0 border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest">
              ACTIVE INCIDENTS
            </p>

            <div className="mt-4 space-y-2">
              {(data?.incidents ?? [])
                .filter((incident) => incident.status !== "resolved")
                .slice(0, 20)
                .map((incident) => (
                  <div
                    key={incident.id}
                    className="min-w-0 border border-border p-3"
                  >
                    <p className="break-words text-xs font-medium">
                      {incident.title}
                    </p>
                    <p className="mt-1 break-words text-xs text-muted-foreground">
                      {incident.description || "No description"}
                    </p>
                    <p className="mt-2 font-mono text-[8px] text-muted-foreground">
                      {(incident.ward ||
                        incident.stationCode ||
                        "COUNTY").toUpperCase()}{" "}
                      · {incident.severity.toUpperCase()}
                    </p>
                  </div>
                ))}
            </div>
          </article>
        </div>
      )}

      {panel === "stations" && (
        <article className="min-w-0 border border-border bg-card p-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-xs">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Station</th>
                  <th className="px-3 py-2">Ward</th>
                  <th className="px-3 py-2">Registered</th>
                  <th className="px-3 py-2">Turnout</th>
                  <th className="px-3 py-2">Agent</th>
                  <th className="px-3 py-2">Opening</th>
                  <th className="px-3 py-2">Queue</th>
                  <th className="px-3 py-2">Device</th>
                  <th className="px-3 py-2">Materials</th>
                  <th className="px-3 py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {(data?.stations ?? []).map((station) => (
                  <tr
                    key={station.stationCode}
                    className="border-b border-border/50"
                  >
                    <td className="px-3 py-3">
                      {station.stationCode} · {station.stationName}
                    </td>
                    <td className="px-3 py-3">{station.ward || "—"}</td>
                    <td className="px-3 py-3">{station.registeredVoters}</td>
                    <td className="px-3 py-3">{station.turnoutCount}</td>
                    <td className="px-3 py-3">
                      {station.agentName || "UNASSIGNED"}
                    </td>
                    <td className="px-3 py-3">{station.openingStatus}</td>
                    <td className="px-3 py-3">{station.queueStatus}</td>
                    <td className="px-3 py-3">{station.deviceStatus}</td>
                    <td className="px-3 py-3">{station.materialsStatus}</td>
                    <td className="px-3 py-3">
                      {String(station.updatedAt || "").slice(0, 16)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {panel === "hourly" && (
        <section className="space-y-4">
          <article className="min-w-0 border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest">
              REPORT HOURLY TURNOUT
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <select
                value={hourlyForm.stationCode}
                onChange={(event) => {
                  const station = (data?.stations ?? []).find(
                    (item) => item.stationCode === event.target.value,
                  );
                  setHourlyForm({
                    ...hourlyForm,
                    stationCode: event.target.value,
                    ward: station?.ward || "",
                  });
                }}
                className="min-h-10 min-w-0 border border-border bg-background px-3 py-2 font-mono text-[8px]"
              >
                <option value="">SELECT STATION</option>
                {(data?.stations ?? []).map((station) => (
                  <option
                    key={station.stationCode}
                    value={station.stationCode}
                  >
                    {station.stationCode} · {station.stationName}
                  </option>
                ))}
              </select>

              <select
                value={hourlyForm.reportHour}
                onChange={(event) =>
                  setHourlyForm({
                    ...hourlyForm,
                    reportHour: event.target.value,
                  })
                }
                className="min-h-10 border border-border bg-background px-3 py-2 font-mono text-[8px]"
              >
                {Array.from({ length: 11 }, (_, index) => index + 7).map(
                  (hour) => (
                    <option key={hour} value={hour}>
                      {String(hour).padStart(2, "0")}:00
                    </option>
                  ),
                )}
              </select>

              <input
                type="number"
                value={hourlyForm.turnoutCount}
                onChange={(event) =>
                  setHourlyForm({
                    ...hourlyForm,
                    turnoutCount: event.target.value,
                  })
                }
                placeholder="Cumulative turnout"
                className="min-h-10 min-w-0 border border-border bg-background px-3 py-2 text-xs"
              />

              <input
                value={hourlyForm.reportedBy}
                onChange={(event) =>
                  setHourlyForm({
                    ...hourlyForm,
                    reportedBy: event.target.value,
                  })
                }
                placeholder="Reported by"
                className="min-h-10 min-w-0 border border-border bg-background px-3 py-2 text-xs"
              />

              <button
                type="button"
                onClick={saveHourly}
                disabled={!hourlyForm.stationCode || saving}
                className="flex min-h-10 items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Clock3 className="h-3 w-3" />
                )}
                SAVE TURNOUT
              </button>
            </div>
          </article>

          <article className="min-w-0 border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest">
              COUNTY HOURLY TURNOUT
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 2xl:grid-cols-11">
              {(data?.hourly ?? []).map((row) => (
                <div key={row.hour} className="border border-border p-3">
                  <p className="font-mono text-[8px] text-muted-foreground">
                    {String(row.hour).padStart(2, "0")}:00
                  </p>
                  <p className="mt-2 font-mono text-lg">{number(row.turnout)}</p>
                  <p className="mt-1 font-mono text-[7px] text-muted-foreground">
                    {row.reports} REPORTS
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}

      {panel === "logistics" && (
        <section className="space-y-4">
          <article className="min-w-0 border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest">
              ADD LOGISTICS RESOURCE
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
              <select
                value={logisticsForm.resourceType}
                onChange={(event) =>
                  setLogisticsForm({
                    ...logisticsForm,
                    resourceType: event.target.value,
                  })
                }
                className="min-h-10 border border-border bg-background px-3 py-2 font-mono text-[8px]"
              >
                <option value="vehicle">VEHICLE</option>
                <option value="device">BACKUP DEVICE</option>
                <option value="materials">ELECTION MATERIALS</option>
                <option value="agent">REPLACEMENT AGENT</option>
                <option value="security">SECURITY SUPPORT</option>
              </select>

              <input
                value={logisticsForm.resourceName}
                onChange={(event) =>
                  setLogisticsForm({
                    ...logisticsForm,
                    resourceName: event.target.value,
                  })
                }
                placeholder="Resource name"
                className="min-h-10 min-w-0 border border-border bg-background px-3 py-2 text-xs"
              />

              <input
                value={logisticsForm.ward}
                onChange={(event) =>
                  setLogisticsForm({
                    ...logisticsForm,
                    ward: event.target.value,
                  })
                }
                placeholder="Ward"
                className="min-h-10 min-w-0 border border-border bg-background px-3 py-2 text-xs"
              />

              <input
                value={logisticsForm.stationCode}
                onChange={(event) =>
                  setLogisticsForm({
                    ...logisticsForm,
                    stationCode: event.target.value,
                  })
                }
                placeholder="Station code"
                className="min-h-10 min-w-0 border border-border bg-background px-3 py-2 text-xs"
              />

              <input
                type="number"
                value={logisticsForm.quantity}
                onChange={(event) =>
                  setLogisticsForm({
                    ...logisticsForm,
                    quantity: event.target.value,
                  })
                }
                placeholder="Quantity"
                className="min-h-10 min-w-0 border border-border bg-background px-3 py-2 text-xs"
              />

              <input
                value={logisticsForm.assignedTo}
                onChange={(event) =>
                  setLogisticsForm({
                    ...logisticsForm,
                    assignedTo: event.target.value,
                  })
                }
                placeholder="Assigned to"
                className="min-h-10 min-w-0 border border-border bg-background px-3 py-2 text-xs"
              />

              <button
                type="button"
                onClick={addLogistics}
                disabled={!logisticsForm.resourceName || saving}
                className="flex min-h-10 items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
              >
                <Boxes className="h-3 w-3" />
                ADD RESOURCE
              </button>
            </div>
          </article>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {(data?.logistics ?? []).map((item) => (
              <article
                key={item.id}
                className="min-w-0 border border-border bg-card p-3"
              >
                <p className="truncate text-xs font-medium">
                  {item.resourceName}
                </p>
                <p className="mt-1 break-words font-mono text-[8px] text-muted-foreground">
                  {item.resourceType.toUpperCase()} ·{" "}
                  {(item.ward || item.stationCode || "COUNTY").toUpperCase()}
                </p>
                <p className="mt-2 font-mono text-[8px]">
                  {item.status.toUpperCase()} · QTY {item.quantity}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
