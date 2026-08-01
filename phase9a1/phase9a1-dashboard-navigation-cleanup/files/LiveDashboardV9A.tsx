import {
  CalendarDays,
  CheckCircle,
  Database,
  DoorOpen,
  ExternalLink,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type DashboardData = {
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
  availability: {
    volunteers: boolean;
    messaging: boolean;
    events: boolean;
    fieldOperations: boolean;
    intelligence: boolean;
  };
};

type DashboardLink = {
  href: string;
  label: string;
};

async function getDashboard(): Promise<DashboardData> {
  const response = await fetch("/api/dashboard-intelligence/overview", {
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

function percent(value?: number | null) {
  return `${Math.max(0, Math.min(100, Number(value ?? 0)))}%`;
}

function when(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-KE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function navigate(href: string) {
  window.location.assign(href);
}

function ClickablePanel({
  href,
  ariaLabel,
  children,
  className = "",
}: {
  href: string;
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={() => navigate(href)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate(href);
        }
      }}
      className={`group cursor-pointer border border-border bg-card transition hover:border-primary/60 hover:bg-primary/[0.025] focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
    >
      {children}
    </article>
  );
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  link,
  unavailable = false,
}: {
  label: string;
  value: number | string;
  note: string;
  icon: any;
  link: DashboardLink;
  unavailable?: boolean;
}) {
  return (
    <ClickablePanel href={link.href} ariaLabel={link.label} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[9px] tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="flex items-center gap-2">
          <Icon
            className={`h-4 w-4 ${
              unavailable ? "text-muted-foreground" : "text-primary"
            }`}
          />
          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition group-hover:opacity-100 group-focus:opacity-100" />
        </div>
      </div>
      <p className="mt-3 font-mono text-2xl">{value}</p>
      <p className="mt-1 font-mono text-[8px] text-muted-foreground">
        {unavailable ? `${note} · MODULE READY` : note}
      </p>
    </ClickablePanel>
  );
}

function IntelligenceCard({
  label,
  value,
  icon: Icon,
  link,
}: {
  label: string;
  value: number;
  icon: any;
  link: DashboardLink;
}) {
  return (
    <ClickablePanel href={link.href} ariaLabel={link.label} className="p-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[8px] text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <Icon className="h-3 w-3 text-primary" />
          <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 group-focus:opacity-100" />
        </div>
      </div>
      <p className="mt-2 font-mono text-lg">{number(value)}</p>
    </ClickablePanel>
  );
}

export default function LiveDashboardV9A() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setData(await getDashboard());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load dashboard intelligence",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = data?.metrics;

  const maxWard = useMemo(
    () =>
      Math.max(
        1,
        ...(data?.wards ?? []).map((ward) =>
          Number(ward.constituents ?? 0),
        ),
      ),
    [data?.wards],
  );

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <section className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Command Overview</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Live constituent, operational and campaign-readiness intelligence.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="border border-green-400/30 px-3 py-2 font-mono text-[9px] text-green-400">
            LIVE DATA
          </span>
          <span className="border border-border px-3 py-2 font-mono text-[9px]">
            {data ? when(data.generatedAt) : "AWAITING DATA"}
          </span>
          <button
            onClick={() => void load()}
            className="flex items-center gap-1 border border-border px-3 py-2 font-mono text-[9px] transition hover:border-primary/60"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            REFRESH
          </button>
        </div>
      </section>

      {error && (
        <div className="border border-red-400/30 bg-red-400/10 p-3 font-mono text-xs text-red-400">
          {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="TOTAL CONSTITUENTS"
          value={number(metrics?.totalConstituents)}
          note="MASTER IDENTITY GRAPH"
          icon={Users}
          link={{
            href: "/voters-db",
            label: "Open the Constituent Database",
          }}
        />
        <MetricCard
          label="PHONE READY"
          value={number(metrics?.phoneReady)}
          note="DIRECT CONTACT COVERAGE"
          icon={Phone}
          link={{
            href: "/voters-db?contact=phone",
            label: "View constituents with phone contacts",
          }}
        />
        <MetricCard
          label="WARDS COVERED"
          value={number(metrics?.wardsCovered)}
          note={`${number(metrics?.constituenciesCovered)} CONSTITUENCIES`}
          icon={MapPin}
          link={{
            href: "/segments?category=geographic",
            label: "Open geographic audience segments",
          }}
        />
        <MetricCard
          label="OPEN THREATS"
          value={number(metrics?.openThreats)}
          note="NARRATIVE INTELLIGENCE"
          icon={ShieldAlert}
          link={{
            href: "/intelligence?tab=incidents",
            label: "Open narrative incident operations",
          }}
          unavailable={!data?.availability.intelligence}
        />

        <MetricCard
          label="ACTIVE VOLUNTEERS"
          value={number(metrics?.activeVolunteers)}
          note="FIELD FORCE"
          icon={UserCheck}
          link={{
            href: "/volunteers",
            label: "Open Volunteer Command",
          }}
          unavailable={!data?.availability.volunteers}
        />
        <MetricCard
          label="MESSAGES SENT"
          value={number(metrics?.messagesSent)}
          note="COMMUNICATIONS MODULE"
          icon={MessageSquare}
          link={{
            href: "/messaging",
            label: "Open Messaging",
          }}
          unavailable={!data?.availability.messaging}
        />
        <MetricCard
          label="DOORS KNOCKED"
          value={number(metrics?.doorsKnocked)}
          note="FIELD OPERATIONS MODULE"
          icon={DoorOpen}
          link={{
            href: "/field-ops",
            label: "Open Field Operations",
          }}
          unavailable={!data?.availability.fieldOperations}
        />
        <MetricCard
          label="UPCOMING EVENTS"
          value={number(metrics?.upcomingEvents)}
          note="EVENT LOGISTICS MODULE"
          icon={CalendarDays}
          link={{
            href: "/events",
            label: "Open Event Logistics",
          }}
          unavailable={!data?.availability.events}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                CONSTITUENT INTELLIGENCE
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Select a category to open its filtered constituent or segment view.
              </p>
            </div>
            <Database className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <IntelligenceCard
              label="WOMEN"
              value={Number(metrics?.women ?? 0)}
              icon={Users}
              link={{
                href: "/segments?segment=women",
                label: "Open the women audience segment",
              }}
            />
            <IntelligenceCard
              label="MEN"
              value={Number(metrics?.men ?? 0)}
              icon={Users}
              link={{
                href: "/segments?segment=men",
                label: "Open the men audience segment",
              }}
            />
            <IntelligenceCard
              label="YOUTH 18–35"
              value={Number(metrics?.youth ?? 0)}
              icon={TrendingUp}
              link={{
                href: "/segments?segment=youth",
                label: "Open the youth audience segment",
              }}
            />
            <IntelligenceCard
              label="SENIORS 60+"
              value={Number(metrics?.seniors ?? 0)}
              icon={Users}
              link={{
                href: "/segments?segment=seniors",
                label: "Open the senior audience segment",
              }}
            />
            <IntelligenceCard
              label="EMAIL READY"
              value={Number(metrics?.emailReady ?? 0)}
              icon={Mail}
              link={{
                href: "/voters-db?contact=email",
                label: "View constituents with email contacts",
              }}
            />
            <IntelligenceCard
              label="SMS CONSENT"
              value={Number(metrics?.smsConsented ?? 0)}
              icon={MessageSquare}
              link={{
                href: "/voters-db?consent=sms",
                label: "View SMS-consented constituents",
              }}
            />
            <IntelligenceCard
              label="WHATSAPP"
              value={Number(metrics?.whatsappConsented ?? 0)}
              icon={MessageSquare}
              link={{
                href: "/voters-db?consent=whatsapp",
                label: "View WhatsApp-consented constituents",
              }}
            />
            <IntelligenceCard
              label="POLLING STATIONS"
              value={Number(metrics?.pollingStations ?? 0)}
              icon={MapPin}
              link={{
                href: "/voters-db?group=polling-station",
                label: "View constituents by polling station",
              }}
            />
          </div>
        </div>

        <div className="border border-border bg-card p-4">
          <p className="font-mono text-[10px] tracking-widest">
            READINESS SCORES
          </p>

          {[
            [
              "DATA READINESS",
              metrics?.dataReadiness,
              "Phone and ward completeness",
            ],
            [
              "OPERATIONAL READINESS",
              metrics?.operationalReadiness,
              "Database, field force, communications and events",
            ],
          ].map(([label, value, note]) => (
            <div key={String(label)} className="mt-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[9px]">{label}</p>
                <p className="font-mono text-lg">
                  {percent(Number(value))}
                </p>
              </div>
              <div className="mt-2 h-2 bg-secondary">
                <div
                  className="h-full bg-primary"
                  style={{ width: percent(Number(value)) }}
                />
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">{note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                TOP WARDS BY DATABASE COVERAGE
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Select a ward to open its geographic segment.
              </p>
            </div>
            <MapPin className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-3">
            {(data?.wards ?? []).map((ward) => {
              const width = Math.max(
                2,
                Math.round(
                  (Number(ward.constituents ?? 0) / maxWard) * 100,
                ),
              );

              return (
                <button
                  key={ward.ward}
                  onClick={() =>
                    navigate(
                      `/segments?category=geographic&ward=${encodeURIComponent(
                        ward.ward,
                      )}`,
                    )
                  }
                  className="group block w-full border border-transparent p-2 text-left transition hover:border-primary/40 hover:bg-primary/[0.025]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px]">{ward.ward}</p>
                      <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                        {number(ward.phone_ready)} PHONE READY ·{" "}
                        {number(ward.women)} WOMEN
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm">
                        {number(ward.constituents)}
                      </p>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 bg-secondary">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </button>
              );
            })}

            {(data?.wards ?? []).length === 0 && (
              <p className="py-12 text-center font-mono text-xs text-muted-foreground">
                [ NO_WARD_DATA ]
              </p>
            )}
          </div>
        </div>

        <div className="border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] tracking-widest">
              SUPPORT CLASSIFICATION
            </p>
            <Target className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-2">
            {[
              ["STRONG", metrics?.strongSupport, "text-green-400", "strong"],
              ["LEANING", metrics?.leaningSupport, "text-blue-400", "leaning"],
              ["UNDECIDED", metrics?.undecided, "text-yellow-400", "undecided"],
              ["OPPOSED", metrics?.opposed, "text-red-400", "opposed"],
            ].map(([label, value, color, filter]) => (
              <button
                key={String(label)}
                onClick={() => navigate(`/voters-db?support=${filter}`)}
                className="group flex w-full items-center justify-between border border-border p-3 text-left transition hover:border-primary/50 hover:bg-primary/[0.025]"
              >
                <p className={`font-mono text-[9px] ${color}`}>{label}</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-lg">{number(Number(value))}</p>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate("/segments?category=data_quality")}
            className="mt-4 w-full border border-border bg-secondary/20 p-3 text-left transition hover:border-primary/50"
          >
            <p className="font-mono text-[8px] text-muted-foreground">
              DATA QUALITY
            </p>
            <p className="mt-2 text-xs">
              Missing phones: {number(metrics?.missingPhone)}
            </p>
            <p className="mt-1 text-xs">
              Missing wards: {number(metrics?.missingWard)}
            </p>
          </button>
        </div>
      </section>

      <section className="border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border p-4">
          <div>
            <p className="font-mono text-[10px] tracking-widest">
              RECENT DATA OPERATIONS
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Latest campaign import activity.
            </p>
          </div>
          <CheckCircle className="h-4 w-4 text-green-400" />
        </header>

        <div className="divide-y divide-border">
          {(data?.recentImports ?? []).map((job) => (
            <button
              key={job.id}
              onClick={() => navigate("/data-centre")}
              className="grid w-full gap-3 p-4 text-left transition hover:bg-primary/[0.025] md:grid-cols-[1fr_repeat(4,120px)]"
            >
              <div>
                <p className="text-xs font-medium">{job.file_name}</p>
                <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                  {job.status.toUpperCase()} ·{" "}
                  {when(job.completed_at ?? job.created_at)}
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
            </button>
          ))}

          {(data?.recentImports ?? []).length === 0 && (
            <p className="py-12 text-center font-mono text-xs text-muted-foreground">
              [ NO_IMPORT_HISTORY ]
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
