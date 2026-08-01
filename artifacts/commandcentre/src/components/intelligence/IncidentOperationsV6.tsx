import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clipboard,
  Clock,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Send,
  ShieldAlert,
  UserPlus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import IncidentInvestigationV7 from "./IncidentInvestigationV7";

type IncidentMetrics = {
  activeIncidents: number;
  highPriority: number;
  awaitingApproval: number;
  publishedToday: number;
  duplicateAttacks: number;
  estimatedReach: number;
  averageResponseMinutes: number;
};

type IncidentMention = {
  id: number;
  platform?: string | null;
  author?: string | null;
  content?: string | null;
  url?: string | null;
  threatLevel?: string | null;
  sentiment?: string | null;
  engagementCount?: number | null;
  detectedAt?: string | null;
};

type IncidentResponse = {
  id: number;
  content?: string | null;
  status?: string | null;
  draftedBy?: string | null;
  createdAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  publishedAt?: string | null;
};

type Incident = {
  id: number;
  incident_code: string;
  fingerprint: string;
  status: string;
  assigned_to?: string | null;
  due_at?: string | null;
  priority?: string | null;
  recommended_action?: string | null;
  strategy_reason?: string | null;
  confidence?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  mention: IncidentMention;
  response?: IncidentResponse | null;
  duplicateCount?: number;
  relatedMentionIds?: number[];
  estimatedReach?: number;
  topic?: string;
  sourceUrl?: string | null;
  timeline?: Array<{
    event_type: string;
    actor?: string | null;
    note?: string | null;
    created_at?: string | null;
  }>;
};

type ChannelOutput = {
  incidentCode: string;
  topic: string;
  generatedBy: string;
  requiresApiKeys: boolean;
  channels: {
    twitter: string;
    facebook: string;
    whatsapp: string;
    sms: string;
    pressStatement: string;
    rallyTalkingPoints: string;
  };
};

const EMPTY_METRICS: IncidentMetrics = {
  activeIncidents: 0,
  highPriority: 0,
  awaitingApproval: 0,
  publishedToday: 0,
  duplicateAttacks: 0,
  estimatedReach: 0,
  averageResponseMinutes: 0,
};

function formatNumber(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-KE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function badgeClass(value?: string | null) {
  const normalized = String(value ?? "").toLowerCase();
  if (["critical", "escalate", "rejected"].includes(normalized)) {
    return "border-red-400/40 bg-red-400/10 text-red-400";
  }
  if (["high", "respond", "awaiting_approval"].includes(normalized)) {
    return "border-orange-400/40 bg-orange-400/10 text-orange-400";
  }
  if (["approved", "published", "closed"].includes(normalized)) {
    return "border-green-400/40 bg-green-400/10 text-green-400";
  }
  if (["monitor", "monitoring", "elevated"].includes(normalized)) {
    return "border-yellow-400/40 bg-yellow-400/10 text-yellow-400";
  }
  return "border-border bg-secondary text-muted-foreground";
}

async function requestJson<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error ?? `Request failed (${response.status})`);
  }

  return data as T;
}

export default function IncidentOperationsV6() {
  const [metrics, setMetrics] = useState<IncidentMetrics>(EMPTY_METRICS);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [channels, setChannels] = useState<ChannelOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [threatFilter, setThreatFilter] = useState("all");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [investigationCode, setInvestigationCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (platformFilter !== "all") params.set("platform", platformFilter);
      if (threatFilter !== "all") params.set("threatLevel", threatFilter);

      const [metricsData, incidentData] = await Promise.all([
        requestJson<IncidentMetrics>("/api/intelligence/incidents/metrics"),
        requestJson<Incident[]>(
          `/api/intelligence/incidents${params.size ? `?${params}` : ""}`,
        ),
      ]);

      setMetrics(metricsData);
      setIncidents(incidentData);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Failed to load incident operations",
      );
    } finally {
      setLoading(false);
    }
  }, [platformFilter, statusFilter, threatFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const platforms = useMemo(
    () =>
      Array.from(
        new Set(
          incidents
            .map((incident) => incident.mention?.platform)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [incidents],
  );

  async function openIncident(incident: Incident) {
    setDetailLoading(true);
    setChannels(null);
    try {
      const full = await requestJson<Incident>(
        `/api/intelligence/incidents/${encodeURIComponent(
          incident.incident_code,
        )}`,
      );
      setSelected(full);
      setAssignedTo(full.assigned_to ?? "");
      setDueAt(
        full.due_at
          ? new Date(full.due_at).toISOString().slice(0, 16)
          : "",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to open incident",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function assignIncident() {
    if (!selected || !assignedTo.trim()) return;
    setActionLoading(true);
    try {
      await requestJson(
        `/api/intelligence/incidents/${encodeURIComponent(
          selected.incident_code,
        )}/assign`,
        {
          method: "PATCH",
          body: JSON.stringify({
            assignedTo: assignedTo.trim(),
            dueAt: dueAt ? new Date(dueAt).toISOString() : null,
            priority: selected.priority ?? "normal",
          }),
        },
      );
      await openIncident(selected);
      await load();
    } finally {
      setActionLoading(false);
    }
  }

  async function changeStatus(status: string) {
    if (!selected) return;
    setActionLoading(true);
    try {
      await requestJson(
        `/api/intelligence/incidents/${encodeURIComponent(
          selected.incident_code,
        )}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status,
            actor: "Campaign Operations",
          }),
        },
      );
      await openIncident(selected);
      await load();
    } finally {
      setActionLoading(false);
    }
  }

  async function generateChannels() {
    if (!selected) return;
    setActionLoading(true);
    try {
      const output = await requestJson<ChannelOutput>(
        `/api/intelligence/incidents/${encodeURIComponent(
          selected.incident_code,
        )}/channels`,
        { method: "POST", body: "{}" },
      );
      setChannels(output);
    } finally {
      setActionLoading(false);
    }
  }

  async function copyText(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1500);
  }

  const metricCards = [
    {
      label: "ACTIVE INCIDENTS",
      value: metrics.activeIncidents,
      icon: Activity,
    },
    {
      label: "HIGH PRIORITY",
      value: metrics.highPriority,
      icon: ShieldAlert,
    },
    {
      label: "AWAITING APPROVAL",
      value: metrics.awaitingApproval,
      icon: Clock,
    },
    {
      label: "PUBLISHED TODAY",
      value: metrics.publishedToday,
      icon: CheckCircle,
    },
    {
      label: "DUPLICATE ATTACKS",
      value: metrics.duplicateAttacks,
      icon: AlertTriangle,
    },
    {
      label: "ESTIMATED REACH",
      value: formatNumber(metrics.estimatedReach),
      icon: BarChart3,
    },
    {
      label: "AVG RESPONSE",
      value: `${metrics.averageResponseMinutes} MIN`,
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {metricCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="border border-border bg-card p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-[9px] tracking-widest text-muted-foreground">
                {label}
              </p>
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="font-mono text-lg font-semibold">{value}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest">
            INTELLIGENCE INCIDENT OPERATIONS
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Detect, assess, assign, respond and close narrative threats.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="border border-border bg-secondary px-3 py-2 font-mono text-[10px]"
          >
            <option value="all">ALL STATUS</option>
            <option value="detected">DETECTED</option>
            <option value="analysed">ANALYSED</option>
            <option value="awaiting_approval">AWAITING APPROVAL</option>
            <option value="approved">APPROVED</option>
            <option value="published">PUBLISHED</option>
            <option value="monitoring">MONITORING</option>
            <option value="closed">CLOSED</option>
          </select>

          <select
            value={platformFilter}
            onChange={(event) => setPlatformFilter(event.target.value)}
            className="border border-border bg-secondary px-3 py-2 font-mono text-[10px]"
          >
            <option value="all">ALL PLATFORMS</option>
            {platforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform.toUpperCase()}
              </option>
            ))}
          </select>

          <select
            value={threatFilter}
            onChange={(event) => setThreatFilter(event.target.value)}
            className="border border-border bg-secondary px-3 py-2 font-mono text-[10px]"
          >
            <option value="all">ALL THREATS</option>
            <option value="critical">CRITICAL</option>
            <option value="high">HIGH</option>
            <option value="elevated">ELEVATED</option>
            <option value="normal">NORMAL</option>
          </select>

          <button
            onClick={() => void load()}
            className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[10px] hover:bg-secondary"
          >
            <RefreshCw className="h-3 w-3" />
            REFRESH
          </button>
        </div>
      </section>

      {error && (
        <div className="border border-red-400/30 bg-red-400/10 p-3 font-mono text-xs text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center border border-border bg-card py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <section className="overflow-x-auto border border-border bg-card">
          <table className="w-full min-w-[1100px] text-left">
            <thead className="border-b border-border bg-secondary/40">
              <tr className="font-mono text-[9px] tracking-widest text-muted-foreground">
                <th className="px-4 py-3">INCIDENT</th>
                <th className="px-4 py-3">SOURCE</th>
                <th className="px-4 py-3">THREAT</th>
                <th className="px-4 py-3">ACTION</th>
                <th className="px-4 py-3">CONFIDENCE</th>
                <th className="px-4 py-3">DUPLICATES</th>
                <th className="px-4 py-3">REACH</th>
                <th className="px-4 py-3">ASSIGNED</th>
                <th className="px-4 py-3">STATUS</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) => (
                <tr
                  key={incident.incident_code}
                  className="border-b border-border/70 text-xs hover:bg-secondary/20"
                >
                  <td className="px-4 py-3">
                    <p className="font-mono text-[10px] text-primary">
                      {incident.incident_code}
                    </p>
                    <p className="mt-1 max-w-[260px] truncate text-muted-foreground">
                      {incident.topic}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{incident.mention?.platform ?? "Unknown"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {incident.mention?.author ?? "Unknown author"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`border px-2 py-1 font-mono text-[9px] ${badgeClass(
                        incident.priority,
                      )}`}
                    >
                      {(incident.priority ?? "normal").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`border px-2 py-1 font-mono text-[9px] ${badgeClass(
                        incident.recommended_action,
                      )}`}
                    >
                      {(incident.recommended_action ?? "monitor").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {incident.confidence ?? 0}%
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {formatNumber(incident.duplicateCount)}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {formatNumber(incident.estimatedReach)}
                  </td>
                  <td className="px-4 py-3">
                    {incident.assigned_to ?? "Unassigned"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`border px-2 py-1 font-mono text-[9px] ${badgeClass(
                        incident.status,
                      )}`}
                    >
                      {incident.status.replaceAll("_", " ").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setInvestigationCode(incident.incident_code)}
                      className="flex items-center gap-1 border border-border px-3 py-1.5 font-mono text-[9px] hover:bg-secondary"
                    >
                      <Eye className="h-3 w-3" />
                      OPEN
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {incidents.length === 0 && (
            <div className="py-16 text-center font-mono text-xs text-muted-foreground">
              [ NO_INCIDENTS_MATCH_FILTERS ]
            </div>
          )}
        </section>
      )}

      {(selected || detailLoading) && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
          <aside className="h-full w-full max-w-3xl overflow-y-auto border-l border-border bg-background p-5 shadow-2xl">
            {detailLoading || !selected ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-5">
                <header className="flex items-start justify-between border-b border-border pb-4">
                  <div>
                    <p className="font-mono text-[10px] tracking-widest text-primary">
                      {selected.incident_code}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold">
                      Intelligence Incident
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Detected {formatDate(selected.mention?.detectedAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelected(null);
                      setChannels(null);
                    }}
                    className="border border-border p-2 hover:bg-secondary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </header>

                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["THREAT", selected.priority ?? "normal"],
                    ["ACTION", selected.recommended_action ?? "monitor"],
                    ["CONFIDENCE", `${selected.confidence ?? 0}%`],
                    ["EST. REACH", formatNumber(selected.estimatedReach)],
                  ].map(([label, value]) => (
                    <div key={label} className="border border-border bg-card p-3">
                      <p className="font-mono text-[9px] text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-1 font-mono text-sm">{value}</p>
                    </div>
                  ))}
                </section>

                <section className="border border-border bg-card p-4">
                  <p className="mb-2 font-mono text-[9px] tracking-widest text-muted-foreground">
                    ORIGINAL POST
                  </p>
                  <p className="text-sm leading-relaxed">
                    {selected.mention?.content ?? "No source text available"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                    <span>{selected.mention?.platform}</span>
                    <span>·</span>
                    <span>{selected.mention?.author}</span>
                    <span>·</span>
                    <span>
                      {formatNumber(selected.mention?.engagementCount)} engagement
                    </span>
                  </div>
                  {selected.sourceUrl && (
                    <a
                      href={selected.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 border border-border px-3 py-1.5 font-mono text-[10px] hover:bg-secondary"
                    >
                      <Eye className="h-3 w-3" />
                      OPEN ORIGINAL POST
                    </a>
                  )}
                </section>

                <section className="border border-border bg-card p-4">
                  <p className="mb-2 font-mono text-[9px] tracking-widest text-muted-foreground">
                    RECOMMENDED STRATEGY
                  </p>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span
                      className={`border px-2 py-1 font-mono text-[9px] ${badgeClass(
                        selected.recommended_action,
                      )}`}
                    >
                      {(selected.recommended_action ?? "monitor").toUpperCase()}
                    </span>
                    <span className="border border-border px-2 py-1 font-mono text-[9px]">
                      {selected.duplicateCount ?? 0} DUPLICATES
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selected.strategy_reason}
                  </p>
                </section>

                <section className="border border-border bg-card p-4">
                  <p className="mb-3 font-mono text-[9px] tracking-widest text-muted-foreground">
                    ASSIGNMENT
                  </p>
                  <div className="grid gap-2 md:grid-cols-[1fr_220px_auto]">
                    <input
                      value={assignedTo}
                      onChange={(event) => setAssignedTo(event.target.value)}
                      placeholder="Communications officer"
                      className="border border-border bg-secondary px-3 py-2 text-xs"
                    />
                    <input
                      type="datetime-local"
                      value={dueAt}
                      onChange={(event) => setDueAt(event.target.value)}
                      className="border border-border bg-secondary px-3 py-2 text-xs"
                    />
                    <button
                      onClick={() => void assignIncident()}
                      disabled={actionLoading || !assignedTo.trim()}
                      className="flex items-center justify-center gap-1 bg-primary px-3 py-2 font-mono text-[10px] text-primary-foreground disabled:opacity-50"
                    >
                      <UserPlus className="h-3 w-3" />
                      ASSIGN
                    </button>
                  </div>
                </section>

                <section className="border border-border bg-card p-4">
                  <p className="mb-3 font-mono text-[9px] tracking-widest text-muted-foreground">
                    OPERATIONAL STATUS
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "analysed",
                      "awaiting_approval",
                      "approved",
                      "published",
                      "monitoring",
                      "closed",
                    ].map((status) => (
                      <button
                        key={status}
                        onClick={() => void changeStatus(status)}
                        disabled={actionLoading}
                        className={`border px-3 py-1.5 font-mono text-[9px] ${badgeClass(
                          status,
                        )}`}
                      >
                        {status.replaceAll("_", " ").toUpperCase()}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="border border-border bg-card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-mono text-[9px] tracking-widest text-muted-foreground">
                      MULTI-CHANNEL RESPONSE BUILDER
                    </p>
                    <button
                      onClick={() => void generateChannels()}
                      disabled={actionLoading}
                      className="flex items-center gap-1 bg-primary px-3 py-1.5 font-mono text-[9px] text-primary-foreground disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      GENERATE
                    </button>
                  </div>

                  {!channels ? (
                    <p className="text-xs text-muted-foreground">
                      Generate Twitter/X, Facebook, WhatsApp, SMS, press statement
                      and rally versions using the local campaign engine.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(channels.channels).map(([key, value]) => (
                        <div
                          key={key}
                          className="border border-border bg-secondary/20 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <p className="font-mono text-[9px] tracking-widest text-primary">
                              {key.replaceAll(/([A-Z])/g, " $1").toUpperCase()}
                            </p>
                            <button
                              onClick={() => void copyText(key, value)}
                              className="flex items-center gap-1 border border-border px-2 py-1 font-mono text-[9px]"
                            >
                              <Clipboard className="h-3 w-3" />
                              {copiedKey === key ? "COPIED" : "COPY"}
                            </button>
                          </div>
                          <p className="whitespace-pre-line text-xs leading-relaxed">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="border border-border bg-card p-4">
                  <p className="mb-3 font-mono text-[9px] tracking-widest text-muted-foreground">
                    INCIDENT TIMELINE
                  </p>
                  <div className="space-y-3">
                    {(selected.timeline ?? []).map((event, index) => (
                      <div
                        key={`${event.event_type}-${index}`}
                        className="grid grid-cols-[90px_1fr] gap-3 border-l border-primary/30 pl-3"
                      >
                        <p className="font-mono text-[9px] text-muted-foreground">
                          {formatDate(event.created_at)}
                        </p>
                        <div>
                          <p className="font-mono text-[10px] text-primary">
                            {event.event_type.replaceAll("_", " ").toUpperCase()}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {event.note}
                            {event.actor ? ` · ${event.actor}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </aside>
        </div>
      )}
      {investigationCode && (
        <IncidentInvestigationV7
          incidentCode={investigationCode}
          onClose={() => setInvestigationCode(null)}
          onChanged={load}
        />
      )}

    </div>
  );
}
