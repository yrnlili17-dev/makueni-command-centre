import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { AiAssistPanel } from "@/components/ai-assist-panel";
import { useAuth } from "@/lib/auth";
import { 
  Menu, X, Activity, Users, PieChart, MessageSquare, 
  Map, UserPlus, FileText, Calendar, 
  ShieldAlert, Target, Star, Shield, LayoutDashboard, LogOut, Banknote, Vote, Database, Award, Settings, BarChart2, Crosshair, Radio, TrendingUp, Mic, BrainCircuit,
  FileCheck2, CircleUserRound, Globe,
} from "lucide-react";
import { PoweredBy } from "@/components/powered-by";
import brandIcon from "@assets/brand-icon.png";

const navGroups = [
  { title: "Mission control", items: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/members", label: "Members", icon: Users },
    { href: "/voters-db", label: "Constituent Database", icon: Database },
    { href: "/segments", label: "Segments", icon: PieChart },
    { href: "/surveys", label: "Opinion Polls", icon: FileText },
    { href: "/messaging", label: "Messaging", icon: MessageSquare },
    { href: "/wa-templates", label: "WA Templates", icon: FileCheck2 },
    { href: "/field-ops", label: "Field Ops", icon: Map },
    { href: "/events", label: "Events", icon: Calendar },
    { href: "/volunteers", label: "Volunteers", icon: UserPlus },
  ] },
  { title: "Planning & reporting", items: [
    { href: "/campaign-plan", label: "Campaign Plan", icon: Target },
    { href: "/analytics", label: "Analytics", icon: BarChart2 },
    { href: "/fundraising", label: "Fundraising", icon: Banknote },
    { href: "/election-day", label: "Election Day", icon: Vote },
    { href: "/turnout", label: "Turnout", icon: TrendingUp },
  ] },
  { title: "Intelligence", items: [
    { href: "/strategist", label: "AI Assistant", icon: BrainCircuit },
    { href: "/intelligence", label: "Intelligence", icon: ShieldAlert },
    { href: "/narrative-response", label: "Narrative Response", icon: MessageSquare },
    { href: "/social-listening", label: "Social Listening", icon: Radio },
    { href: "/swot", label: "SWOT Analysis", icon: Crosshair },
    { href: "/kol", label: "KOL Network", icon: Star },
    { href: "/speeches", label: "Speeches & Manifesto", icon: Mic },
  ] },
  { title: "Administration", items: [
    { href: "/credentials", label: "Credentials", icon: Award },
    { href: "/admin", label: "Settings", icon: Settings },
  ] },
];

// Maps a nav href to its backend permission module key (see admin MODULES list).
const NAV_PERM: Record<string, string> = {
  "/dashboard": "dashboard",
  "/strategist": "dashboard",
  "/members": "voters",
  "/voters-db": "constituents",
  "/segments": "segmentation",
  "/messaging": "messaging",
  "/wa-templates": "messaging",
  "/field-ops": "field-ops",
  "/volunteers": "volunteers",
  "/surveys": "intelligence",
  "/events": "events",
  "/intelligence": "narrative",
  "/narrative-response": "narrative",
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
  "/intelligence": "narrative",
  "/narrative-response": "narrative-response",
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "unavailable">("checking");
  const pageTitle = navGroups.flatMap(group => group.items).find(item => item.href === location)?.label ?? "Makueni Command Centre";

  useEffect(() => {
    const controller = new AbortController();
    const check = async () => {
      try {
        const base = import.meta.env.BASE_URL.replace(/\/$/, "");
        const response = await fetch(`${base}/api/healthz`, { signal: controller.signal });
        if (!controller.signal.aborted) setServerStatus(response.ok ? "online" : "unavailable");
      } catch {
        if (!controller.signal.aborted) setServerStatus("unavailable");
      }
    };
    void check();
    const timer = setInterval(() => void check(), 60_000);
    return () => { controller.abort(); clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    sidebarRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMobileMenuOpen(false); menuButtonRef.current?.focus(); }
      if (event.key !== "Tab" || window.matchMedia("(min-width: 1024px)").matches) return;
      const items = [...(sidebarRef.current?.querySelectorAll<HTMLElement>('a[href],button,summary') ?? [])]
        .filter(element => element.getClientRects().length > 0);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [mobileMenuOpen]);

  return (
    <div className="cc-shell">
      <a href="#workspace-content" className="cc-skip">Skip to content</a>
      {mobileMenuOpen && <button type="button" aria-label="Close navigation" className="cc-backdrop" onClick={() => setMobileMenuOpen(false)} />}
      <aside ref={sidebarRef} id="workspace-navigation" className={cn("cc-sidebar", mobileMenuOpen && "is-open")} aria-label="Workspace navigation">
        <div className="cc-brand">
          <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="cc-brand-link">
            <img src={brandIcon} alt="" className="cc-brand-icon" />
            <span><strong>Command Centre</strong><small>OS // MAKUENI</small></span>
          </Link>
          <button type="button" aria-label="Close menu" className="cc-mobile-close" onClick={() => { setMobileMenuOpen(false); menuButtonRef.current?.focus(); }}><X size={20} /></button>
        </div>
        <nav className="cc-nav" aria-label="Main navigation">
          {visibleGroups.map(group => <section key={group.title} className="cc-nav-group">
            <h2>{group.title}</h2>
            <ul>{group.items.map(item => <li key={item.href}>
              <Link href={item.href} aria-current={location === item.href ? "page" : undefined} onClick={() => setMobileMenuOpen(false)} className={cn("cc-nav-link", location === item.href && "is-active")}>
                <item.icon size={20} strokeWidth={1.7} /><span>{item.label}</span>
              </Link>
            </li>)}</ul>
          </section>)}
        </nav>
        <div className="cc-sidebar-footer">
          {user && <details className="cc-profile">
            <summary><CircleUserRound size={20} /><span>My Profile</span></summary>
            <div className="cc-profile-details"><strong>{user.name}</strong><span>{user.email}</span><small>{user.role.replace(/[_-]/g, " ")}</small></div>
          </details>}
          <div className="cc-workspace-label"><Globe size={17} /><span>Makueni County</span><small>EN</small></div>
          <button onClick={handleLogout} className="cc-nav-link cc-logout"><LogOut size={20} strokeWidth={1.7} /><span>Logout</span></button>
        </div>
      </aside>
      <main className="cc-main">
        <header className="cc-topbar">
          <div className="cc-topbar-title"><button ref={menuButtonRef} type="button" aria-label="Open navigation" aria-controls="workspace-navigation" aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(true)} className="cc-menu-button"><Menu size={22} /></button><h1>{pageTitle}</h1></div>
          <div className="cc-server-status" title="Application server reachability; provider and database health are reported in their modules." role="status"><span className={cn("cc-status-dot", serverStatus)} />{serverStatus === "online" ? "System Online" : serverStatus === "checking" ? "Checking connection" : "Connection unavailable"}</div>
        </header>
        <div id="workspace-content" tabIndex={-1} className="cc-content"><div className="cc-page-content">{children}</div><footer className="cc-workspace-footer"><PoweredBy /></footer></div>
      </main>
      <AiAssistPanel module={currentModule} />
    </div>
  );
}

