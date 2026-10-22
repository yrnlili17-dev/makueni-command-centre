import { useEffect, useState } from "react";

type History = {
  reviewedAt: string; provenance: string;
  makueni: { electionDate: string; office: string; registered: number; validVotes: number; rejectedBallots: number; ballotsCast: number; turnoutPercent: number | null; formula: string; candidates: { name: string; votes: number }[]; registerSnapshot: { registered: number } };
  national: { electionDate: string; scope: string; turnoutPercent: number }[];
  quality: string[];
  sources: { id: string; title: string; url: string; scope: string; locator: string; status: string; note: string }[];
};
export function IebcHistory() {
  const [data, setData] = useState<History | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}api/analytics/iebc-history`, { credentials: "include", signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(setData).catch(e => { if (e.name !== "AbortError") setError(true); });
    return () => controller.abort();
  }, []);
  if (error) return <section role="alert" className="rounded-2xl border border-border p-5">IEBC historical evidence could not be loaded. Refresh to retry.</section>;
  if (!data) return <section aria-live="polite" className="rounded-2xl border border-border p-5">Loading IEBC historical evidence…</section>;
  const m = data.makueni;
  const fmt = (n: number) => n.toLocaleString("en-KE");
  return <section className="space-y-4 rounded-2xl border border-emerald-400/20 bg-emerald-950/10 p-4 sm:p-6 backdrop-blur-xl">
    <div><h2 className="text-lg font-semibold">IEBC historical evidence</h2><p className="text-sm text-muted-foreground">Makueni County · {m.electionDate} · {m.office} · reviewed {data.reviewedAt}</p></div>
    <p className="text-sm text-amber-500">Indexed official extracts · original PDF review outstanding · historical reference, not a prediction</p>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[
      ["Declaration registered voters", fmt(m.registered)], ["Valid votes", fmt(m.validVotes)], ["Rejected ballots", fmt(m.rejectedBallots)], ["Derived turnout", m.turnoutPercent === null ? "Unavailable" : `${m.turnoutPercent}%`],
    ].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-card/60 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold">{value}</p></div>)}</div>
    <p className="text-xs text-muted-foreground">{m.formula}. Derived ballots cast: {fmt(m.ballotsCast)}. Separate county register snapshot: {fmt(m.registerSnapshot.registered)}.</p>
    <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="text-left font-medium pb-2">Historical presidential candidate totals</caption><thead><tr><th className="text-left p-2">Candidate</th><th className="text-right p-2">Votes</th></tr></thead><tbody>{m.candidates.map(c => <tr key={c.name} className="border-t border-border"><td className="p-2">{c.name}</td><td className="text-right p-2">{fmt(c.votes)}</td></tr>)}</tbody></table></div>
    <div className="rounded-xl border border-border p-3"><h3 className="font-medium">Kenya national comparison</h3><p className="text-sm">{data.national.map(n => `${n.electionDate}: ${n.turnoutPercent}%`).join(" · ")}</p><p className="text-xs text-muted-foreground">National figures are not Makueni or ward turnout.</p></div>
    <div><h3 className="font-medium mb-2">Data quality and interpretation</h3><ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">{data.quality.map(q => <li key={q}>{q}</li>)}</ul></div>
    <details><summary className="cursor-pointer font-medium">Official sources and review status</summary><div className="mt-3 space-y-3">{data.sources.map(s => <div key={s.id} className="border-t border-border pt-3"><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{s.title}</a><p className="text-xs text-muted-foreground">{s.scope} · {s.status} · {s.locator}</p><p className="text-sm">{s.note}</p></div>)}</div></details>
    <p className="text-xs text-muted-foreground">{data.provenance}</p>
  </section>;
}
