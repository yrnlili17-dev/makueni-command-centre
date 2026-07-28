import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { AiAssistPanel } from "@/components/ai-assist-panel";
import { useAuth } from "@/lib/auth";
import {
  Award,
  Banknote,
  BarChart2,
  Bell,
  BrainCircuit,
  Calendar,
  ChevronRight,
  Crosshair,
  Database,
  FileText,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  MessageSquare,
  Mic,
  PieChart,
  Radio,
  Settings,
  ShieldAlert,
  Star,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Vote,
  X,
} from "lucide-react";
import brandIcon from "@assets/brand-icon.png";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Command Centre",
    items: [
      { href: "/dashboard", label: "Command Overview", icon: LayoutDashboard },
      { href: "/strategist", label: "AI Chief Strategist", icon: BrainCircuit },
      { href: "/analytics", label: "Analytics Hub", icon: BarChart2 },
      { href: "/campaign-plan", label: "Campaign Countdown", icon: Target },
    ],
  },
  {
    title: "Voter Intelligence",
    items: [
      { href: "/members", label: "Voters", icon: Users },
      { href: "/voters-db", label: "Constituent Database", icon: Database },
      { href: "/segments", label: "Segmentation", icon: PieChart },
    ],
  },
  {
    title: "Outreach & Messaging",
    items: [
      { href: "/messaging", label: "Messaging", icon: MessageSquare },
      { href: "/speeches", label: "Speech & Manifesto", icon: Mic },
      { href: "/events", label: "Event Logistics", icon: Calendar },
      { href: "/kol", label: "KOL Influence", icon: Star },
    ],
  },
  {
    title: "Field Operations",
    items: [
      { href: "/field-ops", label: "Field Operations", icon: Map },
      { href: "/volunteers", label: "Volunteer Command", icon: UserPlus },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { href: "/surveys", label: "Intelligence Gathering", icon: FileText },
      { href: "/intelligence", label: "Narrative Command", icon: ShieldAlert },
      { href: "/social-listening", label: "Social Listening", icon: Radio },
      { href: "/swot", label: "SWOT Analysis", icon: Crosshair },
    ],
  },
  {
    title: "Election Day",
    items: [
      { href: "/election-day", label: "Election Day Ops", icon: Vote },
      { href: "/turnout", label: "Turnout Forecast", icon: TrendingUp },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/fundraising", label: "Finance Operations", icon: Banknote },
      { href: "/credentials", label: "Credentials Hub", icon: Award },
      { href: "/admin", label: "System Administration", icon: Settings },
    ],
  },
];

const NAV_PERM: Record<string, string> = {
  "/dashboard": "dashboard",
  "/strategist": "dashboard",
  "/analytics": "dashboard",
  "/campaign-plan": "campaign-plan",
  "/members": "voters",
  "/voters-db": "constituents",
  "/segments": "segmentation",
  "/messaging": "messaging",
  "/speeches": "messaging",
  "/events": "events",
  "/kol": "kol",
  "/field-ops": "field-ops",
  "/volunteers": "volunteers",
  "/surveys": "intelligence",
  "/intelligence": "narrative",
  "/social-listening": "intelligence",
  "/swot": "intelligence",
  "/election-day": "election-day",
  "/turnout": "election-day",
  "/fundraising": "finance",
  "/credentials": "credentials",
  "/admin": "admin",
};

const PATH_MODULE: Record<string, string> = {
  "/dashboard": "dashboard",
  "/strategist": "dashboard",
  "/analytics": "analytics",
  "/campaign-plan": "campaign-plan",
  "/members": "members",
  "/voters-db": "voters-db",
  "/segments": "segments",
  "/messaging": "messaging",
  "/speeches": "speeches",
  "/events": "events",
  "/kol": "kol",
  "/field-ops": "field-ops",
  "/volunteers": "volunteers",
  "/surveys": "surveys",
  "/intelligence": "intelligence",
  "/social-listening": "social-listening",
  "/swot": "swot",
  "/election-day": "election-day",
  "/turnout": "turnout",
  "/fundraising": "fundraising",
  "/credentials": "credentials",
  "/admin": "admin",
};

function getPageTitle(path: string) {
  for (const group of navGroups) {
    const item = group.items.find((entry) => entry.href === path);
    if (item) return item.label;
  }

  return "Makueni Command Centre";
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, can, logout } = useAuth();

  const currentModule = PATH_MODULE[location] ?? "dashboard";
  const pageTitle = getPageTitle(location);

  const visibleGroups = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => {
            const permission = NAV_PERM[item.href];
            return permission ? can(permission) : true;
          }),
        }))
        .filter((group) => group.items.length > 0),
    [can],
  );

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  const SidebarContent = () => (
    <>
      <div className="border-b px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-background">
            <img
              src={brandIcon}
              alt="Makueni Command Centre"
              className="h-8 w-8 object-contain"
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-wide">
              MAKUENI COMMAND CENTRE
            </p>
            <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Komboa 2027 UDA
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg border bg-secondary/40 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs font-medium">Campaign system active</span>
          </div>
          <span className="text-[10px] font-bold text-green-600">LIVE</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {visibleGroups.map((group) => (
            <section key={group.title}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {group.title}
              </p>

              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location === item.href;
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5 transition",
                            isActive
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-60",
                          )}
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </nav>

      <div className="border-t p-3">
        {user && (
          <div className="mb-2 rounded-xl border bg-secondary/40 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">
                {(user.name || "U").charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-[10px] font-bold uppercase tracking-wider text-primary">
                  {user.role}
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-red-500/10 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-card transition-transform duration-200 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="absolute right-3 top-3 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <SidebarContent />
      </aside>

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg border p-2 text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <p className="truncate text-sm font-bold sm:text-base">
                  {pageTitle}
                </p>
                <p className="hidden truncate text-xs text-muted-foreground sm:block">
                  Prof. Philip Kaloki · Governor Candidate · Makueni County
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border bg-card px-3 py-1.5 md:flex">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-xs font-semibold">Campaign active</span>
              </div>

              <button
                type="button"
                aria-label="Notifications"
                className="relative rounded-lg border p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
              </button>

              <div className="hidden rounded-lg bg-primary/10 px-3 py-2 text-xs font-bold text-primary sm:block">
                KOMBOA 2027 UDA
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)]">
          <div className="mx-auto w-full max-w-[1800px] p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      <AiAssistPanel module={currentModule} />
    </div>
  );
}