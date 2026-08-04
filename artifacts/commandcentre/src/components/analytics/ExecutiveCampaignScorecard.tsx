import {
  Activity,
  AlertTriangle,
  BarChart3,
  Database,
  Flag,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo } from "react";

type OverviewData = {
  metrics?: {
    totalConstituents?: number;
    phoneReady?: number;
    emailReady?: number;
    wardsCovered?: number;
    constituenciesCovered?: number;
    pollingStations?: number;
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
    email_ready?: number;
    women: number;
    youth?: number;
    polling_stations?: number;
    strong_support?: number;
    leaning_support?: number;
    undecided?: number;
    opposed?: number;
    ward_readiness?: number;
  }>;
  constituencies?: Array<{
    constituency: string;
    constituents: number;
    phone_ready: number;
    women: number;
    youth: number;
    wards: number;
    polling_stations: number;
    strong_support: number;
    leaning_support: number;
    undecided: number;
    opposed: number;
    constituency_readiness: number;
  }>;
};

type CampaignReadiness = {
  overall?: number;
  completedMilestones?: number;
  totalMilestones?: number;
  overdueCount?: number;
  inProgressCount?: number;
};

type Props = {
  overview: OverviewData | null;
  campaignReadiness: CampaignReadiness | null;
};

const BASE = import.meta.env.BASE_URL;

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function status(score: number) {
  if (score >= 80) return { label: "ON TRACK", style: "text-green-400 border-green-400/40" };
  if (score >= 60) return { label: "STABLE", style: "text-yellow-400 border-yellow-400/40" };
  if (score >= 40) return { label: "NEEDS ATTENTION", style: "text-orange-400 border-orange-400/40" };
  return { label: "CRITICAL", style: "text-red-400 border-red-400/40" };
}

function navigate(path: string) {
  window.location.assign(`${BASE}${path.replace(/^\//, "")}`);
}

export default function ExecutiveCampaignScorecard({
  overview,
  campaignReadiness,
}: Props) {
  const metrics = overview?.metrics ?? {};
  const wards = overview?.wards ?? [];
  const constituencies = overview?.constituencies ?? [];

  const total = Number(metrics.totalConstituents ?? 0);
  const phoneCoverage = percent(Number(metrics.phoneReady ?? 0), total);
  const emailCoverage = percent(Number(metrics.emailReady ?? 0), total);

  const classifiedSupport =
    Number(metrics.strongSupport ?? 0) +
    Number(metrics.leaningSupport ?? 0) +
    Number(metrics.undecided ?? 0) +
    Number(metrics.opposed ?? 0);

  const supportCoverage = percent(classifiedSupport, total);

  const constituencyReadiness = constituencies.length
    ? Math.round(
        constituencies.reduce(
          (sum, row) =>
            sum +
            Number(row.constituency_readiness ?? 0) *
              Number(row.constituents ?? 0),
          0,
        ) /
          Math.max(
            1,
            constituencies.reduce(
              (sum, row) => sum + Number(row.constituents ?? 0),
              0,
            ),
          ),
      )
    : 0;

  const wardReadiness = wards.length
    ? Math.round(
        wards.reduce(
          (sum, row) =>
            sum +
            Number(row.ward_readiness ?? 0) *
              Number(row.constituents ?? 0),
          0,
        ) /
          Math.max(
            1,
            wards.reduce(
              (sum, row) => sum + Number(row.constituents ?? 0),
              0,
            ),
          ),
      )
    : 0;

  const fieldScore = clamp(
    (Number(metrics.activeVolunteers ?? 0) > 0 ? 35 : 0) +
      (Number(metrics.doorsKnocked ?? 0) > 0 ? 35 : 0) +
      (Number(metrics.upcomingEvents ?? 0) > 0 ? 30 : 0),
  );

  const communicationScore = clamp(
    (Number(metrics.messagesSent ?? 0) > 0 ? 60 : 0) +
      (Number(metrics.phoneReady ?? 0) > 0 ? 40 : 0),
  );

  const campaignPlanScore = clamp(Number(campaignReadiness?.overall ?? 0));
  const crmQuality = clamp(Number(metrics.dataReadiness ?? 0));
  const geographicCoverage = clamp(
    constituencyReadiness > 0
      ? constituencyReadiness
      : Number(metrics.operationalReadiness ?? 0),
  );

  const momentum = clamp(
    (campaignPlanScore * 0.35) +
      (fieldScore * 0.25) +
      (communicationScore * 0.2) +
      (supportCoverage * 0.2),
  );

  const overallHealth = clamp(
    crmQuality * 0.2 +
      phoneCoverage * 0.15 +
      geographicCoverage * 0.2 +
      supportCoverage * 0.15 +
      fieldScore * 0.1 +
      campaignPlanScore * 0.15 +
      momentum * 0.05,
  );

  const lowestWard = [...wards].sort(
    (a, b) =>
      Number(a.ward_readiness ?? 0) - Number(b.ward_readiness ?? 0),
  )[0];

  const largestWard = [...wards].sort(
    (a, b) => Number(b.constituents ?? 0) - Number(a.constituents ?? 0),
  )[0];

  const scorecards = [
    {
      label: "CAMPAIGN HEALTH",
      score: overallHealth,
      note: "Weighted executive health index",
      icon: Activity,
      path: "/analytics",
    },
    {
      label: "CAMPAIGN READINESS",
      score: campaignPlanScore,
      note: `${number(campaignReadiness?.completedMilestones)}/${number(
        campaignReadiness?.totalMilestones,
      )} milestones complete`,
      icon: Flag,
      path: "/campaign-plan",
    },
    {
      label: "CRM DATA QUALITY",
      score: crmQuality,
      note: "Phone and geographic completeness",
      icon: Database,
      path: "/campaign-database",
    },
    {
      label: "CONTACT COVERAGE",
      score: phoneCoverage,
      note: `${number(metrics.phoneReady)} phone-ready records`,
      icon: Users,
      path: "/campaign-database?phoneReady=true",
    },
    {
      label: "GEOGRAPHIC COVERAGE",
      score: geographicCoverage,
      note: `${number(metrics.wardsCovered)} wards represented`,
      icon: MapPin,
      path: "/analytics",
    },
    {
      label: "SUPPORT INTELLIGENCE",
      score: supportCoverage,
      note: `${number(classifiedSupport)} classified records`,
      icon: Target,
      path: "/campaign-database",
    },
    {
      label: "FIELD OPERATIONS",
      score: fieldScore,
      note: `${number(metrics.activeVolunteers)} active volunteers`,
      icon: ShieldCheck,
      path: "/field-ops",
    },
    {
      label: "CAMPAIGN MOMENTUM",
      score: momentum,
      note: "Plan, field, communications and support",
      icon: TrendingUp,
      path: "/dashboard",
    },
  ];

  const recommendations = useMemo(() => {
    const items: Array<{
      severity: "critical" | "high" | "medium";
      text: string;
      action: string;
      path: string;
    }> = [];

    if (phoneCoverage < 70) {
      items.push({
        severity: "high",
        text: `Phone coverage is ${phoneCoverage}%. Prioritize missing contact recovery.`,
        action: "OPEN CRM",
        path: "/campaign-database?phoneReady=false",
      });
    }

    if (supportCoverage < 50) {
      items.push({
        severity: "high",
        text: `Only ${supportCoverage}% of constituents have a recorded support position.`,
        action: "OPEN SEGMENTS",
        path: "/campaign-database",
      });
    }

    if (campaignPlanScore < 60) {
      items.push({
        severity: "critical",
        text: `Campaign readiness is ${campaignPlanScore}%. Escalate incomplete milestones.`,
        action: "OPEN CAMPAIGN PLAN",
        path: "/campaign-plan",
      });
    }

    if (lowestWard && Number(lowestWard.ward_readiness ?? 0) < 60) {
      items.push({
        severity: "medium",
        text: `${lowestWard.ward} has the lowest ward readiness at ${number(
          lowestWard.ward_readiness,
        )}%.`,
        action: "OPEN WARD",
        path: `/campaign-database?ward=${encodeURIComponent(lowestWard.ward)}`,
      });
    }

    if (Number(metrics.activeVolunteers ?? 0) === 0) {
      items.push({
        severity: "high",
        text: "No active volunteers are currently recorded in the operational dashboard.",
        action: "OPEN VOLUNTEERS",
        path: "/volunteers",
      });
    }

    if (Number(metrics.messagesSent ?? 0) === 0) {
      items.push({
        severity: "medium",
        text: "No sent campaign messages are currently recorded.",
        action: "OPEN MESSAGING",
        path: "/messaging",
      });
    }

    if (items.length === 0) {
      items.push({
        severity: "medium",
        text: "No major executive gaps detected. Continue closing low-weight readiness items.",
        action: "OPEN DASHBOARD",
        path: "/dashboard",
      });
    }

    return items.slice(0, 6);
  }, [
    campaignPlanScore,
    lowestWard,
    metrics.activeVolunteers,
    metrics.messagesSent,
    phoneCoverage,
    supportCoverage,
  ]);

  return (
    <div className="space-y-4">
      <section className="border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-primary">
              EXECUTIVE CAMPAIGN SCORECARD
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Live campaign health, operational readiness and prioritized action.
            </p>
          </div>
          <div
            className={`border px-4 py-2 font-mono text-[10px] ${
              status(overallHealth).style
            }`}
          >
            {status(overallHealth).label} · {overallHealth}%
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {scorecards.map(({ label, score, note, icon: Icon, path }) => {
          const currentStatus = status(score);

          return (
            <button
              key={label}
              type="button"
              onClick={() => navigate(path)}
              className="border border-border bg-card p-4 text-left transition hover:border-primary/60 hover:bg-secondary/20"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[8px] text-muted-foreground">
                  {label}
                </p>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className={`mt-3 font-mono text-2xl ${currentStatus.style.split(" ")[0]}`}>
                {score}%
              </p>
              <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                {note}
              </p>
              <div className="mt-3 h-1.5 bg-secondary">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${score}%` }}
                />
              </div>
              <p className={`mt-2 font-mono text-[8px] ${currentStatus.style.split(" ")[0]}`}>
                {currentStatus.label}
              </p>
            </button>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                EXECUTIVE SUMMARY
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Current campaign operating position.
              </p>
            </div>
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              ["TOTAL CONSTITUENTS", total],
              ["IMPORTED WARDS", metrics.wardsCovered ?? wards.length],
              ["ACTIVE CONSTITUENCIES", metrics.constituenciesCovered ?? 0],
              ["PHONE COVERAGE", `${phoneCoverage}%`],
              ["EMAIL COVERAGE", `${emailCoverage}%`],
              ["SUPPORT CLASSIFIED", `${supportCoverage}%`],
              ["LARGEST WARD", largestWard?.ward ?? "—"],
              ["LOWEST-READINESS WARD", lowestWard?.ward ?? "—"],
              ["OPEN THREATS", metrics.openThreats ?? 0],
            ].map(([label, value]) => (
              <div key={String(label)} className="border border-border p-3">
                <p className="font-mono text-[8px] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 font-mono text-sm">
                  {typeof value === "number" ? number(value) : value}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                PRIORITIZED EXECUTIVE ACTIONS
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Rule-based recommendations from live campaign data.
              </p>
            </div>
            <AlertTriangle className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-2">
            {recommendations.map((item, index) => (
              <button
                key={`${item.text}-${index}`}
                type="button"
                onClick={() => navigate(item.path)}
                className="flex w-full items-start justify-between gap-3 border border-border p-3 text-left transition hover:border-primary/60"
              >
                <div>
                  <p className="text-xs leading-relaxed">{item.text}</p>
                  <p className="mt-2 font-mono text-[8px] text-primary">
                    {item.action} →
                  </p>
                </div>
                <span
                  className={`font-mono text-[8px] ${
                    item.severity === "critical"
                      ? "text-red-400"
                      : item.severity === "high"
                        ? "text-orange-400"
                        : "text-yellow-400"
                  }`}
                >
                  {item.severity.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["CAMPAIGN DATABASE", Database, "/campaign-database"],
          ["GEOGRAPHIC INTELLIGENCE", MapPin, "/analytics"],
          ["CAMPAIGN PLAN", Flag, "/campaign-plan"],
          ["FIELD OPERATIONS", ShieldCheck, "/field-ops"],
          ["MESSAGING", MessageSquare, "/messaging"],
        ].map(([label, Icon, path]) => (
          <button
            key={String(label)}
            type="button"
            onClick={() => navigate(String(path))}
            className="border border-border bg-card p-3 text-left transition hover:border-primary/60"
          >
            <Icon className="h-4 w-4 text-primary" />
            <p className="mt-3 font-mono text-[9px]">{label}</p>
          </button>
        ))}
      </section>
    </div>
  );
}
