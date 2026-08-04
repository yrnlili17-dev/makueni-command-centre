import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  Clock3,
  Home,
  Pause,
  PhoneCall,
  Play,
  RefreshCw,
  ShieldAlert,
  Target,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

type Ward = {
  ward: string;
  registered: number;
  stations: number;
  turnoutTarget: number;
  householdTarget: number;
  householdsVisited: number;
  followUps: number;
  contactTarget: number;
  contactsCompleted: number;
  transportRequests: number;
  transportCompleted: number;
  mobilisationScore: number;
  riskScore: number;
};

type CommandPayload = {
  generatedAt: string;
  wards: Ward[];
  timeline: Array<{
    id: string;
    type: string;
    title: string;
    ward?: string | null;
    status: string;
    timestamp: string;
  }>;
  alerts: Array<{
    ward: string;
    severity: string;
    title: string;
    detail: string;
  }>;
};

function tone(score: number) {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function severityClass(severity: string) {
  if (severity === "critical") return "text-red-400 border-red-400/40";
  if (severity === "high") return "text-orange-400 border-orange-400/40";
  return "text-yellow-400 border-yellow-400/40";
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function GotvLiveCommandBoard() {
  const [data, setData] = useState<CommandPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${BASE}api/turnout/operations-centre/live-command`,
        { credentials: "include" },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Failed to load GOTV command board");
      }

      setData(await response.json());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load GOTV command board",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, load]);

  const wards = data?.wards ?? [];

  const summary = useMemo(() => {
    return {
      mobilisation:
        wards.length > 0
          ? Math.round(
              wards.reduce(
                (sum, ward) => sum + ward.mobilisationScore,
                0,
              ) / wards.length,
            )
          : 0,
      risk:
        wards.length > 0
          ? Math.round(
              wards.reduce(
                (sum, ward) => sum + ward.riskScore,
                0,
              ) / wards.length,
            )
          : 0,
      households: wards.reduce(
        (sum, ward) => sum + ward.householdsVisited,
        0,
      ),
      contacts: wards.reduce(
        (sum, ward) => sum + ward.contactsCompleted,
        0,
      ),
      transportPending: wards.reduce(
        (sum, ward) =>
          sum +
          Math.max(
            0,
            ward.transportRequests - ward.transportCompleted,
          ),
        0,
      ),
    };
  }, [wards]);

  return (
    <section className="space-y-4 border-b border-border/50 pb-5">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">
            PHASE 11B · LIVE GOTV COMMAND BOARD
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Real-time mobilisation risk, household progress, contact completion and transport dispatch.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh((value) => !value)}
            className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
          >
            {autoRefresh ? (
              <Pause className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            AUTO {autoRefresh ? "ON" : "OFF"}
          </button>

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
        <div className="border border-red-400/40 p-3 font-mono text-[9px] text-red-400">
          [ GOTV_COMMAND_ERROR ] {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["MOBILISATION", `${summary.mobilisation}%`, Target],
          ["COUNTY RISK", `${summary.risk}%`, ShieldAlert],
          ["HOUSEHOLDS VISITED", summary.households, Home],
          ["CONTACTS COMPLETED", summary.contacts, PhoneCall],
          ["TRANSPORT PENDING", summary.transportPending, Bus],
        ].map(([label, value, Icon]) => (
          <article key={String(label)} className="border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[8px] text-muted-foreground">
                {label}
              </p>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 font-mono text-xl">{value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <article className="border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                MOBILISATION RISK MATRIX
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Wards ranked by low progress, follow-ups and pending transport.
              </p>
            </div>
            <AlertTriangle className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-3">
            {wards.map((ward, index) => (
              <div key={ward.ward} className="border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px]">
                      {String(index + 1).padStart(2, "0")} ·{" "}
                      {ward.ward.toUpperCase()}
                    </p>
                    <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                      {ward.householdsVisited}/{ward.householdTarget} HOUSEHOLDS ·{" "}
                      {ward.contactsCompleted}/{ward.contactTarget} CONTACTS ·{" "}
                      {ward.followUps} FOLLOW-UPS
                    </p>
                  </div>

                  <div className="text-right">
                    <p className={`font-mono text-sm ${tone(ward.mobilisationScore)}`}>
                      {ward.mobilisationScore}%
                    </p>
                    <p className={`mt-1 font-mono text-[8px] ${tone(100 - ward.riskScore)}`}>
                      RISK {ward.riskScore}
                    </p>
                  </div>
                </div>

                <div className="mt-3 h-1.5 bg-secondary">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${ward.mobilisationScore}%` }}
                  />
                </div>
              </div>
            ))}

            {!loading && wards.length === 0 && (
              <div className="border border-dashed border-border py-10 text-center font-mono text-[10px] text-muted-foreground">
                [ NO_GOTV_COMMAND_DATA ]
              </div>
            )}
          </div>
        </article>

        <article className="border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                EXECUTIVE GOTV ALERTS
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Automatic alerts for weak mobilisation and logistics gaps.
              </p>
            </div>
            <ShieldAlert className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 space-y-2">
            {(data?.alerts ?? []).map((alert, index) => (
              <div
                key={`${alert.ward}-${index}`}
                className="grid gap-3 border border-border p-3 md:grid-cols-[28px_1fr_auto]"
              >
                <span className="flex h-7 w-7 items-center justify-center border border-border font-mono text-[8px] text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-xs font-medium">{alert.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {alert.detail}
                  </p>
                </div>
                <span
                  className={`h-fit border px-2 py-1 font-mono text-[8px] ${severityClass(
                    alert.severity,
                  )}`}
                >
                  {alert.severity.toUpperCase()}
                </span>
              </div>
            ))}

            {!loading && (data?.alerts.length ?? 0) === 0 && (
              <div className="border border-dashed border-border py-10 text-center font-mono text-[10px] text-muted-foreground">
                [ NO_CRITICAL_GOTV_ALERTS ]
              </div>
            )}
          </div>
        </article>
      </div>

      <article className="border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-widest">
              LIVE GOTV OPERATIONS TIMELINE
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Household visits, contact activity and transport progress.
            </p>
          </div>
          <Clock3 className="h-4 w-4 text-primary" />
        </div>

        <div className="mt-4 space-y-2">
          {(data?.timeline ?? []).map((item) => (
            <div
              key={item.id}
              className="grid gap-3 border border-border p-3 md:grid-cols-[34px_1fr_auto]"
            >
              <div className="flex h-8 w-8 items-center justify-center border border-border">
                {item.type === "transport" ? (
                  <Bus className="h-4 w-4 text-primary" />
                ) : item.type === "contact" ? (
                  <PhoneCall className="h-4 w-4 text-primary" />
                ) : (
                  <Home className="h-4 w-4 text-primary" />
                )}
              </div>

              <div>
                <p className="text-xs font-medium">{item.title}</p>
                <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                  {(item.ward || "COUNTY").toUpperCase()} ·{" "}
                  item.status.toUpperCase()
                </p>
              </div>

              <p className="font-mono text-[8px] text-muted-foreground">
                {formatTime(item.timestamp)}
              </p>
            </div>
          ))}

          {!loading && (data?.timeline.length ?? 0) === 0 && (
            <div className="border border-dashed border-border py-12 text-center font-mono text-[10px] text-muted-foreground">
              [ NO_GOTV_TIMELINE_ACTIVITY ]
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
