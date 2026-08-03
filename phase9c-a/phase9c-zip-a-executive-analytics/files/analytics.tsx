import {
  AlertTriangle,
  BarChart3,
  Database,
  MapPin,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type AnalyticsOverview = {
  generatedAt: string;
  metrics: {
    totalConstituents: number;
    phoneReady: number;
    emailReady: number;
    smsConsented: number;
    whatsappConsented: number;
    emailConsented: number;
    women: number;
    men: number;
    youth: number;
    seniors: number;
    wardsCovered: number;
    constituenciesCovered: number;
    pollingStations: number;
    missingPhone: number;
    missingWard: number;
    strongSupport: number;
    leaningSupport: number;
    undecided: number;
    opposed: number;
    activeVolunteers: number;
    messagesSent: number;
    upcomingEvents: number;
    doorsKnocked: number;
    openThreats: number;
    dataReadiness: number;
    operationalReadiness: number;
  };
  wards: Array<{
    ward: string;
    constituents: number;
    phone_ready: number;
    women: number;
    strong_support: number;
  }>;
  recentImports: Array<{
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
  }>;
};

type Tab =
  | "executive"
  | "growth"
  | "messaging"
  | "field"
  | "sentiment"
  | "kols"
  | "intelligence";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "executive", label: "EXECUTIVE" },
  { id: "growth", label: "GROWTH" },
  { id: "messaging", label: "MESSAGING" },
  { id: "field", label: "FIELD" },
  { id: "sentiment", label: "SENTIMENT" },
  { id: "kols", label: "KOLS" },
  { id: "intelligence", label: "INTELLIGENCE" },
];

const BASE = import.meta.env.BASE_URL;

async function getOverview(): Promise<AnalyticsOverview> {
  const response = await fetch(`${BASE}api/dashboard-intelligence/overview`, {
    credentials: "include",
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error ?? `Request failed (${response.status})`);
  }

  return data;
}

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: any;
}) {
  return (
    <article className="border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[9px] tracking-widest text-muted-foreground">
          {label}
        </p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-3 font-mono text-2xl">{value}</p>
      <p className="mt-1 font-mono text-[8px] text-muted-foreground">{note}</p>
    </article>
  );
}

function ProgressRow({
  label,
  value,
  total,
  note,
}: {
  label: string;
  value: number;
  total: number;
  note?: string;
}) {
  const score = percent(value, total);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[9px]">{label}</p>
          {note && (
            <p className="mt-1 font-mono text-[8px] text-muted-foreground">
              {note}
            </p>
          )}
        </div>
        <p className="font-mono text-[9px]">
          {number(value)} · {score}%
        </p>
      </div>
      <div className="mt-2 h-1.5 bg-secondary">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function AnalyticsHub() {
  const [tab, setTab] = useState<Tab>("executive");
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setData(await getOverview());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load live analytics",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = data?.metrics;
  const total = Number(metrics?.totalConstituents ?? 0);

  const supportTotal =
    Number(metrics?.strongSupport ?? 0) +
    Number(metrics?.leaningSupport ?? 0) +
    Number(metrics?.undecided ?? 0) +
    Number(metrics?.opposed ?? 0);

  const topWards = useMemo(
    () =>
      [...(data?.wards ?? [])]
        .sort(
          (first, second) =>
            Number(second.constituents ?? 0) -
            Number(first.constituents ?? 0),
        )
        .slice(0, 10),
    [data?.wards],
  );

  const maxWard = Math.max(
    1,
    ...topWards.map((ward) => Number(ward.constituents ?? 0)),
  );

  const completeRecords = Math.max(
    0,
    total -
      Number(metrics?.missingPhone ?? 0) -
      Number(metrics?.missingWard ?? 0),
  );

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <section className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Analytics Hub</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Live constituent, geographic, demographic and campaign intelligence.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="border border-green-400/30 px-3 py-2 font-mono text-[9px] text-green-400">
            LIVE DATABASE
          </span>
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[9px] transition hover:border-primary/60"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            REFRESH
          </button>
        </div>
      </section>

      <section className="flex gap-1 overflow-x-auto border-b border-border pb-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`whitespace-nowrap border px-4 py-2 font-mono text-[9px] transition ${
              tab === item.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </section>

      {error && (
        <div className="border border-red-400/30 bg-red-400/5 p-3 font-mono text-xs text-red-400">
          {error}
        </div>
      )}

      {tab === "executive" ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <MetricCard
              label="TOTAL CONSTITUENTS"
              value={number(metrics?.totalConstituents)}
              note="LIVE CAMPAIGN DATABASE"
              icon={Users}
            />
            <MetricCard
              label="STRONG SUPPORT"
              value={number(metrics?.strongSupport)}
              note={`${percent(
                Number(metrics?.strongSupport ?? 0),
                supportTotal,
              )}% OF CLASSIFIED SUPPORT`}
              icon={TrendingUp}
            />
            <MetricCard
              label="LEANING SUPPORT"
              value={number(metrics?.leaningSupport)}
              note={`${percent(
                Number(metrics?.leaningSupport ?? 0),
                supportTotal,
              )}% OF CLASSIFIED SUPPORT`}
              icon={TrendingUp}
            />
            <MetricCard
              label="UNDECIDED"
              value={number(metrics?.undecided)}
              note="PERSUASION OPPORTUNITY"
              icon={Target}
            />
            <MetricCard
              label="OPPOSED"
              value={number(metrics?.opposed)}
              note="MONITORING SEGMENT"
              icon={AlertTriangle}
            />
            <MetricCard
              label="DATA READINESS"
              value={`${Number(metrics?.dataReadiness ?? 0)}%`}
              note="CONTACT AND GEOGRAPHIC COMPLETENESS"
              icon={ShieldCheck}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <article className="border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] tracking-widest">
                    DEMOGRAPHIC DISTRIBUTION
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Live gender and age-group coverage from the constituent database.
                  </p>
                </div>
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>

              <div className="mt-4 space-y-4">
                <ProgressRow
                  label="WOMEN"
                  value={Number(metrics?.women ?? 0)}
                  total={total}
                />
                <ProgressRow
                  label="MEN"
                  value={Number(metrics?.men ?? 0)}
                  total={total}
                />
                <ProgressRow
                  label="YOUTH 18–35"
                  value={Number(metrics?.youth ?? 0)}
                  total={total}
                />
                <ProgressRow
                  label="SENIORS 60+"
                  value={Number(metrics?.seniors ?? 0)}
                  total={total}
                />
              </div>
            </article>

            <article className="border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] tracking-widest">
                    GEOGRAPHIC COVERAGE
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    County campaign database footprint.
                  </p>
                </div>
                <MapPin className="h-4 w-4 text-primary" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  ["CONSTITUENCIES", metrics?.constituenciesCovered],
                  ["WARDS", metrics?.wardsCovered],
                  ["POLLING STATIONS", metrics?.pollingStations],
                  ["PHONE READY", metrics?.phoneReady],
                  ["EMAIL READY", metrics?.emailReady],
                  ["WHATSAPP CONSENT", metrics?.whatsappConsented],
                ].map(([label, value]) => (
                  <div key={String(label)} className="border border-border p-3">
                    <p className="font-mono text-[8px] text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-2 font-mono text-lg">
                      {number(Number(value ?? 0))}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <article className="border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] tracking-widest">
                    TOP WARDS BY CONSTITUENT COVERAGE
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Highest-volume wards in the live database.
                  </p>
                </div>
                <MapPin className="h-4 w-4 text-primary" />
              </div>

              <div className="mt-4 space-y-3">
                {topWards.map((ward) => (
                  <div key={ward.ward}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-[9px]">
                          {ward.ward.toUpperCase()}
                        </p>
                        <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                          {number(ward.phone_ready)} PHONE READY ·{" "}
                          {number(ward.women)} WOMEN
                        </p>
                      </div>
                      <p className="font-mono text-sm">
                        {number(ward.constituents)}
                      </p>
                    </div>
                    <div className="mt-2 h-1.5 bg-secondary">
                      <div
                        className="h-full bg-primary"
                        style={{
                          width: `${Math.max(
                            2,
                            Math.round(
                              (Number(ward.constituents ?? 0) / maxWard) * 100,
                            ),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}

                {topWards.length === 0 && (
                  <div className="border border-dashed border-border py-10 text-center font-mono text-[10px] text-muted-foreground">
                    [ NO_WARD_ANALYTICS_AVAILABLE ]
                  </div>
                )}
              </div>
            </article>

            <article className="border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] tracking-widest">
                    DATA QUALITY
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Records requiring data-management attention.
                  </p>
                </div>
                <Database className="h-4 w-4 text-primary" />
              </div>

              <div className="mt-4 space-y-3">
                <ProgressRow
                  label="PHONE READY"
                  value={Number(metrics?.phoneReady ?? 0)}
                  total={total}
                />
                <ProgressRow
                  label="EMAIL READY"
                  value={Number(metrics?.emailReady ?? 0)}
                  total={total}
                />
                <ProgressRow
                  label="SMS CONSENT"
                  value={Number(metrics?.smsConsented ?? 0)}
                  total={total}
                />
                <ProgressRow
                  label="WHATSAPP CONSENT"
                  value={Number(metrics?.whatsappConsented ?? 0)}
                  total={total}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                {[
                  ["MISSING PHONE", metrics?.missingPhone],
                  ["MISSING WARD", metrics?.missingWard],
                  ["EST. COMPLETE", completeRecords],
                  [
                    "DUPLICATES",
                    data?.recentImports?.reduce(
                      (sum, job) => sum + Number(job.duplicate_rows ?? 0),
                      0,
                    ) ?? 0,
                  ],
                ].map(([label, value]) => (
                  <div key={String(label)} className="border border-border p-3">
                    <p className="font-mono text-[8px] text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-2 font-mono text-lg">
                      {number(Number(value ?? 0))}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="border border-border bg-card">
            <header className="flex items-center justify-between border-b border-border p-4">
              <div>
                <p className="font-mono text-[10px] tracking-widest">
                  RECENT DATABASE GROWTH
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Latest constituent import activity.
                </p>
              </div>
              <TrendingUp className="h-4 w-4 text-primary" />
            </header>

            <div className="divide-y divide-border">
              {(data?.recentImports ?? []).map((job) => (
                <div
                  key={job.id}
                  className="grid gap-3 p-4 md:grid-cols-[1fr_repeat(4,120px)]"
                >
                  <div>
                    <p className="text-xs font-medium">{job.file_name}</p>
                    <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                      {job.status.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[8px] text-muted-foreground">
                      READ
                    </p>
                    <p className="mt-1 font-mono text-sm">
                      {number(job.total_rows)}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[8px] text-muted-foreground">
                      IMPORTED
                    </p>
                    <p className="mt-1 font-mono text-sm">
                      {number(job.imported_rows)}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[8px] text-muted-foreground">
                      UPDATED
                    </p>
                    <p className="mt-1 font-mono text-sm">
                      {number(job.updated_rows)}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[8px] text-muted-foreground">
                      DUPLICATES
                    </p>
                    <p className="mt-1 font-mono text-sm">
                      {number(job.duplicate_rows)}
                    </p>
                  </div>
                </div>
              ))}

              {(data?.recentImports ?? []).length === 0 && (
                <div className="py-12 text-center font-mono text-[10px] text-muted-foreground">
                  [ NO_IMPORT_ACTIVITY ]
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="border border-border bg-card p-10 text-center">
          <p className="font-mono text-xs text-primary">
            {TABS.find((item) => item.id === tab)?.label}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            This analytics module remains visible and will be activated in the
            corresponding Phase 9C package.
          </p>
        </section>
      )}
    </div>
  );
}
