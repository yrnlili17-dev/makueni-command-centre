import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Flag,
  ShieldAlert,
  Target,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";

type MilestoneLike = {
  id: number;
  title: string;
  dueDate: string;
  category: string;
  status: string;
  priority?: string | null;
  owner?: string | null;
};

type ReadinessLike = {
  overall?: number;
  byCategory?: Array<{
    category: string;
    score: number;
    total: number;
    completed: number;
    overdue: number;
  }>;
  completedMilestones?: number;
  totalMilestones?: number;
  overdueCount?: number;
  inProgressCount?: number;
};

type CountdownLike = {
  electionDate?: string | null;
  daysRemaining?: number | null;
  phase?: string | null;
};

type AlertsLike = {
  overdue?: MilestoneLike[];
  dueIn7?: MilestoneLike[];
  noOwner?: MilestoneLike[];
  critical?: MilestoneLike[];
  recommendations?: string[];
};

type Props = {
  milestones: MilestoneLike[];
  readiness?: ReadinessLike | null;
  countdown?: CountdownLike | null;
  alerts?: AlertsLike | null;
  onOpenMilestone: (milestone: MilestoneLike) => void;
};

function number(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function daysUntil(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function riskLabel(score: number, overdue: number, critical: number) {
  if (overdue >= 3 || critical >= 3 || score < 30) return "CRITICAL";
  if (overdue > 0 || critical > 0 || score < 60) return "AT RISK";
  if (score < 80) return "STABLE";
  return "ON TRACK";
}

function riskClass(label: string) {
  if (label === "CRITICAL") return "text-red-400";
  if (label === "AT RISK") return "text-orange-400";
  if (label === "STABLE") return "text-yellow-400";
  return "text-green-400";
}

function priorityClass(priority?: string | null) {
  if (priority === "critical") return "text-red-400 border-red-400/40";
  if (priority === "high") return "text-orange-400 border-orange-400/40";
  if (priority === "medium") return "text-yellow-400 border-yellow-400/40";
  return "text-blue-400 border-blue-400/40";
}

export default function CampaignExecutiveOperations({
  milestones,
  readiness,
  countdown,
  alerts,
  onOpenMilestone,
}: Props) {
  const completed = milestones.filter((m) => m.status === "completed").length;
  const inProgress = milestones.filter((m) => m.status === "in_progress").length;
  const overdue = milestones.filter(
    (m) => m.status !== "completed" && daysUntil(m.dueDate) < 0,
  ).length;
  const critical = milestones.filter(
    (m) => m.status !== "completed" && m.priority === "critical",
  ).length;
  const score = Number(readiness?.overall ?? 0);
  const health = riskLabel(score, overdue, critical);

  const nextMilestones = useMemo(
    () =>
      milestones
        .filter((m) => m.status !== "completed" && daysUntil(m.dueDate) >= 0)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 5),
    [milestones],
  );

  const risks = useMemo(() => {
    const output: Array<{ label: string; severity: string }> = [];

    if ((alerts?.overdue?.length ?? overdue) > 0) {
      output.push({
        label: `${alerts?.overdue?.length ?? overdue} overdue milestone(s)`,
        severity: "CRITICAL",
      });
    }

    if ((alerts?.critical?.length ?? critical) > 0) {
      output.push({
        label: `${alerts?.critical?.length ?? critical} critical milestone(s) still open`,
        severity: "HIGH",
      });
    }

    if ((alerts?.noOwner?.length ?? 0) > 0) {
      output.push({
        label: `${alerts?.noOwner?.length} milestone(s) without an owner`,
        severity: "MEDIUM",
      });
    }

    if ((alerts?.dueIn7?.length ?? 0) > 0) {
      output.push({
        label: `${alerts?.dueIn7?.length} milestone(s) due within seven days`,
        severity: "MEDIUM",
      });
    }

    if (output.length === 0) {
      output.push({
        label: "No immediate campaign delivery risks detected",
        severity: "LOW",
      });
    }

    return output.slice(0, 5);
  }, [alerts, critical, overdue]);

  const categoryRows = (readiness?.byCategory ?? []).slice(0, 6);

  const kpis = [
    {
      label: "DAYS REMAINING",
      value:
        countdown?.daysRemaining === null ||
        countdown?.daysRemaining === undefined
          ? "—"
          : number(countdown.daysRemaining),
      icon: CalendarClock,
    },
    {
      label: "TOTAL MILESTONES",
      value: number(milestones.length),
      icon: Flag,
    },
    {
      label: "COMPLETED",
      value: number(completed),
      icon: CheckCircle2,
    },
    {
      label: "IN PROGRESS",
      value: number(inProgress),
      icon: TrendingUp,
    },
    {
      label: "CRITICAL",
      value: number(critical),
      icon: ShieldAlert,
    },
    {
      label: "OVERDUE",
      value: number(overdue),
      icon: AlertTriangle,
    },
    {
      label: "READINESS",
      value: `${score}%`,
      icon: Target,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="border border-border bg-card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-primary">
              EXECUTIVE OPERATIONS SNAPSHOT
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Live campaign progress, risks and next actions.
            </p>
          </div>
          <div className={`font-mono text-xs ${riskClass(health)}`}>
            [ {health} ]
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {kpis.map(({ label, value, icon: Icon }) => (
          <article key={label} className="border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[8px] text-muted-foreground">{label}</p>
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="mt-3 font-mono text-xl">{value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                CAMPAIGN HEALTH BY CATEGORY
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Completion and overdue pressure by operational category.
              </p>
            </div>
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-3">
            {categoryRows.map((row) => (
              <div key={row.category}>
                <div className="flex items-center justify-between gap-3 font-mono text-[9px]">
                  <span>{row.category.toUpperCase()}</span>
                  <span className={row.overdue > 0 ? "text-red-400" : ""}>
                    {row.score}% · {row.completed}/{row.total}
                    {row.overdue > 0 ? ` · ${row.overdue} overdue` : ""}
                  </span>
                </div>
                <div className="mt-1 h-1.5 bg-secondary">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${row.score}%` }}
                  />
                </div>
              </div>
            ))}

            {categoryRows.length === 0 && (
              <div className="border border-dashed border-border py-8 text-center font-mono text-[10px] text-muted-foreground">
                [ ADD_MILESTONES_TO_CALCULATE_CATEGORY_HEALTH ]
              </div>
            )}
          </div>
        </article>

        <article className="border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                EXECUTIVE RISK PANEL
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Immediate risks requiring management action.
              </p>
            </div>
            <ShieldAlert className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-2">
            {risks.map((risk) => (
              <div
                key={`${risk.label}-${risk.severity}`}
                className="flex items-center justify-between gap-3 border border-border p-3"
              >
                <div className="flex items-start gap-2">
                  <CircleDot className="mt-0.5 h-3.5 w-3.5 text-primary" />
                  <p className="text-xs">{risk.label}</p>
                </div>
                <span
                  className={`font-mono text-[8px] ${
                    risk.severity === "CRITICAL"
                      ? "text-red-400"
                      : risk.severity === "HIGH"
                        ? "text-orange-400"
                        : risk.severity === "MEDIUM"
                          ? "text-yellow-400"
                          : "text-green-400"
                  }`}
                >
                  {risk.severity}
                </span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-widest">
              CRITICAL TIMELINE
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The next five open milestones in delivery order.
            </p>
          </div>
          <CalendarClock className="h-4 w-4 text-primary" />
        </div>

        <div className="mt-4 grid gap-2 lg:grid-cols-5">
          {nextMilestones.map((milestone) => {
            const remaining = daysUntil(milestone.dueDate);
            return (
              <button
                key={milestone.id}
                type="button"
                onClick={() => onOpenMilestone(milestone)}
                className="border border-border p-3 text-left transition hover:border-primary/60 hover:bg-secondary/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`border px-1.5 py-0.5 font-mono text-[8px] ${priorityClass(
                      milestone.priority,
                    )}`}
                  >
                    {(milestone.priority ?? "medium").toUpperCase()}
                  </span>
                  <span className="font-mono text-[8px] text-muted-foreground">
                    {remaining === 0 ? "TODAY" : `${remaining}D`}
                  </span>
                </div>
                <p className="mt-3 text-xs font-medium">{milestone.title}</p>
                <p className="mt-2 font-mono text-[8px] text-muted-foreground">
                  {milestone.category.toUpperCase()}
                </p>
                <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                  {milestone.owner || "NO OWNER"}
                </p>
              </button>
            );
          })}

          {nextMilestones.length === 0 && (
            <div className="col-span-full border border-dashed border-border py-8 text-center font-mono text-[10px] text-muted-foreground">
              [ NO_OPEN_MILESTONES ]
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
