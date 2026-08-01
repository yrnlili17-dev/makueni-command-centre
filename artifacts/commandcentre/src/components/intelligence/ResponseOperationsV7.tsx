import {
  CheckCircle,
  Clipboard,
  Edit2,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Send,
  Shield,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import IncidentInvestigationV7 from "./IncidentInvestigationV7";

type ResponseItem = {
  id: number;
  mentionId?: number | null;
  platform: string;
  content: string;
  draftedBy?: string | null;
  status: string;
  createdAt: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  publishedAt?: string | null;
  rejectionReason?: string | null;
  sourceContent?: string;
  sourceAuthor?: string | null;
  sourcePlatform?: string | null;
  sourceHref?: string | null;
  sourceLinkLabel?: string | null;
  responseOptions?: string[];
  hiddenDuplicateCount?: number;
};

type Incident = {
  incident_code: string;
  status: string;
  priority?: string | null;
  confidence?: number | null;
  estimatedReach?: number;
  duplicateCount?: number;
  assigned_to?: string | null;
  due_at?: string | null;
  mention?: {
    id: number;
    platform?: string | null;
    author?: string | null;
  };
};

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
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

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-KE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function badge(status?: string | null) {
  const value = String(status ?? "").toLowerCase();
  if (value === "pending_approval") return "border-yellow-400/40 text-yellow-400";
  if (value === "approved") return "border-green-400/40 text-green-400";
  if (value === "published") return "border-blue-400/40 text-blue-400";
  if (value === "rejected") return "border-red-400/40 text-red-400";
  return "border-border text-muted-foreground";
}

export default function ResponseOperationsV7() {
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [investigationCode, setInvestigationCode] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [responseData, incidentData] = await Promise.all([
        requestJson<ResponseItem[]>("/api/intelligence/responses"),
        requestJson<Incident[]>("/api/intelligence/incidents"),
      ]);

      setResponses(responseData);
      setIncidents(incidentData);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Failed to load response operations",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const incidentByMention = useMemo(() => {
    const map = new Map<number, Incident>();
    for (const incident of incidents) {
      const mentionId = incident.mention?.id;
      if (typeof mentionId === "number") map.set(mentionId, incident);
    }
    return map;
  }, [incidents]);

  const platforms = useMemo(
    () =>
      Array.from(
        new Set(responses.map((item) => item.platform).filter(Boolean)),
      ).sort(),
    [responses],
  );

  const visible = useMemo(
    () =>
      responses.filter((response) => {
        if (statusFilter !== "all" && response.status !== statusFilter) {
          return false;
        }
        if (
          platformFilter !== "all" &&
          response.platform !== platformFilter
        ) {
          return false;
        }
        return true;
      }),
    [responses, statusFilter, platformFilter],
  );

  async function updateResponse(
    id: number,
    body: Record<string, unknown>,
  ) {
    await requestJson(`/api/intelligence/responses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    await load();
  }

  async function deleteResponse(id: number) {
    await requestJson(`/api/intelligence/responses/${id}`, {
      method: "DELETE",
    });
    await load();
  }

  async function copyResponse(response: ResponseItem) {
    await navigator.clipboard.writeText(response.content);
    setCopiedId(response.id);
    window.setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">
            PHASE 7 RESPONSE OPERATIONS
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Every response is linked to its intelligence incident, approval state,
            source, owner and operational deadline.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="border border-border bg-secondary px-3 py-2 font-mono text-[10px]"
          >
            <option value="all">ALL STATUS</option>
            <option value="pending_approval">PENDING</option>
            <option value="approved">APPROVED</option>
            <option value="published">RESPONDED</option>
            <option value="rejected">REJECTED</option>
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

          <button
            onClick={() => void load()}
            className="flex items-center gap-1 border border-border px-3 py-2 font-mono text-[10px] hover:bg-secondary"
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
        <div className="flex min-h-[360px] items-center justify-center border border-border bg-card">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 border border-border bg-card">
          <Shield className="h-7 w-7 text-muted-foreground" />
          <p className="font-mono text-xs text-muted-foreground">
            [ RESPONSE_OPERATIONS_EMPTY ]
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((response) => {
            const incident =
              typeof response.mentionId === "number"
                ? incidentByMention.get(response.mentionId)
                : undefined;

            return (
              <article
                key={response.id}
                className="border border-border bg-card p-4"
              >
                <header className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`border px-2 py-1 font-mono text-[9px] ${badge(
                        response.status,
                      )}`}
                    >
                      {response.status.replaceAll("_", " ").toUpperCase()}
                    </span>

                    <span className="font-mono text-[10px] text-muted-foreground">
                      {response.platform}
                    </span>

                    <span className="font-mono text-[9px] text-green-400">
                      {(response.draftedBy ?? "local-engine").toUpperCase()}
                    </span>

                    {incident ? (
                      <button
                        onClick={() =>
                          setInvestigationCode(incident.incident_code)
                        }
                        className="border border-primary/40 bg-primary/5 px-2 py-1 font-mono text-[9px] text-primary"
                      >
                        {incident.incident_code}
                      </button>
                    ) : (
                      <span className="border border-yellow-400/30 px-2 py-1 font-mono text-[9px] text-yellow-400">
                        UNLINKED RESPONSE
                      </span>
                    )}
                  </div>

                  <span className="font-mono text-[9px] text-muted-foreground">
                    {formatDate(response.createdAt)}
                  </span>
                </header>

                {incident && (
                  <section className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                    {[
                      ["THREAT", incident.priority ?? "normal"],
                      ["CONFIDENCE", `${incident.confidence ?? 0}%`],
                      ["REACH", Number(incident.estimatedReach ?? 0).toLocaleString("en-KE")],
                      ["DUPLICATES", String(incident.duplicateCount ?? 0)],
                      ["ASSIGNED", incident.assigned_to ?? "Unassigned"],
                      ["DEADLINE", formatDate(incident.due_at)],
                    ].map(([label, value]) => (
                      <div key={label} className="border border-border bg-secondary/20 p-2">
                        <p className="font-mono text-[8px] text-muted-foreground">
                          {label}
                        </p>
                        <p className="mt-1 truncate font-mono text-[10px]">
                          {value}
                        </p>
                      </div>
                    ))}
                  </section>
                )}

                {response.sourceContent && (
                  <section className="mb-3 border border-border bg-secondary/30 p-3">
                    <p className="mb-1 font-mono text-[8px] tracking-widest text-muted-foreground">
                      ORIGINAL POST
                      {response.sourceAuthor
                        ? ` · ${response.sourceAuthor}`
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {response.sourceContent}
                    </p>
                  </section>
                )}

                {editingId === response.id ? (
                  <section className="mb-3 space-y-2">
                    <textarea
                      value={editingContent}
                      onChange={(event) => setEditingContent(event.target.value)}
                      rows={4}
                      className="w-full resize-none border border-border bg-secondary px-3 py-2 text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="border border-border px-3 py-1.5 font-mono text-[9px]"
                      >
                        CANCEL
                      </button>
                      <button
                        onClick={async () => {
                          await updateResponse(response.id, {
                            content: editingContent,
                          });
                          setEditingId(null);
                        }}
                        className="bg-primary px-3 py-1.5 font-mono text-[9px] text-primary-foreground"
                      >
                        SAVE
                      </button>
                    </div>
                  </section>
                ) : (
                  <>
                    <p className="mb-3 text-sm leading-relaxed">
                      {response.content}
                    </p>

                    {!!response.responseOptions?.length && (
                      <section className="mb-3 grid gap-2 lg:grid-cols-3">
                        {response.responseOptions.map((option, index) => (
                          <button
                            key={`${response.id}-${index}`}
                            onClick={() =>
                              void updateResponse(response.id, {
                                content: option,
                              })
                            }
                            className={`border p-3 text-left text-xs hover:border-primary/60 ${
                              option === response.content
                                ? "border-primary/50 bg-primary/5"
                                : "border-border"
                            }`}
                          >
                            <span className="mb-1 block font-mono text-[8px] text-primary">
                              OPTION {String.fromCharCode(65 + index)}
                            </span>
                            {option}
                          </button>
                        ))}
                      </section>
                    )}
                  </>
                )}

                {rejectingId === response.id && (
                  <section className="mb-3 flex flex-col gap-2 lg:flex-row">
                    <input
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      placeholder="Rejection reason"
                      className="flex-1 border border-red-400/30 bg-secondary px-3 py-2 text-xs"
                    />
                    <button
                      onClick={async () => {
                        await updateResponse(response.id, {
                          status: "rejected",
                          rejectionReason:
                            rejectReason || "Rejected by communications team",
                        });
                        setRejectReason("");
                        setRejectingId(null);
                      }}
                      className="bg-red-500 px-3 py-2 font-mono text-[9px] text-white"
                    >
                      CONFIRM REJECT
                    </button>
                  </section>
                )}

                <footer className="flex flex-wrap gap-2">
                  <button
                    onClick={() => void copyResponse(response)}
                    className="flex items-center gap-1 border border-border px-3 py-1.5 font-mono text-[9px]"
                  >
                    <Clipboard className="h-3 w-3" />
                    {copiedId === response.id ? "COPIED" : "COPY"}
                  </button>

                  {response.sourceHref ? (
                    <a
                      href={response.sourceHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 border border-border px-3 py-1.5 font-mono text-[9px]"
                    >
                      <Eye className="h-3 w-3" />
                      {response.sourceLinkLabel ?? "OPEN SOURCE"}
                    </a>
                  ) : (
                    <span className="border border-border px-3 py-1.5 font-mono text-[9px] text-muted-foreground">
                      SOURCE LINK UNAVAILABLE
                    </span>
                  )}

                  {incident && (
                    <button
                      onClick={() =>
                        setInvestigationCode(incident.incident_code)
                      }
                      className="flex items-center gap-1 border border-primary/40 px-3 py-1.5 font-mono text-[9px] text-primary"
                    >
                      <Eye className="h-3 w-3" />
                      OPEN INVESTIGATION
                    </button>
                  )}

                  {response.status === "pending_approval" && (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(response.id);
                          setEditingContent(response.content);
                        }}
                        className="flex items-center gap-1 border border-border px-3 py-1.5 font-mono text-[9px]"
                      >
                        <Edit2 className="h-3 w-3" />
                        EDIT
                      </button>
                      <button
                        onClick={() =>
                          void updateResponse(response.id, {
                            status: "approved",
                          })
                        }
                        className="flex items-center gap-1 border border-green-500/40 bg-green-500/10 px-3 py-1.5 font-mono text-[9px] text-green-400"
                      >
                        <CheckCircle className="h-3 w-3" />
                        APPROVE
                      </button>
                      <button
                        onClick={() => setRejectingId(response.id)}
                        className="flex items-center gap-1 border border-red-500/40 bg-red-500/10 px-3 py-1.5 font-mono text-[9px] text-red-400"
                      >
                        <XCircle className="h-3 w-3" />
                        REJECT
                      </button>
                    </>
                  )}

                  {response.status === "approved" && (
                    <button
                      onClick={() =>
                        void updateResponse(response.id, {
                          status: "published",
                        })
                      }
                      className="flex items-center gap-1 bg-primary px-3 py-1.5 font-mono text-[9px] text-primary-foreground"
                    >
                      <Send className="h-3 w-3" />
                      MARK RESPONDED
                    </button>
                  )}

                  <button
                    onClick={() => void deleteResponse(response.id)}
                    className="ml-auto border border-border p-2 text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </footer>
              </article>
            );
          })}
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
