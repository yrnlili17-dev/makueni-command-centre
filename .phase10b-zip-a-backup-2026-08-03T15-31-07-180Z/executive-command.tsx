import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Bell, ClipboardCheck, FileBarChart, Footprints, RefreshCw, ShieldCheck } from "lucide-react";
const BASE = import.meta.env.BASE_URL;
const cards = [
  ["tasks", "pending", "Pending Tasks", ClipboardCheck], ["incidents", "open", "Open Incidents", AlertTriangle],
  ["field", "doors", "Doors Knocked", Footprints], ["briefs", "published", "Published Briefs", ShieldCheck],
  ["notifications", "unread", "Unread Alerts", Bell], ["reports", "ready", "Reports Ready", FileBarChart],
] as const;
export default function ExecutiveCommand() {
  const [data, setData] = useState<any>(null); const [loading, setLoading] = useState(false);
  const load = async () => { setLoading(true); try { const r=await fetch(`${BASE}api/command-centre/summary`); setData(await r.json()); } finally { setLoading(false); } };
  useEffect(()=>{load();},[]);
  return <div className="space-y-5">
    <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold tracking-widest">EXECUTIVE COMMAND CENTRE</h1><p className="font-mono text-[10px] text-muted-foreground">PHASE 6 · COUNTY-WIDE OPERATIONAL READINESS</p></div><button onClick={load} className="border border-border px-4 py-2 text-xs font-mono flex gap-2"><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>REFRESH</button></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([section,key,label,Icon])=><div key={label} className="bg-card border border-border p-5"><div className="flex justify-between"><div><p className="font-mono text-[10px] text-muted-foreground">{label.toUpperCase()}</p><p className="text-3xl font-bold mt-2">{data?.[section]?.[key] ?? 0}</p></div><Icon className="w-7 h-7 text-primary"/></div></div>)}</div>
    <div className="grid gap-4 lg:grid-cols-2"><section className="bg-card border border-border p-5"><h2 className="font-bold tracking-wider flex gap-2"><Activity className="w-4 h-4 text-primary"/>COMMAND PRIORITIES</h2><div className="mt-4 space-y-3 text-sm"><p>1. Resolve critical field incidents and assign accountable officers.</p><p>2. Complete pending ward and polling-station tasks.</p><p>3. Publish verified intelligence briefs and executive reports.</p><p>4. Review unread notifications and approval dependencies.</p></div></section><section className="bg-card border border-border p-5"><h2 className="font-bold tracking-wider">READINESS STATUS</h2><p className="mt-4 text-sm text-muted-foreground">This page consolidates Phase 4 operations, Phase 5 communications/intelligence and Phase 6 executive reporting. Values are live from Supabase.</p></section></div>
  </div>;
}
