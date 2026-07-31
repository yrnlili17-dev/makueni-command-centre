import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Map,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CAMPAIGN_UI } from "../config/campaign-ui";
import { CAMPAIGN_OPERATIONS } from "../config/campaign-operations";

type WardMetric = {
  ward: string;
  constituency: string;
  contacts: number;
  volunteers: number;
  events: number;
  incidents: number;
  pollingStations: number;
  coverageScore: number;
  riskLevel: "low" | "medium" | "high";
};

type Summary = {
  wards: number;
  contacts: number;
  volunteers: number;
  pollingStations: number;
  averageCoverage: number;
  highRiskWards: number;
};

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  if (!contentType.includes("application/json")) {
    throw new Error("The GIS API returned a web page instead of JSON.");
  }
  return response.json() as Promise<T>;
}

export default function GisIntelligencePage() {
  const [summary, setSummary] = useState<Summary>({
    wards: 0,
    contacts: 0,
    volunteers: 0,
    pollingStations: 0,
    averageCoverage: 0,
    highRiskWards: 0,
  });
  const [rows, setRows] = useState<WardMetric[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const [nextSummary, nextRows] = await Promise.all([
        readJson<Summary>("/api/gis-intelligence/summary"),
        readJson<WardMetric[]>("/api/gis-intelligence/wards"),
      ]);
      setSummary(nextSummary);
      setRows(nextRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load GIS intelligence.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return rows;
    return rows.filter((row) =>
      [row.ward, row.constituency].some((field) =>
        field.toLowerCase().includes(value),
      ),
    );
  }, [query, rows]);

  const maxContacts = Math.max(1, ...filtered.map((row) => row.contacts));

  const cards = [
    ["Wards", summary.wards, Map],
    ["Contacts", summary.contacts, Users],
    ["Polling Stations", summary.pollingStations, MapPin],
    ["Average Coverage", `${summary.averageCoverage}%`, Activity],
    ["High-Risk Wards", summary.highRiskWards, AlertTriangle],
  ] as const;

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 pb-24 sm:pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.24em] text-primary">
  {CAMPAIGN_OPERATIONS.election}
</p>

<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
  {CAMPAIGN_UI.commandCentreTitle}
</h1>

<p className="mt-1 text-sm text-muted-foreground">
  {CAMPAIGN_OPERATIONS.commandCentre}
</p>

<p className="text-xs text-muted-foreground">
  {CAMPAIGN_OPERATIONS.constituencies} Constituencies •{" "}
  {CAMPAIGN_OPERATIONS.wards} Wards
</p>
        </div>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map(([label, value, Icon]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <Icon className="mb-3 h-5 w-5 text-primary" />
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold">
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <Card className="min-w-0">
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Ward Coverage Map</CardTitle>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search ward or constituency"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid min-h-[360px] grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((row) => {
                const intensity = Math.max(
                  8,
                  Math.round((row.contacts / maxContacts) * 100),
                );
                return (
                  <button
                    type="button"
                    key={`${row.constituency}-${row.ward}`}
                    className="group relative overflow-hidden rounded-md border p-4 text-left transition hover:border-primary/50 hover:bg-primary/5"
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/10 transition-all group-hover:bg-primary/15"
                      style={{ width: `${intensity}%` }}
                    />
                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{row.ward}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.constituency}
                          </p>
                        </div>
                        <Badge
                          variant={
                            row.riskLevel === "high"
                              ? "destructive"
                              : row.riskLevel === "medium"
                                ? "secondary"
                                : "default"
                          }
                        >
                          {row.riskLevel}
                        </Badge>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Contacts</span>
                          <p className="font-semibold">
                            {row.contacts.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Coverage</span>
                          <p className="font-semibold">{row.coverageScore}%</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Stations</span>
                          <p className="font-semibold">{row.pollingStations}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Incidents</span>
                          <p className="font-semibold">{row.incidents}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div className="col-span-full grid min-h-[280px] place-items-center text-center text-sm text-muted-foreground">
                  No ward intelligence matched your search.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Priority Wards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...rows]
                .sort((a, b) => a.coverageScore - b.coverageScore)
                .slice(0, 6)
                .map((row) => (
                  <div
                    key={`priority-${row.ward}`}
                    className="rounded-md border p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{row.ward}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.constituency}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-bold text-primary">
                        {row.coverageScore}%
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${row.coverageScore}%` }}
                      />
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommended Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-3 rounded-md border p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>
                  Assign field coordinators to every ward below 40% coverage.
                </p>
              </div>
              <div className="flex gap-3 rounded-md border p-3">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>
                  Convert imported contacts into verified supporters and volunteers.
                </p>
              </div>
              <div className="flex gap-3 rounded-md border p-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>
                  Confirm polling-station ownership and election-day agent coverage.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
