import {
  Activity,
  BarChart3,
  CalendarRange,
  Database,
  LineChart,
  MapPin,
  Phone,
  RefreshCw,
  Target,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";

type ImportJob = {
  id: string;
  file_name: string;
  status: string;
  total_rows: number;
  imported_rows: number;
  updated_rows: number;
  skipped_rows: number;
  duplicate_rows: number;
  created_at: string;
  completed_at?: string | null;
};

type WardRow = {
  ward: string;
  constituency?: string | null;
  constituents: number;
  phone_ready: number;
  strong_support?: number;
  leaning_support?: number;
  undecided?: number;
  opposed?: number;
  ward_readiness?: number;
};

type ConstituencyRow = {
  constituency: string;
  constituents: number;
  phone_ready: number;
  strong_support: number;
  leaning_support: number;
  undecided: number;
  opposed: number;
  constituency_readiness: number;
};

type OverviewData = {
  metrics?: {
    totalConstituents?: number;
    phoneReady?: number;
    strongSupport?: number;
    leaningSupport?: number;
    undecided?: number;
    opposed?: number;
    dataReadiness?: number;
    operationalReadiness?: number;
  };
  recentImports?: ImportJob[];
  wards?: WardRow[];
  constituencies?: ConstituencyRow[];
};

type CampaignReadiness = {
  overall?: number;
};

type Props = {
  overview: OverviewData | null;
  campaignReadiness: CampaignReadiness | null;
  onRefresh: () => void;
};

type Period = "7d" | "30d" | "90d" | "all";

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
  });
}

function periodStart(period: Period) {
  if (period === "all") return null;

  const now = new Date();
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  now.setDate(now.getDate() - days);
  return now;
}

export default function TrendPerformanceAnalytics({
  overview,
  campaignReadiness,
  onRefresh,
}: Props) {
  const [period, setPeriod] = useState<Period>("30d");

  const metrics = overview?.metrics ?? {};
  const imports = overview?.recentImports ?? [];
  const wards = overview?.wards ?? [];
  const constituencies = overview?.constituencies ?? [];

  const filteredImports = useMemo(() => {
    const start = periodStart(period);

    return [...imports]
      .filter((job) => {
        if (!start) return true;
        const created = new Date(job.created_at);
        return !Number.isNaN(created.getTime()) && created >= start;
      })
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime(),
      );
  }, [imports, period]);

  const cumulativeGrowth = useMemo(() => {
    let running = 0;

    return filteredImports.map((job) => {
      const net =
        Number(job.imported_rows ?? 0) +
        Number(job.updated_rows ?? 0) -
        Number(job.skipped_rows ?? 0);

      running += Math.max(0, net);

      return {
        label: dateLabel(job.created_at),
        net,
        cumulative: running,
        duplicates: Number(job.duplicate_rows ?? 0),
      };
    });
  }, [filteredImports]);

  const maxGrowth = Math.max(
    1,
    ...cumulativeGrowth.map((point) => point.cumulative),
  );

  const supportTotal =
    Number(metrics.strongSupport ?? 0) +
    Number(metrics.leaningSupport ?? 0) +
    Number(metrics.undecided ?? 0) +
    Number(metrics.opposed ?? 0);

  const phoneCoverage = percent(
    Number(metrics.phoneReady ?? 0),
    Number(metrics.totalConstituents ?? 0),
  );

  const supportCoverage = percent(
    supportTotal,
    Number(metrics.totalConstituents ?? 0),
  );

  const rankedWards = useMemo(
    () =>
      [...wards]
        .sort(
          (a, b) =>
            Number(b.ward_readiness ?? 0) -
            Number(a.ward_readiness ?? 0),
        )
        .slice(0, 8),
    [wards],
  );

  const rankedConstituencies = useMemo(
    () =>
      [...constituencies]
        .sort(
          (a, b) =>
            Number(b.constituency_readiness ?? 0) -
            Number(a.constituency_readiness ?? 0),
        )
        .slice(0, 6),
    [constituencies],
  );

  const latestImport = [...imports].sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime(),
  )[0];

  const performanceCards = [
    {
      label: "TOTAL DATABASE",
      value: number(metrics.totalConstituents),
      note: "Current constituent records",
      icon: Database,
    },
    {
      label: "PHONE COVERAGE",
      value: `${phoneCoverage}%`,
      note: `${number(metrics.phoneReady)} phone-ready`,
      icon: Phone,
    },
    {
      label: "SUPPORT CLASSIFIED",
      value: `${supportCoverage}%`,
      note: `${number(supportTotal)} classified`,
      icon: Target,
    },
    {
      label: "DATA READINESS",
      value: `${Number(metrics.dataReadiness ?? 0)}%`,
      note: "CRM completeness",
      icon: Activity,
    },
    {
      label: "CAMPAIGN READINESS",
      value: `${Number(campaignReadiness?.overall ?? 0)}%`,
      note: "Milestone readiness",
      icon: TrendingUp,
    },
    {
      label: "LATEST IMPORT",
      value: latestImport ? number(latestImport.imported_rows) : "0",
      note: latestImport?.file_name ?? "No import recorded",
      icon: CalendarRange,
    },
  ];

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">
            TREND & PERFORMANCE ANALYTICS
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Database growth, readiness trends and geographic performance comparisons.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["7d", "30d", "90d", "all"] as Period[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPeriod(item)}
              className={`border px-3 py-2 font-mono text-[8px] ${
                period === item
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {item.toUpperCase()}
            </button>
          ))}
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
          >
            <RefreshCw className="h-3 w-3" />
            REFRESH
          </button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {performanceCards.map(({ label, value, note, icon: Icon }) => (
          <article key={label} className="border border-border bg-card p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-[8px] text-muted-foreground">
                {label}
              </p>
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="mt-3 font-mono text-xl">{value}</p>
            <p className="mt-1 font-mono text-[8px] text-muted-foreground">
              {note}
            </p>
          </article>
        ))}
      </div>

      <article className="border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-widest">
              DATABASE GROWTH TREND
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Net imported and updated constituent records across recent jobs.
            </p>
          </div>
          <LineChart className="h-4 w-4 text-primary" />
        </div>

        <div className="mt-5 flex h-56 items-end gap-2 overflow-x-auto border-b border-l border-border px-3 pb-3">
          {cumulativeGrowth.map((point, index) => (
            <div
              key={`${point.label}-${index}`}
              className="flex min-w-14 flex-1 flex-col items-center justify-end gap-2"
            >
              <p className="font-mono text-[7px] text-muted-foreground">
                {number(point.cumulative)}
              </p>
              <div
                className="w-full min-w-8 bg-primary"
                style={{
                  height: `${Math.max(
                    4,
                    Math.round((point.cumulative / maxGrowth) * 170),
                  )}px`,
                }}
                title={`${point.label}: ${point.cumulative}`}
              />
              <p className="font-mono text-[7px] text-muted-foreground">
                {point.label}
              </p>
            </div>
          ))}

          {cumulativeGrowth.length === 0 && (
            <div className="flex h-full w-full items-center justify-center font-mono text-[10px] text-muted-foreground">
              [ NO_IMPORTS_IN_SELECTED_PERIOD ]
            </div>
          )}
        </div>
      </article>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                WARD PERFORMANCE
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Highest ward readiness scores.
              </p>
            </div>
            <MapPin className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-3">
            {rankedWards.map((ward) => (
              <div key={ward.ward}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px]">
                      {ward.ward.toUpperCase()}
                    </p>
                    <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                      {number(ward.constituents)} CONSTITUENTS ·{" "}
                      {percent(ward.phone_ready, ward.constituents)}% PHONE
                    </p>
                  </div>
                  <p className="font-mono text-sm">
                    {Number(ward.ward_readiness ?? 0)}%
                  </p>
                </div>
                <div className="mt-2 h-1.5 bg-secondary">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Number(ward.ward_readiness ?? 0)}%`,
                    }}
                  />
                </div>
              </div>
            ))}

            {rankedWards.length === 0 && (
              <p className="font-mono text-[10px] text-muted-foreground">
                [ NO_WARD_PERFORMANCE_DATA ]
              </p>
            )}
          </div>
        </article>

        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                CONSTITUENCY PERFORMANCE
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Imported constituency readiness comparison.
              </p>
            </div>
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-3">
            {rankedConstituencies.map((row) => (
              <div key={row.constituency}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px]">
                      {row.constituency.toUpperCase()}
                    </p>
                    <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                      {number(row.constituents)} CONSTITUENTS ·{" "}
                      {percent(row.phone_ready, row.constituents)}% PHONE
                    </p>
                  </div>
                  <p className="font-mono text-sm">
                    {Number(row.constituency_readiness ?? 0)}%
                  </p>
                </div>
                <div className="mt-2 h-1.5 bg-secondary">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Number(
                        row.constituency_readiness ?? 0,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}

            {rankedConstituencies.length === 0 && (
              <p className="font-mono text-[10px] text-muted-foreground">
                [ NO_CONSTITUENCY_PERFORMANCE_DATA ]
              </p>
            )}
          </div>
        </article>
      </section>
    </section>
  );
}
