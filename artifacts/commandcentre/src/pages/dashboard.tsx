import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DashboardInsights } from "@/components/dashboard-insights";
import { useGetDashboardSummary, useGetDashboardActivity, getGetDashboardSummaryQueryKey, getGetDashboardActivityQueryKey } from "@workspace/api-client-react";
import { Users, MessageSquare, Map, ShieldAlert, Target, Calendar, Zap, Clock, TrendingUp, Activity, User, Building2 } from "lucide-react";

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: any; sub?: string }) {
  return (
    <div className="cc-stat-card bg-card border border-border p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-mono tracking-widest text-muted-foreground">{label}</span>
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="text-3xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-[10px] font-mono text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function ThreatBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    low: "text-blue-400 border-blue-400/30",
    medium: "text-yellow-400 border-yellow-400/30",
    high: "text-orange-400 border-orange-400/30",
    critical: "text-red-400 border-red-400/30 animate-pulse",
  };
  return (
    <span className={`font-mono text-[10px] border px-2 py-0.5 ${colors[level] ?? colors.low}`}>
      [ {level.toUpperCase()} ]
    </span>
  );
}

function ModuleTag({ module }: { module: string }) {
  const tags: Record<string, string> = {
    members: "IDENTITY",
    messaging: "UPLINK",
    "field-ops": "FIELD",
    volunteers: "VOLUNTEER",
    intelligence: "INTEL",
    "campaign-plan": "PLAN",
    events: "EVENT",
    surveys: "SURVEY",
    kol: "KOL",
    segments: "SEGMENT",
  };
  return (
    <span className="font-mono text-[9px] text-primary border border-primary/30 px-1.5 py-0.5">
      {tags[module] ?? module.toUpperCase()}
    </span>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refreshSummary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey(), refetchInterval: 30_000, staleTime: 0 } });
  const { data: activity, isLoading: activityLoading, isError: activityError, refetch: refreshActivity } = useGetDashboardActivity({ query: { queryKey: getGetDashboardActivityQueryKey(), refetchInterval: 30_000, staleTime: 0 } });

  const { data: operations } = useQuery<{ registeredVolunteers: number; pendingVolunteers: number; openVolunteerTasks: number; completedVolunteerTasks: number }>({
    queryKey: ["dashboard-operations"], refetchInterval: 30_000,
    queryFn: async () => { const r = await fetch(`${import.meta.env.BASE_URL}api/dashboard/operations`); if (!r.ok) throw new Error("Operations unavailable"); return r.json(); },
  });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-widest">Dashboard</h1>
          <p className="text-[10px] font-mono text-muted-foreground mt-1 tracking-widest">Makueni County · Workspace overview</p>
        </div>
        {summary?.daysToElection != null && (
          <div className="bg-primary/10 border border-primary/30 px-6 py-3 text-center">
            <div className="text-4xl font-bold text-primary tabular-nums">{summary.daysToElection}</div>
            <div className="text-[9px] font-mono text-primary/80 tracking-widest mt-1">DAYS TO ELECTION</div>
          </div>
        )}
      </div>

      {summaryError && <div role="alert" className="rounded-lg border border-red-400/30 bg-red-400/5 p-4 text-sm">Overview data is unavailable. <button onClick={() => void refreshSummary()} className="underline">Retry</button></div>}
      {summaryLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border border-border p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="TOTAL MEMBERS" value={summary.totalMembers.toLocaleString()} icon={Users} sub="IDENTITY GRAPH" />
          <StatCard label="ACTIVE VOLUNTEERS" value={summary.activeVolunteers} icon={Activity} sub="DEPLOYED" />
          <StatCard label="MESSAGES SENT" value={summary.messagesSent.toLocaleString()} icon={MessageSquare} sub="ALL CHANNELS" />
          <StatCard label="DOORS KNOCKED" value={summary.doorsKnocked.toLocaleString()} icon={Map} sub="FIELD OPS" />
          <StatCard label="WARDS COVERED" value={summary.wardsCovered} icon={TrendingUp} sub="ACTIVE ZONES" />
          <StatCard label="OPEN THREATS" value={summary.openThreats} icon={ShieldAlert} sub="NARRATIVE" />
          <StatCard label="READINESS SCORE" value={`${summary.campaignReadiness}%`} icon={Target} sub="OVERALL" />
          <StatCard label="UPCOMING EVENTS" value={summary.upcomingEvents} icon={Calendar} sub="SCHEDULED" />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/turnout" className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">Turnout scenarios and historical results →</Link>
        <Link href="/volunteers" className="rounded-xl border border-border px-4 py-3">{operations ? `${operations.registeredVolunteers} registrations · ${operations.pendingVolunteers} awaiting review · ${operations.openVolunteerTasks} open tasks · ${operations.completedVolunteerTasks} completed` : "Volunteer registrations and tasks →"}</Link>
      </div>
      <p className="text-xs text-muted-foreground">Updates after saved changes; checks for other users’ changes every 30 seconds while open.</p>
      <DashboardInsights />

      {/* Candidate Profile + Constituency Intel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs tracking-widest">Candidate profile</span>
          </div>
          <div className="p-4 space-y-2.5">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="font-bold text-sm tracking-wide">PROF. PHILIP KALOKI</p>
                <p className="font-mono text-[10px] text-primary tracking-widest mt-0.5">MAKUENI GOVERNOR ASPIRANT · 2027</p>
              </div>
              <span className="font-mono text-[9px] border border-primary/30 px-2 py-0.5 text-primary shrink-0">2027</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                ["WORKSPACE", "Makueni County"],
                ["CONSTITUENCIES", "6"],
                ["COUNTY ASSEMBLY WARDS", "30"],
                ["ADMINISTRATIVE DIVISIONS", "16"],
                ["LOCATIONS", "63"],
                ["SUB-LOCATIONS", "127"],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="font-mono text-[8px] text-muted-foreground">{k}</p>
                  <p className="font-mono text-[10px] text-foreground">{v}</p>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-border">
              <p className="font-mono text-[8px] text-muted-foreground tracking-widest mb-1">DATA STATUS</p>
              <p className="font-mono text-[10px] text-muted-foreground">Makueni workspace reference. Live operational counts come from the database, not these administrative reference totals.</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs tracking-widest">County reference</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "CONSTITUENCIES", value: "6" },
                { label: "ASSEMBLY WARDS", value: "30" },
                { label: "SUB-WARDS", value: "60" },
                { label: "POLLING STATIONS", value: "1,129", note: "IEBC / KNBS · 2022 snapshot" },
              ].map(({ label, value, note }) => (
                <div key={label} className="bg-secondary/50 px-3 py-3">
                  <p className="font-mono text-[8px] text-muted-foreground">{label}</p>
                  <p className="font-bold text-lg tabular-nums text-primary">{value}</p>
                  {note && <p className="font-mono text-[8px] text-muted-foreground mt-1">{note}</p>}
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-2 space-y-1">
              <p className="font-mono text-[9px] text-muted-foreground">LEGACY FIGURES REMOVED</p>
              <p className="font-mono text-[9px] text-muted-foreground">Ward-level polling station and voter data will appear only after verified IEBC records are imported. The county total is a 2022 reference, not a live count.</p>
              <a className="font-mono text-[9px] text-primary underline" href="https://www.iebc.or.ke/docs/rov_per_polling_station.pdf" target="_blank" rel="noreferrer">OPEN OFFICIAL IEBC 2022 REGISTER</a>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs tracking-widest">Recent activity</span>
          </div>
          {activityError ? <div role="alert" className="p-4 text-sm text-red-300">Activity is unavailable. <button className="underline" onClick={() => void refreshActivity()}>Retry</button></div> : activityLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-secondary/50 animate-pulse" />
              ))}
            </div>
          ) : activity && activity.length > 0 ? (
            <div className="divide-y divide-border">
              {activity.slice(0, 10).map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                  <ModuleTag module={item.module} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.description}</p>
                    {item.actor && (
                      <p className="text-[10px] font-mono text-muted-foreground">OPERATIVE: {item.actor}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="font-mono text-xs text-muted-foreground">[ NO_ACTIVITY_RECORDED ]</p>
            </div>
          )}
        </div>

        <div className="bg-card border border-border">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs tracking-widest">Data connections</span>
          </div>
          <div className="p-4 space-y-3">
            {[
              { label: "Overview data", status: summaryLoading ? "LOADING" : summary ? "AVAILABLE" : "UNAVAILABLE" },
              { label: "Activity feed", status: activityLoading ? "LOADING" : activity ? "AVAILABLE" : "UNAVAILABLE" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground">{s.label}</span>
                <span className={`font-mono text-[10px] ${s.status === "AVAILABLE" ? "text-green-400" : "text-yellow-400"}`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
