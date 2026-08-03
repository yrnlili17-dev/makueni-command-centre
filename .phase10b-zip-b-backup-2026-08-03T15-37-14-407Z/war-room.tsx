import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Radio, RefreshCw, Users, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Summary = {
  reports: number;
  turnout: number;
  candidateVotes: number;
  validVotes: number;
  pendingVerification: number;
  incidents: number;
};

type Report = {
  id: number;
  pollingStation: string;
  ward?: string;
  agentName: string;
  turnout: number;
  registeredVoters: number;
  candidateVotes: number;
  totalValidVotes: number;
  incidentLevel: string;
  verificationStatus: string;
  reportedAt: string;
};

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  if (!contentType.includes("application/json")) throw new Error("The server returned a web page instead of API data.");
  return response.json() as Promise<T>;
}

export default function WarRoom() {
  const [summary, setSummary] = useState<Summary>({ reports: 0, turnout: 0, candidateVotes: 0, validVotes: 0, pendingVerification: 0, incidents: 0 });
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ pollingStation: "", ward: "", agentName: "", turnout: "", registeredVoters: "", candidateVotes: "", totalValidVotes: "" });

  const load = async () => {
    try {
      setError("");
      const [s, r] = await Promise.all([
        readJson<Summary>("/api/final-release/war-room/summary"),
        readJson<Report[]>("/api/final-release/war-room/reports"),
      ]);
      setSummary(s);
      setReports(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load war-room data.");
    }
  };

  useEffect(() => { void load(); }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await readJson("/api/final-release/war-room/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          turnout: Number(form.turnout || 0),
          registeredVoters: Number(form.registeredVoters || 0),
          candidateVotes: Number(form.candidateVotes || 0),
          totalValidVotes: Number(form.totalValidVotes || 0),
        }),
      });
      setForm({ pollingStation: "", ward: "", agentName: "", turnout: "", registeredVoters: "", candidateVotes: "", totalValidVotes: "" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save report.");
    }
  };

  const cards = [
    ["Agent Reports", summary.reports, Radio],
    ["Turnout Captured", summary.turnout, Users],
    ["Candidate Votes", summary.candidateVotes, Vote],
    ["Pending Verification", summary.pendingVerification, ClipboardCheck],
    ["Reported Incidents", summary.incidents, AlertTriangle],
  ] as const;

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.24em] text-primary">PHASE 11</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Election War Room</h1>
          <p className="text-sm text-muted-foreground">Polling-station reporting, turnout, verification and incident control.</p>
        </div>
        <Button variant="outline" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>

      {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value, Icon]) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between p-4">
              <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{Number(value).toLocaleString()}</p></div>
              <Icon className="h-6 w-6 text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">Submit Agent Report</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submit}>
              {[
                ["pollingStation", "Polling station"],
                ["ward", "Ward"],
                ["agentName", "Agent name"],
                ["registeredVoters", "Registered voters"],
                ["turnout", "Turnout"],
                ["candidateVotes", "Candidate votes"],
                ["totalValidVotes", "Total valid votes"],
              ].map(([key, label]) => (
                <div className="space-y-1" key={key}>
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    required={["pollingStation", "agentName"].includes(key)}
                    inputMode={key.includes("Voters") || ["turnout", "candidateVotes", "totalValidVotes"].includes(key) ? "numeric" : undefined}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((old) => ({ ...old, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <Button className="w-full" type="submit"><CheckCircle2 className="mr-2 h-4 w-4" />Save Report</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader><CardTitle className="text-base">Latest Polling-Station Reports</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {reports.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No reports submitted yet.</p>}
            {reports.map((report) => (
              <div key={report.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{report.pollingStation}</p>
                    <p className="text-xs text-muted-foreground">{report.ward || "Ward not supplied"} · Agent: {report.agentName}</p>
                  </div>
                  <Badge variant={report.verificationStatus === "verified" ? "default" : "secondary"}>{report.verificationStatus}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <div><span className="text-muted-foreground">Turnout</span><p className="font-semibold">{report.turnout}</p></div>
                  <div><span className="text-muted-foreground">Registered</span><p className="font-semibold">{report.registeredVoters}</p></div>
                  <div><span className="text-muted-foreground">Candidate</span><p className="font-semibold">{report.candidateVotes}</p></div>
                  <div><span className="text-muted-foreground">Valid votes</span><p className="font-semibold">{report.totalValidVotes}</p></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
