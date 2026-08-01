import { Activity, AlertTriangle, BarChart3, CheckCircle, Clock, Loader2, RefreshCw, ShieldAlert, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Metrics = { activeIncidents:number; highPriority:number; awaitingApproval:number; publishedToday:number; duplicateAttacks:number; estimatedReach:number; averageResponseMinutes:number };
type Incident = { incident_code:string; status:string; priority?:string|null; assigned_to?:string|null; topic?:string; mention?:{ platform?:string|null }; response?:{ status?:string|null }|null };
type Health = { status:string; phase6:{ incidentEngine:boolean; localIntelligence:boolean; executiveDashboard:boolean }; database:string; checkedAt:string };

const EMPTY: Metrics = { activeIncidents:0, highPriority:0, awaitingApproval:0, publishedToday:0, duplicateAttacks:0, estimatedReach:0, averageResponseMinutes:0 };

async function getJson<T>(url:string): Promise<T> {
  const response = await fetch(url,{ credentials:"include" });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if(!response.ok) throw new Error(data?.error ?? `Request failed (${response.status})`);
  return data as T;
}

function fmt(value:number){ return Number(value ?? 0).toLocaleString("en-KE"); }

function StatCard({label,value,icon:Icon}:{label:string;value:string|number;icon:typeof Activity}){
  return <div className="border border-border bg-card p-4"><div className="flex items-center justify-between"><p className="font-mono text-[9px] tracking-widest text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-primary"/></div><p className="mt-3 font-mono text-2xl font-semibold">{value}</p></div>;
}

export default function ExecutiveDashboardV6(){
  const [metrics,setMetrics]=useState<Metrics>(EMPTY);
  const [incidents,setIncidents]=useState<Incident[]>([]);
  const [health,setHealth]=useState<Health|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);

  const load=useCallback(async()=>{
    setLoading(true); setError(null);
    try{
      const [metricData,incidentData,healthData]=await Promise.all([
        getJson<Metrics>("/api/intelligence/incidents/metrics"),
        getJson<Incident[]>("/api/intelligence/incidents"),
        getJson<Health>("/api/phase6-health"),
      ]);
      setMetrics(metricData); setIncidents(incidentData); setHealth(healthData);
    }catch(cause){ setError(cause instanceof Error ? cause.message : "Failed to load dashboard"); }
    finally{ setLoading(false); }
  },[]);

  useEffect(()=>{ void load(); },[load]);

  const platformDistribution=useMemo(()=>{ const map=new Map<string,number>(); for(const i of incidents){ const key=i.mention?.platform ?? "Unknown"; map.set(key,(map.get(key)??0)+1); } return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6); },[incidents]);
  const threatDistribution=useMemo(()=>{ const map=new Map<string,number>(); for(const i of incidents){ const key=String(i.priority ?? "normal").toUpperCase(); map.set(key,(map.get(key)??0)+1); } return [...map.entries()].sort((a,b)=>b[1]-a[1]); },[incidents]);
  const topIssues=useMemo(()=>{ const map=new Map<string,number>(); for(const i of incidents){ const key=i.topic ?? "Makueni development priorities"; map.set(key,(map.get(key)??0)+1); } return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5); },[incidents]);
  const teamWorkload=useMemo(()=>{ const map=new Map<string,number>(); for(const i of incidents){ const key=i.assigned_to ?? "Unassigned"; map.set(key,(map.get(key)??0)+1); } return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6); },[incidents]);
  const approvalBacklog=useMemo(()=>incidents.filter(i=>i.response?.status==="pending_approval" || i.status==="awaiting_approval"),[incidents]);
  const sla=metrics.averageResponseMinutes<=0?0:metrics.averageResponseMinutes<=15?100:metrics.averageResponseMinutes<=30?80:metrics.averageResponseMinutes<=60?55:30;

  if(loading) return <div className="flex min-h-[420px] items-center justify-center border border-border bg-card"><Loader2 className="h-7 w-7 animate-spin text-primary"/></div>;

  return <div className="space-y-4">
    <section className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-mono text-[10px] tracking-widest text-primary">PHASE 6 EXECUTIVE OPERATIONS</p><h2 className="mt-1 text-xl font-semibold">Live Intelligence Dashboard</h2><p className="mt-1 text-xs text-muted-foreground">Real-time incident, response, reach, workload and readiness view.</p></div><div className="flex items-center gap-2"><span className={`border px-3 py-1.5 font-mono text-[9px] ${health?.status==="ok"?"border-green-400/40 text-green-400":"border-yellow-400/40 text-yellow-400"}`}>SYSTEM {health?.status?.toUpperCase() ?? "UNKNOWN"}</span><button onClick={()=>void load()} className="flex items-center gap-2 border border-border px-3 py-1.5 font-mono text-[10px] hover:bg-secondary"><RefreshCw className="h-3 w-3"/>REFRESH</button></div></section>
    {error && <div className="border border-red-400/30 bg-red-400/10 p-3 font-mono text-xs text-red-400">{error}</div>}
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      <StatCard label="ACTIVE INCIDENTS" value={metrics.activeIncidents} icon={Activity}/><StatCard label="HIGH PRIORITY" value={metrics.highPriority} icon={ShieldAlert}/><StatCard label="APPROVAL BACKLOG" value={metrics.awaitingApproval} icon={Clock}/><StatCard label="PUBLISHED TODAY" value={metrics.publishedToday} icon={CheckCircle}/><StatCard label="DUPLICATE ATTACKS" value={metrics.duplicateAttacks} icon={AlertTriangle}/><StatCard label="ESTIMATED REACH" value={fmt(metrics.estimatedReach)} icon={BarChart3}/><StatCard label="AVG RESPONSE" value={`${metrics.averageResponseMinutes} MIN`} icon={Clock}/>
    </section>
    <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <div className="border border-border bg-card p-4"><h3 className="font-mono text-[10px] tracking-widest">PLATFORM DISTRIBUTION</h3><div className="mt-4 space-y-3">{platformDistribution.map(([p,c])=><div key={p}><div className="mb-1 flex justify-between text-xs"><span>{p}</span><span className="font-mono">{c}</span></div><div className="h-1.5 bg-secondary"><div className="h-1.5 bg-primary" style={{width:`${Math.max(4,(c/Math.max(1,incidents.length))*100)}%`}}/></div></div>)}</div></div>
      <div className="border border-border bg-card p-4"><h3 className="font-mono text-[10px] tracking-widest">THREAT DISTRIBUTION</h3><div className="mt-4 space-y-2">{threatDistribution.map(([t,c])=><div key={t} className="flex items-center justify-between border border-border px-3 py-2"><span className="font-mono text-[10px]">{t}</span><span className="font-mono text-sm">{c}</span></div>)}</div></div>
      <div className="border border-border bg-card p-4"><h3 className="font-mono text-[10px] tracking-widest">RESPONSE SLA</h3><div className="mt-5 text-center"><p className="font-mono text-4xl font-semibold">{sla}%</p><p className="mt-2 text-xs text-muted-foreground">Average response time: {metrics.averageResponseMinutes} minutes</p><div className="mt-4 h-2 bg-secondary"><div className="h-2 bg-primary" style={{width:`${sla}%`}}/></div></div></div>
      <div className="border border-border bg-card p-4"><h3 className="font-mono text-[10px] tracking-widest">TOP ISSUES</h3><div className="mt-4 space-y-2">{topIssues.map(([issue,c],idx)=><div key={issue} className="grid grid-cols-[28px_1fr_auto] items-center gap-2 border-b border-border pb-2 text-xs"><span className="font-mono text-primary">{idx+1}</span><span>{issue}</span><span className="font-mono">{c}</span></div>)}</div></div>
      <div className="border border-border bg-card p-4"><h3 className="font-mono text-[10px] tracking-widest">TEAM WORKLOAD</h3><div className="mt-4 space-y-2">{teamWorkload.map(([person,c])=><div key={person} className="flex items-center justify-between border border-border px-3 py-2"><span className="flex items-center gap-2 text-xs"><Users className="h-3 w-3 text-primary"/>{person}</span><span className="font-mono">{c}</span></div>)}</div></div>
      <div className="border border-border bg-card p-4"><h3 className="font-mono text-[10px] tracking-widest">APPROVAL BACKLOG</h3><div className="mt-4 space-y-2">{approvalBacklog.slice(0,6).map(i=><div key={i.incident_code} className="border border-border p-3"><div className="flex justify-between"><span className="font-mono text-[9px] text-primary">{i.incident_code}</span><span className="font-mono text-[9px]">{(i.priority??"normal").toUpperCase()}</span></div><p className="mt-1 truncate text-xs text-muted-foreground">{i.topic}</p></div>)}{approvalBacklog.length===0 && <p className="py-6 text-center font-mono text-xs text-muted-foreground">[ NO_APPROVAL_BACKLOG ]</p>}</div></div>
    </section>
    <section className="border border-border bg-card p-4"><h3 className="font-mono text-[10px] tracking-widest">PHASE 6 SYSTEM VALIDATION</h3><div className="mt-4 grid gap-3 sm:grid-cols-3">{[["Incident Engine",health?.phase6.incidentEngine],["Local Intelligence",health?.phase6.localIntelligence],["Executive Dashboard",health?.phase6.executiveDashboard]].map(([label,ready])=><div key={String(label)} className="flex items-center justify-between border border-border px-3 py-3"><span className="text-xs">{String(label)}</span><span className={`font-mono text-[9px] ${ready?"text-green-400":"text-red-400"}`}>{ready?"READY":"MISSING"}</span></div>)}</div></section>
  </div>;
}
