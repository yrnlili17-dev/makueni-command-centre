import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Gavel,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

type ResultRow = Record<string, any>;
type DecisionRow = Record<string, any>;

function statusOf(row: any) {
  return String(row?.status ?? "submitted").toLowerCase();
}

function stationCodeOf(row: any) {
  return String(row?.stationCode ?? row?.station_code ?? "");
}

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function formatTime(value?: string | null) {
  if (!value) return "No deadline";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ResultsSituationRoomDecisionConsole() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    category: "verification",
    priority: "high",
    ward: "",
    constituency: "",
    stationCode: "",
    owner: "",
    decision: "",
    dueAt: "",
    createdBy: "Results Situation Room",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [resultsResponse, decisionsResponse] = await Promise.all([
        fetch(`${BASE}api/election-day/results`, {
          credentials: "include",
        }),
        fetch(`${BASE}api/election-day/results-decisions`, {
          credentials: "include",
        }),
      ]);

      if (!resultsResponse.ok || !decisionsResponse.ok) {
        throw new Error("Failed to load results situation room");
      }

      const [resultsPayload, decisionsPayload] = await Promise.all([
        resultsResponse.json(),
        decisionsResponse.json(),
      ]);

      setResults(
        Array.isArray(resultsPayload)
          ? resultsPayload
          : Array.isArray(resultsPayload?.results)
            ? resultsPayload.results
            : [],
      );

      setDecisions(
        Array.isArray(decisionsPayload) ? decisionsPayload : [],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Results Situation Room",
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

  const disputedStations = useMemo(
    () =>
      new Set(
        results
          .filter((row) =>
            ["disputed", "rejected", "under-review"].includes(
              statusOf(row),
            ),
          )
          .map(stationCodeOf)
          .filter(Boolean),
      ).size,
    [results],
  );

  const pendingVerification = results.filter(
    (row) => statusOf(row) === "submitted",
  ).length;

  const openDecisions = decisions.filter(
    (row) => row.status !== "closed",
  ).length;

  const criticalDecisions = decisions.filter(
    (row) =>
      row.status !== "closed" && row.priority === "critical",
  ).length;

  async function createDecision() {
    if (!form.title.trim()) {
      setError("Decision title is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${BASE}api/election-day/results-decisions`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            dueAt: form.dueAt || null,
          }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create decision");
      }

      setForm({
        title: "",
        category: "verification",
        priority: "high",
        ward: "",
        constituency: "",
        stationCode: "",
        owner: "",
        decision: "",
        dueAt: "",
        createdBy: "Results Situation Room",
      });

      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Decision creation failed",
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateDecision(id: number, status: string) {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${BASE}api/election-day/results-decisions/${id}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Decision update failed");
      }

      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Decision update failed",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4 border-b border-border/50 pb-5">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-widest text-primary">
            RESULTS SITUATION ROOM & DECISION CONSOLE
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Convert verification, dispute and reporting risks into assigned executive decisions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh((value) => !value)}
            className="flex min-h-10 items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
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
            className="flex min-h-10 items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            REFRESH
          </button>
        </div>
      </header>

      {error && (
        <div className="border border-red-400/40 bg-red-400/5 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["OPEN DECISIONS", openDecisions, Gavel],
          ["CRITICAL DECISIONS", criticalDecisions, ShieldAlert],
          ["PENDING VERIFICATION", pendingVerification, Clock3],
          ["DISPUTED STATIONS", disputedStations, AlertTriangle],
        ].map(([label, value, Icon]) => (
          <article key={String(label)} className="border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[8px] text-muted-foreground">{label}</p>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 font-mono text-xl">{number(Number(value))}</p>
          </article>
        ))}
      </div>

      <article className="border border-border bg-card p-4">
        <p className="font-mono text-[10px] tracking-widest">
          CREATE EXECUTIVE DECISION
        </p>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <input
            value={form.title}
            onChange={(event) =>
              setForm({ ...form, title: event.target.value })
            }
            placeholder="Decision title"
            className="min-h-10 border border-border bg-background px-3 py-2 text-xs"
          />

          <select
            value={form.category}
            onChange={(event) =>
              setForm({ ...form, category: event.target.value })
            }
            className="min-h-10 border border-border bg-background px-3 py-2 font-mono text-[8px]"
          >
            <option value="verification">VERIFICATION</option>
            <option value="dispute">DISPUTE</option>
            <option value="reporting">REPORTING</option>
            <option value="legal">LEGAL</option>
            <option value="communications">COMMUNICATIONS</option>
          </select>

          <select
            value={form.priority}
            onChange={(event) =>
              setForm({ ...form, priority: event.target.value })
            }
            className="min-h-10 border border-border bg-background px-3 py-2 font-mono text-[8px]"
          >
            <option value="critical">CRITICAL</option>
            <option value="high">HIGH</option>
            <option value="medium">MEDIUM</option>
            <option value="low">LOW</option>
          </select>

          <input
            value={form.owner}
            onChange={(event) =>
              setForm({ ...form, owner: event.target.value })
            }
            placeholder="Decision owner"
            className="min-h-10 border border-border bg-background px-3 py-2 text-xs"
          />

          <input
            value={form.ward}
            onChange={(event) =>
              setForm({ ...form, ward: event.target.value })
            }
            placeholder="Ward"
            className="min-h-10 border border-border bg-background px-3 py-2 text-xs"
          />

          <input
            value={form.stationCode}
            onChange={(event) =>
              setForm({ ...form, stationCode: event.target.value })
            }
            placeholder="Station code"
            className="min-h-10 border border-border bg-background px-3 py-2 text-xs"
          />

          <input
            type="datetime-local"
            value={form.dueAt}
            onChange={(event) =>
              setForm({ ...form, dueAt: event.target.value })
            }
            className="min-h-10 border border-border bg-background px-3 py-2 text-xs"
          />

          <button
            type="button"
            onClick={createDecision}
            disabled={saving || !form.title.trim()}
            className="flex min-h-10 items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            CREATE DECISION
          </button>
        </div>

        <textarea
          value={form.decision}
          onChange={(event) =>
            setForm({ ...form, decision: event.target.value })
          }
          placeholder="Decision, action or executive instruction"
          className="mt-2 min-h-24 w-full border border-border bg-background px-3 py-2 text-xs"
        />
      </article>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3">
        {decisions.map((decision) => (
          <article
            key={decision.id}
            className="min-w-0 border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-medium">
                  {decision.title}
                </p>
                <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                  {String(decision.category).toUpperCase()} ·{" "}
                  {(decision.owner || "UNASSIGNED").toUpperCase()}
                </p>
              </div>

              <span className="shrink-0 border border-border px-2 py-1 font-mono text-[8px]">
                {String(decision.priority).toUpperCase()}
              </span>
            </div>

            <p className="mt-3 break-words text-xs text-muted-foreground">
              {decision.decision || "No executive instruction recorded."}
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="border border-border p-3">
                <p className="font-mono text-[7px] text-muted-foreground">
                  STATUS
                </p>
                <p className="mt-2 font-mono text-[8px]">
                  {String(decision.status).toUpperCase()}
                </p>
              </div>
              <div className="border border-border p-3">
                <p className="font-mono text-[7px] text-muted-foreground">
                  DUE
                </p>
                <p className="mt-2 text-xs">
                  {formatTime(decision.dueAt)}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => void updateDecision(decision.id, "in-progress")}
                disabled={saving}
                className="min-h-10 border border-border px-3 py-2 font-mono text-[8px]"
              >
                START
              </button>

              <button
                type="button"
                onClick={() => void updateDecision(decision.id, "escalated")}
                disabled={saving}
                className="min-h-10 border border-orange-400/40 px-3 py-2 font-mono text-[8px] text-orange-400"
              >
                ESCALATE
              </button>

              <button
                type="button"
                onClick={() => void updateDecision(decision.id, "closed")}
                disabled={saving}
                className="flex min-h-10 items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground"
              >
                <CheckCircle2 className="h-3 w-3" />
                CLOSE
              </button>
            </div>
          </article>
        ))}
      </div>

      {!loading && decisions.length === 0 && (
        <div className="border border-dashed border-border bg-card py-12 text-center font-mono text-[10px] text-muted-foreground">
          [ NO_RESULTS_DECISIONS_RECORDED ]
        </div>
      )}
    </section>
  );
}
