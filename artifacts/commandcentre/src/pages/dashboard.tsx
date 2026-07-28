import {
  useGetDashboardActivity,
  useGetDashboardSummary,
} from "@workspace/api-client-react";

import type { LucideIcon } from "lucide-react";

import {
  Activity,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Database,
  Flag,
  Gauge,
  Map,
  MapPin,
  MessageSquare,
  Radio,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  Users,
  Vote,
  Zap,
} from "lucide-react";

import { Link } from "wouter";

type MetricCardProps = {
  label: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  trend?: string;
  trendPositive?: boolean;
};

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  actionLabel?: string;
  actionHref?: string;
};

const wardPerformance = [
  {
    ward: "Makueni West",
    support: 74,
    volunteers: 248,
    stations: 55,
    status: "Strong",
  },
  {
    ward: "Tala",
    support: 68,
    volunteers: 194,
    stations: 40,
    status: "Growing",
  },
  {
    ward: "Makueni North",
    support: 62,
    volunteers: 138,
    stations: 26,
    status: "Growing",
  },
  {
    ward: "Makueni East",
    support: 59,
    volunteers: 121,
    stations: 24,
    status: "Focus",
  },
  {
    ward: "Kyeleni",
    support: 54,
    volunteers: 96,
    stations: 20,
    status: "Focus",
  },
];

const supportTrend = [
  { month: "Jan", value: 42 },
  { month: "Feb", value: 47 },
  { month: "Mar", value: 51 },
  { month: "Apr", value: 56 },
  { month: "May", value: 61 },
  { month: "Jun", value: 66 },
  { month: "Jul", value: 71 },
];

const campaignTimeline = [
  {
    title: "Countywide listening tour",
    date: "Current phase",
    description:
      "Ward consultations, issue collection and grassroots structure verification.",
    status: "active",
  },
  {
    title: "Volunteer expansion",
    date: "Next 30 days",
    description:
      "Recruit and verify polling-station coordinators across priority wards.",
    status: "upcoming",
  },
  {
    title: "Manifesto validation",
    date: "Next 60 days",
    description:
      "Community review of development priorities and implementation commitments.",
    status: "upcoming",
  },
  {
    title: "Election readiness",
    date: "Final phase",
    description:
      "Agent deployment, legal preparedness, turnout operations and vote protection.",
    status: "upcoming",
  },
];

const upcomingEvents = [
  {
    title: "Youth leadership forum",
    place: "Wote",
    date: "02 Aug",
    type: "Town hall",
  },
  {
    title: "Women enterprise dialogue",
    place: "Makueni West",
    date: "06 Aug",
    type: "Community",
  },
  {
    title: "Ward coordinators briefing",
    place: "Campaign Secretariat",
    date: "09 Aug",
    type: "Operations",
  },
];

const aiRecommendations = [
  {
    priority: "High",
    title: "Increase water-development messaging",
    text: "Water access is appearing consistently among the strongest community concerns.",
  },
  {
    priority: "High",
    title: "Strengthen Makueni East field structures",
    text: "Volunteer coverage and projected support remain below the countywide target.",
  },
  {
    priority: "Medium",
    title: "Expand youth economic programme content",
    text: "Youth employment and enterprise messages are producing stronger engagement.",
  },
];

const quickActions = [
  {
    label: "Create campaign message",
    href: "/messaging",
    icon: MessageSquare,
  },
  {
    label: "Open AI strategist",
    href: "/strategist",
    icon: BrainCircuit,
  },
  {
    label: "Review field operations",
    href: "/field-ops",
    icon: Map,
  },
  {
    label: "View voter database",
    href: "/voters-db",
    icon: Database,
  },
];

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formattedNumber(value: unknown): string {
  return numberValue(value).toLocaleString("en-KE");
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  trend,
  trendPositive = true,
}: MetricCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c1726] p-5 shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/20 hover:bg-[#0f1c2e]">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-400/[0.04] blur-2xl transition-colors group-hover:bg-cyan-400/[0.08]" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-white">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.07]">
          <Icon className="h-5 w-5 text-cyan-300" />
        </div>
      </div>

      <div className="relative mt-4 flex items-end justify-between gap-3">
        <p className="text-xs text-slate-500">{description}</p>

        {trend && (
          <span
            className={
              trendPositive
                ? "whitespace-nowrap text-[10px] font-semibold text-emerald-300"
                : "whitespace-nowrap text-[10px] font-semibold text-amber-300"
            }
          >
            {trend}
          </span>
        )}
      </div>
    </article>
  );
}

function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  actionLabel,
  actionHref,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-400/[0.06]">
          <Icon className="h-4 w-4 text-cyan-300" />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>

          {subtitle && (
            <p className="mt-0.5 text-[10px] text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>

      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-300 transition-colors hover:text-cyan-200"
        >
          {actionLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function LoadingMetricCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="h-36 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
        />
      ))}
    </div>
  );
}

function SupportTrendChart() {
  const width = 700;
  const height = 220;
  const paddingX = 36;
  const paddingTop = 22;
  const paddingBottom = 35;

  const availableWidth = width - paddingX * 2;
  const availableHeight = height - paddingTop - paddingBottom;

  const points = supportTrend.map((entry, index) => {
    const x =
      paddingX +
      (index * availableWidth) / Math.max(supportTrend.length - 1, 1);

    const y =
      paddingTop +
      availableHeight -
      (entry.value / 100) * availableHeight;

    return {
      ...entry,
      x,
      y,
    };
  });

  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");

  const areaPoints = [
    `${points[0]?.x ?? paddingX},${height - paddingBottom}`,
    ...points.map((point) => `${point.x},${point.y}`),
    `${points[points.length - 1]?.x ?? width - paddingX},${
      height - paddingBottom
    }`,
  ].join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[620px] overflow-visible"
        role="img"
        aria-label="Campaign support trend"
      >
        <defs>
          <linearGradient id="supportArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[25, 50, 75, 100].map((line) => {
          const y =
            paddingTop +
            availableHeight -
            (line / 100) * availableHeight;

          return (
            <g key={line}>
              <line
                x1={paddingX}
                x2={width - paddingX}
                y1={y}
                y2={y}
                stroke="rgba(148,163,184,0.12)"
                strokeDasharray="4 5"
              />

              <text
                x={paddingX - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-600 text-[9px]"
              >
                {line}%
              </text>
            </g>
          );
        })}

        <polygon
          points={areaPoints}
          className="fill-cyan-400 text-cyan-400"
          fill="url(#supportArea)"
        />

        <polyline
          points={linePoints}
          fill="none"
          stroke="rgb(103 232 249)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point) => (
          <g key={point.month}>
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="rgb(8 20 34)"
              stroke="rgb(103 232 249)"
              strokeWidth="3"
            />

            <text
              x={point.x}
              y={height - 10}
              textAnchor="middle"
              className="fill-slate-500 text-[10px]"
            >
              {point.month}
            </text>

            <text
              x={point.x}
              y={point.y - 12}
              textAnchor="middle"
              className="fill-cyan-200 text-[10px] font-semibold"
            >
              {point.value}%
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function ActivityModuleBadge({ module }: { module: string }) {
  const labels: Record<string, string> = {
    members: "Voter",
    messaging: "Message",
    "field-ops": "Field",
    volunteers: "Volunteer",
    intelligence: "Intel",
    "campaign-plan": "Planning",
    events: "Event",
    surveys: "Research",
    kol: "Influence",
    segments: "Segment",
  };

  return (
    <span className="rounded-md border border-cyan-400/10 bg-cyan-400/[0.06] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-300">
      {labels[module] ?? module}
    </span>
  );
}

export default function Dashboard() {
  const {
    data: summary,
    isLoading: summaryLoading,
  } = useGetDashboardSummary();

  const {
    data: activity,
    isLoading: activityLoading,
  } = useGetDashboardActivity();

  const readiness = numberValue(summary?.campaignReadiness);
  const totalMembers = numberValue(summary?.totalMembers);
  const activeVolunteers = numberValue(summary?.activeVolunteers);
  const messagesSent = numberValue(summary?.messagesSent);
  const doorsKnocked = numberValue(summary?.doorsKnocked);
  const wardsCovered = numberValue(summary?.wardsCovered);
  const openThreats = numberValue(summary?.openThreats);
  const upcomingEventCount = numberValue(summary?.upcomingEvents);
  const daysToElection = numberValue(summary?.daysToElection);

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-400/10 bg-gradient-to-br from-[#10223a] via-[#0c192b] to-[#091523] p-6 shadow-2xl shadow-black/20 sm:p-8">
        <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-cyan-400/[0.07] blur-3xl" />
        <div className="absolute bottom-0 right-1/3 h-40 w-40 rounded-full bg-blue-500/[0.05] blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[1fr_auto] xl:items-center">
          <div className="max-w-4xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/[0.06] px-3 py-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />

              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Live campaign intelligence
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl xl:text-4xl">
              Executive Campaign Command Centre
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              One operational view of voter mobilisation, field activity,
              communications, county intelligence and campaign readiness across
              Makueni.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/strategist"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-semibold text-slate-950 transition-all hover:bg-cyan-200"
              >
                <BrainCircuit className="h-4 w-4" />
                Open AI Strategist
              </Link>

              <Link
                href="/analytics"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-white/[0.08]"
              >
                <BarChart3 className="h-4 w-4 text-cyan-300" />
                View Analytics
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:w-[340px]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">
                Readiness
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {readiness}%
              </p>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan-300"
                  style={{
                    width: `${Math.min(Math.max(readiness, 0), 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">
                Days remaining
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {daysToElection || "—"}
              </p>

              <p className="mt-3 text-[10px] text-slate-500">
                Election countdown
              </p>
            </div>

            <div className="col-span-2 rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.05] p-4">
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-cyan-300" />

                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
                  Campaign objective
                </p>
              </div>

              <p className="mt-2 text-sm font-semibold text-white">
                Development. Integrity. Prosperity for every household.
              </p>
            </div>
          </div>
        </div>
      </section>

      {summaryLoading ? (
        <LoadingMetricCards />
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total voters"
            value={formattedNumber(totalMembers)}
            description="Campaign database records"
            icon={Users}
            trend="+ live database"
          />

          <MetricCard
            label="Active volunteers"
            value={formattedNumber(activeVolunteers)}
            description="Currently deployed"
            icon={Activity}
            trend="Field network"
          />

          <MetricCard
            label="Messages sent"
            value={formattedNumber(messagesSent)}
            description="Across all communication channels"
            icon={MessageSquare}
            trend="All channels"
          />

          <MetricCard
            label="Doors reached"
            value={formattedNumber(doorsKnocked)}
            description="Grassroots field engagement"
            icon={MapPin}
            trend="Field operations"
          />

          <MetricCard
            label="Wards covered"
            value={formattedNumber(wardsCovered)}
            description="Active operational zones"
            icon={Map}
            trend={`${wardPerformance.length} priority wards`}
          />

          <MetricCard
            label="Open threats"
            value={formattedNumber(openThreats)}
            description="Narrative and political risks"
            icon={ShieldAlert}
            trend={openThreats > 0 ? "Needs review" : "Stable"}
            trendPositive={openThreats === 0}
          />

          <MetricCard
            label="Readiness score"
            value={`${readiness}%`}
            description="Overall operational readiness"
            icon={Gauge}
            trend={readiness >= 70 ? "On track" : "Build capacity"}
            trendPositive={readiness >= 70}
          />

          <MetricCard
            label="Upcoming events"
            value={formattedNumber(upcomingEventCount)}
            description="Scheduled campaign engagements"
            icon={CalendarDays}
            trend="Campaign calendar"
          />
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c1726]">
          <SectionHeader
            title="Campaign Support Trend"
            subtitle="Executive projection based on current mobilisation signals"
            icon={TrendingUp}
            actionLabel="Full analytics"
            actionHref="/analytics"
          />

          <div className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-3xl font-bold text-white">71%</p>
                <p className="mt-1 text-xs text-slate-500">
                  Current projected support
                </p>
              </div>

              <div className="rounded-lg border border-emerald-400/10 bg-emerald-400/[0.06] px-3 py-2 text-[10px] font-semibold text-emerald-300">
                +29 points since January
              </div>
            </div>

            <SupportTrendChart />
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-cyan-400/10 bg-gradient-to-b from-[#10243a] to-[#0c1726]">
          <SectionHeader
            title="AI Command Brief"
            subtitle="Priority recommendations for campaign leadership"
            icon={Sparkles}
            actionLabel="Open strategist"
            actionHref="/strategist"
          />

          <div className="space-y-3 p-5">
            {aiRecommendations.map((recommendation, index) => (
              <div
                key={recommendation.title}
                className="rounded-xl border border-white/10 bg-black/10 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-[10px] font-bold text-cyan-300">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xs font-semibold text-white">
                        {recommendation.title}
                      </h3>

                      <span
                        className={
                          recommendation.priority === "High"
                            ? "rounded-md bg-red-400/10 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-red-300"
                            : "rounded-md bg-amber-400/10 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-amber-300"
                        }
                      >
                        {recommendation.priority}
                      </span>
                    </div>

                    <p className="mt-2 text-[11px] leading-5 text-slate-400">
                      {recommendation.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            <Link
              href="/strategist"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.07] px-4 py-3 text-xs font-semibold text-cyan-200 transition-colors hover:bg-cyan-400/[0.12]"
            >
              Generate full strategic brief
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.72fr]">
        <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c1726]">
          <SectionHeader
            title="County Intelligence"
            subtitle="Ward-level mobilisation and support overview"
            icon={Building2}
            actionLabel="Field operations"
            actionHref="/field-ops"
          />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-white/10 text-[9px] uppercase tracking-[0.15em] text-slate-500">
                  <th className="px-5 py-3 font-medium">Ward</th>
                  <th className="px-5 py-3 font-medium">Support</th>
                  <th className="px-5 py-3 font-medium">Volunteers</th>
                  <th className="px-5 py-3 font-medium">Stations</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.06]">
                {wardPerformance.map((ward) => (
                  <tr
                    key={ward.ward}
                    className="transition-colors hover:bg-white/[0.025]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-cyan-300" />

                        <span className="text-xs font-semibold text-white">
                          {ward.ward}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-cyan-300"
                            style={{ width: `${ward.support}%` }}
                          />
                        </div>

                        <span className="text-xs font-semibold text-cyan-200">
                          {ward.support}%
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-300">
                      {ward.volunteers.toLocaleString("en-KE")}
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-300">
                      {ward.stations}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={
                          ward.status === "Strong"
                            ? "rounded-md border border-emerald-400/10 bg-emerald-400/[0.06] px-2 py-1 text-[9px] font-semibold text-emerald-300"
                            : ward.status === "Growing"
                              ? "rounded-md border border-cyan-400/10 bg-cyan-400/[0.06] px-2 py-1 text-[9px] font-semibold text-cyan-300"
                              : "rounded-md border border-amber-400/10 bg-amber-400/[0.06] px-2 py-1 text-[9px] font-semibold text-amber-300"
                        }
                      >
                        {ward.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-white/10 p-5 sm:grid-cols-4">
            {[
              ["Population", "187,600"],
              ["Registered voters", "78,000"],
              ["Polling stations", "165"],
              ["Youth population", "75,000"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"
              >
                <p className="text-[9px] uppercase tracking-[0.12em] text-slate-500">
                  {label}
                </p>

                <p className="mt-2 text-lg font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c1726]">
          <SectionHeader
            title="Quick Actions"
            subtitle="Open critical campaign operations"
            icon={Zap}
          />

          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-1">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 transition-all hover:border-cyan-400/20 hover:bg-cyan-400/[0.05]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/[0.07]">
                    <action.icon className="h-4 w-4 text-cyan-300" />
                  </div>

                  <span className="text-xs font-semibold text-slate-200">
                    {action.label}
                  </span>
                </div>

                <ChevronRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-cyan-300" />
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c1726] xl:col-span-2">
          <SectionHeader
            title="Live Campaign Activity"
            subtitle="Latest activity recorded across the command centre"
            icon={Radio}
          />

          {activityLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-xl bg-white/[0.03]"
                />
              ))}
            </div>
          ) : activity && activity.length > 0 ? (
            <div className="divide-y divide-white/[0.06]">
              {activity.slice(0, 7).map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center"
                >
                  <ActivityModuleBadge module={item.module} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-200">
                      {item.description}
                    </p>

                    {item.actor && (
                      <p className="mt-1 text-[10px] text-slate-500">
                        Recorded by {item.actor}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" />

                    {new Date(item.timestamp).toLocaleString("en-KE", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
                <Activity className="h-5 w-5 text-slate-500" />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-300">
                No campaign activity recorded
              </p>

              <p className="mt-1 text-xs text-slate-500">
                New system activity will appear here automatically.
              </p>
            </div>
          )}
        </article>

        <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c1726]">
          <SectionHeader
            title="Upcoming Events"
            subtitle="Next scheduled engagements"
            icon={CalendarDays}
            actionLabel="View calendar"
            actionHref="/events"
          />

          <div className="space-y-3 p-5">
            {upcomingEvents.map((event) => (
              <div
                key={event.title}
                className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"
              >
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-400/[0.06]">
                  <span className="text-xs font-bold text-cyan-200">
                    {event.date.split(" ")[0]}
                  </span>

                  <span className="text-[8px] uppercase text-cyan-400">
                    {event.date.split(" ")[1]}
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white">
                    {event.title}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] text-slate-500">
                    <span>{event.place}</span>
                    <span>•</span>
                    <span>{event.type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-[#0c1726] p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/[0.07]">
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            </div>

            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
              Operational
            </span>
          </div>

          <p className="mt-4 text-sm font-semibold text-white">
            Campaign systems
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Authentication, voter records, messaging and field intelligence
            services are connected.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#0c1726] p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/[0.07]">
              <Vote className="h-5 w-5 text-cyan-300" />
            </div>

            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-300">
              Election readiness
            </span>
          </div>

          <p className="mt-4 text-sm font-semibold text-white">
            Polling operations
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Continue polling-agent recruitment, station mapping and legal
            readiness across all target areas.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#0c1726] p-5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/[0.07]">
              <CircleDollarSign className="h-5 w-5 text-amber-300" />
            </div>

            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-300">
              Finance
            </span>
          </div>

          <p className="mt-4 text-sm font-semibold text-white">
            Resource mobilisation
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Track fundraising, approved expenditure and logistical commitments
            from the finance operations module.
          </p>
        </article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c1726]">
        <SectionHeader
          title="Campaign Roadmap"
          subtitle="Executive milestones towards election readiness"
          icon={Target}
          actionLabel="Campaign plan"
          actionHref="/campaign-plan"
        />

        <div className="grid gap-0 divide-y divide-white/[0.06] lg:grid-cols-4 lg:divide-x lg:divide-y-0">
          {campaignTimeline.map((phase, index) => (
            <div key={phase.title} className="relative p-5">
              <div className="mb-4 flex items-center justify-between">
                <span
                  className={
                    phase.status === "active"
                      ? "flex h-8 w-8 items-center justify-center rounded-full bg-cyan-300 text-xs font-bold text-slate-950"
                      : "flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-xs font-bold text-slate-500"
                  }
                >
                  {index + 1}
                </span>

                <span
                  className={
                    phase.status === "active"
                      ? "text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-300"
                      : "text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-600"
                  }
                >
                  {phase.date}
                </span>
              </div>

              <h3 className="text-xs font-semibold text-white">
                {phase.title}
              </h3>

              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                {phase.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
