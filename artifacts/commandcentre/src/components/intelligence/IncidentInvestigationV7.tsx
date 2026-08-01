import { Clipboard, ExternalLink, FileText, Loader2, MessageSquare, RefreshCw, Send, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Incident = {
  id: number;
  incident_code: string;
  status: string;
  assigned_to?: string | null;
  due_at?: string | null;
  priority?: string | null;
  recommended_action?: string | null;
  strategy_reason?: string | null;
  confidence?: number | null;
  duplicateCount?: number;
  relatedMentionIds?: number[];
  estimatedReach?: number;
  topic?: string;
  sourceUrl?: string | null;
  mention: {
    id: number;
    platform?: string | null;
    author?: string | null;
    content?: string | null;
    sentiment?: string | null;
    engagementCount?: number | null;
    detectedAt?: string | null;
    aiSummary?: string | null;
  };
  response?: {
    id: number;
    status?: string | null;
    content?: string | null;
    draftedBy?: string | null;
    approvedBy?: string | null;
    approvedAt?: string | null;
    publishedAt?: string | null;
  } | null;
  timeline?: Array<{
    event_type: string;
    actor?: string | null;
    note?: string | null;
    created_at?: string | null;
  }>;
};

type ChannelOutput = {
  channels: Record<string, string>;
  generatedBy: string;
  requiresApiKeys: boolean;
};

type Props = {
  incidentCode: string;
  onClose: () => void;
  onChanged?: () => Promise<void> | void;
};

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.error ?? `Request failed (${response.status})`);
  return data as T;
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-KE", { dateStyle: "short", timeStyle: "short" });
}

function fmtNumber(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function badge(value?: string | null) {
  const key = String(value ?? "").toLowerCase();
  if (["critical", "escalate", "rejected"].includes(key)) return "border-red-400/40 bg-red-400/10 text-red-400";
  if (["high", "respond", "awaiting_approval"].includes(key)) return "border-orange-400/40 bg-orange-400/10 text-orange-400";
  if (["approved", "published", "closed"].includes(key)) return "border-green-400/40 bg-green-400/10 text-green-400";
  if (["monitor", "monitoring", "elevated"].includes(key)) return "border-yellow-400/40 bg-yellow-400/10 text-yellow-400";
  return "border-border bg-secondary text-muted-foreground";
}

export default function IncidentInvestigationV7({ incidentCode, onClose, onChanged }: Props) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [channels, setChannels] = useState<ChannelOutput | null>(null);
  const [assignedTo, setAssignedTo] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [note, setNote] = useState("");
  const [noteActor, setNoteActor] = useState("Campaign Operations");
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestJson<Incident>(`/api/intelligence/incidents/${encodeURIComponent(incidentCode)}`);
      setIncident(data);
      setAssignedTo(data.assigned_to ?? "");
      setDueAt(data.due_at ? new Date(data.due_at).toISOString().slice(0, 16) : "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load incident");
    } finally {
      setLoading(false);
    }
  }, [incidentCode]);

  useEffect(() => { void load(); }, [load]);

  const flags = useMemo(() => {
    if (!incident) return [];
    const text = String(incident.mention?.content ?? "").toLowerCase();
    const values: string[] = [];
    if (/corrupt|fraud|tender/.test(text)) values.push("LEGAL REVIEW");
    if (/violence|threat|attack/.test(text)) values.push("SECURITY ESCALATION");
    if (/rumou?r|unverified/.test(text)) values.push("FACT VERIFICATION");
    if ((incident.duplicateCount ?? 0) > 5) values.push("COORDINATED REPETITION");
    if ((incident.estimatedReach ?? 0) > 10000) values.push("HIGH REACH");
    return values;
  }, [incident]);

  async function assign() {
    if (!incident || !assignedTo.trim()) return;
    setActionLoading(true);
    try {
      await requestJson(`/api/intelligence/incidents/${encodeURIComponent(incident.incident_code)}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assignedTo: assignedTo.trim(), dueAt: dueAt ? new Date(dueAt).toISOString() : null, priority: incident.priority ?? "normal" }),
      });
      await load();
      await onChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Assignment failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function changeStatus(status: string) {
    if (!incident) return;
    setActionLoading(true);
    try {
      await requestJson(`/api/intelligence/incidents/${encodeURIComponent(incident.incident_code)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, actor: "Campaign Operations" }),
      });
      await load();
      await onChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Status update failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function addNote() {
    if (!incident || !note.trim()) return;
    setActionLoading(true);
    try {
      await requestJson(`/api/intelligence/incidents/${encodeURIComponent(incident.incident_code)}/events`, {
        method: "POST",
        body: JSON.stringify({ eventType: "investigation_note", actor: noteActor.trim() || "Campaign Operations", note: note.trim(), metadata: { source: "phase7-investigation-workspace" } }),
      });
      setNote("");
      await load();
      await onChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save note");
    } finally {
      setActionLoading(false);
    }
  }

  async function generateChannels() {
    if (!incident) return;
    setActionLoading(true);
    try {
      setChannels(await requestJson<ChannelOutput>(`/api/intelligence/incidents/${encodeURIComponent(incident.incident_code)}/channels`, { method: "POST", body: "{}" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate responses");
    } finally {
      setActionLoading(false);
    }
  }

  async function copyText(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 p-2 lg:p-5">
      <div className="mx-auto flex h-full max-w-[1500px] flex-col overflow-hidden border border-border bg-background shadow-2xl">
        <header className="flex items-start justify-between border-b border-border bg-card px-5 py-4">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-primary">PHASE 7 INCIDENT INVESTIGATION</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{incidentCode}</h2>
              {incident && <>
                <span className={`border px-2 py-1 font-mono text-[9px] ${badge(incident.status)}`}>{incident.status.replaceAll("_", " ").toUpperCase()}</span>
                <span className={`border px-2 py-1 font-mono text-[9px] ${badge(incident.priority)}`}>{(incident.priority ?? "normal").toUpperCase()}</span>
              </>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void load()} className="flex items-center gap-1 border border-border px-3 py-2 font-mono text-[10px]"><RefreshCw className="h-3 w-3" />REFRESH</button>
            <button onClick={onClose} className="border border-border p-2"><X className="h-4 w-4" /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-5">
          {loading ? <div className="flex min-h-[500px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : incident ? <div className="space-y-4">
            {error && <div className="border border-red-400/30 bg-red-400/10 p-3 font-mono text-xs text-red-400">{error}</div>}

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
              {[["TOPIC", incident.topic ?? "Unclassified"],["ACTION", incident.recommended_action ?? "monitor"],["CONFIDENCE", `${incident.confidence ?? 0}%`],["REACH", fmtNumber(incident.estimatedReach)],["DUPLICATES", fmtNumber(incident.duplicateCount)],["PLATFORM", incident.mention?.platform ?? "Unknown"],["ASSIGNED", incident.assigned_to ?? "Unassigned"],["DEADLINE", fmtDate(incident.due_at)]].map(([label,value]) => <div key={label} className="border border-border bg-card p-3"><p className="font-mono text-[8px] text-muted-foreground">{label}</p><p className="mt-2 truncate font-mono text-xs">{value}</p></div>)}
            </section>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <section className="border border-border bg-card p-4">
                  <div className="mb-3 flex items-center justify-between"><p className="font-mono text-[10px]">SOURCE INTELLIGENCE</p>{incident.sourceUrl && <a href={incident.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 border border-border px-3 py-1.5 font-mono text-[9px]"><ExternalLink className="h-3 w-3" />OPEN ORIGINAL</a>}</div>
                  <div className="border border-border bg-secondary/30 p-4"><p className="text-sm leading-relaxed">{incident.mention?.content ?? "No source content available."}</p></div>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><p><span className="text-muted-foreground">Author:</span> {incident.mention?.author ?? "Unknown"}</p><p><span className="text-muted-foreground">Detected:</span> {fmtDate(incident.mention?.detectedAt)}</p><p><span className="text-muted-foreground">Sentiment:</span> {incident.mention?.sentiment ?? "Unknown"}</p><p><span className="text-muted-foreground">Engagement:</span> {fmtNumber(incident.mention?.engagementCount)}</p></div>
                </section>

                <section className="border border-border bg-card p-4">
                  <p className="mb-3 font-mono text-[10px]">INVESTIGATION ASSESSMENT</p>
                  <div className="mb-3 flex flex-wrap gap-2">{flags.length ? flags.map(flag => <span key={flag} className="border border-orange-400/40 bg-orange-400/10 px-2 py-1 font-mono text-[9px] text-orange-400">{flag}</span>) : <span className="border border-border px-2 py-1 font-mono text-[9px] text-muted-foreground">NO AUTOMATIC RISK FLAGS</span>}</div>
                  <p className="text-sm text-muted-foreground">{incident.strategy_reason ?? "No strategy explanation available."}</p>
                  {incident.mention?.aiSummary && <div className="mt-3 border border-border bg-secondary/20 p-3"><p className="mb-1 font-mono text-[8px] text-muted-foreground">LOCAL INTELLIGENCE SUMMARY</p><p className="text-xs">{incident.mention.aiSummary}</p></div>}
                </section>

                <section className="border border-border bg-card p-4">
                  <p className="mb-3 font-mono text-[10px]">RELATED ACTIVITY</p>
                  <div className="grid gap-3 sm:grid-cols-3">{[["RELATED MENTIONS", incident.relatedMentionIds?.length ?? 0],["DUPLICATE POSTS", incident.duplicateCount ?? 0],["EVIDENCE ITEMS",0]].map(([label,value]) => <div key={String(label)} className="border border-border p-3"><p className="font-mono text-[8px] text-muted-foreground">{label}</p><p className="mt-2 text-xl">{value}</p></div>)}</div>
                  {!!incident.relatedMentionIds?.length && <div className="mt-3 flex flex-wrap gap-2">{incident.relatedMentionIds.map(id => <span key={id} className="border border-border px-2 py-1 font-mono text-[9px]">MENTION #{id}</span>)}</div>}
                </section>

                <section className="border border-border bg-card p-4">
                  <div className="mb-3 flex items-center justify-between"><p className="font-mono text-[10px]">RESPONSE OPERATIONS</p><button onClick={() => void generateChannels()} disabled={actionLoading} className="flex items-center gap-1 bg-primary px-3 py-1.5 font-mono text-[9px] text-primary-foreground"><Send className="h-3 w-3" />GENERATE CHANNEL VERSIONS</button></div>
                  {incident.response?.content && <div className="mb-3 border border-border bg-secondary/20 p-3"><div className="mb-2 flex items-center justify-between"><p className="font-mono text-[8px] text-primary">CURRENT RESPONSE</p><button onClick={() => void copyText("current", incident.response?.content ?? "")} className="flex items-center gap-1 border border-border px-2 py-1 font-mono text-[8px]"><Clipboard className="h-3 w-3" />{copied === "current" ? "COPIED" : "COPY"}</button></div><p className="text-xs leading-relaxed">{incident.response.content}</p></div>}
                  {!channels ? <p className="text-xs text-muted-foreground">Generate Twitter/X, Facebook, WhatsApp, SMS, press statement and rally talking points with the Local Campaign Intelligence Engine.</p> : <div className="space-y-3">{Object.entries(channels.channels).map(([key,value]) => <div key={key} className="border border-border bg-secondary/20 p-3"><div className="mb-2 flex items-center justify-between"><p className="font-mono text-[8px] text-primary">{key.replaceAll(/([A-Z])/g," $1").toUpperCase()}</p><button onClick={() => void copyText(key,value)} className="flex items-center gap-1 border border-border px-2 py-1 font-mono text-[8px]"><Clipboard className="h-3 w-3" />{copied === key ? "COPIED" : "COPY"}</button></div><p className="whitespace-pre-line text-xs leading-relaxed">{value}</p></div>)}</div>}
                </section>
              </div>

              <div className="space-y-4">
                <section className="border border-border bg-card p-4"><p className="mb-3 font-mono text-[10px]">ASSIGNMENT & DEADLINE</p><div className="space-y-2"><input value={assignedTo} onChange={e=>setAssignedTo(e.target.value)} placeholder="Officer or team" className="w-full border border-border bg-secondary px-3 py-2 text-xs"/><input type="datetime-local" value={dueAt} onChange={e=>setDueAt(e.target.value)} className="w-full border border-border bg-secondary px-3 py-2 text-xs"/><button onClick={() => void assign()} disabled={actionLoading || !assignedTo.trim()} className="flex w-full items-center justify-center gap-1 bg-primary px-3 py-2 font-mono text-[10px] text-primary-foreground"><UserPlus className="h-3 w-3" />SAVE ASSIGNMENT</button></div></section>

                <section className="border border-border bg-card p-4"><p className="mb-3 font-mono text-[10px]">OPERATIONAL ACTIONS</p><div className="grid grid-cols-2 gap-2">{[["analysed","ANALYSED"],["awaiting_approval","AWAITING APPROVAL"],["approved","APPROVED"],["published","PUBLISHED"],["monitoring","MONITORING"],["closed","CLOSE INCIDENT"]].map(([status,label]) => <button key={status} onClick={() => void changeStatus(status)} disabled={actionLoading} className={`border px-3 py-2 font-mono text-[9px] ${badge(status)}`}>{label}</button>)}</div></section>

                <section className="border border-border bg-card p-4"><p className="mb-3 font-mono text-[10px]">INVESTIGATION NOTES</p><input value={noteActor} onChange={e=>setNoteActor(e.target.value)} placeholder="Officer name" className="mb-2 w-full border border-border bg-secondary px-3 py-2 text-xs"/><textarea value={note} onChange={e=>setNote(e.target.value)} rows={5} placeholder="Add fact-checking notes, legal guidance, evidence status or operational instructions..." className="w-full resize-none border border-border bg-secondary px-3 py-2 text-xs"/><button onClick={() => void addNote()} disabled={actionLoading || !note.trim()} className="mt-2 flex w-full items-center justify-center gap-1 border border-primary bg-primary/10 px-3 py-2 font-mono text-[10px] text-primary"><MessageSquare className="h-3 w-3" />ADD NOTE TO TIMELINE</button></section>

                <section className="border border-border bg-card p-4"><p className="mb-3 font-mono text-[10px]">EVIDENCE REGISTER</p><div className="space-y-2">{["Screenshot","Source URL","Campaign document","Public record","Legal review"].map(item => <div key={item} className="flex items-center justify-between border border-border px-3 py-2"><span className="flex items-center gap-2 text-xs"><FileText className="h-3 w-3 text-muted-foreground" />{item}</span><span className="font-mono text-[8px] text-muted-foreground">NOT ATTACHED</span></div>)}</div><p className="mt-3 text-[10px] text-muted-foreground">Evidence uploads and legal-review records will be enabled in Phase 7 ZIP D.</p></section>

                <section className="border border-border bg-card p-4"><p className="mb-3 font-mono text-[10px]">INCIDENT TIMELINE</p><div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">{(incident.timeline ?? []).map((event,index) => <div key={`${event.event_type}-${index}`} className="border-l border-primary/40 pl-3"><div className="flex items-center justify-between gap-3"><p className="font-mono text-[9px] text-primary">{event.event_type.replaceAll("_"," ").toUpperCase()}</p><p className="font-mono text-[8px] text-muted-foreground">{fmtDate(event.created_at)}</p></div><p className="mt-1 text-xs text-muted-foreground">{event.note ?? "Operational event"}{event.actor ? ` · ${event.actor}` : ""}</p></div>)}{!(incident.timeline ?? []).length && <p className="py-8 text-center font-mono text-xs text-muted-foreground">[ NO_TIMELINE_EVENTS ]</p>}</div></section>
              </div>
            </div>
          </div> : <div className="border border-red-400/30 bg-red-400/10 p-4 font-mono text-xs text-red-400">{error ?? "Incident not found"}</div>}
        </div>
      </div>
    </div>
  );
}
