import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  Clock3,
  Flag,
  MapPin,
  RefreshCw,
  ShieldAlert,
  UploadCloud,
  Users,
  Vote,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CAMPAIGN_UI } from "../config/campaign-ui";
import { CAMPAIGN_OPERATIONS } from "../config/campaign-operations";
import ElectionOperationsCentre from "@/components/election/ElectionOperationsCentre";
import LiveElectionCommandBoard from "@/components/election/LiveElectionCommandBoard";
import ResultsIntelligenceCentre from "@/components/election/ResultsIntelligenceCentre";
import LiveCountyTallyCentre from "@/components/election/LiveCountyTallyCentre";
import ResultsVerificationCentre from "@/components/election/ResultsVerificationCentre";
import ResultsFormsEvidenceCentre from "@/components/election/ResultsFormsEvidenceCentre";
import ConstituencyWardResultsDashboard from "@/components/election/ConstituencyWardResultsDashboard";
import CandidateIntelligenceDashboard from "@/components/election/CandidateIntelligenceDashboard";
import ResultsPredictionScenarioIntelligence from "@/components/election/ResultsPredictionScenarioIntelligence";
import StatisticalAnomalyDetectionCentre from "@/components/election/StatisticalAnomalyDetectionCentre";
import ResultsSituationRoomDecisionConsole from "@/components/election/ResultsSituationRoomDecisionConsole";
import ExecutiveResultsCommandIntelligence from "@/components/election/ExecutiveResultsCommandIntelligence";
import ElectionReadinessSitrep from "@/components/election/ElectionReadinessSitrep";

type WarRoomSummary = {
  registeredVoters: number;
  turnoutReported: number;
  turnoutPercentage: number;
  pollingStations: number;
  stationsReported: number;
  agentsAssigned: number;
  agentsCheckedIn: number;
  openIncidents: number;
  criticalIncidents: number;
  resultsSubmitted: number;
  resultsVerified: number;
};

type StationStatus = {
  id: string;
  station: string;
  ward: string;
  constituency: string;
  registeredVoters: number;
  turnout: number;
  agentStatus: "not-assigned" | "assigned" | "checked-in";
  resultStatus: "not-started" | "submitted" | "verified" | "disputed";
  incidentCount: number;
  lastUpdated: string | null;
};

type Incident = {
  id: string;
  title: string;
  station: string;
  ward: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved";
  createdAt: string;
};

type ResultRecord = {
  id: string;
  station: string;
  ward: string;
  votes: number;
  rejected: number;
  status: "submitted" | "verified" | "disputed";
  submittedAt: string;
};

type Payload = {
  summary: WarRoomSummary;
  stations: StationStatus[];
  incidents: Incident[];
  results: ResultRecord[];
  mode: "foundation" | "live";
};

async function getPayload(): Promise<Payload> {
  const response = await fetch("/api/election-war-room");
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) throw new Error(`War Room request failed (${response.status}).`);
  if (!contentType.includes("application/json")) {
    throw new Error("War Room API returned a web page instead of JSON.");
  }
  return response.json() as Promise<Payload>;
}

function formatTime(value: string | null) {
  if (!value) return "No report";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function ElectionWarRoomPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activeView, setActiveView] = useState<
    "stations" | "incidents" | "results"
  >("stations");

  const load = async () => {
    try {
      setError("");
      setData(await getPayload());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load Election War Room.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const stations = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return data?.stations ?? [];
    return (data?.stations ?? []).filter((row) =>
      [row.station, row.ward, row.constituency].some((field) =>
        field.toLowerCase().includes(value),
      ),
    );
  }, [data, query]);

  const summary = data?.summary ?? {
    registeredVoters: 0,
    turnoutReported: 0,
    turnoutPercentage: 0,
    pollingStations: 0,
    stationsReported: 0,
    agentsAssigned: 0,
    agentsCheckedIn: 0,
    openIncidents: 0,
    criticalIncidents: 0,
    resultsSubmitted: 0,
    resultsVerified: 0,
  };

  const cards = [
    {
      label: "Turnout",
      value: `${summary.turnoutPercentage}%`,
      detail: `${summary.turnoutReported.toLocaleString()} reported`,
      icon: Vote,
    },
    {
      label: "Stations Reporting",
      value: `${summary.stationsReported}/${summary.pollingStations}`,
      detail: "polling stations",
      icon: MapPin,
    },
    {
      label: "Agents Checked In",
      value: `${summary.agentsCheckedIn}/${summary.agentsAssigned}`,
      detail: "assigned agents",
      icon: Users,
    },
    {
      label: "Open Incidents",
      value: summary.openIncidents,
      detail: `${summary.criticalIncidents} critical`,
      icon: ShieldAlert,
    },
    {
      label: "Verified Results",
      value: `${summary.resultsVerified}/${summary.resultsSubmitted}`,
      detail: "submitted forms",
      icon: BadgeCheck,
    },
  ];

  return (
    <div className="mx-auto max-w-[1700px] space-y-5 pb-24 sm:pb-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs tracking-[0.24em] text-primary">
              V2.0-C
            </p>
            <Badge variant={data?.mode === "live" ? "default" : "secondary"}>
              {data?.mode === "live" ? "LIVE MODE" : "FOUNDATION MODE"}
            </Badge>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Election War Room
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Election-day turnout, agent check-in, incident escalation, parallel
            tally and results verification in one command dashboard.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button>
            <UploadCloud className="mr-2 h-4 w-4" />
            Submit Form
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {data?.mode === "foundation" && (
        <div className="flex gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold">War Room foundation is active.</p>
            <p className="mt-1 text-muted-foreground">
              The dashboard and secure API route are installed. Live election
              records will populate after the production database tables are
              activated during final deployment hardening.
            </p>
          </div>
        </div>
      )}

      <LiveElectionCommandBoard />

      <ResultsIntelligenceCentre />

      <LiveCountyTallyCentre />

      <ResultsVerificationCentre />

      <ResultsFormsEvidenceCentre />

      <ConstituencyWardResultsDashboard />

      <CandidateIntelligenceDashboard />

      <ResultsPredictionScenarioIntelligence />

      <StatisticalAnomalyDetectionCentre />

      <ResultsSituationRoomDecisionConsole />

      <ExecutiveResultsCommandIntelligence />

      <ElectionReadinessSitrep />

      <ElectionOperationsCentre />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map(({ label, value, detail, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <Icon className="mb-3 h-5 w-5 text-primary" />
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold">
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Election Operations</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Switch between station reporting, incidents and tally verification.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["stations", "Polling Stations", MapPin],
              ["incidents", "Incidents", ShieldAlert],
              ["results", "Results", BarChart3],
            ].map(([key, label, Icon]) => (
              <Button
                key={String(key)}
                size="sm"
                variant={activeView === key ? "default" : "outline"}
                onClick={() =>
                  setActiveView(key as "stations" | "incidents" | "results")
                }
              >
                <Icon className="mr-2 h-4 w-4" />
                {String(label)}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {activeView === "stations" && (
            <div>
              <div className="border-b p-4">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search polling station, ward or constituency"
                  className="max-w-md"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-secondary/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Polling Station</th>
                      <th className="px-4 py-3">Ward</th>
                      <th className="px-4 py-3">Registered</th>
                      <th className="px-4 py-3">Turnout</th>
                      <th className="px-4 py-3">Agent</th>
                      <th className="px-4 py-3">Result</th>
                      <th className="px-4 py-3">Incidents</th>
                      <th className="px-4 py-3">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stations.map((row) => (
                      <tr key={row.id} className="border-t">
                        <td className="px-4 py-3">
                          <p className="font-medium">{row.station}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.constituency}
                          </p>
                        </td>
                        <td className="px-4 py-3">{row.ward}</td>
                        <td className="px-4 py-3">
                          {row.registeredVoters.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">{row.turnout.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{row.agentStatus}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              row.resultStatus === "verified"
                                ? "default"
                                : row.resultStatus === "disputed"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {row.resultStatus}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">{row.incidentCount}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatTime(row.lastUpdated)}
                        </td>
                      </tr>
                    ))}

                    {stations.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-16 text-center text-muted-foreground"
                        >
                          No polling-station reports are available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeView === "incidents" && (
            <div className="grid gap-3 p-4 lg:grid-cols-2">
              {(data?.incidents ?? []).map((incident) => (
                <div key={incident.id} className="rounded-md border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{incident.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {incident.station} · {incident.ward}
                      </p>
                    </div>
                    <Badge
                      variant={
                        incident.severity === "critical" ||
                        incident.severity === "high"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {incident.severity}
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {formatTime(incident.createdAt)}
                    </span>
                    <Badge variant="outline">{incident.status}</Badge>
                  </div>
                </div>
              ))}

              {(data?.incidents.length ?? 0) === 0 && (
                <div className="col-span-full grid min-h-64 place-items-center text-center text-sm text-muted-foreground">
                  No incidents have been reported.
                </div>
              )}
            </div>
          )}

          {activeView === "results" && (
            <div className="grid gap-3 p-4 lg:grid-cols-2">
              {(data?.results ?? []).map((result) => (
                <div key={result.id} className="rounded-md border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{result.station}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {result.ward}
                      </p>
                    </div>
                    <Badge
                      variant={
                        result.status === "verified"
                          ? "default"
                          : result.status === "disputed"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {result.status}
                    </Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Votes</p>
                      <p className="font-semibold">
                        {result.votes.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Rejected</p>
                      <p className="font-semibold">
                        {result.rejected.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Submitted</p>
                      <p className="font-semibold">
                        {new Date(result.submittedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {(data?.results.length ?? 0) === 0 && (
                <div className="col-span-full grid min-h-64 place-items-center text-center text-sm text-muted-foreground">
                  No result forms have been submitted.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="h-4 w-4 text-primary" />
              Opening Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              Confirm every polling station opened.
            </p>
            <p className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              Verify agent check-in and contact channels.
            </p>
            <p className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              Escalate missing materials immediately.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flag className="h-4 w-4 text-primary" />
              Tally Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Require an uploaded official result form before verification.</p>
            <p>Separate data entry from final verification permissions.</p>
            <p>Record every edit and dispute in the audit log.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Escalation Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Critical incidents require command-centre acknowledgement.</p>
            <p>Disputed results remain excluded from verified totals.</p>
            <p>Unresponsive agents are reassigned through field operations.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
