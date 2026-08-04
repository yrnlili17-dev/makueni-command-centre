import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  Loader2,
  PlayCircle,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

type Briefing = {
  id: number;
  briefingDate: string;
  title: string;
  summary: string;
  priorities: string[];
  risks: string[];
  opportunities: string[];
  createdAt: string;
};

type ActionItem = {
  id: number;
  title: string;
  description?: string | null;
  category: string;
  priority: string;
  status: string;
  owner?: string | null;
  dueDate?: string | null;
  source?: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  onPrompt: (prompt: string) => void;
};

function priorityClass(priority: string) {
  if (priority === "critical") return "text-red-400 border-red-400/40";
  if (priority === "high") return "text-orange-400 border-orange-400/40";
  if (priority === "medium") return "text-yellow-400 border-yellow-400/40";
  return "text-blue-400 border-blue-400/40";
}

export default function DailyBriefingActionQueue({ onPrompt }: Props) {
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [priority, setPriority] = useState("high");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [briefingsResponse, actionsResponse] = await Promise.all([
        fetch(`${BASE}api/strategist/briefings`, {
          credentials: "include",
        }),
        fetch(`${BASE}api/strategist/actions`, {
          credentials: "include",
        }),
      ]);

      if (briefingsResponse.ok) {
        setBriefings(await briefingsResponse.json());
      }

      if (actionsResponse.ok) {
        setActions(await actionsResponse.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function generateBriefing() {
    setGenerating(true);
    try {
      const response = await fetch(
        `${BASE}api/strategist/briefings/generate`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to generate briefing");
      }

      await load();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function createAction() {
    if (!title.trim()) return;

    setCreating(true);
    try {
      const response = await fetch(`${BASE}api/strategist/actions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          owner: owner.trim() || null,
          priority,
          category: "executive",
          status: "pending",
          source: "manual",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create action");
      }

      setTitle("");
      setOwner("");
      await load();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Creation failed");
    } finally {
      setCreating(false);
    }
  }

  async function updateAction(id: number, patch: Record<string, unknown>) {
    const response = await fetch(`${BASE}api/strategist/actions/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (response.ok) await load();
  }

  async function deleteAction(id: number) {
    const response = await fetch(`${BASE}api/strategist/actions/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (response.ok) await load();
  }

  function downloadBriefing(briefing: Briefing) {
    const text = [
      briefing.title,
      `Date: ${briefing.briefingDate}`,
      "",
      "SUMMARY",
      briefing.summary,
      "",
      "PRIORITIES",
      ...briefing.priorities.map((item, index) => `${index + 1}. ${item}`),
      "",
      "RISKS",
      ...briefing.risks.map((item, index) => `${index + 1}. ${item}`),
      "",
      "OPPORTUNITIES",
      ...briefing.opportunities.map((item, index) => `${index + 1}. ${item}`),
    ].join("\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `executive-briefing-${briefing.briefingDate}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const latest = briefings[0];

  return (
    <section className="space-y-4 border-b border-border/50 bg-background/40 p-4 md:p-6">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">
            DAILY EXECUTIVE BRIEFING & ACTION QUEUE
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Persistent daily situation reports and trackable strategic actions.
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
            onClick={generateBriefing}
            disabled={generating}
            className="flex items-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CalendarDays className="h-3 w-3" />
            )}
            GENERATE TODAY
          </button>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                LATEST EXECUTIVE BRIEFING
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Generated from the live campaign database.
              </p>
            </div>
            <ClipboardList className="h-4 w-4 text-primary" />
          </div>

          {latest ? (
            <div className="mt-4 space-y-4">
              <div className="border border-border p-3">
                <p className="font-mono text-[8px] text-muted-foreground">
                  {latest.briefingDate}
                </p>
                <p className="mt-2 text-sm font-medium">{latest.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {latest.summary}
                </p>
              </div>

              <div>
                <p className="font-mono text-[9px] text-primary">
                  TOP PRIORITIES
                </p>
                <div className="mt-2 space-y-2">
                  {latest.priorities.map((item, index) => (
                    <button
                      key={`${item}-${index}`}
                      type="button"
                      onClick={() =>
                        onPrompt(
                          `Turn this executive priority into a detailed action plan: ${item}`,
                        )
                      }
                      className="grid w-full grid-cols-[28px_1fr] gap-3 border border-border p-3 text-left"
                    >
                      <span className="flex h-7 w-7 items-center justify-center border border-border font-mono text-[8px] text-primary">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-xs leading-relaxed">{item}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="border border-border p-3">
                  <p className="font-mono text-[8px] text-red-400">RISKS</p>
                  <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                    {latest.risks.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="border border-border p-3">
                  <p className="font-mono text-[8px] text-green-400">
                    OPPORTUNITIES
                  </p>
                  <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                    {latest.opportunities.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadBriefing(latest)}
                  className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
                >
                  <Download className="h-3 w-3" />
                  DOWNLOAD
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
                >
                  <Printer className="h-3 w-3" />
                  PRINT
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 border border-dashed border-border py-12 text-center font-mono text-[10px] text-muted-foreground">
              [ NO_EXECUTIVE_BRIEFING_GENERATED ]
            </div>
          )}
        </article>

        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                STRATEGIC ACTION QUEUE
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Assign, track and complete executive campaign actions.
              </p>
            </div>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_130px_110px_auto]">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="New strategic action"
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
              onClick={createAction}
              disabled={creating || !title.trim()}
              className="flex items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
            >
              <Plus className="h-3 w-3" />
              ADD
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {actions.map((action) => (
              <div
                key={action.id}
                className="grid gap-3 border border-border p-3 sm:grid-cols-[1fr_120px_110px_auto]"
              >
                <div>
                  <p className="text-xs font-medium">{action.title}</p>
                  <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                    {action.owner || "UNASSIGNED"} ·{" "}
                    {(action.source || "manual").toUpperCase()}
                  </p>
                </div>

                <span
                  className={`h-fit border px-2 py-1 text-center font-mono text-[8px] ${priorityClass(
                    action.priority,
                  )}`}
                >
                  {action.priority.toUpperCase()}
                </span>

                <select
                  value={action.status}
                  onChange={(event) =>
                    updateAction(action.id, { status: event.target.value })
                  }
                  className="h-fit border border-border bg-background px-2 py-1 font-mono text-[8px]"
                >
                  <option value="pending">PENDING</option>
                  <option value="in_progress">IN PROGRESS</option>
                  <option value="completed">COMPLETED</option>
                  <option value="deferred">DEFERRED</option>
                </select>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      onPrompt(
                        `Develop a detailed operational plan for this action: ${action.title}`,
                      )
                    }
                    className="border border-border p-2"
                    title="Open in strategist"
                  >
                    <PlayCircle className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAction(action.id)}
                    className="border border-border p-2 text-red-400"
                    title="Delete action"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {!loading && actions.length === 0 && (
              <div className="border border-dashed border-border py-10 text-center font-mono text-[10px] text-muted-foreground">
                [ NO_STRATEGIC_ACTIONS ]
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
