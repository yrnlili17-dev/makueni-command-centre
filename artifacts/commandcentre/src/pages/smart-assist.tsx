import { useEffect, useMemo, useState } from "react";
import { Search, ExternalLink, FolderPlus, BookmarkPlus, Radio, RefreshCw, MapPinned, Globe2, Trash2 } from "lucide-react";

type NewsItem = { title: string; link: string; source: string; publishedAt: string };
type Workspace = { id: number; title: string; query: string; geography?: string | null; notes?: string | null; tags?: string[] };
const API = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/smart-assist`;
const platforms = [
  ["Google", (q:string)=>`https://www.google.com/search?q=${encodeURIComponent(q)}`],
  ["Google News", (q:string)=>`https://news.google.com/search?q=${encodeURIComponent(q)}`],
  ["X", (q:string)=>`https://x.com/search?q=${encodeURIComponent(q)}&src=typed_query`],
  ["YouTube", (q:string)=>`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`],
  ["Facebook", (q:string)=>`https://www.facebook.com/search/top?q=${encodeURIComponent(q)}`],
  ["TikTok", (q:string)=>`https://www.tiktok.com/search?q=${encodeURIComponent(q)}`],
] as const;

export default function SmartAssist() {
  const [query, setQuery] = useState("Prof. Philip Kaloki Makueni");
  const [searched, setSearched] = useState("");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const loadWorkspaces = () => fetch(`${API}/workspaces`, { credentials: "include" }).then(r=>r.json()).then(setWorkspaces).catch(()=>{});
  useEffect(loadWorkspaces, []);
  const search = async () => {
    if (!query.trim()) return; setLoading(true); setMessage(""); setSearched(query.trim());
    try { const r=await fetch(`${API}/news?q=${encodeURIComponent(query.trim())}`, { credentials:"include" }); const d=await r.json(); if(!r.ok) throw new Error(d.error); setItems(d.items ?? []); }
    catch(e){ setMessage(e instanceof Error ? e.message : "Search failed"); } finally { setLoading(false); }
  };
  const createWorkspace = async () => {
    if (!searched && !query.trim()) return;
    const q=searched || query.trim();
    const r=await fetch(`${API}/workspaces`, { method:"POST", credentials:"include", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ title:q.slice(0,80), query:q, geography:"Makueni County", tags:["smart-assist"] }) });
    const d=await r.json(); if(r.ok){ setActive(d.id); loadWorkspaces(); setMessage("Workspace created"); }
  };
  const save = async (item: NewsItem) => {
    if(!active){ setMessage("Create or select a Campaign Workspace first"); return; }
    const r=await fetch(`${API}/workspaces/${active}/sources`, { method:"POST", credentials:"include", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ title:item.title, url:item.link, source:item.source, topic:searched, publishedAt:item.publishedAt, sentiment:"neutral" }) });
    setMessage(r.ok ? "Source saved to workspace" : "Could not save source");
  };
  const trendCounts = useMemo(()=>{
    const words=["roads","water","health","youth","jobs","agriculture","education","corruption","women"];
    return words.map(word=>({word,count:items.filter(i=>i.title.toLowerCase().includes(word)).length})).filter(x=>x.count).sort((a,b)=>b.count-a.count);
  },[items]);
  return <div className="space-y-5 max-w-[1500px] mx-auto">
    <header><h1 className="text-xl font-bold tracking-widest flex items-center gap-2"><Search className="w-5 h-5 text-primary"/> SMART ASSIST</h1><p className="text-[10px] font-mono text-muted-foreground mt-1">PUBLIC NEWS LISTENING · SOCIAL SEARCH LAUNCHER · CAMPAIGN WORKSPACES · NO AI KEY REQUIRED</p></header>
    <div className="grid xl:grid-cols-[1fr_320px] gap-5">
      <section className="space-y-4 min-w-0">
        <div className="bg-card border border-border p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-2"><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} placeholder="Search candidate, ward, issue or opponent..." className="flex-1 min-w-0 bg-secondary border border-border px-3 py-3 text-sm focus:outline-none focus:border-primary"/><button onClick={search} disabled={loading} className="bg-primary text-primary-foreground px-5 py-3 font-mono text-xs flex items-center justify-center gap-2"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/>{loading?"LISTENING...":"SEARCH"}</button></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-3">{platforms.map(([name,url])=><a key={name} target="_blank" rel="noreferrer" href={url(query)} className="border border-border px-2 py-2 text-center font-mono text-[10px] hover:border-primary hover:text-primary">{name} ↗</a>)}</div>
          <p className="text-[10px] text-muted-foreground font-mono mt-3">Smart Assist automatically retrieves public news headlines. Social-network buttons open each platform's public search because most platforms restrict automatic collection without official APIs.</p>
        </div>
        {message&&<div className="border border-primary/30 bg-primary/5 p-3 text-xs font-mono">{message}</div>}
        <div className="grid sm:grid-cols-3 gap-3">{trendCounts.length?trendCounts.slice(0,6).map(t=><div key={t.word} className="bg-card border border-border p-3"><div className="text-[10px] font-mono text-muted-foreground uppercase">TRENDING TOPIC</div><div className="font-bold capitalize mt-1">{t.word}</div><div className="text-primary text-sm">{t.count} headline{t.count===1?"":"s"}</div></div>):<div className="sm:col-span-3 bg-card border border-border p-4 text-xs text-muted-foreground font-mono">Run a search to identify repeated public-news topics.</div>}</div>
        <div className="bg-card border border-border"><div className="p-3 border-b border-border flex items-center justify-between"><span className="font-mono text-xs tracking-widest flex gap-2 items-center"><Radio className="w-4 h-4"/> LISTENING RESULTS</span><button onClick={createWorkspace} className="text-[10px] font-mono border border-border px-2 py-1 hover:border-primary"><FolderPlus className="inline w-3 h-3 mr-1"/>NEW WORKSPACE</button></div>
          {!items.length?<div className="p-12 text-center text-muted-foreground font-mono text-xs">NO RESULTS YET</div>:<ul className="divide-y divide-border">{items.map((item,i)=><li key={`${item.link}-${i}`} className="p-4 flex gap-3"><div className="flex-1 min-w-0"><a href={item.link} target="_blank" rel="noreferrer" className="text-sm font-medium hover:text-primary">{item.title}</a><div className="mt-2 text-[10px] font-mono text-muted-foreground">{item.source} · {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : "date unavailable"}</div></div><button onClick={()=>save(item)} title="Save to workspace" className="shrink-0 border border-border p-2 hover:text-primary hover:border-primary"><BookmarkPlus className="w-4 h-4"/></button><a href={item.link} target="_blank" rel="noreferrer" className="shrink-0 border border-border p-2 hover:text-primary"><ExternalLink className="w-4 h-4"/></a></li>)}</ul>}
        </div>
      </section>
      <aside className="space-y-4"><div className="bg-card border border-border"><div className="p-3 border-b border-border font-mono text-xs tracking-widest">CAMPAIGN WORKSPACES</div><div className="p-2 space-y-2 max-h-[420px] overflow-y-auto">{workspaces.length===0?<p className="p-3 text-[10px] font-mono text-muted-foreground">Create a workspace from a search to collect sources and campaign notes.</p>:workspaces.map(w=><button key={w.id} onClick={()=>setActive(w.id)} className={`w-full text-left p-3 border text-xs ${active===w.id?"border-primary bg-primary/10":"border-border hover:bg-secondary"}`}><div className="font-semibold">{w.title}</div><div className="font-mono text-[9px] text-muted-foreground mt-1">{w.geography||"All areas"}</div></button>)}</div></div>
        <div className="bg-card border border-border p-4"><div className="flex items-center gap-2 font-mono text-xs"><MapPinned className="w-4 h-4"/> GEOGRAPHIC CONTEXT</div><p className="text-[10px] text-muted-foreground mt-2">Link research to wards and use the GIS Centre to compare coverage, risks, issues and campaign activity.</p><a href="/gis-centre" className="mt-3 inline-flex items-center gap-2 text-xs text-primary"><Globe2 className="w-4 h-4"/>Open GIS Centre</a></div>
      </aside>
    </div>
  </div>;
}
