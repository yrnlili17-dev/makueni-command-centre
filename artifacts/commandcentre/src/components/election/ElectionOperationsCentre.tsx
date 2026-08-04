import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
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

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function riskClass(value: number) {
  if (value >= 70) return "text-red-400";
  if (value >= 45) return "text-orange-400";
  if (value >= 25) return "text-yellow-400";
  return "text-green-400";
}

export default function ElectionOperationsCentre() {
  const [data, setData] = useState<OperationsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activePanel, setActivePanel] = useState<
    "readiness" | "agents" | "vehicles" | "observers" | "escalations"
  >("readiness");

  const [stationCode, setStationCode] = useState("");
  const [readinessForm, setReadinessForm] = useState({
    opened: false,
    materialsReceived: false,
    deviceReady: false,
    connectivityReady: false,
    presidingOfficerConfirmed: false,
    notes: "",
  });

  const [agentForm, setAgentForm] = useState({
    stationCode: "",
    agentName: "",
    agentPhone: "",
    role: "primary",
    status: "assigned",
  });

  const [vehicleForm, setVehicleForm] = useState({
    registrationNumber: "",
    driverName: "",
    driverPhone: "",
    ward: "",
    assignment: "",
    fuelStatus: "full",
    status: "available",
  });

  const [observerForm, setObserverForm] = useState({
    observerName: "",
    observerPhone: "",
    observerType: "party",
    ward: "",
    stationCode: "",
    status: "assigned",
  });

  const [incidentForm, setIncidentForm] = useState({
    title: "",
    description: "",
    severity: "high",
    ward: "",
    stationCode: "",
    assignedTo: "",
  });

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
        throw new Error(body.error ?? "Failed to load election operations");
      }

      setData(await response.json());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load election operations centre",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const highRiskWards = useMemo(
    () =>
      [...(data?.wards ?? [])]
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 6),
    [data?.wards],
  );

  async function request(path: string, method: string, body?: unknown) {
    setSaving(true);
    try {
      const response = await fetch(`${BASE}api/election-day${path}`, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Operation failed");
      }

      await load();
      return true;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Operation failed");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveReadiness() {
    if (!stationCode) return;
    const ok = await request(
      `/operations-centre/stations/${encodeURIComponent(stationCode)}/readiness`,
      "PATCH",
      readinessForm,
    );
    if (ok) {
      setReadinessForm({
        opened: false,
        materialsReceived: false,
        deviceReady: false,
        connectivityReady: false,
        presidingOfficerConfirmed: false,
        notes: "",
      });
    }
  }

  async function addAgent() {
    if (!agentForm.stationCode || !agentForm.agentName) return;
    const ok = await request("/operations-centre/agents", "POST", agentForm);
    if (ok) {
      setAgentForm({
        stationCode: "",
        agentName: "",
        agentPhone: "",
        role: "primary",
        status: "assigned",
      });
    }
  }

  async function addVehicle() {
    if (!vehicleForm.registrationNumber) return;
    const ok = await request("/operations-centre/vehicles", "POST", vehicleForm);
    if (ok) {
      setVehicleForm({
        registrationNumber: "",
        driverName: "",
        driverPhone: "",
        ward: "",
        assignment: "",
        fuelStatus: "full",
        status: "available",
      });
    }
  }

  async function addObserver() {
    if (!observerForm.observerName) return;
    const ok = await request("/operations-centre/observers", "POST", observerForm);
    if (ok) {
      setObserverForm({
        observerName: "",
        observerPhone: "",
        observerType: "party",
        ward: "",
        stationCode: "",
        status: "assigned",
      });
    }
  }

  async function addEscalation() {
    if (!incidentForm.title) return;
    const ok = await request(
      "/operations-centre/escalations",
      "POST",
      incidentForm,
    );
    if (ok) {
      setIncidentForm({
        title: "",
        description: "",
        severity: "high",
        ward: "",
        stationCode: "",
        assignedTo: "",
      });
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">
            PHASE 11A · ELECTION OPERATIONS CENTRE
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Polling readiness, agent deployment, transport, observers and incident escalation.
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
        <div className="border border-red-400/40 bg-red-400/5 p-3 font-mono text-[9px] text-red-400">
          [ ELECTION_OPERATIONS_ERROR ] {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {[
          ["POLLING STATIONS", data?.summary.pollingStations ?? 0, MapPin],
          ["READY STATIONS", data?.summary.readyStations ?? 0, CheckCircle2],
          ["OPENED STATIONS", data?.summary.openedStations ?? 0, ShieldCheck],
          ["AGENTS", data?.summary.agents ?? 0, Users],
          ["AGENTS CHECKED IN", data?.summary.agentsCheckedIn ?? 0, UserCheck],
          ["VEHICLES", data?.summary.vehicles ?? 0, Bus],
          ["OBSERVERS", data?.summary.observers ?? 0, ShieldCheck],
          ["OPEN ESCALATIONS", data?.summary.openEscalations ?? 0, AlertTriangle],
        ].map(([label, value, Icon]) => (
          <article key={String(label)} className="border border-border bg-card p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-[7px] text-muted-foreground">{label}</p>
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="mt-3 font-mono text-lg">{number(Number(value))}</p>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["readiness", "WARD READINESS"],
          ["agents", "AGENT OPERATIONS"],
          ["vehicles", "VEHICLE DEPLOYMENT"],
          ["observers", "OBSERVERS"],
          ["escalations", "INCIDENT ESCALATION"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setActivePanel(value as any)}
            className={`border px-3 py-2 font-mono text-[8px] ${
              activePanel === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activePanel === "readiness" && (
        <section className="space-y-4">
          <article className="border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest">
              POLLING-STATION OPENING CHECKLIST
            </p>
            <div className="mt-4 grid gap-3 lg:grid-cols-[220px_1fr_auto]">
              <select
                value={stationCode}
                onChange={(event) => setStationCode(event.target.value)}
                className="border border-border bg-background px-3 py-2 font-mono text-[8px]"
              >
                <option value="">SELECT STATION</option>
                {(data?.stations ?? []).map((station) => (
                  <option key={station.code} value={station.code}>
                    {station.code} · {station.name}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  ["opened", "OPENED"],
                  ["materialsReceived", "MATERIALS"],
                  ["deviceReady", "DEVICE"],
                  ["connectivityReady", "CONNECTIVITY"],
                  ["presidingOfficerConfirmed", "PRESIDING OFFICER"],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
                  >
                    <input
                      type="checkbox"
                      checked={(readinessForm as any)[key]}
                      onChange={(event) =>
                        setReadinessForm((current) => ({
                          ...current,
                          [key]: event.target.checked,
                        }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={saveReadiness}
                disabled={!stationCode || saving}
                className="flex items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ClipboardCheck className="h-3 w-3" />
                )}
                SAVE
              </button>
            </div>
          </article>

          <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
            <article className="border border-border bg-card p-4">
              <p className="font-mono text-[10px] tracking-widest">
                WARD READINESS INDEX
              </p>
              <div className="mt-4 space-y-3">
                {(data?.wards ?? []).map((ward) => (
                  <div key={ward.ward}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-[9px]">{ward.ward.toUpperCase()}</p>
                        <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                          {ward.readyStations}/{ward.totalStations} READY ·{" "}
                          {ward.openedStations} OPENED · {ward.missingAgents} MISSING AGENTS
                        </p>
                      </div>
                      <p className="font-mono text-sm">{ward.readiness}%</p>
                    </div>
                    <div className="mt-2 h-1.5 bg-secondary">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${ward.readiness}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="border border-border bg-card p-4">
              <p className="font-mono text-[10px] tracking-widest">
                HIGHEST-RISK WARDS
              </p>
              <div className="mt-4 space-y-2">
                {highRiskWards.map((ward, index) => (
                  <div
                    key={ward.ward}
                    className="flex items-center justify-between border border-border p-3"
                  >
                    <div>
                      <p className="font-mono text-[9px]">
                        {String(index + 1).padStart(2, "0")} · {ward.ward.toUpperCase()}
                      </p>
                      <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                        OPENING {ward.openingRate}% · READY {ward.readiness}%
                      </p>
                    </div>
                    <span className={`font-mono text-sm ${riskClass(ward.riskScore)}`}>
                      {ward.riskScore}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </section>
      )}

      {activePanel === "agents" && (
        <section className="space-y-4">
          <article className="border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest">ADD AGENT ASSIGNMENT</p>
            <div className="mt-4 grid gap-2 md:grid-cols-5">
              <input
                value={agentForm.stationCode}
                onChange={(event) =>
                  setAgentForm({ ...agentForm, stationCode: event.target.value })
                }
                placeholder="Station code"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <input
                value={agentForm.agentName}
                onChange={(event) =>
                  setAgentForm({ ...agentForm, agentName: event.target.value })
                }
                placeholder="Agent name"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <input
                value={agentForm.agentPhone}
                onChange={(event) =>
                  setAgentForm({ ...agentForm, agentPhone: event.target.value })
                }
                placeholder="Phone"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <select
                value={agentForm.status}
                onChange={(event) =>
                  setAgentForm({ ...agentForm, status: event.target.value })
                }
                className="border border-border bg-background px-3 py-2 font-mono text-[8px]"
              >
                <option value="assigned">ASSIGNED</option>
                <option value="checked-in">CHECKED IN</option>
                <option value="missing">MISSING</option>
                <option value="backup">BACKUP</option>
              </select>
              <button
                type="button"
                onClick={addAgent}
                disabled={saving}
                className="flex items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
                ADD AGENT
              </button>
            </div>
          </article>

          <article className="border border-border bg-card p-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Agent</th>
                    <th className="px-3 py-2">Station</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.agents ?? []).map((agent) => (
                    <tr key={agent.id} className="border-b border-border/50">
                      <td className="px-3 py-3">{agent.agentName}</td>
                      <td className="px-3 py-3">{agent.stationCode}</td>
                      <td className="px-3 py-3">{agent.role}</td>
                      <td className="px-3 py-3">{agent.status}</td>
                      <td className="px-3 py-3">{agent.agentPhone || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {activePanel === "vehicles" && (
        <section className="space-y-4">
          <article className="border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest">ADD VEHICLE DEPLOYMENT</p>
            <div className="mt-4 grid gap-2 md:grid-cols-4">
              <input
                value={vehicleForm.registrationNumber}
                onChange={(event) =>
                  setVehicleForm({
                    ...vehicleForm,
                    registrationNumber: event.target.value,
                  })
                }
                placeholder="Registration"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <input
                value={vehicleForm.driverName}
                onChange={(event) =>
                  setVehicleForm({ ...vehicleForm, driverName: event.target.value })
                }
                placeholder="Driver"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <input
                value={vehicleForm.ward}
                onChange={(event) =>
                  setVehicleForm({ ...vehicleForm, ward: event.target.value })
                }
                placeholder="Ward"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={addVehicle}
                disabled={saving}
                className="bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
              >
                ADD VEHICLE
              </button>
            </div>
          </article>

          <div className="grid gap-3 lg:grid-cols-2">
            {(data?.vehicles ?? []).map((vehicle) => (
              <div key={vehicle.id} className="border border-border bg-card p-3">
                <p className="font-mono text-[9px]">{vehicle.registrationNumber}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {vehicle.driverName || "No driver"} · {vehicle.ward || "No ward"}
                </p>
                <p className="mt-2 font-mono text-[8px]">
                  {vehicle.status.toUpperCase()} · FUEL {vehicle.fuelStatus.toUpperCase()}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {activePanel === "observers" && (
        <section className="space-y-4">
          <article className="border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest">ADD OBSERVER</p>
            <div className="mt-4 grid gap-2 md:grid-cols-4">
              <input
                value={observerForm.observerName}
                onChange={(event) =>
                  setObserverForm({
                    ...observerForm,
                    observerName: event.target.value,
                  })
                }
                placeholder="Observer name"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <input
                value={observerForm.observerPhone}
                onChange={(event) =>
                  setObserverForm({
                    ...observerForm,
                    observerPhone: event.target.value,
                  })
                }
                placeholder="Phone"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <input
                value={observerForm.ward}
                onChange={(event) =>
                  setObserverForm({ ...observerForm, ward: event.target.value })
                }
                placeholder="Ward"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={addObserver}
                disabled={saving}
                className="bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
              >
                ADD OBSERVER
              </button>
            </div>
          </article>

          <div className="grid gap-3 lg:grid-cols-2">
            {(data?.observers ?? []).map((observer) => (
              <div key={observer.id} className="border border-border bg-card p-3">
                <p className="text-xs font-medium">{observer.observerName}</p>
                <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                  {observer.observerType.toUpperCase()} ·{" "}
                  {(observer.ward || observer.stationCode || "UNASSIGNED").toUpperCase()}
                </p>
                <p className="mt-2 font-mono text-[8px]">{observer.status.toUpperCase()}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {activePanel === "escalations" && (
        <section className="space-y-4">
          <article className="border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest">CREATE INCIDENT ESCALATION</p>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              <input
                value={incidentForm.title}
                onChange={(event) =>
                  setIncidentForm({ ...incidentForm, title: event.target.value })
                }
                placeholder="Incident title"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <input
                value={incidentForm.ward}
                onChange={(event) =>
                  setIncidentForm({ ...incidentForm, ward: event.target.value })
                }
                placeholder="Ward"
                className="border border-border bg-background px-3 py-2 text-xs"
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
              <button
                type="button"
                onClick={addEscalation}
                disabled={saving}
                className="bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
              >
                CREATE ESCALATION
              </button>
            </div>
          </article>

          <div className="space-y-2">
            {(data?.escalations ?? []).map((incident) => (
              <div
                key={incident.id}
                className="grid gap-3 border border-border bg-card p-3 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="text-xs font-medium">{incident.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {incident.description || "No description"}
                  </p>
                  <p className="mt-2 font-mono text-[8px] text-muted-foreground">
                    {(incident.ward || incident.stationCode || "COUNTY").toUpperCase()} ·{" "}
                    {(incident.assignedTo || "UNASSIGNED").toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-mono text-[8px] ${riskClass(
                    incident.severity === "critical"
                      ? 100
                      : incident.severity === "high"
                        ? 75
                        : incident.severity === "medium"
                          ? 45
                          : 20,
                  )}`}>
                    {incident.severity.toUpperCase()}
                  </p>
                  <p className="mt-2 font-mono text-[8px] text-muted-foreground">
                    {incident.status.toUpperCase()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
