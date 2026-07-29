import {
  useGetDashboardSummary,
  useGetDashboardActivity,
} from "@workspace/api-client-react";
import {
  Users,
  MessageSquare,
  Map,
  ShieldAlert,
  Target,
  Calendar,
  Zap,
  Clock,
  TrendingUp,
  Activity,
  User,
  Building2,
} from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: any;
  sub?: string;
}) {
  return (
    <div className="bg-card border border-border p-4">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-mono tracking-widest text-muted-foreground">
          {label}
        </span>
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="text-3xl font-bold tabular-nums">{value}</div>
      {sub && (
        <div className="text-[10px] font-mono text-muted-foreground mt-1">
          {sub}
        </div>
      )}
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
    <span
      className={`font-mono text-[10px] border px-2 py-0.5 ${colors[level] ?? colors.low}`}
    >
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
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: activity, isLoading: activityLoading } =
    useGetDashboardActivity();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-widest">
            COMMAND OVERVIEW
          </h1>
          <p className="text-[10px] font-mono text-muted-foreground mt-1 tracking-widest">
            [ CAMPAIGN_READ ] [ LIVE_DATA ]
          </p>
        </div>
        {summary?.daysToElection != null && (
          <div className="bg-primary/10 border border-primary/30 px-6 py-3 text-center">
            <div className="text-4xl font-bold text-primary tabular-nums">
              {summary.daysToElection}
            </div>
            <div className="text-[9px] font-mono text-primary/80 tracking-widest mt-1">
              DAYS TO ELECTION
            </div>
          </div>
        )}
      </div>

      {summaryLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-card border border-border p-4 h-24 animate-pulse"
            />
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="TOTAL MEMBERS"
            value={summary.totalMembers.toLocaleString()}
            icon={Users}
            sub="IDENTITY GRAPH"
          />
          <StatCard
            label="ACTIVE VOLUNTEERS"
            value={summary.activeVolunteers}
            icon={Activity}
            sub="DEPLOYED"
          />
          <StatCard
            label="MESSAGES SENT"
            value={summary.messagesSent.toLocaleString()}
            icon={MessageSquare}
            sub="ALL CHANNELS"
          />
          <StatCard
            label="DOORS KNOCKED"
            value={summary.doorsKnocked.toLocaleString()}
            icon={Map}
            sub="FIELD OPS"
          />
          <StatCard
            label="WARDS COVERED"
            value={summary.wardsCovered}
            icon={TrendingUp}
            sub="ACTIVE ZONES"
          />
          <StatCard
            label="OPEN THREATS"
            value={summary.openThreats}
            icon={ShieldAlert}
            sub="NARRATIVE"
          />
          <StatCard
            label="READINESS SCORE"
            value={`${summary.campaignReadiness}%`}
            icon={Target}
            sub="OVERALL"
          />
          <StatCard
            label="UPCOMING EVENTS"
            value={summary.upcomingEvents}
            icon={Calendar}
            sub="SCHEDULED"
          />
        </div>
      ) : null}

      {/* Candidate Profile + Constituency Intel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs tracking-widest">
              CANDIDATE_PROFILE
            </span>
          </div>
          <div className="p-4 space-y-2.5">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="font-bold text-sm tracking-wide">
                  PROF. PHILIP KALOKI
                </p>
                <p className="font-mono text-[10px] text-primary tracking-widest mt-0.5">
                  PROF. KALOKI · MAKUENI GUBERNATORIAL CAMPAIGN
                </p>
              </div>
              <span className="font-mono text-[9px] border border-primary/30 px-2 py-0.5 text-primary shrink-0">
                WIPER PATRIOTIC FRONT
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {[
                ["SLOGAN", "Komboa Kenya"],
                ["SYMBOL", "Umbrella"],
                ["PROFESSION", "Biomedical Engineer"],
                ["EXPERIENCE", "15 Years Leadership"],
                ["EDUCATION", "Degree"],
                ["CONTACT", "0725 988 683"],
                ["WARD", "Makueni West"],
                ["TARGET WIN", "85%+"],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="font-mono text-[8px] text-muted-foreground">
                    {k}
                  </p>
                  <p className="font-mono text-[10px] text-foreground">{v}</p>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-border space-y-1">
              <p className="font-mono text-[8px] text-muted-foreground tracking-widest mb-1">
                SOCIAL MEDIA
              </p>
              {[
                ["FACEBOOK", "Prof. Philip Kaloki"],
                ["FB PAGE", "Prof. Philip Kaloki for Governor, Makueni"],
                ["TWITTER/X", "Philip Kaloki1"],
                ["TIKTOK", "@profphilipkaloki"],
              ].map(([p, h]) => (
                <div key={p} className="flex items-start gap-2">
                  <span className="font-mono text-[8px] text-muted-foreground w-16 shrink-0 mt-0.5">
                    {p}
                  </span>
                  <span className="font-mono text-[9px] text-foreground">
                    {h}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs tracking-widest">
              CONSTITUENCY_INTEL
            </span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "POPULATION", value: "187,600" },
                { label: "REG. VOTERS", value: "78,000" },
                { label: "WARDS", value: "5" },
                { label: "POLL. STATIONS", value: "165" },
                { label: "POLL. STREAMS", value: "117" },
                { label: "YOUTH", value: "75,000" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-secondary/50 px-2 py-2">
                  <p className="font-mono text-[8px] text-muted-foreground">
                    {label}
                  </p>
                  <p className="font-bold text-sm tabular-nums text-primary">
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <div>
              <p className="font-mono text-[8px] text-muted-foreground tracking-widest mb-2">
                POLLING STATIONS BY WARD
              </p>
              <div className="space-y-1.5">
                {[
                  { ward: "Tala", stations: 40 },
                  { ward: "Makueni West", stations: 55 },
                  { ward: "Makueni North", stations: 26 },
                  { ward: "Makueni East", stations: 24 },
                  { ward: "Kyeleni", stations: 20 },
                ].map(({ ward, stations }) => (
                  <div key={ward} className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-muted-foreground w-32 shrink-0">
                      {ward.toUpperCase()}
                    </span>
                    <div className="flex-1 bg-secondary/50 h-2 relative">
                      <div
                        className="absolute inset-y-0 left-0 bg-primary/60"
                        style={{ width: `${(stations / 55) * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-[9px] text-primary font-bold w-6 text-right">
                      {stations}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="font-mono text-[8px] text-muted-foreground tracking-widest mb-1">
                KEY ISSUES
              </p>
              <div className="flex flex-wrap gap-1">
                {[
                  "Clean Water",
                  "Road Infrastructure",
                  "Employment",
                  "Security",
                ].map((i) => (
                  <span
                    key={i}
                    className="font-mono text-[9px] border border-red-400/30 px-2 py-0.5 text-red-400"
                  >
                    [ {i.toUpperCase()} ]
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="font-mono text-[8px] text-muted-foreground tracking-widest mb-1">
                ECONOMIC ACTIVITIES
              </p>
              <p className="font-mono text-[9px] text-muted-foreground">
                Coffee farming · Maize & beans · Horticulture · Quarry stones ·
                Ballast
              </p>
            </div>
            <div>
              <p className="font-mono text-[8px] text-muted-foreground tracking-widest mb-1">
                RELIGIOUS GROUPS
              </p>
              <p className="font-mono text-[9px] text-muted-foreground">
                Christianity · Islam
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs tracking-widest">
              ACTIVITY_FEED
            </span>
          </div>
          {activityLoading ? (
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
                      <p className="text-[10px] font-mono text-muted-foreground">
                        OPERATIVE: {item.actor}
                      </p>
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
              <p className="font-mono text-xs text-muted-foreground">
                [ NO_ACTIVITY_RECORDED ]
              </p>
            </div>
          )}
        </div>

        <div className="bg-card border border-border">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs tracking-widest">
              SYSTEM_STATUS
            </span>
          </div>
          <div className="p-4 space-y-3">
            {[
              { label: "IDENTITY_GRAPH", status: "OPERATIONAL" },
              { label: "MESSAGING_UPLINK", status: "OPERATIONAL" },
              { label: "FIELD_OPS", status: "OPERATIONAL" },
              { label: "NARRATIVE_CMD", status: "MONITORING" },
              { label: "INTEL_LAYER", status: "OPERATIONAL" },
              { label: "KOL_NETWORK", status: "OPERATIONAL" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {s.label}
                </span>
                <span
                  className={`font-mono text-[10px] ${s.status === "OPERATIONAL" ? "text-green-400" : "text-yellow-400"}`}
                >
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
