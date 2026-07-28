import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { AiAssistPanel } from "@/components/ai-assist-panel";
import { useAuth } from "@/lib/auth";

import {
  Activity,
  Award,
  Banknote,
  BarChart2,
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
  Search,
  Settings,
  ShieldAlert,
  Star,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Vote,
  X,
  Zap,
} from "lucide-react";

import brandIcon from "@assets/brand-icon.png";

type NavigationItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavigationGroup = {
  title: string;
  items: NavigationItem[];
};

const navGroups: NavigationGroup[] = [
  {
    title: "Command Centre",
    items: [
      {
        href: "/dashboard",
        label: "Executive Overview",
        icon: LayoutDashboard,
      },
      {
        href: "/strategist",
        label: "AI Chief Strategist",
        icon: BrainCircuit,
      },
      {
        href: "/analytics",
        label: "Analytics Hub",
        icon: BarChart2,
      },
      {
        href: "/campaign-plan",
        label: "Campaign Plan",
        icon: Target,
      },
    ],
  },
  {
    title: "Voter Intelligence",
    items: [
      {
        href: "/members",
        label: "Voters",
        icon: Users,
      },
      {
        href: "/voters-db",
        label: "Constituent Database",
        icon: Database,
      },
      {
        href: "/segments",
        label: "Voter Segmentation",
        icon: PieChart,
      },
    ],
  },
  {
    title: "Communication",
    items: [
      {
        href: "/messaging",
        label: "Messaging Centre",
        icon: MessageSquare,
      },
      {
        href: "/speeches",
        label: "Speeches & Manifesto",
        icon: Mic,
      },
      {
        href: "/events",
        label: "Events & Logistics",
        icon: Calendar,
      },
      {
        href: "/kol",
        label: "Influencer Network",
        icon: Star,
      },
    ],
  },
  {
    title: "Field Operations",
    items: [
      {
        href: "/field-ops",
        label: "Field Operations",
        icon: Map,
      },
      {
        href: "/volunteers",
        label: "Volunteer Command",
        icon: UserPlus,
      },
    ],
  },
  {
    title: "Intelligence",
    items: [
      {
        href: "/surveys",
        label: "Surveys & Research",
        icon: FileText,
      },
      {
        href: "/intelligence",
        label: "Political Intelligence",
        icon: ShieldAlert,
      },
      {
        href: "/social-listening",
        label: "Social Listening",
        icon: Radio,
      },
      {
        href: "/swot",
        label: "SWOT Analysis",
        icon: Crosshair,
      },
    ],
  },
  {
    title: "Election Operations",
    items: [
      {
        href: "/election-day",
        label: "Election Day Centre",
        icon: Vote,
      },
      {
        href: "/turnout",
        label: "Turnout Forecast",
        icon: TrendingUp,
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        href: "/fundraising",
        label: "Finance Operations",
        icon: Banknote,
      },
      {
        href: "/credentials",
        label: "Credentials Hub",
        icon: Award,
      },
      {
        href: "/admin",
        label: "System Administration",
        icon: Settings,
      },
    ],
  },
];

/**
 * Maps navigation routes to backend permission keys.
 * These values are intentionally preserved from V1.
 */
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

  "/fundraising": "finance",

  "/election-day": "election-day",
  "/turnout": "election-day",

  "/credentials": "credentials",
  "/admin": "admin",
};

/**
 * Maps the active page to the AI assistant module.
 * These values are also preserved from V1.
 */
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

  "/fundraising": "fundraising",

  "/election-day": "election-day",
  "/turnout": "turnout",

  "/credentials": "credentials",
  "/admin": "admin",
};

function getPageTitle(location: string): string {
  for (const group of navGroups) {
    const item = group.items.find(
      (navigationItem) => navigationItem.href === location,
    );

    if (item) {
      return item.label;
    }
  }

  return "Campaign Command Centre";
}

function SidebarContent({
  location,
  visibleGroups,
  user,
  onNavigate,
  onLogout,
}: {
  location: string;
  visibleGroups: NavigationGroup[];
  user: ReturnType<typeof useAuth>["user"];
  onNavigate: () => void;
  onLogout: () => Promise<void>;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Platform brand */}
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 shadow-lg shadow-cyan-950/30">
            <img
              src={brandIcon}
              alt="Campaign Command Centre"
              className="h-7 w-7 object-contain"
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold tracking-[0.12em] text-white">
              CAMPAIGN
            </p>

            <p className="truncate text-[11px] font-semibold tracking-[0.16em] text-cyan-300">
              COMMAND CENTRE
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-emerald-400/10 bg-emerald-400/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

            <span className="font-mono text-[9px] tracking-[0.18em] text-emerald-300">
              SYSTEM ONLINE
            </span>
          </div>

          <Zap className="h-3.5 w-3.5 text-emerald-300" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {visibleGroups.map((group) => (
            <section key={group.title}>
              <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {group.title}
              </p>

              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location === item.href;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                          isActive
                            ? "border border-cyan-400/20 bg-cyan-400/10 text-cyan-200 shadow-sm shadow-cyan-950/40"
                            : "border border-transparent text-slate-400 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <item.icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              isActive
                                ? "text-cyan-300"
                                : "text-slate-500 group-hover:text-slate-300",
                            )}
                          />

                          <span className="truncate text-[12px] font-medium">
                            {item.label}
                          </span>
                        </span>

                        {isActive && (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </nav>

      {/* Signed-in user */}
      <div className="border-t border-white/10 p-3">
        {user && (
          <div className="mb-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 text-xs font-bold text-cyan-200">
                {user.name?.slice(0, 1)?.toUpperCase() || "U"}
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">
                  {user.name}
                </p>

                <p className="truncate text-[9px] uppercase tracking-[0.16em] text-cyan-300">
                  {user.role}
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  const { user, can, logout } = useAuth();

  const currentModule = PATH_MODULE[location] ?? "dashboard";
  const currentPageTitle = getPageTitle(location);

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const permissionModule = NAV_PERM[item.href];

        return permissionModule ? can(permissionModule) : true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  useEffect(() => {
    setMobileNavigationOpen(false);
  }, [location]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setLocation("/login");
    }
  };

  const currentTime = new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-[#07101d] text-slate-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/10 bg-[#091321] lg:block">
        <SidebarContent
          location={location}
          visibleGroups={visibleGroups}
          user={user}
          onNavigate={() => undefined}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile overlay */}
      {mobileNavigationOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNavigationOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[86%] max-w-72 border-r border-white/10 bg-[#091321] transition-transform duration-300 lg:hidden",
          mobileNavigationOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileNavigationOpen(false)}
          className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <SidebarContent
          location={location}
          visibleGroups={visibleGroups}
          user={user}
          onNavigate={() => setMobileNavigationOpen(false)}
          onLogout={handleLogout}
        />
      </aside>

      {/* Main workspace */}
      <div className="min-h-screen lg:pl-72">
        {/* Top navigation */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07101d]/90 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setMobileNavigationOpen(true)}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <p className="truncate text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  Campaign Operations
                </p>

                <h1 className="truncate text-sm font-semibold text-white sm:text-base">
                  {currentPageTitle}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 xl:flex">
                <Search className="h-4 w-4 text-slate-500" />

                <span className="text-[11px] text-slate-500">
                  Search command centre
                </span>
              </div>

              <div className="hidden items-center gap-2 rounded-lg border border-emerald-400/10 bg-emerald-400/5 px-3 py-2 sm:flex">
                <Activity className="h-3.5 w-3.5 text-emerald-300" />

                <span className="text-[10px] font-medium tracking-wide text-emerald-300">
                  LIVE
                </span>
              </div>

              <div className="hidden text-right md:block">
                <p className="text-[10px] text-slate-500">Local time</p>
                <p className="text-[11px] font-medium text-slate-300">
                  {currentTime}
                </p>
              </div>
            </div>
          </div>

          {/* Active campaign strip */}
          <div className="border-t border-white/5 bg-gradient-to-r from-cyan-400/[0.07] via-blue-500/[0.04] to-transparent px-4 py-2 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />

                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200 sm:text-[11px]">
                  Active Campaign: Prof. Philip Kaloki · Makueni Governor 2027
                </p>
              </div>

              <p className="hidden text-[9px] uppercase tracking-[0.18em] text-slate-500 sm:block">
                Development · Integrity · Prosperity
              </p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-104px)]">
          <div className="mx-auto w-full max-w-[1800px] p-4 sm:p-6 lg:p-7">
            {children}
          </div>
        </main>
      </div>

      {/* Existing AI assistant */}
      <AiAssistPanel module={currentModule} />
    </div>
  );
}