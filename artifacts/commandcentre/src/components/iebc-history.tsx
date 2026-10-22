import { useQuery } from "@tanstack/react-query";

type GovernorHistory = {
  electionDate: string; reviewedAt: string; office: string; geography: string;
  candidates: { name: string; votes: number }[]; candidateVoteSum: number; note: string;
  sources: { title: string; date: string; locator: string; url: string }[];
};
export function IebcHistory({ endpoint = "analytics/governor-history" }: { endpoint?: string }) {
  const { data, isPending, error, refetch } = useQuery<GovernorHistory>({
    queryKey: ["makueni-governor-history", endpoint],
    queryFn: async () => {
      const r = await fetch(`${import.meta.env.BASE_URL}api/${endpoint}`, { credentials: "include" });
      if (!r.ok) throw new Error("Historical results unavailable");
      return r.json();
    },
  });
  if (error) return <section role="alert" className="rounded-2xl border border-border p-5">Gubernatorial history could not be loaded. <button className="underline" onClick={() => void refetch()}>Retry</button></section>;
  if (isPending || !data) return <section className="rounded-2xl border border-border p-5">Loading Makueni gubernatorial history…</section>;
  return <section className="space-y-4 rounded-2xl border border-emerald-400/20 bg-emerald-950/10 p-4 sm:p-6 backdrop-blur-xl">
    <div><h2 className="text-lg font-semibold">Makueni gubernatorial results · 2022</h2><p className="text-sm text-muted-foreground">{data.geography} · {data.electionDate} · {data.office}</p></div>
    <p className="text-xs text-amber-500">Historical primary-source extracts · not a 2027 projection · original Form 37C review outstanding</p>
    <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="text-left pb-2">Reported candidate totals</caption><thead><tr><th className="text-left p-2">Candidate</th><th className="text-right p-2">Votes</th></tr></thead><tbody>{data.candidates.map(c => <tr key={c.name} className="border-t border-border"><td className="p-2">{c.name}</td><td className="text-right p-2">{c.votes.toLocaleString("en-KE")}</td></tr>)}</tbody><tfoot><tr className="border-t border-border font-semibold"><td className="p-2">Sum of listed candidate votes</td><td className="text-right p-2">{data.candidateVoteSum.toLocaleString("en-KE")}</td></tr></tfoot></table></div>
    <p className="text-xs text-muted-foreground">{data.note}</p>
    <details><summary className="cursor-pointer text-sm">Sources and verification · reviewed {data.reviewedAt}</summary><ul className="mt-3 space-y-2 text-xs">{data.sources.map(source => <li key={source.url}><a className="text-primary underline" target="_blank" rel="noreferrer" href={source.url}>{source.title}</a> · {source.date} · {source.locator}</li>)}</ul></details>
  </section>;
}
