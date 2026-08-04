import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Command,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

type WardRow = {
  ward: string;
  constituency?: string | null;
  constituents: number;
  phone_ready: number;
  support_classified: number;
  undecided: number;
  readiness: number;
  risk_score: number;
  opportunity_score: number;
};

type SituationData = {
  generatedAt: string;
  wards: WardRow[];
  highestRisk: WardRow[];
  highestOpportunity: WardRow[];
  actions: Array<{
    id: number;
    title: string;
    priority: string;
    status: string;
    owner?: string | null;
  }>;
  incidents: Array<{
    id: number;
    title: string;
    severity: string;
    status: string;
  }>;
  events: Array<{
    id: number;
    title: string;
    startDate: string;
    status: string;
  }>;
};

function num(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function severityClass(value: number) {
  if (value >= 70) return "text-red-400";
  if (value >= 45) return "text-orange-400";
  if (value >= 25) return "text-yellow-400";
  return "text-green-400";
}

function navigate(path: string) {
  window.location.assign(`${BASE}${path.replace(/^\//, "")}`);
}

export default function CountySituationRoom() {
  const [data, setData] = useState<SituationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWard, setSelectedWard] = useState<string>("all");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${BASE}api/command-centre/situation-room`,
        { credentials: "include" },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to load situation room");
      }

      setData(await response.json());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load county situation room",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const wards = data?.wards ?? [];

  const selected = useMemo(
    () =>
      selectedWard === "all"
        ? null
        : wards.find((ward) => ward.ward === selectedWard) ?? null,
    [selectedWard, wards],
  );

  const readinessAverage = wards.length
    ? Math.round(
        wards.reduce(
          (sum, ward) => sum + Number(ward.readiness ?? 0),
          0,
        ) / wards.length,
      )
    : 0;

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">
            COUNTY SITUATION ROOM
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ward risk, opportunity, incidents, actions and operational timeline.
          </p>
        </div>

        <div className="flex gap-2">
          <select
            value={selectedWard}
            onChange={(event) => setSelectedWard(event.target.value)}
            className="border border-border bg-background px-3 py-2 font-mono text-[8px]"
          >
            <option value="all">ALL WARDS</option>
            {wards.map((ward) => (
              <option key={ward.ward} value={ward.ward}>
                {ward.ward.toUpperCase()}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            REFRESH
          </button>
        </div>
      </header>

      {error && (
        <div className="border border-red-400/40 bg-red-400/5 p-3 font-mono text-[9px] text-red-400">
          [ SITUATION_ROOM_ERROR ] {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["WARD READINESS", `${readinessAverage}%`, TrendingUp],
          ["HIGH-RISK WARDS", data?.highestRisk?.length ?? 0, ShieldAlert],
          ["OPEN ACTIONS", data?.actions?.length ?? 0, Command],
          ["OPEN INCIDENTS", data?.incidents?.length ?? 0, AlertTriangle],
        ].map(([label, value, Icon]) => (
          <article key={String(label)} className="border border-border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-[8px] text-muted-foreground">
                {label}
              </p>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 font-mono text-2xl">{value}</p>
          </article>
        ))}
      </div>

      {selected && (
        <article className="border border-primary/40 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[9px] text-primary">
                SELECTED WARD
              </p>
              <p className="mt-1 text-lg font-semibold">
                {selected.ward.toUpperCase()}
              </p>
              <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                {(selected.constituency || "MAKUENI").toUpperCase()} ·{" "}
                {num(selected.constituents)} CONSTITUENTS
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/campaign-database?ward=${encodeURIComponent(selected.ward)}`,
                )
              }
              className="border border-border px-3 py-2 font-mono text-[8px]"
            >
              OPEN WARD DATABASE →
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              ["READINESS", `${selected.readiness}%`],
              ["RISK", selected.risk_score],
              ["OPPORTUNITY", selected.opportunity_score],
              ["PHONE READY", num(selected.phone_ready)],
              ["SUPPORT CLASSIFIED", num(selected.support_classified)],
            ].map(([label, value]) => (
              <div key={String(label)} className="border border-border p-3">
                <p className="font-mono text-[7px] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 font-mono text-sm">{value}</p>
              </div>
            ))}
          </div>
        </article>
      )}

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                HIGHEST-RISK WARDS
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Contact and support-intelligence gaps requiring intervention.
              </p>
            </div>
            <ShieldAlert className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-2">
            {(data?.highestRisk ?? []).map((ward, index) => (
              <button
                key={ward.ward}
                type="button"
                onClick={() => setSelectedWard(ward.ward)}
                className="flex w-full items-center justify-between border border-border p-3 text-left transition hover:border-primary/60"
              >
                <div>
                  <p className="font-mono text-[9px]">
                    {String(index + 1).padStart(2, "0")} ·{" "}
                    {ward.ward.toUpperCase()}
                  </p>
                  <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                    {num(ward.constituents)} CONSTITUENTS ·{" "}
                    {ward.readiness}% READY
                  </p>
                </div>
                <span className={`font-mono text-sm ${severityClass(ward.risk_score)}`}>
                  {ward.risk_score}
                </span>
              </button>
            ))}
          </div>
        </article>

        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                HIGHEST-OPPORTUNITY WARDS
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Wards with the largest persuasion and classification opportunity.
              </p>
            </div>
            <Target className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-2">
            {(data?.highestOpportunity ?? []).map((ward, index) => (
              <button
                key={ward.ward}
                type="button"
                onClick={() => setSelectedWard(ward.ward)}
                className="flex w-full items-center justify-between border border-border p-3 text-left transition hover:border-primary/60"
              >
                <div>
                  <p className="font-mono text-[9px]">
                    {String(index + 1).padStart(2, "0")} ·{" "}
                    {ward.ward.toUpperCase()}
                  </p>
                  <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                    {num(ward.undecided)} UNDECIDED ·{" "}
                    {num(
                      ward.constituents - ward.support_classified,
                    )} UNCLASSIFIED
                  </p>
                </div>
                <span className={`font-mono text-sm ${severityClass(ward.opportunity_score)}`}>
                  {ward.opportunity_score}
                </span>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[10px] tracking-widest">
              STRATEGIC ACTIONS
            </p>
            <Command className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-4 space-y-2">
            {(data?.actions ?? []).slice(0, 8).map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => navigate("/strategist")}
                className="w-full border border-border p-3 text-left"
              >
                <p className="text-xs font-medium">{action.title}</p>
                <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                  {(action.owner || "UNASSIGNED").toUpperCase()} ·{" "}
                  action.priority.toUpperCase()
                </p>
              </button>
            ))}
          </div>
        </article>

        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[10px] tracking-widest">
              INCIDENT MATRIX
            </p>
            <AlertTriangle className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-4 space-y-2">
            {(data?.incidents ?? []).slice(0, 8).map((incident) => (
              <button
                key={incident.id}
                type="button"
                onClick={() => navigate("/intelligence")}
                className="w-full border border-border p-3 text-left"
              >
                <p className="text-xs font-medium">{incident.title}</p>
                <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                  {incident.severity.toUpperCase()} ·{" "}
                  incident.status.toUpperCase()
                </p>
              </button>
            ))}
          </div>
        </article>

        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[10px] tracking-widest">
              CAMPAIGN TIMELINE
            </p>
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-4 space-y-2">
            {(data?.events ?? []).slice(0, 8).map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => navigate("/events")}
                className="w-full border border-border p-3 text-left"
              >
                <p className="text-xs font-medium">{event.title}</p>
                <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                  {String(event.startDate).slice(0, 10)} ·{" "}
                  event.status.toUpperCase()
                </p>
              </button>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}
