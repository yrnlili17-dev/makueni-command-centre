import { Bus, CheckCircle2, Home, PhoneCall, RefreshCw, Target, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

export default function GotvOperationsCentre() {
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const r=await fetch(`${BASE}api/turnout/operations-centre`,{credentials:"include"});
      if(!r.ok){const b=await r.json().catch(()=>({}));throw new Error(b.error??"Failed to load GOTV operations");}
      setData(await r.json());
    }catch(e){setError(e instanceof Error?e.message:"Unable to load GOTV");}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{void load();},[load]);

  const wards=useMemo(
    ()=>[...(data?.wards??[])].sort((a:any,b:any)=>b.mobilisationScore-a.mobilisationScore),
    [data]
  );
  const score=wards.length
    ? Math.round(wards.reduce((s:number,w:any)=>s+w.mobilisationScore,0)/wards.length)
    : 0;
  const s=data?.summary??{};

  return (
    <section className="space-y-4 border-b border-border/50 pb-5">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">PHASE 11B · GOTV OPERATIONS CENTRE</p>
          <p className="mt-1 text-xs text-muted-foreground">Household mobilisation, voter contact, volunteers and transport readiness.</p>
        </div>
        <button onClick={()=>void load()} className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]">
          <RefreshCw className={`h-3 w-3 ${loading?"animate-spin":""}`}/>REFRESH
        </button>
      </header>

      {error&&<div className="border border-red-400/40 p-3 font-mono text-[9px] text-red-400">[ GOTV_OPERATIONS_ERROR ] {error}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {[
          ["MOBILISATION",`${score}%`,Target],
          ["HOUSEHOLDS",s.households??0,Home],
          ["VISITED",s.householdsVisited??0,CheckCircle2],
          ["FOLLOW-UPS",s.followUps??0,PhoneCall],
          ["CONTACTS",s.contacts??0,PhoneCall],
          ["COMPLETED",s.contactsCompleted??0,CheckCircle2],
          ["ACTIVE VOLUNTEERS",s.activeVolunteers??0,Users],
          ["TRANSPORT COMPLETE",s.transportCompleted??0,Bus],
        ].map(([label,value,Icon]:any)=>(
          <article key={label} className="border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[7px] text-muted-foreground">{label}</p>
              <Icon className="h-3.5 w-3.5 text-primary"/>
            </div>
            <p className="mt-3 font-mono text-lg">{value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <article className="border border-border bg-card p-4">
          <p className="font-mono text-[10px] tracking-widest">WARD MOBILISATION RANKING</p>
          <div className="mt-4 space-y-3">
            {wards.map((w:any,i:number)=>(
              <div key={w.ward} className="border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[9px]">{String(i+1).padStart(2,"0")} · {String(w.ward).toUpperCase()}</p>
                    <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                      {Number(w.registered??0).toLocaleString("en-KE")} REGISTERED · TURNOUT TARGET {w.turnoutTarget}%
                    </p>
                  </div>
                  <span className="font-mono text-sm">{w.mobilisationScore}%</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="border border-border p-2"><p className="font-mono text-[7px] text-muted-foreground">HOUSEHOLDS</p><p className="mt-1 font-mono text-[9px]">{w.householdsVisited}/{w.householdTarget}</p></div>
                  <div className="border border-border p-2"><p className="font-mono text-[7px] text-muted-foreground">CONTACTS</p><p className="mt-1 font-mono text-[9px]">{w.contactsCompleted}/{w.contactTarget}</p></div>
                  <div className="border border-border p-2"><p className="font-mono text-[7px] text-muted-foreground">TRANSPORT</p><p className="mt-1 font-mono text-[9px]">{w.transportCompleted}/{w.transportRequests}</p></div>
                </div>
                <div className="mt-3 h-1.5 bg-secondary"><div className="h-full bg-primary" style={{width:`${w.mobilisationScore}%`}}/></div>
              </div>
            ))}
            {!loading&&wards.length===0&&<div className="border border-dashed border-border py-10 text-center font-mono text-[10px] text-muted-foreground">[ NO_GOTV_WARD_DATA ]</div>}
          </div>
        </article>

        <article className="border border-border bg-card p-4">
          <p className="font-mono text-[10px] tracking-widest">CONTACT & LOGISTICS QUEUES</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              ["PENDING CALLS",s.pendingCalls??0],
              ["PENDING SMS",s.pendingSms??0],
              ["PENDING WHATSAPP",s.pendingWhatsapp??0],
              ["TRANSPORT REQUESTS",s.transportRequests??0],
              ["TRANSPORT COMPLETE",s.transportCompleted??0],
              ["TOTAL VOLUNTEERS",s.volunteers??0],
            ].map(([label,value]:any)=>(
              <div key={label} className="border border-border p-3">
                <p className="font-mono text-[7px] text-muted-foreground">{label}</p>
                <p className="mt-2 font-mono text-lg">{Number(value).toLocaleString("en-KE")}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
