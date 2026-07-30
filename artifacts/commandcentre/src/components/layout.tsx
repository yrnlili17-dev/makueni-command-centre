import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { AiAssistPanel } from "@/components/ai-assist-panel";
import { useAuth } from "@/lib/auth";
import {
  Activity, Users, PieChart, MessageSquare, Command, ClipboardList, Megaphone, FileBarChart,
  Map, UserPlus, FileText, Calendar, ShieldAlert, Target, Star, LayoutDashboard, LogOut,
  Banknote, Vote, Database, Award, Settings, BarChart2, Crosshair, Radio, TrendingUp, Mic,
  BrainCircuit, FolderLock, Menu, X, Home, Bell, MoreHorizontal
} from "lucide-react";
import brandIcon from "@assets/brand-icon.png";

const navGroups = [
  { title: "COMMAND", items: [
    { href: "/dashboard", label: "COMMAND OVERVIEW", icon: LayoutDashboard },
    { href: "/executive-command", label: "EXECUTIVE COMMAND", icon: Command },
    { href: "/reports-hub", label: "EXECUTIVE REPORTS", icon: FileBarChart },
    { href: "/smart-assist", label: "SMART ASSIST", icon: BrainCircuit },
      { href: "/strategist", label: "CHIEF STRATEGIST", icon: BrainCircuit },
    { href: "/analytics", label: "ANALYTICS HUB", icon: BarChart2 },
    { href: "/campaign-plan", label: "CAMPAIGN COUNTDOWN", icon: Target },
  ]},
  { title: "VOTER DATA", items: [
    { href: "/members", label: "VOTERS", icon: Users },
    { href: "/voters-db", label: "CONSTITUENT DATABASE", icon: Database },
      { href: "/data-centre", label: "DATA MANAGEMENT CENTRE", icon: Database },
    { href: "/segments", label: "SEGMENTATION", icon: PieChart },
  ]},
  { title: "OUTREACH & MESSAGING", items: [
    { href: "/messaging", label: "MESSAGING", icon: MessageSquare },
    { href: "/communications-hub", label: "COMMUNICATIONS HUB", icon: Megaphone },
    { href: "/speeches", label: "SPEECH & MANIFESTO", icon: Mic },
    { href: "/events", label: "EVENT LOGISTICS", icon: Calendar },
    { href: "/kol", label: "KOL INFLUENCE", icon: Star },
  ]},
  { title: "FIELD OPERATIONS", items: [
    { href: "/field-ops", label: "FIELD OPERATIONS", icon: Map },
    { href: "/operations-hub", label: "OPERATIONS HUB", icon: ClipboardList },
    { href: "/volunteers", label: "VOLUNTEER COMMAND", icon: UserPlus },
  ]},
  { title: "INTELLIGENCE", items: [
    { href: "/surveys", label: "INTELLIGENCE GATHERING", icon: FileText },
    { href: "/intelligence", label: "NARRATIVE COMMAND", icon: ShieldAlert },
    { href: "/social-listening", label: "SOCIAL LISTENING", icon: Radio },
      { href: "/gis-centre", label: "GIS & COVERAGE", icon: Map },
    { href: "/swot", label: "SWOT ANALYSIS", icon: Crosshair },
  ]},
  { title: "ELECTION DAY", items: [
    { href: "/election-day", label: "ELECTION DAY OPS", icon: Vote },
      { href: "/war-room", label: "ELECTION WAR ROOM", icon: Vote },
    { href: "/turnout", label: "TURNOUT FORECAST", icon: TrendingUp },
  ]},
  { title: "ADMINISTRATION", items: [
    { href: "/fundraising", label: "FINANCE OPS", icon: Banknote },
    { href: "/credentials", label: "CREDENTIALS HUB", icon: Award },
    { href: "/governance", label: "APPROVALS & DOCUMENTS", icon: FolderLock },
    { href: "/admin", label: "SYSTEM ADMIN", icon: Settings },
      { href: "/production-centre", label: "PRODUCTION CENTRE", icon: Settings },
  ]},
];

const NAV_PERM: Record<string, string> = {
  "/executive-command": "dashboard", "/operations-hub": "field-ops", "/communications-hub": "messaging",
  "/reports-hub": "analytics", "/dashboard": "dashboard", "/strategist": "analytics",
  "/smart-assist": "social-listening",
  "/data-centre": "constituents",
  "/gis-centre": "analytics", "/members": "voters",
  "/voters-db": "constituents", "/segments": "segmentation", "/messaging": "messaging", "/field-ops": "field-ops",
  "/volunteers": "volunteers", "/surveys": "intelligence", "/events": "events", "/intelligence": "narrative",
  "/social-listening": "social-listening", "/swot": "intelligence", "/campaign-plan": "campaign-plan", "/kol": "kol",
  "/speeches": "speeches", "/fundraising": "finance", "/election-day": "election-day",
  "/election-war-room": "election-day",
  "/war-room": "election-day", "/turnout": "election-day",
  "/credentials": "credentials", "/analytics": "analytics", "/governance": "approvals", "/admin": "admin",
  "/production-readiness": "admin",
  "/production-centre": "admin",
};

const PATH_MODULE: Record<string, string> = {
  "/executive-command": "executive-command", "/operations-hub": "operations-hub", "/communications-hub": "communications-hub",
  "/reports-hub": "reports-hub", "/dashboard": "dashboard", "/strategist": "analytics", "/members": "members",
  "/voters-db": "voters-db", "/segments": "segments", "/messaging": "messaging", "/field-ops": "field-ops",
  "/volunteers": "volunteers", "/surveys": "surveys", "/events": "events", "/intelligence": "intelligence",
  "/social-listening": "social-listening", "/swot": "swot", "/campaign-plan": "campaign-plan", "/kol": "kol",
  "/speeches": "speeches", "/fundraising": "fundraising", "/election-day": "election-day",
  "/war-room": "war-room", "/turnout": "turnout",
  "/credentials": "credentials", "/analytics": "analytics", "/governance": "governance", "/admin": "admin",
  "/production-centre": "production-centre",
};

const mobileNav = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/operations-hub", label: "Operations", icon: ClipboardList },
  { href: "/messaging", label: "Messages", icon: MessageSquare },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, can, logout } = useAuth();
  const currentModule = PATH_MODULE[location] ?? "dashboard";

  useEffect(() => setMenuOpen(false), [location]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const visibleGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => NAV_PERM[item.href] ? can(NAV_PERM[item.href]) : true),
  })).filter(group => group.items.length > 0);

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  const sidebar = (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-[70] flex w-[min(88vw,19rem)] flex-col border-r border-border bg-card shadow-2xl transition-transform duration-200 lg:static lg:z-auto lg:w-64 lg:shrink-0 lg:translate-x-0 lg:shadow-none",
      menuOpen ? "translate-x-0" : "-translate-x-full"
    )} aria-label="Primary navigation">
      <div className="flex min-h-16 items-center gap-3 border-b border-border px-4 py-3 lg:px-5">
        <img src={brandIcon} alt="Makueni Command Centre" className="h-9 w-9 shrink-0 object-contain" />
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-bold tracking-widest">MAKUENI COMMAND CENTRE</span>
          <span className="block font-mono text-[10px] tracking-widest text-primary">[ SYSTEM_ACTIVE ]</span>
        </div>
        <button className="touch-target grid place-items-center lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3">
        <div className="space-y-4 px-2">
          {visibleGroups.map(group => (
            <div key={group.title}>
              <div className="mb-1.5 flex items-center gap-2 border-l-2 border-primary bg-secondary/60 px-3 py-1.5">
                <span className="font-mono text-[10px] font-bold text-primary">▸</span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-foreground">{group.title}</span>
              </div>
              <ul className="space-y-1">
                {group.items.map(item => {
                  const active = location === item.href;
                  return (
                    <li key={item.href}>
                      <Link href={item.href} className={cn(
                        "flex min-h-11 items-center gap-3 border-l-2 px-3 py-2 font-mono text-xs tracking-wider transition-colors",
                        active ? "border-primary-foreground bg-primary text-primary-foreground" : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}>
                        <item.icon className="h-4 w-4 shrink-0" /><span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="mt-auto space-y-2 border-t border-border p-3">
        {user && <div className="border border-border bg-secondary/50 px-3 py-2">
          <p className="truncate font-mono text-[11px] text-foreground">{user.name}</p>
          <p className="truncate font-mono text-[9px] uppercase tracking-widest text-primary">{user.role}</p>
        </div>}
        <button onClick={handleLogout} className="flex min-h-11 w-full items-center gap-3 px-3 py-2 font-mono text-xs tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground">
          <LogOut className="h-4 w-4" /> TERMINATE SESSION
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-sans lg:flex">
      {menuOpen && <button className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close navigation overlay" />}
      {sidebar}

      <main className="flex min-h-[100dvh] min-w-0 flex-1 flex-col lg:h-screen lg:min-h-0 lg:overflow-hidden">
        <header className="sticky top-0 z-50 flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/95 px-3 py-2 backdrop-blur lg:static lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button className="touch-target grid shrink-0 place-items-center lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </button>
            <img src={brandIcon} alt="" className="h-8 w-8 shrink-0 object-contain lg:hidden" />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold tracking-wider lg:hidden">MAKUENI COMMAND CENTRE</p>
              <div className="hidden items-center gap-3 lg:flex">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="font-mono text-xs tracking-widest text-muted-foreground">MAKUENI COUNTY · CAMPAIGN COMMAND CENTRE · SECURE OPERATIONS</span>
              </div>
              <p className="truncate font-mono text-[9px] uppercase tracking-widest text-primary lg:hidden">{currentModule.replace(/-/g, " ")}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button className="touch-target grid place-items-center" aria-label="Notifications"><Bell className="h-4 w-4" /></button>
            <div className="hidden border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary sm:block">KOMBOA KENYA</div>
          </div>
        </header>

        <div className="responsive-content flex-1 overflow-x-hidden px-3 py-4 pb-28 sm:px-5 lg:overflow-y-auto lg:p-6 lg:pb-24">
          {children}
        </div>
      </main>

      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-border bg-card/95 px-1 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur lg:hidden" aria-label="Quick navigation">
        {mobileNav.map(item => {
          const active = location === item.href;
          return <Link key={item.href} href={item.href} className={cn("flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[10px]", active ? "text-primary" : "text-muted-foreground")}>
            <item.icon className="h-5 w-5" /><span>{item.label}</span>
          </Link>;
        })}
        <button onClick={() => setMenuOpen(true)} className="flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[10px] text-muted-foreground">
          <MoreHorizontal className="h-5 w-5" /><span>More</span>
        </button>
      </nav>

      <AiAssistPanel module={currentModule} />
    </div>
  );
}
