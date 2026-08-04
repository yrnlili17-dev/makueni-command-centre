import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

type DispatchPayload = {
  generatedAt: string;
  summary: {
    stations: number;
    opened: number;
    agentsPresent: number;
    devicesReady: number;
    materialsReady: number;
    turnout: number;
    openIncidents: number;
  };
  wards: Array<{
    ward: string;
    stations: number;
    opened: number;
    agentsPresent: number;
    deviceReady: number;
    materialsReady: number;
    turnout: number;
    openIncidents: number;
  }>;
  stations: Array<any>;
  incidents: Array<any>;
};

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export default function ElectionDayDispatchCommand() {
  const [data, setData] = useState<DispatchPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [panel, setPanel] = useState<
    "overview" | "stations" | "incidents"
  >("overview");
  const [selectedStation, setSelectedStation] = useState("");
  const [stationForm, setStationForm] = useState({
    openingStatus: "not-open",
    queueStatus: "normal",
    materialsStatus: "unknown",
    deviceStatus: "unknown",
    turnoutCount: "0",
    turnoutHour: "",
  });
  const [incidentForm, setIncidentForm] = useState({
    stationCode: "",
    ward: "",
    title: "",
    description: "",
    severity: "high",
    assignedTo: "",
  });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${BASE}api/turnout/operations-centre/election-dispatch`,
        { credentials: "include" },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load election dispatch");
      }

      setData(await response.json());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Election Day Dispatch",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = data?.summary ?? {
    stations: 0,
    opened: 0,
    agentsPresent: 0,
    devicesReady: 0,
    materialsReady: 0,
    turnout: 0,
    openIncidents: 0,
  };

  const readinessScore = Math.round(
    pct(summary.opened, summary.stations) * 0.3 +
      pct(summary.agentsPresent, summary.stations) * 0.25 +
      pct(summary.devicesReady, summary.stations) * 0.25 +
      pct(summary.materialsReady, summary.stations) * 0.2,
  );

  const wards = useMemo(
    () =>
      [...(data?.wards ?? [])].sort((a, b) => {
        const ar = a.openIncidents * 20 + (a.stations - a.opened) * 10;
        const br = b.openIncidents * 20 + (b.stations - b.opened) * 10;
        return br - ar;
      }),
    [data?.wards],
  );

  async function saveStation() {
    if (!selectedStation) return;
    setSaving(true);

    try {
      const response = await fetch(
        `${BASE}api/turnout/operations-centre/election-dispatch/stations/${encodeURIComponent(
          selectedStation,
        )}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...stationForm,
            turnoutCount: Number(stationForm.turnoutCount || 0),
            turnoutHour: stationForm.turnoutHour
              ? Number(stationForm.turnoutHour)
              : null,
          }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to update station");
      }

      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Station update failed");
    } finally {
      setSaving(false);
    }
  }

  async function createIncident() {
    if (!incidentForm.title) return;
    setSaving(true);

    try {
      const response = await fetch(
        `${BASE}api/turnout/operations-centre/election-dispatch/incidents`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(incidentForm),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create incident");
      }

      setIncidentForm({
        stationCode: "",
        ward: "",
        title: "",
        description: "",
        severity: "high",
        assignedTo: "",
      });

      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Incident creation failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4 border-b border-border/50 pb-5">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">
            PHASE 11B · ELECTION DAY DISPATCH COMMAND
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Polling station opening, agent presence, devices, materials, turnout and incidents.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          REFRESH
        </button>
      </header>

      {error && (
        <div className="border border-red-400/40 p-3 font-mono text-[9px] text-red-400">
          [ ELECTION_DISPATCH_ERROR ] {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {[
          ["READINESS", `${readinessScore}%`, CheckCircle2],
          ["STATIONS", summary.stations, MapPin],
          ["OPENED", summary.opened, CheckCircle2],
          ["AGENTS PRESENT", summary.agentsPresent, UserCheck],
          ["DEVICES READY", summary.devicesReady, ShieldAlert],
          ["MATERIALS READY", summary.materialsReady, CheckCircle2],
          ["TURNOUT RECORDED", number(summary.turnout), Users],
          ["OPEN INCIDENTS", summary.openIncidents, AlertTriangle],
        ].map(([label, value, Icon]) => (
          <article key={String(label)} className="border border-border bg-card p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-[7px] text-muted-foreground">
                {label}
              </p>
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="mt-3 font-mono text-lg">{value}</p>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["overview", "COUNTY OVERVIEW"],
          ["stations", "STATION DISPATCH"],
          ["incidents", "INCIDENT COMMAND"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setPanel(value as any)}
            className={`border px-3 py-2 font-mono text-[8px] ${
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
        <article className="border border-border bg-card p-4">
          <p className="font-mono text-[10px] tracking-widest">
            WARD DISPATCH READINESS
          </p>

          <div className="mt-4 space-y-3">
            {wards.map((ward, index) => {
              const score = Math.round(
                pct(ward.opened, ward.stations) * 0.35 +
                  pct(ward.agentsPresent, ward.stations) * 0.25 +
                  pct(ward.deviceReady, ward.stations) * 0.2 +
                  pct(ward.materialsReady, ward.stations) * 0.2,
              );

              return (
                <div key={ward.ward} className="border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[9px]">
                        {String(index + 1).padStart(2, "0")} ·{" "}
                        {String(ward.ward).toUpperCase()}
                      </p>
                      <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                        OPEN {ward.opened}/{ward.stations} · AGENTS{" "}
                        {ward.agentsPresent}/{ward.stations} · INCIDENTS{" "}
                        {ward.openIncidents}
                      </p>
                    </div>
                    <span className="font-mono text-sm">{score}%</span>
                  </div>

                  <div className="mt-3 h-1.5 bg-secondary">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      )}

      {panel === "stations" && (
        <section className="space-y-4">
          <article className="border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest">
              UPDATE POLLING STATION
            </p>

            <div className="mt-4 grid gap-2 md:grid-cols-4">
              <select
                value={selectedStation}
                onChange={(event) => setSelectedStation(event.target.value)}
                className="border border-border bg-background px-3 py-2 font-mono text-[8px]"
              >
                <option value="">SELECT STATION</option>
                {(data?.stations ?? []).map((station) => (
                  <option key={station.stationCode} value={station.stationCode}>
                    {station.stationCode} · {station.stationName}
                  </option>
                ))}
              </select>

              <select
                value={stationForm.openingStatus}
                onChange={(event) =>
                  setStationForm({
                    ...stationForm,
                    openingStatus: event.target.value,
                  })
                }
                className="border border-border bg-background px-3 py-2 font-mono text-[8px]"
              >
                <option value="not-open">NOT OPEN</option>
                <option value="open">OPEN</option>
                <option value="closed">CLOSED</option>
              </select>

              <select
                value={stationForm.materialsStatus}
                onChange={(event) =>
                  setStationForm({
                    ...stationForm,
                    materialsStatus: event.target.value,
                  })
                }
                className="border border-border bg-background px-3 py-2 font-mono text-[8px]"
              >
                <option value="unknown">MATERIALS UNKNOWN</option>
                <option value="received">MATERIALS RECEIVED</option>
                <option value="missing">MATERIALS MISSING</option>
              </select>

              <select
                value={stationForm.deviceStatus}
                onChange={(event) =>
                  setStationForm({
                    ...stationForm,
                    deviceStatus: event.target.value,
                  })
                }
                className="border border-border bg-background px-3 py-2 font-mono text-[8px]"
              >
                <option value="unknown">DEVICE UNKNOWN</option>
                <option value="ready">DEVICE READY</option>
                <option value="failed">DEVICE FAILED</option>
              </select>

              <select
                value={stationForm.queueStatus}
                onChange={(event) =>
                  setStationForm({
                    ...stationForm,
                    queueStatus: event.target.value,
                  })
                }
                className="border border-border bg-background px-3 py-2 font-mono text-[8px]"
              >
                <option value="normal">QUEUE NORMAL</option>
                <option value="long">QUEUE LONG</option>
                <option value="blocked">QUEUE BLOCKED</option>
              </select>

              <input
                type="number"
                value={stationForm.turnoutCount}
                onChange={(event) =>
                  setStationForm({
                    ...stationForm,
                    turnoutCount: event.target.value,
                  })
                }
                placeholder="Turnout count"
                className="border border-border bg-background px-3 py-2 text-xs"
              />

              <input
                type="number"
                min="0"
                max="23"
                value={stationForm.turnoutHour}
                onChange={(event) =>
                  setStationForm({
                    ...stationForm,
                    turnoutHour: event.target.value,
                  })
                }
                placeholder="Hour"
                className="border border-border bg-background px-3 py-2 text-xs"
              />

              <button
                type="button"
                onClick={saveStation}
                disabled={!selectedStation || saving}
                className="flex items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Clock3 className="h-3 w-3" />
                )}
                SAVE STATION
              </button>
            </div>
          </article>

          <article className="border border-border bg-card p-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-xs">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Station</th>
                    <th className="px-3 py-2">Ward</th>
                    <th className="px-3 py-2">Agent</th>
                    <th className="px-3 py-2">Opening</th>
                    <th className="px-3 py-2">Queue</th>
                    <th className="px-3 py-2">Materials</th>
                    <th className="px-3 py-2">Device</th>
                    <th className="px-3 py-2">Turnout</th>
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
                      <td className="px-3 py-3">
                        {station.agentName || "UNASSIGNED"}
                      </td>
                      <td className="px-3 py-3">{station.openingStatus}</td>
                      <td className="px-3 py-3">{station.queueStatus}</td>
                      <td className="px-3 py-3">{station.materialsStatus}</td>
                      <td className="px-3 py-3">{station.deviceStatus}</td>
                      <td className="px-3 py-3">{station.turnoutCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {panel === "incidents" && (
        <section className="space-y-4">
          <article className="border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest">
              CREATE ELECTION INCIDENT
            </p>

            <div className="mt-4 grid gap-2 md:grid-cols-3">
              <input
                value={incidentForm.title}
                onChange={(event) =>
                  setIncidentForm({
                    ...incidentForm,
                    title: event.target.value,
                  })
                }
                placeholder="Incident title"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <input
                value={incidentForm.ward}
                onChange={(event) =>
                  setIncidentForm({
                    ...incidentForm,
                    ward: event.target.value,
                  })
                }
                placeholder="Ward"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <input
                value={incidentForm.stationCode}
                onChange={(event) =>
                  setIncidentForm({
                    ...incidentForm,
                    stationCode: event.target.value,
                  })
                }
                placeholder="Station code"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <textarea
                value={incidentForm.description}
                onChange={(event) =>
                  setIncidentForm({
                    ...incidentForm,
                    description: event.target.value,
                  })
                }
                placeholder="Description"
                className="md:col-span-2 border border-border bg-background px-3 py-2 text-xs"
              />
              <select
                value={incidentForm.severity}
                onChange={(event) =>
                  setIncidentForm({
                    ...incidentForm,
                    severity: event.target.value,
                  })
                }
                className="border border-border bg-background px-3 py-2 font-mono text-[8px]"
              >
                <option value="critical">CRITICAL</option>
                <option value="high">HIGH</option>
                <option value="medium">MEDIUM</option>
                <option value="low">LOW</option>
              </select>

              <button
                type="button"
                onClick={createIncident}
                disabled={!incidentForm.title || saving}
                className="md:col-span-3 flex items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
              >
                <AlertTriangle className="h-3 w-3" />
                CREATE INCIDENT
              </button>
            </div>
          </article>

          <div className="space-y-2">
            {(data?.incidents ?? []).map((incident) => (
              <article
                key={incident.id}
                className="grid gap-3 border border-border bg-card p-3 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="text-xs font-medium">{incident.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {incident.description || "No description"}
                  </p>
                  <p className="mt-2 font-mono text-[8px] text-muted-foreground">
                    {(incident.ward ||
                      incident.stationCode ||
                      "COUNTY").toUpperCase()}{" "}
                    · {(incident.assignedTo || "UNASSIGNED").toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[8px]">
                    {incident.severity.toUpperCase()}
                  </p>
                  <p className="mt-2 font-mono text-[8px] text-muted-foreground">
                    {incident.status.toUpperCase()}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
