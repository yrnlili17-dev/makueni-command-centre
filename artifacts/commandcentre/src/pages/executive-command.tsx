import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Command,
  Database,
  Flag,
  Footprints,
  MapPin,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

type CommandSummary = {
  tasks?: { pending?: number };
  incidents?: { open?: number };
  field?: { doors?: number };
  briefs?: { published?: number };
  notifications?: { unread?: number };
  reports?: { ready?: number };
};

type DashboardOverview = {
  metrics?: {
    totalConstituents?: number;
    phoneReady?: number;
    dataReadiness?: number;
    operationalReadiness?: number;
    openThreats?: number;
    activeVolunteers?: number;
    messagesSent?: number;
    upcomingEvents?: number;
    doorsKnocked?: number;
    strongSupport?: number;
    leaningSupport?: number;
    undecided?: number;
    opposed?: number;
    wardsCovered?: number;
  };
  wards?: Array<{
    ward: string;
    constituents: number;
    phone_ready: number;
    ward_readiness?: number;
  }>;
};

type CampaignReadiness = {
  overall?: number;
  completedMilestones?: number;
  totalMilestones?: number;
  overdueCount?: number;
  inProgressCount?: number;
};

type StrategistAction = {
  id: number;
  title: string;
  priority: string;
  status: string;
  owner?: string | null;
};

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function percentage(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function tone(score: number) {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function navigate(path: string) {
  window.location.assign(`${BASE}${path.replace(/^\//, "")}`);
}

export default function ExecutiveCommand() {
  const [summary, setSummary] = useState<CommandSummary | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [readiness, setReadiness] = useState<CampaignReadiness | null>(null);
  const [actions, setActions] = useState<StrategistAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [summaryResponse, overviewResponse, readinessResponse, actionsResponse] =
        await Promise.all([
          fetch(`${BASE}api/command-centre/summary`, {
            credentials: "include",
          }),
          fetch(`${BASE}api/dashboard-intelligence/overview`, {
            credentials: "include",
          }),
          fetch(`${BASE}api/campaign-plan/readiness`, {
            credentials: "include",
          }),
          fetch(`${BASE}api/strategist/actions`, {
            credentials: "include",
          }),
        ]);

      if (!summaryResponse.ok) {
        throw new Error("Command summary failed");
      }
      if (!overviewResponse.ok) {
        throw new Error("Dashboard intelligence failed");
      }
      if (!readinessResponse.ok) {
        throw new Error("Campaign readiness failed");
      }

      setSummary(await summaryResponse.json());
      setOverview(await overviewResponse.json());
      setReadiness(await readinessResponse.json());

      if (actionsResponse.ok) {
        setActions(await actionsResponse.json());
      } else {
        setActions([]);
      }

      setLastUpdated(new Date().toLocaleTimeString("en-KE"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Executive Command Centre",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = overview?.metrics ?? {};
  const total = Number(metrics.totalConstituents ?? 0);
  const phoneCoverage = percentage(Number(metrics.phoneReady ?? 0), total);
  const classified =
    Number(metrics.strongSupport ?? 0) +
    Number(metrics.leaningSupport ?? 0) +
    Number(metrics.undecided ?? 0) +
    Number(metrics.opposed ?? 0);
  const supportCoverage = percentage(classified, total);
  const planReadiness = Number(readiness?.overall ?? 0);
  const dataReadiness = Number(metrics.dataReadiness ?? 0);
  const operationalReadiness = Number(metrics.operationalReadiness ?? 0);

  const campaignHealth = clamp(
    dataReadiness * 0.25 +
      operationalReadiness * 0.25 +
      planReadiness * 0.25 +
      phoneCoverage * 0.15 +
      supportCoverage * 0.1,
  );

  const weakestWards = useMemo(
    () =>
      [...(overview?.wards ?? [])]
        .sort(
          (a, b) =>
            Number(a.ward_readiness ?? 0) -
            Number(b.ward_readiness ?? 0),
        )
        .slice(0, 5),
    [overview?.wards],
  );

  const urgentActions = useMemo(
    () =>
      [...actions]
        .filter((item) => item.status !== "completed")
        .sort((a, b) => {
          const order: Record<string, number> = {
            critical: 1,
            high: 2,
            medium: 3,
            low: 4,
          };
          return (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
        })
        .slice(0, 6),
    [actions],
  );

  const alerts = [
    Number(metrics.openThreats ?? 0) > 0
      ? `${number(metrics.openThreats)} open intelligence threats require review.`
      : "No open intelligence threats detected.",
    planReadiness < 60
      ? `Campaign Plan readiness is ${planReadiness}%.`
      : `Campaign Plan readiness is stable at ${planReadiness}%.`,
    Number(metrics.activeVolunteers ?? 0) === 0
      ? "No active volunteers are currently visible."
      : `${number(metrics.activeVolunteers)} active volunteers are recorded.`,
    Number(metrics.messagesSent ?? 0) === 0
      ? "No measurable campaign messaging activity is recorded."
      : `${number(metrics.messagesSent)} campaign messages have been sent.`,
  ];

  const commandCards = [
    {
      label: "CAMPAIGN HEALTH",
      value: `${campaignHealth}%`,
      icon: Activity,
      score: campaignHealth,
      path: "/analytics",
    },
    {
      label: "CAMPAIGN READINESS",
      value: `${planReadiness}%`,
      icon: Flag,
      score: planReadiness,
      path: "/campaign-plan",
    },
    {
      label: "DATA READINESS",
      value: `${dataReadiness}%`,
      icon: Database,
      score: dataReadiness,
      path: "/campaign-database",
    },
    {
      label: "OPERATIONAL READINESS",
      value: `${operationalReadiness}%`,
      icon: UserCheck,
      score: operationalReadiness,
      path: "/operations-hub",
    },
    {
      label: "PHONE COVERAGE",
      value: `${phoneCoverage}%`,
      icon: Users,
      score: phoneCoverage,
      path: "/campaign-database?phoneReady=false",
    },
    {
      label: "SUPPORT CLASSIFIED",
      value: `${supportCoverage}%`,
      icon: Target,
      score: supportCoverage,
      path: "/campaign-database",
    },
    {
      label: "OPEN THREATS",
      value: number(metrics.openThreats),
      icon: ShieldAlert,
      score: Number(metrics.openThreats ?? 0) > 0 ? 20 : 100,
      path: "/intelligence",
    },
    {
      label: "URGENT ACTIONS",
      value: number(urgentActions.length),
      icon: ClipboardCheck,
      score: urgentActions.length === 0 ? 100 : 40,
      path: "/strategist",
    },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">
            EXECUTIVE OPERATIONS DASHBOARD
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-widest">
            EXECUTIVE COMMAND CENTRE
          </h1>
          <p className="mt-1 font-mono text-[9px] text-muted-foreground">
            LIVE COUNTY-WIDE CAMPAIGN HEALTH · OPERATIONS · STRATEGIC ACTION
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {lastUpdated && (
            <div className="border border-border px-3 py-2 font-mono text-[8px] text-muted-foreground">
              UPDATED {lastUpdated}
            </div>
          )}

          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-2 border border-border px-4 py-2 font-mono text-[8px]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            REFRESH
          </button>
        </div>
      </header>

      {error && (
        <div className="border border-red-400/40 bg-red-400/5 p-3 font-mono text-[9px] text-red-400">
          [ COMMAND_DATA_ERROR ] {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {commandCards.map(({ label, value, icon: Icon, score, path }) => (
          <button
            key={label}
            type="button"
            onClick={() => navigate(path)}
            className="border border-border bg-card p-3 text-left transition hover:border-primary/60"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-[7px] text-muted-foreground">
                {label}
              </p>
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className={`mt-3 font-mono text-lg ${tone(score)}`}>{value}</p>
          </button>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                EXECUTIVE ALERT WALL
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Immediate campaign conditions requiring leadership attention.
              </p>
            </div>
            <Bell className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-2">
            {alerts.map((alert, index) => (
              <div
                key={alert}
                className="grid grid-cols-[28px_1fr] gap-3 border border-border p-3"
              >
                <span className="flex h-7 w-7 items-center justify-center border border-border font-mono text-[8px] text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-xs leading-relaxed">{alert}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                URGENT STRATEGIC ACTIONS
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Highest-priority items from the Chief Strategist queue.
              </p>
            </div>
            <Command className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-2">
            {urgentActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => navigate("/strategist")}
                className="w-full border border-border p-3 text-left transition hover:border-primary/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium">{action.title}</p>
                    <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                      {(action.owner || "UNASSIGNED").toUpperCase()} ·{" "}
                      action.status.toUpperCase()
                    </p>
                  </div>
                  <span
                    className={`font-mono text-[8px] ${
                      action.priority === "critical"
                        ? "text-red-400"
                        : action.priority === "high"
                          ? "text-orange-400"
                          : "text-yellow-400"
                    }`}
                  >
                    {action.priority.toUpperCase()}
                  </span>
                </div>
              </button>
            ))}

            {urgentActions.length === 0 && (
              <div className="border border-dashed border-border py-8 text-center font-mono text-[9px] text-muted-foreground">
                [ NO_URGENT_STRATEGIC_ACTIONS ]
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                PRIORITY WARD WATCHLIST
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Lowest-readiness imported wards.
              </p>
            </div>
            <MapPin className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-2">
            {weakestWards.map((ward) => (
              <button
                key={ward.ward}
                type="button"
                onClick={() =>
                  navigate(
                    `/campaign-database?ward=${encodeURIComponent(ward.ward)}`,
                  )
                }
                className="flex w-full items-center justify-between border border-border p-3 text-left transition hover:border-primary/60"
              >
                <div>
                  <p className="font-mono text-[9px]">
                    {ward.ward.toUpperCase()}
                  </p>
                  <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                    {number(ward.constituents)} CONSTITUENTS ·{" "}
                    {percentage(ward.phone_ready, ward.constituents)}% PHONE
                  </p>
                </div>
                <span className={`font-mono text-sm ${tone(Number(ward.ward_readiness ?? 0))}`}>
                  {Number(ward.ward_readiness ?? 0)}%
                </span>
              </button>
            ))}
          </div>
        </article>

        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                LIVE OPERATIONS SUMMARY
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Consolidated command-centre activity.
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              ["PENDING TASKS", summary?.tasks?.pending ?? 0, ClipboardCheck],
              ["OPEN INCIDENTS", summary?.incidents?.open ?? 0, AlertTriangle],
              ["DOORS KNOCKED", summary?.field?.doors ?? metrics.doorsKnocked ?? 0, Footprints],
              ["PUBLISHED BRIEFS", summary?.briefs?.published ?? 0, CheckCircle2],
              ["UNREAD ALERTS", summary?.notifications?.unread ?? 0, Bell],
              ["REPORTS READY", summary?.reports?.ready ?? 0, CalendarDays],
            ].map(([label, value, Icon]) => (
              <div key={String(label)} className="border border-border p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-mono text-[7px] text-muted-foreground">
                    {label}
                  </p>
                  <Icon className="h-3 w-3 text-primary" />
                </div>
                <p className="mt-2 font-mono text-lg">
                  {number(Number(value))}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        {[
          ["CHIEF STRATEGIST", Command, "/strategist"],
          ["CAMPAIGN PLAN", Flag, "/campaign-plan"],
          ["CAMPAIGN DATABASE", Database, "/campaign-database"],
          ["FIELD OPERATIONS", UserCheck, "/operations-hub"],
          ["MESSAGING", MessageSquare, "/communications-hub"],
          ["INTELLIGENCE", ShieldAlert, "/intelligence"],
        ].map(([label, Icon, path]) => (
          <button
            key={String(label)}
            type="button"
            onClick={() => navigate(String(path))}
            className="border border-border bg-card p-3 text-left transition hover:border-primary/60"
          >
            <Icon className="h-4 w-4 text-primary" />
            <p className="mt-3 font-mono text-[8px]">{label}</p>
          </button>
        ))}
      </section>
    </div>
  );
}
