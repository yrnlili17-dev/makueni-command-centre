import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { MAKUENI_REGISTER_SUMMARY } from "@/lib/makueni-register-summary";
import "./landing.css";

/* Kenya's general election: second Tuesday of August (Constitution, Art. 101). */
const ELECTION_DAY = new Date("2027-08-10T06:00:00+03:00");

const CONSTITUENCIES = MAKUENI_REGISTER_SUMMARY;
const TOTAL_VOTERS = CONSTITUENCIES.reduce((s, c) => s + c.voters, 0);
const TOTAL_STATIONS = CONSTITUENCIES.reduce((s, c) => s + c.stations, 0);
const TOTAL_WARDS = CONSTITUENCIES.reduce((s, c) => s + c.wards.length, 0);
const fmt = (n: number) => n.toLocaleString("en-KE");

/* Every module that already exists in the command centre, grouped the same
   way as the in-app sidebar so people find things where they expect them. */
const MODULE_GROUPS: { group: string; items: { name: string; href: string; does: string }[] }[] = [
  {
    group: "Overview",
    items: [
      { name: "Command overview", href: "/dashboard", does: "Today’s numbers across every ward on one screen." },
      { name: "AI chief strategist", href: "/strategist", does: "Ask strategy questions answered from live campaign data." },
      { name: "Analytics hub", href: "/analytics", does: "Trends in support, outreach and field work over time." },
      { name: "Campaign countdown", href: "/campaign-plan", does: "Days to election, phases and readiness milestones." },
    ],
  },
  {
    group: "Voters",
    items: [
      { name: "Voters", href: "/members", does: "Supporter records with ward, support level and consent." },
      { name: "Constituent database", href: "/voters-db", does: "The registry with contact totals and data-quality checks." },
      { name: "Segmentation", href: "/segments", does: "Build target lists, such as undecided voters in Wote." },
    ],
  },
  {
    group: "Outreach",
    items: [
      { name: "Messaging", href: "/messaging", does: "SMS and WhatsApp campaigns to any segment." },
      { name: "Speech and manifesto", href: "/speeches", does: "Draft speeches by occasion, audience, ward and language." },
      { name: "Event logistics", href: "/events", does: "Barazas, rallies and stakeholder meetings, with attendance." },
      { name: "Influence network", href: "/kol", does: "Elders, clergy, group leaders and their reach." },
    ],
  },
  {
    group: "Field",
    items: [
      { name: "Field operations", href: "/field-ops", does: "Canvass drives, door targets and visit logs per ward." },
      { name: "Volunteer command", href: "/volunteers", does: "Recruit, assign and track volunteers and their hours." },
    ],
  },
  {
    group: "Intelligence",
    items: [
      { name: "Opinion polls and surveys", href: "/surveys", does: "Run polls with shareable links and see results by ward." },
      { name: "Political intelligence", href: "/intelligence", does: "Opponent activity and threats, logged and rated." },
      { name: "Narrative response", href: "/narrative-response", does: "Answer misinformation quickly with an agreed line." },
      { name: "Social listening", href: "/social-listening", does: "Scan public mentions of the candidate and local issues." },
      { name: "SWOT analysis", href: "/swot", does: "Strengths, weaknesses, opportunities and threats, kept current." },
    ],
  },
  {
    group: "Election day",
    items: [
      { name: "Election day operations", href: "/election-day", does: "Polling stations, agents and tallies as they report." },
      { name: "Turnout forecast", href: "/turnout", does: "Predicted turnout per ward and where get-out-the-vote pays off most." },
    ],
  },
  {
    group: "Finance and admin",
    items: [
      { name: "Pledges and fundraising", href: "/fundraising", does: "Donors, pledges and M-Pesa contributions." },
      { name: "Credentials hub", href: "/credentials", does: "The candidate’s record, documents and achievements." },
      { name: "System admin", href: "/admin", does: "User accounts, roles and module permissions." },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Hero visual: the county's register, one band per constituency,     */
/* each band's height proportional to its registered voters.          */
/* ------------------------------------------------------------------ */

function RegisterBands({ active, onActive }: { active: number | null; onActive: (i: number | null) => void }) {
  return (
    <div className="lp-bands" role="list" aria-label="Registered voters by constituency">
      {CONSTITUENCIES.map((c, i) => (
        <button
          key={c.constituency}
          type="button"
          role="listitem"
          className={"lp-band" + (active === i ? " is-active" : "")}
          style={{ flexGrow: c.voters }}
          onMouseEnter={() => onActive(i)}
          onMouseLeave={() => onActive(null)}
          onFocus={() => onActive(i)}
          onBlur={() => onActive(null)}
          onClick={() => onActive(active === i ? null : i)}
          aria-label={`${c.constituency}: ${fmt(c.voters)} registered voters, ${c.wards.length} wards, ${c.stations} polling stations`}
        >
          <span className="lp-band-name">{c.constituency}</span>
          <span className="lp-band-num">{fmt(c.voters)}</span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return useMemo(() => {
    const ms = Math.max(0, target.getTime() - now);
    const days = Math.floor(ms / 86_400_000);
    return { days, weeks: Math.floor(days / 7) };
  }, [now, target]);
}

export default function Landing() {
  const { user } = useAuth();
  const [active, setActive] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { days, weeks } = useCountdown(ELECTION_DAY);

  useEffect(() => {
    const prev = document.title;
    document.title = "Makueni Command Centre";
    return () => { document.title = prev; };
  }, []);

  const appHref = user ? "/dashboard" : "/login";
  const appLabel = user ? "Open the command centre" : "Log in";
  const focus = active === null ? null : CONSTITUENCIES[active]!;

  const nav = [
    { href: "#platform", label: "Platform" },
    { href: "#wards", label: "Wards" },
    { href: "#volunteer", label: "Volunteer" },
  ];

  return (
    <div className="lp">
      <a href="#main" className="lp-skip">Skip to content</a>

      <header className="lp-header">
        <div className="lp-wrap lp-header-row">
          <a href="#top" className="lp-brand" aria-label="Makueni Command Centre, home">
            <svg viewBox="0 0 40 40" aria-hidden="true" className="lp-brand-mark">
              <path d="M3 33 L13 15 L19 24 L26 9 L37 33 Z" />
              <path d="M3 33 H37" fill="none" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            <span>
              <strong>Makueni</strong>
              <small>Command Centre</small>
            </span>
          </a>

          <nav className="lp-nav" aria-label="Main">
            {nav.map(n => <a key={n.href} href={n.href}>{n.label}</a>)}
          </nav>

          <div className="lp-header-cta">
            <Link href={appHref} className="lp-btn lp-btn-solid">{appLabel}</Link>
            <button
              type="button"
              className="lp-menu-btn"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(o => !o)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="lp-mobile-nav" aria-label="Mobile">
            {nav.map(n => <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)}>{n.label}</a>)}
          </nav>
        )}
      </header>

      <main id="main">
        <section id="top" className="lp-hero">
          <div className="lp-wrap lp-hero-grid">
            <div className="lp-hero-copy">
              <p className="lp-slogan">Makueni County</p>
              <h1>Every ward in Makueni, on one screen.</h1>
              <p className="lp-lede">
                Campaign operations for {TOTAL_WARDS} wards, {fmt(TOTAL_STATIONS)} polling stations and{" "}
                {fmt(TOTAL_VOTERS)} registered voters. Voters, volunteers, polls, outreach and
                election-day tallies, run from one place.
              </p>
              <div className="lp-actions">
                <Link href={appHref} className="lp-btn lp-btn-solid lp-btn-lg">{appLabel}</Link>
                <Link href="/insights/volunteer" className="lp-btn lp-btn-ghost lp-btn-lg">Volunteer with us</Link>
              </div>
            </div>

            <figure className="lp-hero-figure">
              <RegisterBands active={active} onActive={setActive} />
              <figcaption className="lp-band-caption" aria-live="polite">
                {focus ? (
                  <>
                    <strong>{focus.constituency}</strong>: {focus.wards.length} wards, {focus.stations} polling stations.{" "}
                    {focus.wards.map(w => w.ward).join(", ")}.
                  </>
                ) : (
                  <>Registered voters by constituency. Select a band to see its wards.</>
                )}
              </figcaption>
            </figure>
          </div>

          <div className="lp-wrap">
            <p className="lp-countdown">
              <span className="lp-countdown-num">{fmt(days)}</span>
              <span className="lp-countdown-text">
                days to the general election on Tuesday 10 August 2027. That is {weeks} weekends of canvassing.
              </span>
            </p>
          </div>
        </section>

        <section id="platform" className="lp-section">
          <div className="lp-wrap">
            <div className="lp-section-head">
              <h2>What the command centre does</h2>
              <p>
                Twenty-three tools, grouped the way the team works. Each opens inside the command centre
                once you have logged in, and what you can see depends on the role your administrator gives you.
              </p>
            </div>

            <div className="lp-modules">
              {MODULE_GROUPS.map(g => (
                <div key={g.group} className="lp-module-group">
                  <h3>{g.group}</h3>
                  <ul>
                    {g.items.map(m => (
                      <li key={m.href}>
                        <Link href={user ? m.href : "/login"} className="lp-module">
                          <span className="lp-module-name">{m.name}</span>
                          <span className="lp-module-does">{m.does}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="wards" className="lp-section lp-section-ink">
          <div className="lp-wrap">
            <div className="lp-section-head">
              <h2>All {TOTAL_WARDS} wards, from the IEBC register</h2>
              <p>
                Every voter record, volunteer, canvass drive and polling station in the system belongs to one
                of these wards. Figures are from the IEBC register of voters for the 2022 general election.
              </p>
            </div>

            <div className="lp-geo">
              {CONSTITUENCIES.map(c => (
                <div key={c.constituency} className="lp-geo-group">
                  <h3>
                    {c.constituency}
                    <span>{fmt(c.voters)} voters</span>
                  </h3>
                  <table className="lp-geo-table">
                    <thead>
                      <tr><th scope="col">Ward</th><th scope="col">Stations</th><th scope="col">Voters</th></tr>
                    </thead>
                    <tbody>
                      {c.wards.map(w => (
                        <tr key={w.ward}>
                          <th scope="row">{w.ward}</th>
                          <td>{w.stations}</td>
                          <td>{fmt(w.voters)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="volunteer" className="lp-section lp-contact">
          <div className="lp-wrap lp-contact-grid">
            <div>
              <h2>Join the team</h2>
              <p>
                Canvassers, phone bankers, polling agents and data clerks are needed in every ward.
                Register and your ward coordinator will get in touch.
              </p>
            </div>
            <div className="lp-actions lp-actions-end">
              <Link href="/insights/volunteer" className="lp-btn lp-btn-solid lp-btn-lg">Register as a volunteer</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-row">
          <p>Makueni County Command Centre. Register data: IEBC, 2022.</p>
          <p><Link href="/login">Staff log in</Link></p>
        </div>
      </footer>
    </div>
  );
}
