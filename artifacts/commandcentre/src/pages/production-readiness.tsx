import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Check = {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
};

type Diagnostics = {
  status: "healthy" | "degraded";
  environment: string;
  timestamp: string;
  uptimeSeconds: number;
  checks: Check[];
};

async function loadDiagnostics(): Promise<Diagnostics> {
  const response = await fetch("/api/production-readiness");
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok) throw new Error(`Diagnostics failed (${response.status}).`);
  if (!type.includes("application/json")) {
    throw new Error("Diagnostics endpoint returned HTML instead of JSON.");
  }
  return response.json() as Promise<Diagnostics>;
}

export default function ProductionReadinessPage() {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [error, setError] = useState("");

  const refresh = async () => {
    try {
      setError("");
      setData(await loadDiagnostics());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load diagnostics.");
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const passed = data?.checks.filter((check) => check.ok).length ?? 0;
  const total = data?.checks.length ?? 0;
  const percentage = total ? Math.round((passed / total) * 100) : 0;

  const cards = [
    ["Overall Readiness", `${percentage}%`, Activity],
    ["Checks Passed", `${passed}/${total}`, CheckCircle2],
    ["Environment", data?.environment ?? "unknown", Server],
    ["Uptime", `${Math.floor((data?.uptimeSeconds ?? 0) / 60)} min`, HardDrive],
  ] as const;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-24 sm:pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.24em] text-primary">V2.0-D</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Production Readiness
            </h1>
            <Badge variant={data?.status === "healthy" ? "default" : "destructive"}>
              {data?.status ?? "checking"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Deployment health, configuration, security and responsive-readiness checks.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refresh()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Run checks
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <Icon className="mb-3 h-5 w-5 text-primary" />
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 break-words text-xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live Application Checks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.checks ?? []).map((check) => (
              <div
                key={check.key}
                className="flex items-start gap-3 rounded-md border p-4"
              >
                {check.ok ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                )}
                <div className="min-w-0">
                  <p className="font-medium">{check.label}</p>
                  <p className="mt-1 break-words text-xs text-muted-foreground">
                    {check.detail}
                  </p>
                </div>
              </div>
            ))}

            {!data && !error && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Running production checks…
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Production Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="flex gap-2">
                <Database className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Use managed PostgreSQL with backups and restricted credentials.
              </p>
              <p className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Keep secrets only in Render environment variables.
              </p>
              <p className="flex gap-2">
                <Server className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Require successful frontend and backend builds before deployment.
              </p>
              <p className="flex gap-2">
                <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Test key workflows on phone, tablet and desktop.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-primary" />
                Final Release Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Do not deploy when either workspace build fails.</p>
              <p>Do not commit `.env`, credentials, logs or database exports.</p>
              <p>Back up the database before schema migrations.</p>
              <p>Use small stabilization patches after this release.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
