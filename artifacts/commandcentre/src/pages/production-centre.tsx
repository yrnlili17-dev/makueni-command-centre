import { useEffect, useState } from "react";
import { AlertOctagon, CheckCircle2, Cloud, DatabaseBackup, RefreshCw, ServerCog, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Summary = {
  checks: { total: number; passing: number; warning: number; failing: number };
  incidents: { total: number; open: number; critical: number };
};
type Check = { id: number; checkName: string; category: string; status: string; details?: string; owner?: string };

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  if (!contentType.includes("application/json")) throw new Error("The API route returned HTML instead of JSON.");
  return response.json() as Promise<T>;
}

export default function ProductionCentre() {
  const [summary, setSummary] = useState<Summary>({ checks: { total: 0, passing: 0, warning: 0, failing: 0 }, incidents: { total: 0, open: 0, critical: 0 } });
  const [checks, setChecks] = useState<Check[]>([]);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const [s, c] = await Promise.all([
        readJson<Summary>("/api/final-release/production/summary"),
        readJson<Check[]>("/api/final-release/production/checks"),
      ]);
      setSummary(s); setChecks(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load production status.");
    }
  };
  useEffect(() => { void load(); }, []);

  const defaults = [
    { checkName: "Render application health", category: "deployment", status: "passing", details: "Confirm /api/healthz responds successfully." },
    { checkName: "Database backup policy", category: "backup", status: "warning", details: "Confirm scheduled Supabase backups and recovery procedure." },
    { checkName: "Secrets excluded from Git", category: "security", status: "warning", details: "Remove .env from tracking and rotate exposed credentials." },
    { checkName: "Mobile responsive verification", category: "quality", status: "passing", details: "Test primary pages on phone, tablet and desktop." },
    { checkName: "Error and uptime monitoring", category: "monitoring", status: "pending", details: "Configure alerts for API failures and service downtime." },
  ];

  const seed = async () => {
    try {
      for (const item of defaults) {
        await fetch("/api/final-release/production/checks", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item),
        });
      }
      await load();
    } catch { setError("Unable to create the readiness checklist."); }
  };

  const statusVariant = (status: string) => status === "passing" ? "default" : status === "failing" ? "destructive" : "secondary";

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.24em] text-primary">PHASE 13</p>
          <h1 className="text-2xl font-bold sm:text-3xl">Production & Enterprise Centre</h1>
          <p className="text-sm text-muted-foreground">Deployment, security, backup, monitoring and operational readiness.</p>
        </div>
        <Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>

      {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Passing", summary.checks.passing, CheckCircle2],
          ["Warnings", summary.checks.warning, AlertOctagon],
          ["Failing", summary.checks.failing, ShieldCheck],
          ["Open Incidents", summary.incidents.open, ServerCog],
          ["Critical", summary.incidents.critical, Cloud],
        ].map(([label, value, Icon]) => (
          <Card key={String(label)}><CardContent className="p-4"><Icon className="mb-3 h-5 w-5 text-primary" /><p className="text-xs text-muted-foreground">{String(label)}</p><p className="text-2xl font-bold">{Number(value)}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Enterprise Readiness Checklist</CardTitle>
          {checks.length === 0 && <Button size="sm" onClick={() => void seed()}><DatabaseBackup className="mr-2 h-4 w-4" />Create checklist</Button>}
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {checks.length === 0 && <p className="col-span-full py-10 text-center text-sm text-muted-foreground">Create the standard production checklist to begin verification.</p>}
          {checks.map((check) => (
            <div className="rounded-md border p-4" key={check.id}>
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-semibold">{check.checkName}</p><p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{check.category}</p></div>
                <Badge variant={statusVariant(check.status)}>{check.status}</Badge>
              </div>
              {check.details && <p className="mt-3 text-sm text-muted-foreground">{check.details}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
