import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Printer,
  ShieldCheck,
  Target,
  UserCheck,
} from "lucide-react";
import { useMemo } from "react";

type ReadinessItem = {
  id: number;
  domain: string;
  item: string;
  status: string;
  owner?: string | null;
  notes?: string | null;
  weight?: string | null;
};

type Milestone = {
  id: number;
  title: string;
  status: string;
  dueDate: string;
  category: string;
  priority?: string | null;
  owner?: string | null;
};

type Props = {
  readinessItems: ReadinessItem[];
  milestones: Milestone[];
  electionDate?: string | null;
  daysRemaining?: number | null;
  onPrint: () => void;
};

const WEIGHTS: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const STATUS_POINTS: Record<string, number> = {
  not_started: 0,
  in_progress: 0.5,
  done: 1,
};

function number(value: number) {
  return value.toLocaleString("en-KE");
}

function weightedScore(items: ReadinessItem[]) {
  if (items.length === 0) return 0;

  let earned = 0;
  let possible = 0;

  for (const item of items) {
    const weight = WEIGHTS[item.weight ?? "medium"] ?? 2;
    possible += weight;
    earned += weight * (STATUS_POINTS[item.status] ?? 0);
  }

  return possible > 0 ? Math.round((earned / possible) * 100) : 0;
}

function scoreClass(score: number) {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function scoreLabel(score: number) {
  if (score >= 80) return "READY";
  if (score >= 60) return "STABLE";
  if (score >= 40) return "AT RISK";
  return "CRITICAL";
}

export default function CandidateReadinessExecutive({
  readinessItems,
  milestones,
  electionDate,
  daysRemaining,
  onPrint,
}: Props) {
  const overall = weightedScore(readinessItems);

  const domains = useMemo(() => {
    const grouped = new Map<string, ReadinessItem[]>();

    for (const item of readinessItems) {
      const current = grouped.get(item.domain) ?? [];
      current.push(item);
      grouped.set(item.domain, current);
    }

    return Array.from(grouped.entries())
      .map(([domain, items]) => ({
        domain,
        items,
        score: weightedScore(items),
        done: items.filter((item) => item.status === "done").length,
        inProgress: items.filter((item) => item.status === "in_progress").length,
        unassigned: items.filter((item) => !item.owner?.trim()).length,
      }))
      .sort((a, b) => a.score - b.score);
  }, [readinessItems]);

  const actionItems = useMemo(
    () =>
      readinessItems
        .filter((item) => item.status !== "done")
        .sort((a, b) => {
          const weightDifference =
            (WEIGHTS[b.weight ?? "medium"] ?? 2) -
            (WEIGHTS[a.weight ?? "medium"] ?? 2);

          if (weightDifference !== 0) return weightDifference;

          if (a.status === "in_progress" && b.status !== "in_progress") return -1;
          if (b.status === "in_progress" && a.status !== "in_progress") return 1;
          return a.domain.localeCompare(b.domain);
        })
        .slice(0, 8),
    [readinessItems],
  );

  const openMilestones = milestones.filter(
    (milestone) => milestone.status !== "completed",
  ).length;
  const completedMilestones = milestones.length - openMilestones;
  const assignedItems = readinessItems.filter(
    (item) => Boolean(item.owner?.trim()),
  ).length;
  const inProgressItems = readinessItems.filter(
    (item) => item.status === "in_progress",
  ).length;
  const completedItems = readinessItems.filter(
    (item) => item.status === "done",
  ).length;

  function downloadBriefing() {
    const lines = [
      "KALOKI 2027 — CANDIDATE READINESS EXECUTIVE BRIEFING",
      "====================================================",
      `Generated: ${new Date().toLocaleString("en-KE")}`,
      `Election Date: ${electionDate ?? "Not set"}`,
      `Days Remaining: ${daysRemaining ?? "—"}`,
      `Weighted Readiness: ${overall}% (${scoreLabel(overall)})`,
      "",
      "READINESS SUMMARY",
      `Checklist Items: ${readinessItems.length}`,
      `Completed: ${completedItems}`,
      `In Progress: ${inProgressItems}`,
      `Assigned: ${assignedItems}`,
      `Milestones: ${completedMilestones}/${milestones.length} completed`,
      "",
      "DOMAIN SCORES",
      ...domains.map(
        (domain) =>
          `${domain.domain}: ${domain.score}% (${domain.done}/${domain.items.length} complete, ${domain.unassigned} unassigned)`,
      ),
      "",
      "PRIORITY ACTIONS",
      ...actionItems.map(
        (item, index) =>
          `${index + 1}. [${(item.weight ?? "medium").toUpperCase()}] ${item.domain} — ${item.item}` +
          `${item.owner ? ` (Owner: ${item.owner})` : " (No owner assigned)"}`,
      ),
      "",
      "EXECUTIVE RECOMMENDATION",
      overall >= 80
        ? "Campaign readiness is strong. Protect completed capabilities and close remaining high-weight actions."
        : overall >= 60
          ? "Readiness is stable but incomplete. Assign owners and close high-weight gaps before the next campaign phase."
          : overall >= 40
            ? "Campaign readiness is at risk. Escalate unassigned and high-weight actions immediately."
            : "Campaign readiness is critical. Convene an executive delivery meeting and assign owners, deadlines and resources.",
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `candidate-readiness-briefing-${new Date()
      .toISOString()
      .slice(0, 10)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-4">
      <div className="border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-primary">
              CANDIDATE READINESS EXECUTIVE CENTRE
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Weighted operational readiness, ownership and priority actions.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onPrint}
              className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[9px] transition hover:border-primary/60"
            >
              <Printer className="h-3 w-3" />
              PRINT
            </button>
            <button
              type="button"
              onClick={downloadBriefing}
              className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[9px] transition hover:border-primary/60"
            >
              <Download className="h-3 w-3" />
              DOWNLOAD BRIEFING
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["WEIGHTED READINESS", `${overall}%`, Target],
          ["CHECKLIST ITEMS", number(readinessItems.length), ClipboardCheck],
          ["COMPLETED", number(completedItems), CheckCircle2],
          ["IN PROGRESS", number(inProgressItems), AlertTriangle],
          ["ASSIGNED", number(assignedItems), UserCheck],
        ].map(([label, value, Icon]) => (
          <article key={String(label)} className="border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[8px] text-muted-foreground">
                {label}
              </p>
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <p
              className={`mt-3 font-mono text-xl ${
                label === "WEIGHTED READINESS" ? scoreClass(overall) : ""
              }`}
            >
              {value}
            </p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                DOMAIN READINESS
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Weighted scores account for low, medium, high and critical items.
              </p>
            </div>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-3">
            {domains.map((domain) => (
              <div key={domain.domain}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px]">
                      {domain.domain.toUpperCase()}
                    </p>
                    <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                      {domain.done}/{domain.items.length} COMPLETE ·{" "}
                      {domain.inProgress} IN PROGRESS · {domain.unassigned} UNASSIGNED
                    </p>
                  </div>
                  <p className={`font-mono text-sm ${scoreClass(domain.score)}`}>
                    {domain.score}%
                  </p>
                </div>
                <div className="mt-2 h-1.5 bg-secondary">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${domain.score}%` }}
                  />
                </div>
              </div>
            ))}

            {domains.length === 0 && (
              <div className="border border-dashed border-border py-10 text-center font-mono text-[10px] text-muted-foreground">
                [ INITIALISE_OR_ADD_READINESS_ITEMS ]
              </div>
            )}
          </div>
        </article>

        <article className="border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                EXECUTIVE ASSESSMENT
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Current readiness classification and recommended action.
              </p>
            </div>
            <Target className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-6 text-center">
            <p className={`font-mono text-5xl ${scoreClass(overall)}`}>
              {overall}%
            </p>
            <p className={`mt-2 font-mono text-xs ${scoreClass(overall)}`}>
              [ {scoreLabel(overall)} ]
            </p>
          </div>

          <p className="mt-6 border border-border p-3 text-xs leading-relaxed text-muted-foreground">
            {overall >= 80
              ? "Readiness is strong. Protect completed capabilities and close remaining high-weight actions."
              : overall >= 60
                ? "Readiness is stable but incomplete. Assign owners and close high-weight gaps before the next campaign phase."
                : overall >= 40
                  ? "Readiness is at risk. Escalate unassigned and high-weight actions immediately."
                  : "Readiness is critical. Convene an executive delivery meeting and assign owners, deadlines and resources."}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="border border-border p-3">
              <p className="font-mono text-[8px] text-muted-foreground">
                MILESTONES COMPLETE
              </p>
              <p className="mt-2 font-mono text-lg">
                {completedMilestones}/{milestones.length}
              </p>
            </div>
            <div className="border border-border p-3">
              <p className="font-mono text-[8px] text-muted-foreground">
                OPEN MILESTONES
              </p>
              <p className="mt-2 font-mono text-lg">{openMilestones}</p>
            </div>
          </div>
        </article>
      </div>

      <article className="border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-widest">
              PRIORITY READINESS ACTIONS
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Highest-weight incomplete actions requiring ownership and delivery.
            </p>
          </div>
          <AlertTriangle className="h-4 w-4 text-primary" />
        </div>

        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          {actionItems.map((item, index) => (
            <div
              key={item.id}
              className="grid gap-3 border border-border p-3 sm:grid-cols-[32px_1fr_auto]"
            >
              <div className="flex h-7 w-7 items-center justify-center border border-border font-mono text-[9px] text-primary">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div>
                <p className="text-xs font-medium">{item.item}</p>
                <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                  {item.domain.toUpperCase()} ·{" "}
                  {(item.status ?? "not_started").replaceAll("_", " ").toUpperCase()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[8px] text-orange-400">
                  {(item.weight ?? "medium").toUpperCase()}
                </p>
                <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                  {item.owner || "NO OWNER"}
                </p>
              </div>
            </div>
          ))}

          {actionItems.length === 0 && (
            <div className="col-span-full border border-dashed border-border py-10 text-center font-mono text-[10px] text-green-400">
              [ ALL_READINESS_ACTIONS_COMPLETE ]
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
