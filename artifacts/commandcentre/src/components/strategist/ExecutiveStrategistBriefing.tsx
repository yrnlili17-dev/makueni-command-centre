import { Activity, AlertTriangle, BrainCircuit, Database, Flag, MapPin, Target, TrendingUp, Users } from "lucide-react";
import { useMemo } from "react";

type Props = {
  overview: any;
  readiness: any;
  onPrompt: (prompt: string) => void;
};

function num(value: any) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function tone(score: number) {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

export default function ExecutiveStrategistBriefing({
  overview,
  readiness,
  onPrompt,
}: Props) {
  const metrics = overview?.metrics ?? {};
  const wards = overview?.wards ?? [];
  const total = Number(metrics.totalConstituents ?? 0);
  const phoneCoverage = pct(Number(metrics.phoneReady ?? 0), total);
  const planReadiness = Number(readiness?.overall ?? 0);
  const dataReadiness = Number(metrics.dataReadiness ?? 0);
  const operationalReadiness = Number(metrics.operationalReadiness ?? 0);

  const classified =
    Number(metrics.strongSupport ?? 0) +
    Number(metrics.leaningSupport ?? 0) +
    Number(metrics.undecided ?? 0) +
    Number(metrics.opposed ?? 0);

  const supportCoverage = pct(classified, total);
  const health = Math.round(
    dataReadiness * 0.3 +
      operationalReadiness * 0.25 +
      planReadiness * 0.25 +
      phoneCoverage * 0.15 +
      supportCoverage * 0.05,
  );

  const priorityWards = useMemo(
    () =>
      [...wards]
        .sort(
          (a, b) =>
            Number(a.ward_readiness ?? 0) -
            Number(b.ward_readiness ?? 0),
        )
        .slice(0, 5),
    [wards],
  );

  const recommendations: string[] = [];
  if (planReadiness < 60) recommendations.push(`Escalate campaign-plan execution: readiness is ${planReadiness}%.`);
  if (phoneCoverage < 70) recommendations.push(`Prioritize contact recovery: phone coverage is ${phoneCoverage}%.`);
  if (supportCoverage < 50) recommendations.push(`Expand support classification: only ${supportCoverage}% of records are classified.`);
  if (Number(metrics.activeVolunteers ?? 0) === 0) recommendations.push("Activate volunteer recruitment and deployment.");
  if (Number(metrics.messagesSent ?? 0) === 0) recommendations.push("Launch measurable campaign messaging.");
  if (Number(metrics.openThreats ?? 0) > 0) recommendations.push(`Review ${num(metrics.openThreats)} open intelligence threats.`);
  if (recommendations.length === 0) recommendations.push("Maintain the current execution pace and close remaining gaps.");

  const cards = [
    ["CAMPAIGN HEALTH", health, Activity],
    ["CAMPAIGN READINESS", planReadiness, Flag],
    ["DATA READINESS", dataReadiness, Database],
    ["OPERATIONAL READINESS", operationalReadiness, TrendingUp],
    ["PHONE COVERAGE", phoneCoverage, Users],
    ["SUPPORT INTELLIGENCE", supportCoverage, Target],
    ["OPEN THREATS", Number(metrics.openThreats ?? 0), AlertTriangle],
  ] as const;

  const prompts = [
    "Give me today's top 5 strategic priorities using the live campaign data.",
    "Create a 7-day action plan for the weakest wards.",
    "Recommend how to deploy volunteers and field resources this week.",
    "Draft a 30-day campaign strategy for Makueni County.",
    "Assess our current narrative threats and recommend counter-moves.",
    "Prepare a rally speech based on our current campaign priorities.",
  ];

  return (
    <section className="space-y-4 border-b border-border/50 bg-background/40 p-4 md:p-6">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">EXECUTIVE STRATEGIST BRIEFING</p>
          <p className="mt-1 text-xs text-muted-foreground">Live campaign health, priority wards and recommended executive action.</p>
        </div>
        <div className={`border border-border px-3 py-2 font-mono text-[9px] ${tone(health)}`}>
          CAMPAIGN HEALTH · {health}%
        </div>
      </header>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {cards.map(([label, value, Icon]) => (
          <article key={label} className="border border-border bg-card p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-[7px] text-muted-foreground">{label}</p>
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className={`mt-3 font-mono text-lg ${label === "OPEN THREATS" ? "" : tone(Number(value))}`}>
              {label === "OPEN THREATS" ? num(value) : `${value}%`}
            </p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[10px] tracking-widest">PRIORITY WARDS</p>
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-4 space-y-2">
            {priorityWards.map((ward: any, index: number) => (
              <button
                key={ward.ward}
                type="button"
                onClick={() => onPrompt(`Create a focused strategy for ${ward.ward} ward using the live campaign data.`)}
                className="flex w-full items-center justify-between border border-border p-3 text-left transition hover:border-primary/60"
              >
                <div>
                  <p className="font-mono text-[9px]">{String(index + 1).padStart(2, "0")} · {String(ward.ward).toUpperCase()}</p>
                  <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                    {num(ward.constituents)} CONSTITUENTS · {pct(Number(ward.phone_ready ?? 0), Number(ward.constituents ?? 0))}% PHONE
                  </p>
                </div>
                <span className={`font-mono text-sm ${tone(Number(ward.ward_readiness ?? 0))}`}>
                  {Number(ward.ward_readiness ?? 0)}%
                </span>
              </button>
            ))}
          </div>
        </article>

        <article className="border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[10px] tracking-widest">RECOMMENDED EXECUTIVE ACTIONS</p>
            <BrainCircuit className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-4 space-y-2">
            {recommendations.slice(0, 6).map((item, index) => (
              <button
                key={item}
                type="button"
                onClick={() => onPrompt(`Turn this recommendation into an operational action plan: ${item}`)}
                className="grid w-full grid-cols-[28px_1fr] gap-3 border border-border p-3 text-left transition hover:border-primary/60"
              >
                <span className="flex h-7 w-7 items-center justify-center border border-border font-mono text-[8px] text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="text-xs leading-relaxed">{item}</p>
              </button>
            ))}
          </div>
        </article>
      </div>

      <article className="border border-border bg-card p-4">
        <p className="font-mono text-[10px] tracking-widest">QUICK STRATEGY ACTIONS</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onPrompt(prompt)}
              className="border border-border p-3 text-left text-xs transition hover:border-primary/60"
            >
              {prompt}
            </button>
          ))}
        </div>
      </article>
    </section>
  );
}
