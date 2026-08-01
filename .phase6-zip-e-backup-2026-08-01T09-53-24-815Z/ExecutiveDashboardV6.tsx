import {BarChart3,AlertTriangle,Clock,Users,ShieldCheck} from "lucide-react";

export default function ExecutiveDashboardV6(){
const cards=[
["Active Incidents","50",AlertTriangle],
["High Priority","12",ShieldCheck],
["Average SLA","31 min",Clock],
["Teams Online","8",Users],
["Estimated Reach","216,565",BarChart3],
];
return (
<div className="space-y-4">
<h2 className="text-xl font-semibold">Executive Operations Dashboard</h2>
<div className="grid gap-3 md:grid-cols-5">
{cards.map(([t,v,I])=>(
<div key={String(t)} className="border p-4">
<div className="flex justify-between"><span className="text-xs">{t}</span><I className="h-4 w-4"/></div>
<div className="mt-3 text-2xl font-bold">{v}</div>
</div>
))}
</div>

<div className="grid gap-4 lg:grid-cols-2">
<div className="border p-4">
<h3 className="font-semibold">Operational Priorities</h3>
<ul className="list-disc ml-5 mt-2 text-sm">
<li>Critical narratives awaiting response</li>
<li>Approval backlog</li>
<li>Platform engagement trends</li>
<li>Response SLA compliance</li>
<li>Regional incident distribution</li>
</ul>
</div>

<div className="border p-4">
<h3 className="font-semibold">Leadership Snapshot</h3>
<p className="text-sm mt-2">
This dashboard aggregates campaign intelligence, response queue activity,
incident metrics and operational readiness into a single executive view.
</p>
</div>
</div>
</div>);
}
