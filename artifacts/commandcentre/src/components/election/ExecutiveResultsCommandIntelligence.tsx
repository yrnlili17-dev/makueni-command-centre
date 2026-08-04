import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Gauge,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  ShieldAlert,
  Siren,
  ListTree,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

type CommandPayload = {
  generatedAt: string;
  summary: {
    totalStations: number;
    reportingStations: number;
    verifiedStations: number;
    disputedStations: number;
    reportingRate: number;
    verificationRate: number;
    openDecisions: number;
    criticalDecisions: number;
    openEscalations: number;
    overdueEscalations: number;
    proposedRecommendations: number;
    countyRiskScore: number;
  };
  decisions: Array<any>;
  escalations: Array<any>;
  recommendations: Array<any>;
  feed: Array<any>;
};

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
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

function priorityClass(priority: string) {
  if (priority === "critical") return "text-red-400 border-red-400/40";
  if (priority === "high") return "text-orange-400 border-orange-400/40";
  if (priority === "medium") return "text-yellow-400 border-yellow-400/40";
  return "text-muted-foreground border-border";
}

export default function ExecutiveResultsCommandIntelligence() {
  const [data, setData] = useState<CommandPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<
    "command" | "escalations" | "recommendations" | "timeline"
  >("command");

  const [escalationForm, setEscalationForm] = useState({
    title: "",
    sourceType: "results",
    sourceId: "",
    priority: "high",
    ward: "",
    constituency: "",
    stationCode: "",
    owner: "",
    dueAt: "",
    createdBy: "Executive Results Command",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${BASE}api/election-day/executive-results-command`,
        { credentials: "include" },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.error ?? "Failed to load Executive Results Command",
        );
      }

      setData(await response.json());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Executive Results Command Intelligence",
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
    totalStations: 0,
    reportingStations: 0,
    verifiedStations: 0,
    disputedStations: 0,
    reportingRate: 0,
    verificationRate: 0,
    openDecisions: 0,
    criticalDecisions: 0,
    openEscalations: 0,
    overdueEscalations: 0,
    proposedRecommendations: 0,
    countyRiskScore: 0,
  };

  const resolutionRate = useMemo(() => {
    const escalations = data?.escalations ?? [];
    if (escalations.length === 0) return 0;

    const resolved = escalations.filter((row) =>
      ["resolved", "closed"].includes(
        String(row.status ?? "").toLowerCase(),
      ),
    ).length;

    return Math.round((resolved / escalations.length) * 100);
  }, [data?.escalations]);

  async function request(
    path: string,
    method: string,
    body?: unknown,
  ) {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${BASE}api/election-day${path}`,
        {
          method,
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Operation failed");
      }

      await load();
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Operation failed",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function createEscalation() {
    if (!escalationForm.title.trim()) {
      setError("Escalation title is required.");
      return;
    }

    const ok = await request(
      "/executive-results-command/escalations",
      "POST",
      {
        ...escalationForm,
        dueAt: escalationForm.dueAt || null,
      },
    );

    if (ok) {
      setEscalationForm({
        title: "",
        sourceType: "results",
        sourceId: "",
        priority: "high",
        ward: "",
        constituency: "",
        stationCode: "",
        owner: "",
        dueAt: "",
        createdBy: "Executive Results Command",
      });
    }
  }

  async function updateEscalation(
    id: number,
    status: string,
  ) {
    await request(
      `/executive-results-command/escalations/${id}`,
      "PATCH",
      {
        status,
        acknowledgedBy:
          status === "acknowledged"
            ? "Executive Command"
            : undefined,
        resolvedBy:
          status === "resolved"
            ? "Executive Command"
            : undefined,
      },
    );
  }

  async function generateRecommendations() {
    await request(
      "/executive-results-command/recommendations/generate",
      "POST",
      {},
    );
  }

  async function updateRecommendation(
    id: number,
    status: string,
  ) {
    await request(
      `/executive-results-command/recommendations/${id}`,
      "PATCH",
      {
        status,
        acceptedBy:
          status === "accepted"
            ? "Executive Command"
            : undefined,
      },
    );
  }

  return (
    <section className="space-y-4 border-b border-border/50 pb-5">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-widest text-primary">
            EXECUTIVE RESULTS COMMAND INTELLIGENCE
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Unified executive KPIs, escalations, recommendations, resolution tracking and command timeline.
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6">
        {[
          ["REPORTING", `${summary.reportingRate}%`, Gauge],
          ["VERIFICATION", `${summary.verificationRate}%`, CheckCircle2],
          ["COUNTY RISK", `${summary.countyRiskScore}%`, ShieldAlert],
          ["OPEN DECISIONS", summary.openDecisions, Clock3],
          ["ESCALATIONS", summary.openEscalations, Siren],
          ["RESOLUTION RATE", `${resolutionRate}%`, CheckCircle2],
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

      <div className="flex flex-wrap gap-2">
        {[
          ["command", "COMMAND OVERVIEW"],
          ["escalations", "ESCALATION CENTRE"],
          ["recommendations", "DECISION INTELLIGENCE"],
          ["timeline", "EXECUTIVE TIMELINE"],
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

      {panel === "command" && (
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.1fr_0.9fr]">
          <article className="border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest">
              EXECUTIVE COMMAND STATUS
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                ["TOTAL STATIONS", summary.totalStations],
                ["REPORTING STATIONS", summary.reportingStations],
                ["VERIFIED STATIONS", summary.verifiedStations],
                ["DISPUTED STATIONS", summary.disputedStations],
                ["CRITICAL DECISIONS", summary.criticalDecisions],
                ["OVERDUE ESCALATIONS", summary.overdueEscalations],
              ].map(([label, value]) => (
                <div key={String(label)} className="border border-border p-3">
                  <p className="font-mono text-[7px] text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-2 font-mono text-lg">{number(Number(value))}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] tracking-widest">
                  EXECUTIVE INTELLIGENCE FEED
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Latest decisions, escalations and recommendations.
                </p>
              </div>
              <ListTree className="h-4 w-4 text-primary" />
            </div>

            <div className="mt-4 space-y-2">
              {(data?.feed ?? []).slice(0, 25).map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[32px_1fr] gap-3 border border-border p-3 sm:grid-cols-[32px_1fr_auto]"
                >
                  <div className="flex h-8 w-8 items-center justify-center border border-border">
                    {item.type === "escalation" ? (
                      <Siren className="h-4 w-4 text-primary" />
                    ) : item.type === "recommendation" ? (
                      <BrainCircuit className="h-4 w-4 text-primary" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="break-words text-xs font-medium">
                      {item.title}
                    </p>
                    <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                      {String(item.type).toUpperCase()} ·{" "}
                      {String(item.status).toUpperCase()}
                    </p>
                  </div>

                  <p className="col-span-2 font-mono text-[8px] text-muted-foreground sm:col-span-1">
                    {formatTime(item.timestamp)}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}

      {panel === "escalations" && (
        <section className="space-y-4">
          <article className="border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest">
              CREATE EXECUTIVE ESCALATION
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <input
                value={escalationForm.title}
                onChange={(event) =>
                  setEscalationForm({
                    ...escalationForm,
                    title: event.target.value,
                  })
                }
                placeholder="Escalation title"
                className="min-h-10 border border-border bg-background px-3 py-2 text-xs"
              />

              <select
                value={escalationForm.priority}
                onChange={(event) =>
                  setEscalationForm({
                    ...escalationForm,
                    priority: event.target.value,
                  })
                }
                className="min-h-10 border border-border bg-background px-3 py-2 font-mono text-[8px]"
              >
                <option value="critical">CRITICAL</option>
                <option value="high">HIGH</option>
                <option value="medium">MEDIUM</option>
                <option value="low">LOW</option>
              </select>

              <input
                value={escalationForm.owner}
                onChange={(event) =>
                  setEscalationForm({
                    ...escalationForm,
                    owner: event.target.value,
                  })
                }
                placeholder="Owner"
                className="min-h-10 border border-border bg-background px-3 py-2 text-xs"
              />

              <input
                type="datetime-local"
                value={escalationForm.dueAt}
                onChange={(event) =>
                  setEscalationForm({
                    ...escalationForm,
                    dueAt: event.target.value,
                  })
                }
                className="min-h-10 border border-border bg-background px-3 py-2 text-xs"
              />

              <input
                value={escalationForm.ward}
                onChange={(event) =>
                  setEscalationForm({
                    ...escalationForm,
                    ward: event.target.value,
                  })
                }
                placeholder="Ward"
                className="min-h-10 border border-border bg-background px-3 py-2 text-xs"
              />

              <input
                value={escalationForm.constituency}
                onChange={(event) =>
                  setEscalationForm({
                    ...escalationForm,
                    constituency: event.target.value,
                  })
                }
                placeholder="Constituency"
                className="min-h-10 border border-border bg-background px-3 py-2 text-xs"
              />

              <input
                value={escalationForm.stationCode}
                onChange={(event) =>
                  setEscalationForm({
                    ...escalationForm,
                    stationCode: event.target.value,
                  })
                }
                placeholder="Station code"
                className="min-h-10 border border-border bg-background px-3 py-2 text-xs"
              />

              <button
                type="button"
                onClick={createEscalation}
                disabled={saving || !escalationForm.title.trim()}
                className="flex min-h-10 items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                CREATE ESCALATION
              </button>
            </div>
          </article>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3">
            {(data?.escalations ?? []).map((item) => (
              <article
                key={item.id}
                className="border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium">
                      {item.title}
                    </p>
                    <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                      {(item.owner || "UNASSIGNED").toUpperCase()} ·{" "}
                      {String(item.status).toUpperCase()}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 border px-2 py-1 font-mono text-[8px] ${priorityClass(
                      item.priority,
                    )}`}
                  >
                    {String(item.priority).toUpperCase()}
                  </span>
                </div>

                <p className="mt-3 font-mono text-[8px] text-muted-foreground">
                  DUE {formatTime(item.dueAt)}
                </p>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() =>
                      void updateEscalation(item.id, "acknowledged")
                    }
                    disabled={saving}
                    className="min-h-10 border border-border px-3 py-2 font-mono text-[8px]"
                  >
                    ACKNOWLEDGE
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void updateEscalation(item.id, "in-progress")
                    }
                    disabled={saving}
                    className="min-h-10 border border-orange-400/40 px-3 py-2 font-mono text-[8px] text-orange-400"
                  >
                    START
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void updateEscalation(item.id, "resolved")
                    }
                    disabled={saving}
                    className="flex min-h-10 items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    RESOLVE
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {panel === "recommendations" && (
        <section className="space-y-4">
          <article className="flex flex-col gap-3 border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                STRATEGIC DECISION INTELLIGENCE
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Generate rule-based recommendations from live reporting, disputes, decisions and escalations.
              </p>
            </div>

            <button
              type="button"
              onClick={generateRecommendations}
              disabled={saving}
              className="flex min-h-10 items-center justify-center gap-2 bg-primary px-4 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <BrainCircuit className="h-4 w-4" />
              )}
              GENERATE RECOMMENDATIONS
            </button>
          </article>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3">
            {(data?.recommendations ?? []).map((item) => (
              <article
                key={item.id}
                className="border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium">
                      {item.title}
                    </p>
                    <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                      {String(item.recommendationType).toUpperCase()} ·{" "}
                      {(item.recommendedOwner || "UNASSIGNED").toUpperCase()}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 border px-2 py-1 font-mono text-[8px] ${priorityClass(
                      item.priority,
                    )}`}
                  >
                    {String(item.priority).toUpperCase()}
                  </span>
                </div>

                <p className="mt-3 break-words text-xs text-muted-foreground">
                  {item.rationale || "No rationale recorded."}
                </p>

                <p className="mt-3 font-mono text-[8px]">
                  STATUS {String(item.status).toUpperCase()}
                </p>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      void updateRecommendation(item.id, "accepted")
                    }
                    disabled={saving || item.status === "accepted"}
                    className="flex min-h-10 items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    ACCEPT
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void updateRecommendation(item.id, "dismissed")
                    }
                    disabled={saving}
                    className="flex min-h-10 items-center justify-center gap-2 border border-red-400/40 px-3 py-2 font-mono text-[8px] text-red-400 disabled:opacity-50"
                  >
                    <XCircle className="h-3 w-3" />
                    DISMISS
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {panel === "timeline" && (
        <article className="border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                EXECUTIVE COMMAND TIMELINE
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Chronological command activity across decisions, escalations and recommendations.
              </p>
            </div>
            <ListTree className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-2">
            {(data?.feed ?? []).map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-[32px_1fr] gap-3 border border-border p-3 sm:grid-cols-[32px_1fr_auto]"
              >
                <span className="flex h-8 w-8 items-center justify-center border border-border font-mono text-[8px] text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0">
                  <p className="break-words text-xs font-medium">
                    {item.title}
                  </p>
                  <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                    {String(item.type).toUpperCase()} ·{" "}
                    {String(item.status).toUpperCase()} ·{" "}
                    {(item.ward ||
                      item.stationCode ||
                      "COUNTY").toUpperCase()}
                  </p>
                </div>

                <p className="col-span-2 font-mono text-[8px] text-muted-foreground sm:col-span-1">
                  {formatTime(item.timestamp)}
                </p>
              </div>
            ))}
          </div>
        </article>
      )}

      <div className="border border-border bg-card p-4">
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          Recommendations are decision-support suggestions derived from current system data. Final operational, legal and communications decisions remain with authorized campaign leadership.
        </p>
      </div>
    </section>
  );
}
