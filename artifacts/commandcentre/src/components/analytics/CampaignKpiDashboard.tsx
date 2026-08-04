import {
  Activity,
  BarChart3,
  CalendarDays,
  Database,
  Download,
  MapPin,
  MessageSquare,
  Phone,
  Printer,
  ShieldCheck,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { useMemo } from "react";

type OverviewData = {
  generatedAt?: string;
  metrics?: {
    totalConstituents?: number;
    phoneReady?: number;
    emailReady?: number;
    smsConsented?: number;
    whatsappConsented?: number;
    wardsCovered?: number;
    constituenciesCovered?: number;
    pollingStations?: number;
    women?: number;
    men?: number;
    youth?: number;
    seniors?: number;
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
    constituents: number;
    phone_ready: number;
    ward_readiness?: number;
  }>;
  constituencies?: Array<{
    constituency: string;
    constituents: number;
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

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function status(score: number) {
  if (score >= 80) return { label: "ON TRACK", className: "text-green-400" };
  if (score >= 60) return { label: "STABLE", className: "text-yellow-400" };
  if (score >= 40) return { label: "NEEDS ATTENTION", className: "text-orange-400" };
  return { label: "CRITICAL", className: "text-red-400" };
}

function navigate(path: string) {
  window.location.assign(`${BASE}${path.replace(/^\//, "")}`);
}

export default function CampaignKpiDashboard({
  overview,
  campaignReadiness,
}: Props) {
  const metrics = overview?.metrics ?? {};
  const wards = overview?.wards ?? [];
  const constituencies = overview?.constituencies ?? [];

  const total = Number(metrics.totalConstituents ?? 0);
  const phoneCoverage = percentage(Number(metrics.phoneReady ?? 0), total);
  const emailCoverage = percentage(Number(metrics.emailReady ?? 0), total);
  const womenCoverage = percentage(Number(metrics.women ?? 0), total);
  const youthCoverage = percentage(Number(metrics.youth ?? 0), total);

  const classified =
    Number(metrics.strongSupport ?? 0) +
    Number(metrics.leaningSupport ?? 0) +
    Number(metrics.undecided ?? 0) +
    Number(metrics.opposed ?? 0);

  const supportCoverage = percentage(classified, total);

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

  const fieldScore = clamp(
    (Number(metrics.activeVolunteers ?? 0) > 0 ? 35 : 0) +
      (Number(metrics.doorsKnocked ?? 0) > 0 ? 35 : 0) +
      (Number(metrics.upcomingEvents ?? 0) > 0 ? 30 : 0),
  );

  const messagingScore = clamp(
    (Number(metrics.messagesSent ?? 0) > 0 ? 60 : 0) +
      (Number(metrics.phoneReady ?? 0) > 0 ? 40 : 0),
  );

  const planScore = clamp(Number(campaignReadiness?.overall ?? 0));

  const kpis = [
    {
      label: "CRM GROWTH",
      value: total,
      display: number(total),
      target: 25000,
      icon: Database,
      path: "/campaign-database",
    },
    {
      label: "PHONE COVERAGE",
      value: phoneCoverage,
      display: `${phoneCoverage}%`,
      target: 90,
      icon: Phone,
      path: "/campaign-database?phoneReady=false",
    },
    {
      label: "SUPPORT CLASSIFIED",
      value: supportCoverage,
      display: `${supportCoverage}%`,
      target: 85,
      icon: Target,
      path: "/campaign-database",
    },
    {
      label: "WARD READINESS",
      value: wardReadiness,
      display: `${wardReadiness}%`,
      target: 85,
      icon: MapPin,
      path: "/analytics",
    },
    {
      label: "CONSTITUENCY READINESS",
      value: constituencyReadiness,
      display: `${constituencyReadiness}%`,
      target: 85,
      icon: ShieldCheck,
      path: "/analytics",
    },
    {
      label: "CAMPAIGN PLAN",
      value: planScore,
      display: `${planScore}%`,
      target: 80,
      icon: CalendarDays,
      path: "/campaign-plan",
    },
    {
      label: "FIELD OPERATIONS",
      value: fieldScore,
      display: `${fieldScore}%`,
      target: 80,
      icon: UserCheck,
      path: "/field-ops",
    },
    {
      label: "MESSAGING ACTIVITY",
      value: messagingScore,
      display: `${messagingScore}%`,
      target: 80,
      icon: MessageSquare,
      path: "/messaging",
    },
  ];

  const overallKpi = clamp(
    kpis.reduce((sum, kpi) => {
      const score =
        kpi.label === "CRM GROWTH"
          ? Math.min(100, Math.round((kpi.value / kpi.target) * 100))
          : Math.min(100, Math.round((kpi.value / kpi.target) * 100));
      return sum + score;
    }, 0) / kpis.length,
  );

  const topWards = useMemo(
    () =>
      [...wards]
        .sort(
          (a, b) =>
            Number(b.ward_readiness ?? 0) -
            Number(a.ward_readiness ?? 0),
        )
        .slice(0, 5),
    [wards],
  );

  function downloadReport() {
    const rows = [
      ["KPI", "CURRENT", "TARGET", "STATUS"],
      ...kpis.map((kpi) => {
        const progress =
          kpi.label === "CRM GROWTH"
            ? Math.min(100, Math.round((kpi.value / kpi.target) * 100))
            : Math.min(100, Math.round((kpi.value / kpi.target) * 100));

        return [
          kpi.label,
          kpi.display,
          kpi.label === "CRM GROWTH"
            ? number(kpi.target)
            : `${kpi.target}%`,
          status(progress).label,
        ];
      }),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `campaign-kpi-dashboard-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">
            CAMPAIGN KPI DASHBOARD
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Live performance against campaign targets and executive benchmarks.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
          >
            <Printer className="h-3 w-3" />
            PRINT
          </button>
          <button
            type="button"
            onClick={downloadReport}
            className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
          >
            <Download className="h-3 w-3" />
            EXPORT CSV
          </button>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <article className="border border-border bg-card p-5">
          <p className="font-mono text-[10px] tracking-widest">
            OVERALL KPI PERFORMANCE
          </p>
          <div className="mt-8 text-center">
            <p className={`font-mono text-6xl ${status(overallKpi).className}`}>
              {overallKpi}%
            </p>
            <p className={`mt-3 font-mono text-[10px] ${status(overallKpi).className}`}>
              [ {status(overallKpi).label} ]
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-2">
            {[
              ["CONSTITUENTS", number(total)],
              ["WARDS", number(metrics.wardsCovered)],
              ["POLLING STATIONS", number(metrics.pollingStations)],
              ["OPEN THREATS", number(metrics.openThreats)],
              ["WOMEN", `${womenCoverage}%`],
              ["YOUTH", `${youthCoverage}%`],
            ].map(([label, value]) => (
              <div key={String(label)} className="border border-border p-3">
                <p className="font-mono text-[8px] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 font-mono text-sm">{value}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                KPI TARGET TRACKING
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Click any KPI to open its operating module.
              </p>
            </div>
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {kpis.map((kpi) => {
              const progress =
                kpi.label === "CRM GROWTH"
                  ? Math.min(
                      100,
                      Math.round((kpi.value / kpi.target) * 100),
                    )
                  : Math.min(
                      100,
                      Math.round((kpi.value / kpi.target) * 100),
                    );

              const currentStatus = status(progress);

              return (
                <button
                  key={kpi.label}
                  type="button"
                  onClick={() => navigate(kpi.path)}
                  className="border border-border p-3 text-left transition hover:border-primary/60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-[8px] text-muted-foreground">
                        {kpi.label}
                      </p>
                      <p className="mt-2 font-mono text-xl">
                        {kpi.display}
                      </p>
                    </div>
                    <kpi.icon className="h-4 w-4 text-primary" />
                  </div>

                  <div className="mt-3 flex justify-between font-mono text-[8px]">
                    <span>
                      TARGET{" "}
                      {kpi.label === "CRM GROWTH"
                        ? number(kpi.target)
                        : `${kpi.target}%`}
                    </span>
                    <span className={currentStatus.className}>
                      {progress}% · {currentStatus.label}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 bg-secondary">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                DEMOGRAPHIC REPRESENTATION
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                CRM representation of priority demographic groups.
              </p>
            </div>
            <Users className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-4">
            {[
              ["WOMEN", womenCoverage, metrics.women ?? 0],
              ["YOUTH", youthCoverage, metrics.youth ?? 0],
              [
                "PHONE READY",
                phoneCoverage,
                metrics.phoneReady ?? 0,
              ],
              [
                "EMAIL READY",
                emailCoverage,
                metrics.emailReady ?? 0,
              ],
            ].map(([label, score, count]) => (
              <div key={String(label)}>
                <div className="flex items-center justify-between font-mono text-[9px]">
                  <span>{label}</span>
                  <span>
                    {number(Number(count))} · {score}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 bg-secondary">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                TOP WARD PERFORMANCE
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Highest ward readiness in the current database.
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-3">
            {topWards.map((ward) => (
              <button
                key={ward.ward}
                type="button"
                onClick={() =>
                  navigate(
                    `/campaign-database?ward=${encodeURIComponent(
                      ward.ward,
                    )}`,
                  )
                }
                className="w-full border border-border p-3 text-left transition hover:border-primary/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px]">
                      {ward.ward.toUpperCase()}
                    </p>
                    <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                      {number(ward.constituents)} CONSTITUENTS ·{" "}
                      {percentage(
                        ward.phone_ready,
                        ward.constituents,
                      )}% PHONE
                    </p>
                  </div>
                  <p className="font-mono text-sm">
                    {Number(ward.ward_readiness ?? 0)}%
                  </p>
                </div>
              </button>
            ))}

            {topWards.length === 0 && (
              <p className="font-mono text-[10px] text-muted-foreground">
                [ NO_WARD_KPI_DATA ]
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["CAMPAIGN DATABASE", Database, "/campaign-database"],
          ["CAMPAIGN PLAN", CalendarDays, "/campaign-plan"],
          ["FIELD OPERATIONS", UserCheck, "/field-ops"],
          ["MESSAGING", MessageSquare, "/messaging"],
          ["EXECUTIVE DASHBOARD", Activity, "/dashboard"],
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
    </section>
  );
}
