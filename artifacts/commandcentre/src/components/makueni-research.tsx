import { useEffect, useState } from "react";

type Research = {
  scope: string; reviewedAt: string; coverage: string; topics: string[]; rules: string[];
  facts: { id: string; label: string; value: number | string; unit: string; period: string; kind: string; topic: string; pdfPage: number | null; locator: string; caution: string; sourceTitle: string; sourceUrl: string }[];
  sources: { id: string; title: string; url: string; publisher: string; period: string; status: string; notes: string; sha256?: string; reviewedPdfPages: number[] }[];
};
export function MakueniResearch() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const [data, setData] = useState<Research | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setError(false);
    const params = new URLSearchParams({ county: "017", topic, q: query });
    fetch(`${import.meta.env.BASE_URL}api/analytics/county-research?${params}`, { credentials: "include", signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(e => { if (e.name !== "AbortError") setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, query, topic, retry]);
  return <section className="rounded-2xl border border-primary/25 bg-card/60 p-4 sm:p-6 backdrop-blur-xl space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Makueni policy research</h2><p className="text-sm text-muted-foreground">County 017 · source pages, historical baselines, projections and targets</p></div><button type="button" aria-expanded={open} aria-controls="county-research-library" onClick={() => setOpen(v => !v)} className="rounded-lg bg-primary/15 border border-primary/30 px-4 py-2 text-sm">{open ? "Close library" : "Open library"}</button></div>
    {open && <div id="county-research-library" className="space-y-4">
      <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); setQuery(draft.trim()); }}>
        <label className="flex-1 min-w-40"><span className="sr-only">Search Makueni evidence</span><input maxLength={400} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Search water, population, sanitation…" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm" /></label>
        <label><span className="sr-only">Research topic</span><select value={topic} onChange={e => setTopic(e.target.value)} className="rounded-lg bg-background border border-border px-3 py-2 text-sm">{["all", "population", "geography", "water", "sanitation", "health", "governance", "agriculture", "education", "infrastructure"].map(t => <option key={t} value={t}>{t === "all" ? "All topics" : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select></label>
        <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm">Search</button>
      </form>
      {loading && <p aria-live="polite" className="text-sm text-muted-foreground">Loading dated source records…</p>}
      {error && <div role="alert" className="text-sm">Could not load the research library. <button onClick={() => setRetry(v => v + 1)} className="underline">Retry</button></div>}
      {data && !loading && !error && <>
        <p className="text-xs text-muted-foreground">Reviewed {data.reviewedAt}. {data.coverage}</p>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-sm">These records do not establish current conditions. Different water definitions and conflicting area figures must remain separate. No contact records or electoral boundaries are changed.</div>
        {!data.facts.length && <p className="text-sm text-muted-foreground">No reviewed evidence matches these filters. Try another topic or clear your search.</p>}
        <div className="grid gap-3 md:grid-cols-2">{data.facts.map(f => <article key={f.id} className="rounded-xl border border-border bg-background/40 p-4 space-y-2">
          <div className="flex justify-between gap-2"><h3 className="font-medium text-sm">{f.label}</h3><span className="text-[10px] text-primary uppercase shrink-0">{f.kind.replaceAll("-", " ")}</span></div>
          <p className="text-lg font-semibold">{typeof f.value === "number" ? f.value.toLocaleString("en-KE") : f.value} <span className="text-xs font-normal text-muted-foreground">{f.unit}</span></p>
          <p className="text-xs text-muted-foreground">{f.period} · Makueni County</p>
          <p className="text-xs">{f.caution}</p>
          <a className="block text-xs text-primary underline break-words" href={`${f.sourceUrl}${f.pdfPage ? `#page=${f.pdfPage}` : ""}`} target="_blank" rel="noopener noreferrer">{f.sourceTitle}{f.pdfPage ? ` · PDF page ${f.pdfPage}` : ""}</a>
          <p className="text-[11px] text-muted-foreground">{f.locator}</p>
        </article>)}</div>
        <details><summary className="cursor-pointer text-sm font-medium">Interpretation rules</summary><ul className="list-disc pl-5 mt-2 text-xs text-muted-foreground space-y-2">{data.rules.map(r => <li key={r}>{r}</li>)}</ul></details>
        <details><summary className="cursor-pointer text-sm font-medium">Sources and review status ({data.sources.length})</summary><div className="space-y-3 mt-3">{data.sources.map(s => <div key={s.id} className="border-t border-border pt-3 space-y-1"><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">{s.title}</a><p className="text-xs text-muted-foreground">{s.publisher} · {s.period} · {s.status}</p><p className="text-xs">{s.notes}</p>{s.sha256 && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Document integrity and reviewed pages</summary><p className="break-all">SHA-256: {s.sha256}</p><p>PDF pages: {s.reviewedPdfPages.join(", ")}</p></details>}</div>)}</div></details>
      </>}
    </div>}
  </section>;
}
