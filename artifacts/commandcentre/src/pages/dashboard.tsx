import {
  useGetDashboardActivity,
  useGetDashboardSummary,
} from "@workspace/api-client-react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BrainCircuit,
  Building2,
  Calendar,
  Clock,
  Flag,
  HeartHandshake,
  Landmark,
  Map,
  MessageSquare,
  Radio,
  ShieldAlert,
  Target,
  User,
  Users,
  Vote,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

type DashboardSummary = {
  totalMembers?: number;
  activeVolunteers?: number;
  campaignReadiness?: number;
  messagesSent?: number;
  doorsKnocked?: number;
  wardsCovered?: number;
  openThreats?: number;
  upcomingEvents?: number;
  daysToElection?: number;
};

type DashboardActivity = {
  id?: string | number;
  module?: string;
  actor?: string | null;
  description?: string;
  timestamp?: string | number | Date;
};

function StatCard({
  title,
  value,
  icon: Icon,
  change,
  positive = true,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition hover:shadow-lg">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {title}
          </p>
          <h2 className="mt-2 break-words text-3xl font-bold">{value}</h2>
        </div>

        <div className="shrink-0 rounded-xl bg-primary/10 p-3">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>

      {change ? (
        <div
          className={`flex items-center text-xs font-semibold ${
            positive ? "text-green-600" : "text-red-500"
          }`}
        >
          {positive ? (
            <ArrowUpRight className="mr-1 h-4 w-4" />
          ) : (
            <ArrowDownRight className="mr-1 h-4 w-4" />
          )}
          {change}
        </div>
      ) : null}
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      className="w-full rounded-xl border bg-card p-4 text-left transition hover:border-primary hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}

function InsightCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <BrainCircuit className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function StatusChip({ text, className }: { text: string; className: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {text}
    </span>
  );
}

function formatActivityDate(value: DashboardActivity["timestamp"]): string {
  if (!value) return "Recently";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently" : date.toLocaleString();
}

export default function Dashboard() {
  const summaryQuery = useGetDashboardSummary();
  const activityQuery = useGetDashboardActivity();

  const summary = summaryQuery.data as DashboardSummary | undefined;
  const activity = Array.isArray(activityQuery.data)
    ? (activityQuery.data as DashboardActivity[])
    : [];

  const summaryLoading = summaryQuery.isLoading;
  const activityLoading = activityQuery.isLoading;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="grid items-center gap-6 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
            Makueni County Command Centre
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Prof. Philip Kaloki
          </h1>
          <p className="mt-2 text-muted-foreground">
            Governor Candidate • United Democratic Alliance (UDA)
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Komboa 2027 UDA
            </span>
            <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-600">
              Campaign Active
            </span>
            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600">
              Makueni County
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-card p-5 text-center">
            <p className="text-xs uppercase text-muted-foreground">Days Remaining</p>
            <h2 className="mt-2 text-5xl font-black text-primary">
              {summary?.daysToElection ?? "--"}
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">Until Election</p>
          </div>

          <div className="rounded-xl border bg-card p-5 text-center sm:text-left">
            <p className="text-xs uppercase text-muted-foreground">Campaign Health</p>
            <h2 className="mt-3 text-4xl font-black text-green-600">87%</h2>
            <p className="mt-2 text-xs">Excellent Momentum</p>
          </div>
        </div>
      </section>

      {summaryLoading ? (
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-xl border bg-card"
            />
          ))}
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Registered Voters"
            value={summary?.totalMembers?.toLocaleString() ?? "0"}
            icon={Users}
            change="+8.6% this month"
          />
          <StatCard
            title="Active Volunteers"
            value={summary?.activeVolunteers?.toLocaleString() ?? "0"}
            icon={Activity}
            change="+124 recruited"
          />
          <StatCard
            title="Campaign Readiness"
            value={`${summary?.campaignReadiness ?? 0}%`}
            icon={Target}
            change="Excellent"
          />
          <StatCard
            title="Messages Delivered"
            value={summary?.messagesSent?.toLocaleString() ?? "0"}
            icon={MessageSquare}
            change="SMS • WhatsApp • Email"
          />
          <StatCard
            title="Field Visits"
            value={summary?.doorsKnocked?.toLocaleString() ?? "0"}
            icon={Map}
            change="Door to door"
          />
          <StatCard
            title="Wards Covered"
            value={summary?.wardsCovered?.toLocaleString() ?? "0"}
            icon={Landmark}
            change="County coverage"
          />
          <StatCard
            title="Open Issues"
            value={summary?.openThreats?.toLocaleString() ?? "0"}
            icon={Flag}
            change="AI monitoring"
            positive={false}
          />
          <StatCard
            title="Upcoming Events"
            value={summary?.upcomingEvents?.toLocaleString() ?? "0"}
            icon={Calendar}
            change="Campaign schedule"
          />
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-5">
        <div className="overflow-hidden rounded-xl border bg-card xl:col-span-2">
          <div className="border-b bg-primary/10 px-6 py-5">
            <div className="flex items-center gap-3">
              <User className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-lg font-bold">Prof. Philip Kaloki</h2>
                <p className="text-sm text-muted-foreground">
                  Governor Candidate • United Democratic Alliance
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-col items-center">
              <div className="flex h-40 w-40 items-center justify-center rounded-full border-4 border-primary bg-secondary">
                <User className="h-20 w-20 text-primary" />
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Official campaign portrait will be added later
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div><p className="text-xs text-muted-foreground">Party</p><h3 className="font-semibold">UDA</h3></div>
              <div><p className="text-xs text-muted-foreground">Slogan</p><h3 className="font-semibold">Komboa 2027</h3></div>
              <div><p className="text-xs text-muted-foreground">County</p><h3 className="font-semibold">Makueni</h3></div>
              <div><p className="text-xs text-muted-foreground">Target</p><h3 className="font-semibold">Governor 2027</h3></div>
            </div>

            <div className="mt-8">
              <InsightCard
                title="AI Strategic Brief"
                text="Campaign momentum is steadily increasing. Continue strengthening grassroots mobilisation, youth engagement, women empowerment initiatives and ward-based leadership structures while maintaining a strong digital campaign presence."
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card xl:col-span-3">
          <div className="flex items-center gap-3 border-b px-6 py-5">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-bold">Makueni County Intelligence</h2>
              <p className="text-sm text-muted-foreground">County demographic overview</p>
            </div>
          </div>

          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {[
                ["Population", "1,050,000+"],
                ["Registered Voters", "620,000+"],
                ["Sub-counties", "6"],
                ["Wards", "30"],
                ["Polling Stations", "1,200+"],
                ["Youth", "420,000+"],
                ["Women", "530,000+"],
                ["PWD", "32,000+"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-secondary/40 p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <h3 className="mt-2 text-xl font-bold text-primary">{value}</h3>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <h3 className="mb-4 font-semibold">Priority Development Agenda</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  "Water & Irrigation",
                  "Healthcare",
                  "Agriculture",
                  "Road Infrastructure",
                  "Youth Employment",
                  "Women's Economic Empowerment",
                  "Education",
                  "Digital Economy",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-lg border p-3">
                    <Target className="h-4 w-4 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <InsightCard
                title="County Assessment"
                text="Current intelligence indicates that strengthening grassroots mobilisation, expanding volunteer recruitment, improving digital engagement and maintaining consistent ward-level visibility will improve campaign competitiveness across all six sub-counties."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="overflow-hidden rounded-xl border bg-card xl:col-span-2">
          <div className="flex items-center justify-between gap-4 border-b px-6 py-5">
            <div className="flex items-center gap-3">
              <BrainCircuit className="h-6 w-6 text-primary" />
              <div>
                <h2 className="font-bold">AI Campaign War Room</h2>
                <p className="text-sm text-muted-foreground">Live strategic campaign briefing</p>
              </div>
            </div>
            <StatusChip text="AI ACTIVE" className="bg-green-500/10 text-green-600" />
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2">
            <InsightCard title="Grassroots Mobilisation" text="Intensify volunteer recruitment and ward-level engagement across all six sub-counties, prioritising areas with limited recent field activity." />
            <InsightCard title="Youth Engagement" text="Emphasise employment, digital opportunities, enterprise financing, sports, education and participation in county decision-making." />
            <InsightCard title="Women Mobilisation" text="Expand women-led campaign networks and communicate practical policies around markets, healthcare, agriculture, enterprise support and household prosperity." />
            <InsightCard title="Digital Strategy" text="Increase consistent social media engagement, respond quickly to emerging narratives and align digital messaging with ward-level activities." />
          </div>
        </div>

        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-3 border-b px-6 py-5">
            <Vote className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-bold">Election Readiness</h2>
              <p className="text-sm text-muted-foreground">Operational preparation</p>
            </div>
          </div>

          <div className="space-y-5 p-6">
            {[
              ["Campaign Structure", 92],
              ["Ward Coordinators", 84],
              ["Volunteer Network", 78],
              ["Polling Agents", 61],
              ["Voter Mobilisation", 73],
            ].map(([label, rawValue]) => {
              const value = Number(rawValue);
              return (
                <div key={String(label)}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold">{value}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
                  </div>
                </div>
              );
            })}

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Overall Readiness</span>
                <span className="text-2xl font-black text-primary">
                  {summary?.campaignReadiness ?? 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between gap-3 border-b px-6 py-5">
            <div className="flex items-center gap-3">
              <Radio className="h-6 w-6 text-primary" />
              <div>
                <h2 className="font-bold">Social Listening</h2>
                <p className="text-sm text-muted-foreground">Public sentiment overview</p>
              </div>
            </div>
            <StatusChip text="MONITORING" className="bg-blue-500/10 text-blue-600" />
          </div>

          <div className="p-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-green-500/10 p-4 text-center"><p className="text-2xl font-black text-green-600">68%</p><p className="mt-1 text-xs text-muted-foreground">Positive</p></div>
              <div className="rounded-lg bg-yellow-500/10 p-4 text-center"><p className="text-2xl font-black text-yellow-600">21%</p><p className="mt-1 text-xs text-muted-foreground">Neutral</p></div>
              <div className="rounded-lg bg-red-500/10 p-4 text-center"><p className="text-2xl font-black text-red-600">11%</p><p className="mt-1 text-xs text-muted-foreground">Negative</p></div>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Trending Topics</p>
              <div className="flex flex-wrap gap-2">
                {["Water", "Agriculture", "Youth Jobs", "Healthcare", "Roads", "Women Enterprise"].map((topic) => (
                  <span key={topic} className="rounded-full border px-3 py-1 text-xs">
                    #{topic.replaceAll(" ", "")}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-secondary/40 p-4">
              <p className="text-xs font-semibold text-primary">AI RECOMMENDATION</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Publish a coordinated message focused on water, agriculture and youth employment, supported by local ward-level testimonials.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-3 border-b px-6 py-5">
            <HeartHandshake className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-bold">Volunteer Deployment</h2>
              <p className="text-sm text-muted-foreground">Sub-county mobilisation</p>
            </div>
          </div>

          <div className="space-y-4 p-6">
            {[
              ["Makueni", 186, 88],
              ["Kaiti", 142, 76],
              ["Kibwezi East", 164, 81],
              ["Kibwezi West", 137, 69],
              ["Kilome", 121, 73],
              ["Mbooni", 173, 84],
            ].map(([area, rawVolunteers, rawReadiness]) => {
              const volunteers = Number(rawVolunteers);
              const readiness = Number(rawReadiness);
              return (
                <div key={String(area)} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{area}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{volunteers} active volunteers</p>
                    </div>
                    <span className="font-bold text-primary">{readiness}%</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${readiness}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-3 border-b px-6 py-5">
            <Calendar className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-bold">Campaign Calendar</h2>
              <p className="text-sm text-muted-foreground">Upcoming engagements</p>
            </div>
          </div>

          <div className="space-y-4 p-6">
            {[
              { date: "12 AUG", title: "Ward Coordinators Meeting", location: "Wote Town", type: "Strategy" },
              { date: "15 AUG", title: "Youth Economic Forum", location: "Kibwezi", type: "Youth" },
              { date: "18 AUG", title: "Women Leaders Conference", location: "Mbooni", type: "Women" },
              { date: "21 AUG", title: "Agriculture Stakeholders Forum", location: "Kaiti", type: "Policy" },
            ].map((event) => (
              <div key={`${event.date}-${event.title}`} className="flex gap-4 rounded-lg border p-4">
                <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Calendar className="mb-1 h-4 w-4" />
                  <span className="text-[10px] font-bold">{event.date}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{event.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{event.location}</p>
                  <span className="mt-2 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px]">{event.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card">
        <div className="flex items-center gap-3 border-b px-6 py-5">
          <Zap className="h-6 w-6 text-primary" />
          <div>
            <h2 className="font-bold">Quick Campaign Actions</h2>
            <p className="text-sm text-muted-foreground">Frequently used command-centre tools</p>
          </div>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction icon={Calendar} title="Create Event" description="Schedule a campaign event" />
          <QuickAction icon={MessageSquare} title="Broadcast Message" description="Send SMS or WhatsApp updates" />
          <QuickAction icon={BrainCircuit} title="Generate Speech" description="Create an AI-assisted campaign speech" />
          <QuickAction icon={Users} title="Deploy Volunteers" description="Assign teams to wards" />
          <QuickAction icon={Map} title="Field Operation" description="Create a door-to-door assignment" />
          <QuickAction icon={Radio} title="Social Scan" description="Run a public sentiment scan" />
          <QuickAction icon={Bell} title="Incident Report" description="Record an urgent field incident" />
          <QuickAction icon={Wallet} title="Fundraising" description="Review campaign finance activity" />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="overflow-hidden rounded-xl border bg-card xl:col-span-2">
          <div className="flex items-center gap-3 border-b px-6 py-5">
            <Activity className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-bold">Campaign Activity Feed</h2>
              <p className="text-sm text-muted-foreground">Latest actions across the command centre</p>
            </div>
          </div>

          {activityLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-lg bg-secondary/40" />
              ))}
            </div>
          ) : activity.length > 0 ? (
            <div className="divide-y">
              {activity.slice(0, 8).map((item, index) => (
                <div key={item.id ?? index} className="flex items-start gap-4 px-6 py-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase">
                        {item.module ?? "Campaign"}
                      </span>
                      {item.actor ? <span className="text-xs text-muted-foreground">by {item.actor}</span> : null}
                    </div>
                    <p className="mt-2 text-sm">{item.description ?? "Campaign activity recorded."}</p>
                  </div>
                  <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:block">
                    {formatActivityDate(item.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <Clock className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-semibold">No campaign activity recorded</p>
              <p className="mt-1 text-sm text-muted-foreground">Recent actions will appear here.</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card">
          <div className="flex items-center gap-3 border-b px-6 py-5">
            <ShieldAlert className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-bold">System Status</h2>
              <p className="text-sm text-muted-foreground">Platform service health</p>
            </div>
          </div>

          <div className="space-y-4 p-6">
            {[
              ["Voter Registry", "Operational"],
              ["Messaging Gateway", "Operational"],
              ["Field Operations", "Operational"],
              ["Social Listening", "Monitoring"],
              ["AI Strategist", "Operational"],
              ["Election Operations", "Operational"],
            ].map(([name, status]) => (
              <div key={name} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <span className="text-sm">{name}</span>
                <span className={`text-xs font-semibold ${status === "Operational" ? "text-green-600" : "text-yellow-600"}`}>
                  ● {status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}