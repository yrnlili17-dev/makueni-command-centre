import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { AiAssistPanel } from "@/components/ai-assist-panel";
import { useAuth } from "@/lib/auth";
import { 
  Activity, Users, PieChart, MessageSquare, 
  Map, UserPlus, FileText, Calendar, 
  ShieldAlert, Target, Star, Shield, LayoutDashboard, LogOut, Banknote, Vote, Database, Award, Settings, BarChart2, Crosshair, Radio, TrendingUp, Mic, BrainCircuit
} from "lucide-react";
import brandIcon from "@assets/brand-icon.png";

const navGroups = [
  {
    title: "COMMAND",
    items: [
      { href: "/dashboard", label: "COMMAND OVERVIEW", icon: LayoutDashboard },
      { href: "/strategist", label: "AI CHIEF STRATEGIST", icon: BrainCircuit },
      { href: "/analytics", label: "ANALYTICS HUB", icon: BarChart2 },
      { href: "/campaign-plan", label: "CAMPAIGN COUNTDOWN", icon: Target },
    ],
  },
  {
    title: "VOTER DATA",
    items: [
      { href: "/members", label: "VOTERS", icon: Users },
      { href: "/voters-db", label: "CONSTITUENT DATABASE", icon: Database },
      { href: "/segments", label: "SEGMENTATION", icon: PieChart },
    ],
  },
  {
    title: "OUTREACH & MESSAGING",
    items: [
      { href: "/messaging", label: "MESSAGING", icon: MessageSquare },
      { href: "/speeches", label: "SPEECH & MANIFESTO", icon: Mic },
      { href: "/events", label: "EVENT LOGISTICS", icon: Calendar },
      { href: "/kol", label: "KOL INFLUENCE", icon: Star },
    ],
  },
  {
    title: "FIELD OPERATIONS",
    items: [
      { href: "/field-ops", label: "FIELD OPERATIONS", icon: Map },
      { href: "/volunteers", label: "VOLUNTEER COMMAND", icon: UserPlus },
    ],
  },
  {
    title: "INTELLIGENCE",
    items: [
      { href: "/surveys", label: "INTELLIGENCE GATHERING", icon: FileText },
      { href: "/intelligence", label: "NARRATIVE COMMAND", icon: ShieldAlert },
      { href: "/social-listening", label: "SOCIAL LISTENING", icon: Radio },
      { href: "/swot", label: "SWOT ANALYSIS", icon: Crosshair },
    ],
  },
  {
    title: "ELECTION DAY",
    items: [
      { href: "/election-day", label: "ELECTION DAY OPS", icon: Vote },
      { href: "/turnout", label: "TURNOUT FORECAST", icon: TrendingUp },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      { href: "/fundraising", label: "FINANCE OPS", icon: Banknote },
      { href: "/credentials", label: "CREDENTIALS HUB", icon: Award },
      { href: "/admin", label: "SYSTEM ADMIN", icon: Settings },
    ],
  },
];

// Maps a nav href to its backend permission module key (see admin MODULES list).
const NAV_PERM: Record<string, string> = {
  "/dashboard": "dashboard",
  "/strategist": "dashboard",
  "/members": "voters",
  "/voters-db": "constituents",
  "/segments": "segmentation",
  "/messaging": "messaging",
  "/field-ops": "field-ops",
  "/volunteers": "volunteers",
  "/surveys": "intelligence",
  "/events": "events",
  "/intelligence": "narrative",
  "/social-listening": "intelligence",
  "/swot": "intelligence",
  "/campaign-plan": "campaign-plan",
  "/kol": "kol",
  "/speeches": "messaging",
  "/fundraising": "finance",
  "/election-day": "election-day",
  "/turnout": "election-day",
  "/credentials": "credentials",
  "/analytics": "dashboard",
  "/admin": "admin",
};

const PATH_MODULE: Record<string, string> = {
  "/dashboard": "dashboard",
  "/strategist": "dashboard",
  "/members": "members",
  "/voters-db": "voters-db",
  "/segments": "segments",
  "/messaging": "messaging",
  "/field-ops": "field-ops",
  "/volunteers": "volunteers",
  "/surveys": "surveys",
  "/events": "events",
  "/intelligence": "intelligence",
  "/social-listening": "social-listening",
  "/swot": "swot",
  "/campaign-plan": "campaign-plan",
  "/kol": "kol",
  "/speeches": "speeches",
  "/fundraising": "fundraising",
  "/election-day": "election-day",
  "/turnout": "turnout",
  "/credentials": "credentials",
  "/analytics": "analytics",
  "/admin": "admin",
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, can, logout } = useAuth();
  const currentModule = PATH_MODULE[location] ?? "dashboard";

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const mod = NAV_PERM[item.href];
        return mod ? can(mod) : true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-border">
          <img src={brandIcon} alt="CommandCentre OS" className="w-8 h-8 object-contain" />
          <div className="flex flex-col">
            <span className="font-bold tracking-widest text-sm">CAMPAIGN COMMAND CENTRE</span>
            <span className="text-[10px] text-primary font-mono tracking-widest">[ SYSTEM_ACTIVE ]</span>
          </div>
        </div>
        
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="space-y-5 px-2">
            {visibleGroups.map((group) => (
              <div key={group.title}>
                <div className="mb-1.5 flex items-center gap-2 bg-secondary/60 border-l-2 border-primary px-3 py-1.5">
                  <span className="text-primary font-mono text-[10px] font-bold">▸</span>
                  <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-foreground uppercase">
                    {group.title}
                  </span>
                </div>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = location === item.href;
                    return (
                      <li key={item.href}>
                        <Link href={item.href} className={cn(
                          "flex items-center gap-3 px-3 py-2 text-xs font-mono tracking-wider transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground border-l-2 border-primary-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground border-l-2 border-transparent"
                        )}>
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-border mt-auto space-y-2">
          {user && (
            <div className="px-3 py-2 bg-secondary/50 border border-border">
              <p className="font-mono text-[11px] text-foreground truncate">{user.name}</p>
              <p className="font-mono text-[9px] text-primary tracking-widest uppercase truncate">{user.role}</p>
            </div>
          )}
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-xs font-mono tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground">
            <LogOut className="w-4 h-4" />
            TERMINATE SESSION
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-14 border-b border-border flex items-center px-6 justify-between shrink-0 bg-card/50">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-xs text-muted-foreground tracking-widest">PROF. PHILIP KALOKI · MAKUENI GOVERNOR 2027 · DEVELOPMENT · INTEGRITY · PROSPERITY</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[10px] text-muted-foreground">TIME: {new Date().toISOString()}</span>
            <div className="px-2 py-1 bg-primary/10 text-primary font-mono text-[10px] border border-primary/30">
              KOMBOA KENYA
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
      <AiAssistPanel module={currentModule} />
    </div>
  );
}
