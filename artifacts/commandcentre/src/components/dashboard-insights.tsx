import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { HeartPulse, Download, ShieldCheck, LogIn, Eye, TrendingUp, ListTodo, Send, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

type Growth = {
  joinedThisMonth: number; joinedLastMonth: number; growthRate: number | null;
  weeks: { week: string; joined: number }[]; openTasks: number; messagesThisMonth: number;
};
type Check = { id: string; label: string; status: "ok" | "warn" | "fail"; detail: string; href: string };
type Health = { score: number; status: "healthy" | "needs_attention" | "at_risk"; checks: Check[]; generatedAt: string };
type FeedItem = {
  id: number; action: string; module: string; severity: string; userName: string; userEmail: string;
  ipAddress: string | null; userAgent: string | null; createdAt: string;
};

/** "Chrome on Linux" from a user-agent string, without a parsing library. */
function describeAgent(ua: string | null): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows"
    : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "unknown OS";
  return `${browser} on ${os}`;
}

const fmtWeek = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "short" });
const fmtTime = (iso: string) => new Date(iso).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function Kpi({ label, value, sub, icon: Icon }: { label: string; value: string; sub: string; icon: any }) {
  return (
    <div className="bg-card border border-border p-4">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-mono tracking-widest text-muted-foreground">{label}</span>
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="text-3xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] font-mono text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}

const STATUS_STYLE = {
  ok: { icon: CheckCircle2, cls: "text-green-400" },
  warn: { icon: AlertTriangle, cls: "text-yellow-400" },
  fail: { icon: XCircle, cls: "text-red-400" },
} as const;

const HEALTH_LABEL = { healthy: "HEALTHY", needs_attention: "NEEDS ATTENTION", at_risk: "AT RISK" } as const;
const HEALTH_CLS = {
  healthy: "text-green-400 border-green-400/40 bg-green-400/10",
  needs_attention: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  at_risk: "text-red-400 border-red-400/40 bg-red-400/10",
} as const;

function downloadReport(growth: Growth | undefined, health: Health | undefined) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows: unknown[][] = [
    ["Makueni Command Centre: campaign health report"],
    ["Generated", new Date().toLocaleString("en-KE")],
    [],
    ["Health score", health ? `${health.score}/100` : "n/a", health ? HEALTH_LABEL[health.status] : ""],
    [],
    ["Check", "Status", "Detail"],
    ...(health?.checks ?? []).map(c => [c.label, c.status.toUpperCase(), c.detail]),
    [],
    ["Members joined this month", growth?.joinedThisMonth ?? ""],
    ["Members joined last month", growth?.joinedLastMonth ?? ""],
    ["Growth rate", growth?.growthRate == null ? "n/a" : `${growth.growthRate}%`],
    ["Open tasks", growth?.openTasks ?? ""],
    ["Messages sent this month", growth?.messagesThisMonth ?? ""],
    [],
    ["Week starting", "Members joined"],
    ...(growth?.weeks ?? []).map(w => [w.week, w.joined]),
  ];
  const csv = "\uFEFF" + rows.map(r => r.map(esc).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `makueni-campaign-health-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function DashboardInsights() {
  const { can } = useAuth();
  const canSeeFeed = can("admin");
  const growth = useQuery({ queryKey: ["dashboard-growth"], queryFn: () => getJson<Growth>("/dashboard/growth") });
  const health = useQuery({ queryKey: ["dashboard-health"], queryFn: () => getJson<Health>("/dashboard/health") });
  const feed = useQuery({
    queryKey: ["admin-activity-feed"], enabled: canSeeFeed, refetchInterval: 30_000,
    queryFn: () => getJson<FeedItem[]>("/admin/activity-feed"),
  });
  const g = growth.data;
  const h = health.data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="GROWTH RATE" icon={TrendingUp}
          value={g ? (g.growthRate == null ? (g.joinedThisMonth ? "NEW" : "–") : `${g.growthRate > 0 ? "+" : ""}${g.growthRate}%`) : "…"}
          sub={g ? `${g.joinedThisMonth} joined this month, ${g.joinedLastMonth} last month` : "MONTH ON MONTH"} />
        <Kpi label="JOINED THIS MONTH" icon={LogIn} value={g ? g.joinedThisMonth.toLocaleString() : "…"} sub="NEW MEMBERS" />
        <Kpi label="OPEN TASKS" icon={ListTodo} value={g ? String(g.openTasks) : "…"} sub="MILESTONES NOT DONE" />
        <Kpi label="MESSAGES THIS MONTH" icon={Send} value={g ? g.messagesThisMonth.toLocaleString() : "…"} sub="ALL CHANNELS" />
      </div>

      <div className={`grid grid-cols-1 gap-4 ${canSeeFeed ? "lg:grid-cols-3" : ""}`}>
        <div className={`bg-card border border-border ${canSeeFeed ? "lg:col-span-2" : ""}`}>
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs tracking-widest">MEMBER_ACQUISITION · LAST 12 WEEKS</span>
          </div>
          <div className="p-4 h-64">
            {g ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={g.weeks} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="acq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="week" tickFormatter={fmtWeek} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    labelFormatter={(v) => `Week of ${fmtWeek(String(v))}`}
                    formatter={(v) => [`${v} members`, "Joined"]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Area type="monotone" dataKey="joined" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#acq)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full animate-pulse bg-secondary/30" />
            )}
          </div>
        </div>

        {canSeeFeed && (
          <div className="bg-card border border-border flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="font-mono text-xs tracking-widest">ACCESS_LOG</span>
              </span>
              <Link href="/admin" className="font-mono text-[10px] text-primary hover:underline">FULL AUDIT</Link>
            </div>
            <ul className="divide-y divide-border overflow-y-auto max-h-64">
              {(feed.data ?? []).map(item => (
                <li key={item.id} className="px-4 py-2.5">
                  <div className="flex items-start gap-2">
                    {item.module === "auth" ? <LogIn className="w-3.5 h-3.5 mt-0.5 text-blue-400 shrink-0" /> : <Eye className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-xs"><span className="font-semibold">{item.userName}</span> {item.action.charAt(0).toLowerCase() + item.action.slice(1)}</p>
                      <p className="font-mono text-[10px] text-muted-foreground truncate">
                        {fmtTime(item.createdAt)} · {item.ipAddress ?? "no IP"} · {describeAgent(item.userAgent)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
              {feed.data && feed.data.length === 0 && (
                <li className="px-4 py-6 text-center font-mono text-[10px] text-muted-foreground">Sign-ins and sensitive-data access will appear here.</li>
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-card border border-border">
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs tracking-widest">CAMPAIGN_HEALTH</span>
            {h && (
              <span className={`font-mono text-[10px] border px-2 py-0.5 ${HEALTH_CLS[h.status]}`}>
                {HEALTH_LABEL[h.status]} · {h.score}/100
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => downloadReport(g, h)}
            disabled={!h}
            className="flex items-center gap-1.5 border border-border px-3 py-1.5 font-mono text-[10px] tracking-widest hover:border-primary hover:text-primary disabled:opacity-40"
          >
            <Download className="w-3 h-3" /> DOWNLOAD REPORT
          </button>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 divide-border">
          {(h?.checks ?? []).map(c => {
            const S = STATUS_STYLE[c.status];
            return (
              <li key={c.id} className="px-4 py-3 border-border md:border-b md:odd:border-r">
                <Link href={c.href} className="flex items-start gap-2.5 group">
                  <S.icon className={`w-4 h-4 mt-0.5 shrink-0 ${S.cls}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold group-hover:text-primary">{c.label}</span>
                    <span className="block text-xs text-muted-foreground">{c.detail}</span>
                  </span>
                </Link>
              </li>
            );
          })}
          {!h && Array.from({ length: 4 }).map((_, i) => <li key={i} className="h-14 animate-pulse bg-secondary/20 m-2" />)}
        </ul>
      </div>
    </div>
  );
}
