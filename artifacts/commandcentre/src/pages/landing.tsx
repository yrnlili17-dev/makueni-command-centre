import { PwaControls } from "@/components/pwa-controls";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Menu, X, Database, Users, Calendar, Map, BarChart3, ShieldCheck, ClipboardList, Wallet, ChevronRight } from "lucide-react";
import { MakueniLandingMap } from "@/components/makueni-landing-map";
import { PoweredBy } from "@/components/powered-by";
import brandIcon from "@assets/brand-icon.png";
import { useAuth } from "@/lib/auth";
import { MAKUENI_REGISTER_SUMMARY } from "@/lib/makueni-register-summary";
import "./landing.css";

const FEATURES = [
  { title: "Constituent Database", description: "Maintain contact records, review imports and monitor data quality in one workspace.", icon: Database, href: "/voters-db" },
  { title: "Volunteer Management", description: "Keep team registrations, assigned responsibilities and volunteer records organised.", icon: Users, href: "/volunteers" },
  { title: "Field Operations", description: "Record field reports and coordinate the team's day-to-day activities.", icon: Map, href: "/field-ops" },
  { title: "Events & Calendar", description: "Coordinate schedules, event details and attendance records.", icon: Calendar, href: "/events" },
  { title: "Reports & Analytics", description: "Review the information recorded by your team and track operational activity.", icon: BarChart3, href: "/analytics" },
  { title: "Planning", description: "Keep milestones, tasks and responsibilities together for the whole team.", icon: ClipboardList, href: "/campaign-plan" },
  { title: "Finance Records", description: "Manage the fundraising and pledge records already held in your workspace.", icon: Wallet, href: "/fundraising" },
  { title: "Administration", description: "Manage user accounts, roles and access to each part of the platform.", icon: ShieldCheck, href: "/admin" },
];

export default function Landing() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const previous = document.title;
    document.title = "Makueni Command Centre";
    return () => { document.title = previous; };
  }, []);
  const appHref = user ? "/dashboard" : "/login";
  const nav = [{ href: "#home", label: "Home" }, { href: "#features", label: "Features" }, { href: "#makueni", label: "Makueni" }, { href: "#access", label: "Access" }];
  return <div className="mc-public" id="home">
    <a href="#public-content" className="mc-skip">Skip to content</a>
    <header className="mc-public-header"><div className="mc-public-wrap mc-public-header-row">
      <a href="#home" className="mc-public-brand"><img src={brandIcon} alt="" /><span><strong>Command Centre OS</strong><small>MAKUENI COUNTY</small></span></a>
      <nav aria-label="Main" className="mc-public-nav">{nav.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}</nav>
      <div className="mc-header-actions"><Link href={appHref} className="mc-login-link">{user ? "Dashboard" : "Log In"}</Link><Link href={appHref} className="mc-button mc-button-primary">Open Command Centre</Link><button type="button" className="mc-public-menu" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls="public-mobile-navigation" onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button></div>
    </div>{menuOpen && <nav id="public-mobile-navigation" className="mc-public-mobile-nav" aria-label="Mobile">{nav.map(item => <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>)}</nav>}</header>
      <PwaControls />
    <main id="public-content">
      <section className="mc-hero"><div className="mc-public-wrap mc-hero-grid"><div className="mc-hero-copy">
        <p className="mc-eyebrow"><span /> KARIBU · WELCOME TO MAKUENI</p>
        <h1>Makueni<br /><span>Command Centre</span> OS</h1>
        <p className="mc-hero-subtitle">Your people. Your county. One connected workspace.</p>
        <p className="mc-hero-description">Contacts, field reports, volunteers, events and administration — together in the Makueni County workspace.</p>
        <div className="mc-hero-actions"><Link href={appHref} className="mc-button mc-button-primary">{user ? "Open Dashboard" : "Log In to Your Workspace"}<ArrowRight size={18} /></Link><a href="#features" className="mc-button mc-button-outline">Explore Features</a></div>
      </div><MakueniLandingMap /></div></section>
      <section className="mc-platform-strip" aria-label="Workspace overview"><div className="mc-public-wrap"><p>CONNECTED WORKFLOWS FOR YOUR EXISTING TEAM AND RECORDS</p><div>{["Contact Management", "Field Reports", "Volunteer Records", "Events & Scheduling", "Reporting", "Administration"].map(label => <span key={label}>{label}</span>)}</div></div></section>
      <section className="mc-facts"><div className="mc-public-wrap mc-facts-grid">{[["6", "CONSTITUENCIES"], ["30", "COUNTY ASSEMBLY WARDS"], ["16", "ADMINISTRATIVE DIVISIONS"], ["127", "SUB-LOCATIONS"]].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div></section>
      <section id="features" className="mc-public-section"><div className="mc-public-wrap">
        <div className="mc-section-heading"><p className="mc-kicker">THE PLATFORM</p><h2>One unified command centre.</h2><p>The tools your team uses, in one consistent workspace.</p></div>
        <div className="mc-feature-grid">{FEATURES.map(feature => <Link key={feature.href} href={user ? feature.href : "/login"} className="mc-feature-card"><feature.icon size={25} strokeWidth={1.6} /><h3>{feature.title}</h3><p>{feature.description}</p><span>Open module <ChevronRight size={15} /></span></Link>)}</div>
      </div></section>
      <section id="makueni" className="mc-public-section mc-geography-section"><div className="mc-public-wrap">
        <div className="mc-section-heading"><p className="mc-kicker">MAKUENI COUNTY</p><h2>Six constituencies. Thirty wards.</h2><p>County geography and the existing IEBC 2022 register reference. These reference figures are separate from your private contact records.</p></div>
        <div className="mc-geography-grid">{MAKUENI_REGISTER_SUMMARY.map(item => <article key={item.constituency} id={`constituency-${item.constituency.toLowerCase().replace(/\s+/g, "-")}`} className="mc-geography-card"><h3>{item.constituency}</h3><p>{item.wards.length} wards · {item.stations.toLocaleString("en-KE")} polling stations</p><ul>{item.wards.map(ward => <li key={ward.ward}>{ward.ward}</li>)}</ul></article>)}</div>
      </div></section>
      <section id="access" className="mc-public-section"><div className="mc-public-wrap mc-access-callout"><div><p className="mc-kicker">YOUR TEAM'S WORKSPACE</p><h2>Ready to get to work?</h2><p>Sign in with your assigned account to access your team's records and tools.</p></div><Link href={appHref} className="mc-button mc-button-primary">Open Command Centre <ArrowRight size={18} /></Link></div></section>
    </main>
    <footer className="mc-public-footer"><div className="mc-public-wrap"><div><strong>Makueni Command Centre</strong><p>Prof. Philip Kaloki · Makueni County</p></div><Link href="/login">Staff Log In</Link><PoweredBy /></div></footer>
  </div>;
}


