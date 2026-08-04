import {
  CheckCircle2,
  Command,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

type Decision = {
  id: number;
  title: string;
  decisionType: string;
  priority: string;
  status: string;
  owner?: string | null;
  dueDate?: string | null;
  rationale?: string | null;
  sourceModule?: string | null;
};

type AuditItem = {
  id: number;
  action: string;
  entityType: string;
  entityId?: string | null;
  actor?: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};

function priorityClass(priority: string) {
  if (priority === "critical") return "text-red-400 border-red-400/40";
  if (priority === "high") return "text-orange-400 border-orange-400/40";
  if (priority === "medium") return "text-yellow-400 border-yellow-400/40";
  return "text-blue-400 border-blue-400/40";
}

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-KE");
}

export default function ExecutiveDecisionConsole() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [priority, setPriority] = useState("high");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [decisionsResponse, auditResponse] = await Promise.all([
        fetch(`${BASE}api/command-centre/executive-decisions`, {
          credentials: "include",
        }),
        fetch(`${BASE}api/command-centre/executive-audit`, {
          credentials: "include",
        }),
      ]);

      if (decisionsResponse.ok) {
        setDecisions(await decisionsResponse.json());
      }

      if (auditResponse.ok) {
        setAudit(await auditResponse.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function generate() {
    setGenerating(true);
    try {
      const response = await fetch(
        `${BASE}api/command-centre/executive-decisions/generate`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to generate decisions");
      }

      await load();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function createDecision() {
    if (!title.trim()) return;

    const response = await fetch(
      `${BASE}api/command-centre/executive-decisions`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          owner: owner.trim() || null,
          priority,
          status: "pending",
          decisionType: "operational",
          sourceModule: "executive-command",
        }),
      },
    );

    if (response.ok) {
      setTitle("");
      setOwner("");
      await load();
    }
  }

  async function updateDecision(
    id: number,
    patch: Record<string, unknown>,
  ) {
    const response = await fetch(
      `${BASE}api/command-centre/executive-decisions/${id}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      },
    );

    if (response.ok) await load();
  }

  async function deleteDecision(id: number) {
    const response = await fetch(
      `${BASE}api/command-centre/executive-decisions/${id}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );

    if (response.ok) await load();
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">
            EXECUTIVE DECISION COMMAND CONSOLE
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Generate, assign, approve and audit executive campaign decisions.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            REFRESH
          </button>
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Command className="h-3 w-3" />
            )}
            GENERATE DECISIONS
          </button>
        </div>
      </header>

      <article className="border border-border bg-card p-4">
        <p className="font-mono text-[10px] tracking-widest">
          CREATE EXECUTIVE DECISION
        </p>

        <div className="mt-4 grid gap-2 md:grid-cols-[1fr_150px_110px_auto]">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Decision title"
            className="border border-border bg-background px-3 py-2 text-xs"
          />
          <input
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="Owner"
            className="border border-border bg-background px-3 py-2 text-xs"
          />
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className="border border-border bg-background px-3 py-2 font-mono text-[8px]"
          >
            <option value="critical">CRITICAL</option>
            <option value="high">HIGH</option>
            <option value="medium">MEDIUM</option>
            <option value="low">LOW</option>
          </select>
          <button
            type="button"
            onClick={createDecision}
            disabled={!title.trim()}
            className="flex items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
            ADD
          </button>
        </div>
      </article>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] tracking-widest">
              ACTIVE DECISIONS
            </p>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-2">
            {decisions.map((decision) => (
              <div
                key={decision.id}
                className="grid gap-3 border border-border p-3 lg:grid-cols-[1fr_110px_130px_auto]"
              >
                <div>
                  <p className="text-xs font-medium">{decision.title}</p>
                  {decision.rationale && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {decision.rationale}
                    </p>
                  )}
                  <p className="mt-2 font-mono text-[8px] text-muted-foreground">
                    {(decision.owner || "UNASSIGNED").toUpperCase()} ·{" "}
                    {(decision.sourceModule || "EXECUTIVE-COMMAND").toUpperCase()}
                  </p>
                </div>

                <span
                  className={`h-fit border px-2 py-1 text-center font-mono text-[8px] ${priorityClass(
                    decision.priority,
                  )}`}
                >
                  {decision.priority.toUpperCase()}
                </span>

                <select
                  value={decision.status}
                  onChange={(event) =>
                    updateDecision(decision.id, {
                      status: event.target.value,
                    })
                  }
                  className="h-fit border border-border bg-background px-2 py-1 font-mono text-[8px]"
                >
                  <option value="pending">PENDING</option>
                  <option value="approved">APPROVED</option>
                  <option value="in_progress">IN PROGRESS</option>
                  <option value="completed">COMPLETED</option>
                  <option value="deferred">DEFERRED</option>
                  <option value="archived">ARCHIVED</option>
                </select>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      updateDecision(decision.id, {
                        status: "approved",
                      })
                    }
                    className="border border-border p-2 text-green-400"
                    title="Approve"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteDecision(decision.id)}
                    className="border border-border p-2 text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {!loading && decisions.length === 0 && (
              <div className="border border-dashed border-border py-10 text-center font-mono text-[10px] text-muted-foreground">
                [ NO_EXECUTIVE_DECISIONS ]
              </div>
            )}
          </div>
        </article>

        <article className="border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] tracking-widest">
              EXECUTIVE AUDIT TRAIL
            </p>
            <FileText className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-2">
            {audit.slice(0, 30).map((item) => (
              <div
                key={item.id}
                className="border border-border p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[8px] text-primary">
                    {item.action.toUpperCase()}
                  </p>
                  <p className="font-mono text-[7px] text-muted-foreground">
                    {timeLabel(item.createdAt)}
                  </p>
                </div>
                <p className="mt-2 text-xs">
                  {item.entityType}{" "}
                  {item.entityId ? `#${item.entityId}` : ""}
                </p>
                <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                  ACTOR: {(item.actor || "SYSTEM").toUpperCase()}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}
