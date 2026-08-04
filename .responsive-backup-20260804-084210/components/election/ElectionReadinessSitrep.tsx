import {
  Download,
  FileText,
  Printer,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

type OperationsPayload = {
  generatedAt: string;
  summary: {
    pollingStations: number;
    readyStations: number;
    openedStations: number;
    agents: number;
    agentsCheckedIn: number;
    vehicles: number;
    activeVehicles: number;
    observers: number;
    openEscalations: number;
  };
  wards: Array<{
    ward: string;
    totalStations: number;
    readyStations: number;
    openedStations: number;
    missingAgents: number;
    readiness: number;
    openingRate: number;
    riskScore: number;
  }>;
  stations: Array<any>;
  agents: Array<any>;
  vehicles: Array<any>;
  observers: Array<any>;
  escalations: Array<any>;
};

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function ElectionReadinessSitrep() {
  const [data, setData] = useState<OperationsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${BASE}api/election-day/operations-centre`,
        { credentials: "include" },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load readiness SITREP");
      }

      setData(await response.json());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load election readiness SITREP",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = data?.summary ?? {
    pollingStations: 0,
    readyStations: 0,
    openedStations: 0,
    agents: 0,
    agentsCheckedIn: 0,
    vehicles: 0,
    activeVehicles: 0,
    observers: 0,
    openEscalations: 0,
  };

  const stationReadiness = pct(
    summary.readyStations,
    summary.pollingStations,
  );
  const openingRate = pct(
    summary.openedStations,
    summary.pollingStations,
  );
  const agentCoverage = pct(
    summary.agentsCheckedIn,
    Math.max(summary.agents, summary.pollingStations),
  );
  const vehicleReadiness = pct(
    summary.activeVehicles,
    summary.vehicles,
  );
  const observerCoverage = pct(
    summary.observers,
    summary.pollingStations,
  );
  const incidentHealth =
    summary.openEscalations === 0
      ? 100
      : clamp(100 - summary.openEscalations * 12);

  const overallReadiness = clamp(
    stationReadiness * 0.35 +
      openingRate * 0.25 +
      agentCoverage * 0.2 +
      vehicleReadiness * 0.1 +
      observerCoverage * 0.05 +
      incidentHealth * 0.05,
  );

  const findings = useMemo(() => {
    const items: string[] = [];

    if (stationReadiness < 80) {
      items.push(
        `Polling-station readiness is ${stationReadiness}%, below the 80% command threshold.`,
      );
    }

    if (openingRate < 100) {
      items.push(
        `${summary.pollingStations - summary.openedStations} station(s) are not marked as opened.`,
      );
    }

    if (agentCoverage < 90) {
      items.push(
        `Agent coverage is ${agentCoverage}%; missing or unchecked-in agents require escalation.`,
      );
    }

    if (summary.openEscalations > 0) {
      items.push(
        `${summary.openEscalations} election escalation(s) remain open.`,
      );
    }

    if (summary.vehicles > 0 && vehicleReadiness < 70) {
      items.push(
        `Vehicle readiness is ${vehicleReadiness}%; transport deployment requires attention.`,
      );
    }

    if (observerCoverage < 70) {
      items.push(
        `Observer coverage is ${observerCoverage}%, leaving monitoring gaps.`,
      );
    }

    if (items.length === 0) {
      items.push(
        "No major election-readiness gaps detected in the current operations data.",
      );
    }

    return items;
  }, [
    agentCoverage,
    observerCoverage,
    openingRate,
    stationReadiness,
    summary,
    vehicleReadiness,
  ]);

  const recommendations = useMemo(() => {
    const items: string[] = [];

    if (stationReadiness < 80) {
      items.push(
        "Assign command owners to every station missing materials, device, connectivity or presiding-officer confirmation.",
      );
    }

    if (openingRate < 100) {
      items.push(
        "Escalate unopened polling stations immediately and require a time-stamped opening confirmation.",
      );
    }

    if (agentCoverage < 90) {
      items.push(
        "Deploy backup agents to missing stations and verify primary-agent contact channels.",
      );
    }

    if (summary.openEscalations > 0) {
      items.push(
        "Review all open escalations in the command meeting and assign resolution deadlines.",
      );
    }

    if (summary.vehicles > 0 && vehicleReadiness < 70) {
      items.push(
        "Confirm drivers, fuel and ward assignments before activating remaining vehicles.",
      );
    }

    if (items.length === 0) {
      items.push(
        "Maintain current readiness, continue 30-minute monitoring and preserve the escalation chain.",
      );
    }

    return items;
  }, [
    agentCoverage,
    openingRate,
    stationReadiness,
    summary,
    vehicleReadiness,
  ]);

  function downloadReport() {
    const wardRows = (data?.wards ?? []).map(
      (ward) =>
        `${ward.ward},${ward.totalStations},${ward.readyStations},${ward.openedStations},${ward.missingAgents},${ward.readiness},${ward.riskScore}`,
    );

    const text = [
      "ELECTION READINESS SITUATION REPORT",
      `Generated: ${new Date().toLocaleString("en-KE")}`,
      "",
      `Overall readiness: ${overallReadiness}%`,
      `Station readiness: ${stationReadiness}%`,
      `Opening rate: ${openingRate}%`,
      `Agent coverage: ${agentCoverage}%`,
      `Vehicle readiness: ${vehicleReadiness}%`,
      `Observer coverage: ${observerCoverage}%`,
      `Open escalations: ${summary.openEscalations}`,
      "",
      "KEY FINDINGS",
      ...findings.map((item, index) => `${index + 1}. ${item}`),
      "",
      "COMMAND RECOMMENDATIONS",
      ...recommendations.map((item, index) => `${index + 1}. ${item}`),
      "",
      "WARD READINESS",
      "Ward,Total Stations,Ready Stations,Opened Stations,Missing Agents,Readiness %,Risk Score",
      ...wardRows,
    ].join("\n");

    const blob = new Blob([text], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `election-readiness-sitrep-${new Date()
      .toISOString()
      .slice(0, 10)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">
            PHASE 11A · ELECTION READINESS SITREP
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Executive readiness assessment, findings and command recommendations.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            REFRESH
          </button>

          <button
            type="button"
            onClick={downloadReport}
            className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
          >
            <Download className="h-3 w-3" />
            DOWNLOAD
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
          >
            <Printer className="h-3 w-3" />
            PRINT
          </button>
        </div>
      </header>

      {error && (
        <div className="border border-red-400/40 bg-red-400/5 p-3 font-mono text-[9px] text-red-400">
          [ READINESS_SITREP_ERROR ] {error}
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
        <article className="border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] tracking-widest">
              OVERALL ELECTION READINESS
            </p>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>

          <p className="mt-8 text-center font-mono text-6xl">
            {overallReadiness}%
          </p>

          <div className="mt-8 grid grid-cols-2 gap-2">
            {[
              ["STATIONS", `${stationReadiness}%`],
              ["OPENING", `${openingRate}%`],
              ["AGENTS", `${agentCoverage}%`],
              ["VEHICLES", `${vehicleReadiness}%`],
              ["OBSERVERS", `${observerCoverage}%`],
              ["ESCALATIONS", String(summary.openEscalations)],
            ].map(([label, value]) => (
              <div key={label} className="border border-border p-3">
                <p className="font-mono text-[7px] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 font-mono text-sm">{value}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] tracking-widest">
              EXECUTIVE SITUATION REPORT
            </p>
            <FileText className="h-4 w-4 text-primary" />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="border border-border p-4">
              <p className="font-mono text-[9px] text-primary">
                KEY FINDINGS
              </p>
              <ol className="mt-3 space-y-3">
                {findings.map((item, index) => (
                  <li
                    key={item}
                    className="grid grid-cols-[24px_1fr] gap-2 text-xs"
                  >
                    <span className="font-mono text-[8px] text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="border border-border p-4">
              <p className="font-mono text-[9px] text-primary">
                COMMAND RECOMMENDATIONS
              </p>
              <ol className="mt-3 space-y-3">
                {recommendations.map((item, index) => (
                  <li
                    key={item}
                    className="grid grid-cols-[24px_1fr] gap-2 text-xs"
                  >
                    <span className="font-mono text-[8px] text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </article>
      </section>

      <article className="border border-border bg-card p-4">
        <p className="font-mono text-[10px] tracking-widest">
          WARD READINESS ANNEX
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Ward</th>
                <th className="px-3 py-2">Stations</th>
                <th className="px-3 py-2">Ready</th>
                <th className="px-3 py-2">Opened</th>
                <th className="px-3 py-2">Missing Agents</th>
                <th className="px-3 py-2">Readiness</th>
                <th className="px-3 py-2">Risk</th>
              </tr>
            </thead>
            <tbody>
              {(data?.wards ?? []).map((ward) => (
                <tr key={ward.ward} className="border-b border-border/50">
                  <td className="px-3 py-3 font-medium">{ward.ward}</td>
                  <td className="px-3 py-3">{ward.totalStations}</td>
                  <td className="px-3 py-3">{ward.readyStations}</td>
                  <td className="px-3 py-3">{ward.openedStations}</td>
                  <td className="px-3 py-3">{ward.missingAgents}</td>
                  <td className="px-3 py-3">{ward.readiness}%</td>
                  <td className="px-3 py-3">{ward.riskScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
