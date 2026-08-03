import {
  BookOpen,
  CheckCircle2,
  Download,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

type Playbook = {
  id: number;
  title: string;
  playbookType: string;
  objective: string;
  timeframe: string;
  targetArea?: string | null;
  executiveSummary: string;
  actions: string[];
  successMetrics: string[];
  risks: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  onPrompt: (prompt: string) => void;
};

const PLAYBOOK_TYPES = [
  ["30-day-strategy", "30-DAY STRATEGY"],
  ["7-day-ward-plan", "7-DAY WARD PLAN"],
  ["rally-plan", "RALLY PLAN"],
  ["volunteer-plan", "VOLUNTEER PLAN"],
  ["messaging-plan", "MESSAGING PLAN"],
  ["threat-response", "THREAT RESPONSE"],
];

export default function StrategyPlaybookWorkspace({ onPrompt }: Props) {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [playbookType, setPlaybookType] = useState("30-day-strategy");
  const [targetArea, setTargetArea] = useState("Makueni County");
  const [timeframe, setTimeframe] = useState("30 days");
  const [convertingId, setConvertingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE}api/strategist/playbooks`, {
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load playbooks");
      }

      setPlaybooks(await response.json());
    } catch (error) {
      alert(error instanceof Error ? error.message : "Playbook load failed");
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
        `${BASE}api/strategist/playbooks/generate`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playbookType,
            targetArea,
            timeframe,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to generate playbook");
      }

      await load();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function updateStatus(id: number, status: string) {
    const response = await fetch(
      `${BASE}api/strategist/playbooks/${id}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      },
    );

    if (response.ok) await load();
  }

  async function deletePlaybook(id: number) {
    const response = await fetch(
      `${BASE}api/strategist/playbooks/${id}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );

    if (response.ok) await load();
  }

  async function convertToActions(id: number) {
    setConvertingId(id);
    try {
      const response = await fetch(
        `${BASE}api/strategist/playbooks/${id}/actions`,
        {
          method: "POST",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create actions");
      }

      const data = await response.json();
      alert(`${data.createdActions ?? 0} actions added to the queue`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Conversion failed");
    } finally {
      setConvertingId(null);
    }
  }

  function download(playbook: Playbook) {
    const text = [
      playbook.title,
      "",
      `TYPE: ${playbook.playbookType}`,
      `TARGET AREA: ${playbook.targetArea ?? "Not specified"}`,
      `TIMEFRAME: ${playbook.timeframe}`,
      `STATUS: ${playbook.status}`,
      "",
      "OBJECTIVE",
      playbook.objective,
      "",
      "EXECUTIVE SUMMARY",
      playbook.executiveSummary,
      "",
      "ACTIONS",
      ...playbook.actions.map((item, index) => `${index + 1}. ${item}`),
      "",
      "SUCCESS METRICS",
      ...playbook.successMetrics.map(
        (item, index) => `${index + 1}. ${item}`,
      ),
      "",
      "RISKS",
      ...playbook.risks.map((item, index) => `${index + 1}. ${item}`),
    ].join("\n");

    const blob = new Blob([text], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `strategy-playbook-${playbook.id}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-4 border-b border-border/50 bg-background/40 p-4 md:p-6">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">
            STRATEGY PLAYBOOK WORKSPACE
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Generate, save, activate and convert campaign strategies into tracked actions.
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

      <article className="border border-border bg-card p-4">
        <p className="font-mono text-[10px] tracking-widest">
          GENERATE NEW PLAYBOOK
        </p>

        <div className="mt-4 grid gap-2 md:grid-cols-[180px_1fr_140px_auto]">
          <select
            value={playbookType}
            onChange={(event) => setPlaybookType(event.target.value)}
            className="border border-border bg-background px-3 py-2 font-mono text-[8px]"
          >
            {PLAYBOOK_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <input
            value={targetArea}
            onChange={(event) => setTargetArea(event.target.value)}
            placeholder="Target area"
            className="border border-border bg-background px-3 py-2 text-xs"
          />

          <input
            value={timeframe}
            onChange={(event) => setTimeframe(event.target.value)}
            placeholder="Timeframe"
            className="border border-border bg-background px-3 py-2 text-xs"
          />

          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="flex items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            GENERATE
          </button>
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-2">
        {playbooks.map((playbook) => (
          <article
            key={playbook.id}
            className="border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[8px] text-primary">
                  {playbook.playbookType.toUpperCase()}
                </p>
                <p className="mt-1 text-sm font-medium">{playbook.title}</p>
                <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                  {(playbook.targetArea || "NOT SPECIFIED").toUpperCase()} ·{" "}
                  {playbook.timeframe.toUpperCase()}
                </p>
              </div>

              <select
                value={playbook.status}
                onChange={(event) =>
                  updateStatus(playbook.id, event.target.value)
                }
                className="border border-border bg-background px-2 py-1 font-mono text-[8px]"
              >
                <option value="draft">DRAFT</option>
                <option value="active">ACTIVE</option>
                <option value="completed">COMPLETED</option>
                <option value="archived">ARCHIVED</option>
              </select>
            </div>

            <div className="mt-4 border border-border p-3">
              <p className="font-mono text-[8px] text-muted-foreground">
                OBJECTIVE
              </p>
              <p className="mt-2 text-xs leading-relaxed">
                {playbook.objective}
              </p>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              {playbook.executiveSummary}
            </p>

            <div className="mt-4">
              <p className="font-mono text-[8px] text-primary">
                ACTIONS
              </p>
              <ol className="mt-2 space-y-2">
                {playbook.actions.map((action, index) => (
                  <li
                    key={`${action}-${index}`}
                    className="grid grid-cols-[24px_1fr] gap-2 border border-border p-2 text-xs"
                  >
                    <span className="font-mono text-[8px] text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{action}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  onPrompt(
                    `Review and improve this strategy playbook: ${playbook.title}. Objective: ${playbook.objective}. Actions: ${playbook.actions.join(
                      "; ",
                    )}`,
                  )
                }
                className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
              >
                <MessageSquare className="h-3 w-3" />
                ASK STRATEGIST
              </button>

              <button
                type="button"
                onClick={() => convertToActions(playbook.id)}
                disabled={convertingId === playbook.id}
                className="flex items-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
              >
                {convertingId === playbook.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                ADD ACTIONS TO QUEUE
              </button>

              <button
                type="button"
                onClick={() => download(playbook)}
                className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
              >
                <Download className="h-3 w-3" />
                DOWNLOAD
              </button>

              <button
                type="button"
                onClick={() => deletePlaybook(playbook.id)}
                className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px] text-red-400"
              >
                <Trash2 className="h-3 w-3" />
                DELETE
              </button>
            </div>
          </article>
        ))}

        {!loading && playbooks.length === 0 && (
          <div className="col-span-full border border-dashed border-border py-12 text-center font-mono text-[10px] text-muted-foreground">
            [ NO_STRATEGY_PLAYBOOKS ]
          </div>
        )}
      </div>
    </section>
  );
}
