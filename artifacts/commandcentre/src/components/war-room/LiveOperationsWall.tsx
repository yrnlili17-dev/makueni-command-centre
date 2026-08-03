import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Command,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

type FeedItem = {
  id: string | number;
  eventType: string;
  title: string;
  description?: string | null;
  module?: string | null;
  severity: string;
  status: string;
  createdAt: string;
  source?: string;
};

function iconFor(type: string) {
  if (type === "incident") return AlertTriangle;
  if (type === "event") return CalendarDays;
  if (type === "strategic-action") return Command;
  if (type === "volunteer") return Users;
  if (type === "message") return MessageSquare;
  return Activity;
}

function severityClass(severity: string) {
  if (severity === "critical") return "text-red-400 border-red-400/40";
  if (severity === "high") return "text-orange-400 border-orange-400/40";
  if (severity === "medium") return "text-yellow-400 border-yellow-400/40";
  if (severity === "low") return "text-blue-400 border-blue-400/40";
  return "text-muted-foreground border-border";
}

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LiveOperationsWall() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");


  async function fetchFeed() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${BASE}api/command-centre/operations-wall`,
        { credentials: "include" },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load operations wall");
      }

      setItems(await response.json());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load operations wall",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchFeed();
    const interval = window.setInterval(() => void fetchFeed(), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? items
        : items.filter((item) => item.eventType === filter),
    [filter, items],
  );

  const counts = useMemo(
    () => ({
      all: items.length,
      incident: items.filter((item) => item.eventType === "incident").length,
      event: items.filter((item) => item.eventType === "event").length,
      "strategic-action": items.filter(
        (item) => item.eventType === "strategic-action",
      ).length,
    }),
    [items],
  );

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">
            LIVE OPERATIONS WALL
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Real-time incidents, strategic actions, events and command updates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchFeed()}
          className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          REFRESH
        </button>
      </header>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["all", "ALL ACTIVITY", Activity],
          ["incident", "INCIDENTS", AlertTriangle],
          ["event", "EVENTS", CalendarDays],
          ["strategic-action", "STRATEGIC ACTIONS", Command],
        ].map(([value, label, Icon]) => (
          <button
            key={String(value)}
            type="button"
            onClick={() => setFilter(String(value))}
            className={`border p-3 text-left transition ${
              filter === value
                ? "border-primary bg-primary/5"
                : "border-border bg-card"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-[8px] text-muted-foreground">
                {label}
              </p>
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="mt-2 font-mono text-lg">
              {counts[value as keyof typeof counts] ?? 0}
            </p>
          </button>
        ))}
      </div>

      {error && (
        <div className="border border-red-400/40 bg-red-400/5 p-3 font-mono text-[9px] text-red-400">
          [ OPERATIONS_WALL_ERROR ] {error}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((item) => {
          const Icon = iconFor(item.eventType);

          return (
            <article
              key={`${item.source}-${item.id}`}
              className="grid gap-3 border border-border bg-card p-4 md:grid-cols-[34px_1fr_auto]"
            >
              <div className="flex h-8 w-8 items-center justify-center border border-border">
                <Icon className="h-4 w-4 text-primary" />
              </div>

              <div>
                <p className="text-xs font-medium">{item.title}</p>
                {item.description && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2 font-mono text-[8px] text-muted-foreground">
                  <span>{String(item.module ?? "war-room").toUpperCase()}</span>
                  <span>·</span>
                  <span>{timeLabel(item.createdAt)}</span>
                  <span>·</span>
                  <span>{item.status.toUpperCase()}</span>
                </div>
              </div>

              <span
                className={`h-fit border px-2 py-1 font-mono text-[8px] ${severityClass(
                  item.severity,
                )}`}
              >
                {item.severity.toUpperCase()}
              </span>
            </article>
          );
        })}

        {!loading && filtered.length === 0 && (
          <div className="border border-dashed border-border py-12 text-center font-mono text-[10px] text-muted-foreground">
            [ NO_LIVE_OPERATIONS_ACTIVITY ]
          </div>
        )}
      </div>
    </section>
  );
}
