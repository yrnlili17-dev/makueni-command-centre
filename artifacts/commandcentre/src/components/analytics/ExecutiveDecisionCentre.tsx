import {
  AlertTriangle,
  BrainCircuit,
  Flag,
  MapPin,
  MessageSquare,
  ShieldAlert,
  Target,
  Users,
} from "lucide-react";
import { useMemo } from "react";

type OverviewData = {
  metrics?: {
    totalConstituents?: number;
    phoneReady?: number;
    strongSupport?: number;
    leaningSupport?: number;
    undecided?: number;
    opposed?: number;
    activeVolunteers?: number;
    messagesSent?: number;
    upcomingEvents?: number;
    doorsKnocked?: number;
    openThreats?: number;
    dataReadiness?: number;
    operationalReadiness?: number;
  };
  wards?: Array<{
    ward: string;
    constituency?: string | null;
    constituents: number;
    phone_ready: number;
    youth?: number;
    strong_support?: number;
    leaning_support?: number;
    undecided?: number;
    opposed?: number;
    ward_readiness?: number;
  }>;
};

type CampaignReadiness = {
  overall?: number;
  overdueCount?: number;
  inProgressCount?: number;
  totalMilestones?: number;
  completedMilestones?: number;
};

type Props = {
  overview: OverviewData | null;
  campaignReadiness: CampaignReadiness | null;
};

const BASE = import.meta.env.BASE_URL;

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function navigate(path: string) {
  window.location.assign(`${BASE}${path.replace(/^\//, "")}`);
}

function severityClass(severity: string) {
  if (severity === "CRITICAL") return "text-red-400 border-red-400/40";
  if (severity === "HIGH") return "text-orange-400 border-orange-400/40";
  if (severity === "MEDIUM") return "text-yellow-400 border-yellow-400/40";
  return "text-blue-400 border-blue-400/40";
}

export default function ExecutiveDecisionCentre({
  overview,
  campaignReadiness,
}: Props) {
  const metrics = overview?.metrics ?? {};
  const wards = overview?.wards ?? [];
  const total = Number(metrics.totalConstituents ?? 0);
  const phoneCoverage = percent(Number(metrics.phoneReady ?? 0), total);

  const classified =
    Number(metrics.strongSupport ?? 0) +
    Number(metrics.leaningSupport ?? 0) +
    Number(metrics.undecided ?? 0) +
    Number(metrics.opposed ?? 0);

  const supportCoverage = percent(classified, total);

  const weakestWards = useMemo(
    () =>
      [...wards]
        .sort(
          (a, b) =>
            Number(a.ward_readiness ?? 0) -
            Number(b.ward_readiness ?? 0),
        )
        .slice(0, 5),
    [wards],
  );

  const opportunityWards = useMemo(
    () =>
      [...wards]
        .sort((a, b) => {
          const aOpportunity =
            Number(a.undecided ?? 0) +
            Number(a.constituents ?? 0) -
            Number(a.phone_ready ?? 0);
          const bOpportunity =
            Number(b.undecided ?? 0) +
            Number(b.constituents ?? 0) -
            Number(b.phone_ready ?? 0);
          return bOpportunity - aOpportunity;
        })
        .slice(0, 5),
    [wards],
  );

  const priorities = useMemo(() => {
    const items: Array<{
      title: string;
      reason: string;
      severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
      action: string;
      path: string;
    }> = [];

    if (Number(campaignReadiness?.overdueCount ?? 0) > 0) {
      items.push({
        title: "Resolve overdue campaign milestones",
        reason: `${number(
          campaignReadiness?.overdueCount,
        )} milestone(s) are overdue.`,
        severity: "CRITICAL",
        action: "OPEN CAMPAIGN PLAN",
        path: "/campaign-plan",
      });
    }

    if (phoneCoverage < 70) {
      items.push({
        title: "Recover missing phone contacts",
        reason: `Phone coverage is only ${phoneCoverage}%.`,
        severity: "HIGH",
        action: "OPEN CAMPAIGN DATABASE",
        path: "/campaign-database?phoneReady=false",
      });
    }

    if (supportCoverage < 50) {
      items.push({
        title: "Expand voter support classification",
        reason: `Only ${supportCoverage}% of constituent records are classified.`,
        severity: "HIGH",
        action: "OPEN SEGMENTS",
        path: "/campaign-database",
      });
    }

    if (Number(metrics.activeVolunteers ?? 0) === 0) {
      items.push({
        title: "Activate volunteer deployment",
        reason: "No active volunteers are visible in live analytics.",
        severity: "HIGH",
        action: "OPEN VOLUNTEERS",
        path: "/volunteers",
      });
    }

    if (Number(metrics.messagesSent ?? 0) === 0) {
      items.push({
        title: "Start measurable campaign messaging",
        reason: "No sent campaign messages are recorded.",
        severity: "MEDIUM",
        action: "OPEN MESSAGING",
        path: "/messaging",
      });
    }

    if (Number(metrics.openThreats ?? 0) > 0) {
      items.push({
        title: "Review open intelligence threats",
        reason: `${number(metrics.openThreats)} unresolved threat(s) require attention.`,
        severity: "CRITICAL",
        action: "OPEN INCIDENT OPERATIONS",
        path: "/intelligence",
      });
    }

    if (items.length === 0) {
      items.push({
        title: "Maintain current execution pace",
        reason: "No immediate critical decision gaps were detected.",
        severity: "LOW",
        action: "OPEN DASHBOARD",
        path: "/dashboard",
      });
    }

    return items.slice(0, 10);
  }, [
    campaignReadiness?.overdueCount,
    metrics.activeVolunteers,
    metrics.messagesSent,
    metrics.openThreats,
    phoneCoverage,
    supportCoverage,
  ]);

  const deploymentSuggestions = weakestWards.map((ward, index) => ({
    rank: index + 1,
    ward: ward.ward,
    readiness: Number(ward.ward_readiness ?? 0),
    constituents: Number(ward.constituents ?? 0),
    phoneCoverage: percent(
      Number(ward.phone_ready ?? 0),
      Number(ward.constituents ?? 0),
    ),
  }));

  return (
    <section className="space-y-4">
      <header className="border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-primary">
              EXECUTIVE DECISION CENTRE
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Prioritized campaign decisions, risk areas and deployment guidance.
            </p>
          </div>
          <div className="border border-border px-3 py-2 font-mono text-[9px] text-primary">
            LIVE RULE-BASED INTELLIGENCE
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["TOP PRIORITIES", priorities.length, Target],
          ["WEAK WARDS", weakestWards.length, MapPin],
          ["OPEN THREATS", metrics.openThreats ?? 0, ShieldAlert],
          ["OVERDUE MILESTONES", campaignReadiness?.overdueCount ?? 0, Flag],
        ].map(([label, value, Icon]) => (
          <article key={String(label)} className="border border-border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-[8px] text-muted-foreground">{label}</p>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 font-mono text-2xl">{number(Number(value))}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                PRIORITIZED EXECUTIVE DECISIONS
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Highest-impact actions generated from current campaign data.
              </p>
            </div>
            <BrainCircuit className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-2">
            {priorities.map((item, index) => (
              <button
                key={`${item.title}-${index}`}
                type="button"
                onClick={() => navigate(item.path)}
                className="grid w-full gap-3 border border-border p-3 text-left transition hover:border-primary/60 sm:grid-cols-[32px_1fr_auto]"
              >
                <div className="flex h-7 w-7 items-center justify-center border border-border font-mono text-[9px] text-primary">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div>
                  <p className="text-xs font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
                  <p className="mt-2 font-mono text-[8px] text-primary">
                    {item.action} →
                  </p>
                </div>
                <span
                  className={`border px-2 py-1 font-mono text-[8px] ${severityClass(
                    item.severity,
                  )}`}
                >
                  {item.severity}
                </span>
              </button>
            ))}
          </div>
        </article>

        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                RESOURCE DEPLOYMENT PRIORITY
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Lowest-readiness wards ranked for intervention.
              </p>
            </div>
            <Users className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-2">
            {deploymentSuggestions.map((item) => (
              <button
                key={item.ward}
                type="button"
                onClick={() =>
                  navigate(
                    `/campaign-database?ward=${encodeURIComponent(item.ward)}`,
                  )
                }
                className="w-full border border-border p-3 text-left transition hover:border-primary/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px]">
                      {String(item.rank).padStart(2, "0")} · {item.ward.toUpperCase()}
                    </p>
                    <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                      {number(item.constituents)} CONSTITUENTS ·{" "}
                      {item.phoneCoverage}% PHONE
                    </p>
                  </div>
                  <p className="font-mono text-sm text-orange-400">
                    {item.readiness}%
                  </p>
                </div>
              </button>
            ))}

            {deploymentSuggestions.length === 0 && (
              <p className="font-mono text-[10px] text-muted-foreground">
                [ NO_WARD_DEPLOYMENT_DATA ]
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="border border-border bg-card p-4">
          <p className="font-mono text-[10px] tracking-widest">
            HIGH-OPPORTUNITY WARDS
          </p>
          <div className="mt-4 space-y-2">
            {opportunityWards.map((ward) => (
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
                    {number(ward.undecided)} UNDECIDED ·{" "}
                    {number(
                      Number(ward.constituents ?? 0) -
                        Number(ward.phone_ready ?? 0),
                    )} MISSING PHONE
                  </p>
                </div>
                <Target className="h-4 w-4 text-primary" />
              </button>
            ))}
          </div>
        </article>

        <article className="border border-border bg-card p-4">
          <p className="font-mono text-[10px] tracking-widest">
            EXECUTIVE ACTION SHORTCUTS
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              ["CAMPAIGN PLAN", Flag, "/campaign-plan"],
              ["CAMPAIGN DATABASE", Users, "/campaign-database"],
              ["FIELD OPERATIONS", MapPin, "/field-ops"],
              ["MESSAGING", MessageSquare, "/messaging"],
              ["INCIDENT OPERATIONS", ShieldAlert, "/intelligence"],
              ["EXECUTIVE DASHBOARD", BrainCircuit, "/dashboard"],
            ].map(([label, Icon, path]) => (
              <button
                key={String(label)}
                type="button"
                onClick={() => navigate(String(path))}
                className="border border-border p-3 text-left transition hover:border-primary/60"
              >
                <Icon className="h-4 w-4 text-primary" />
                <p className="mt-3 font-mono text-[8px]">{label}</p>
              </button>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}
