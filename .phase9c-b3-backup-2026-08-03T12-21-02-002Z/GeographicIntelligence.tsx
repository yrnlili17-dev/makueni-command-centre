import {
  AlertTriangle,
  BarChart3,
  MapPin,
  Phone,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo } from "react";

type ConstituencyRow = {
  constituency: string;
  constituents: number;
  phone_ready: number;
  email_ready: number;
  women: number;
  men: number;
  youth: number;
  wards: number;
  polling_stations: number;
  strong_support: number;
  leaning_support: number;
  undecided: number;
  opposed: number;
  missing_phone: number;
  missing_ward: number;
  constituency_readiness: number;
};

type Props = {
  constituencies: ConstituencyRow[];
};

const BASE = import.meta.env.BASE_URL;

const MAKUENI_CONSTITUENCIES = [
  "Mbooni",
  "Kaiti",
  "Kilome",
  "Makueni",
  "Kibwezi East",
  "Kibwezi West",
];

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function readinessLabel(score: number) {
  if (score >= 80) return "READY";
  if (score >= 60) return "STABLE";
  if (score >= 40) return "NEEDS ATTENTION";
  return "CRITICAL";
}

function readinessClass(score: number) {
  if (score >= 80) return "text-green-400 border-green-400/40";
  if (score >= 60) return "text-yellow-400 border-yellow-400/40";
  if (score >= 40) return "text-orange-400 border-orange-400/40";
  return "text-red-400 border-red-400/40";
}

function openConstituency(constituency: string) {
  const query = new URLSearchParams({ constituency });
  window.location.assign(`${BASE}campaign-database?${query.toString()}`);
}

export default function GeographicIntelligence({
  constituencies,
}: Props) {
  const rows = useMemo(() => {
    const byName = new Map(
      constituencies.map((row) => [
        row.constituency.trim().toLowerCase(),
        row,
      ]),
    );

    return MAKUENI_CONSTITUENCIES.map((name) => {
      const live = byName.get(name.toLowerCase());

      return (
        live ?? {
          constituency: name,
          constituents: 0,
          phone_ready: 0,
          email_ready: 0,
          women: 0,
          men: 0,
          youth: 0,
          wards: 0,
          polling_stations: 0,
          strong_support: 0,
          leaning_support: 0,
          undecided: 0,
          opposed: 0,
          missing_phone: 0,
          missing_ward: 0,
          constituency_readiness: 0,
        }
      );
    });
  }, [constituencies]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (summary, row) => ({
          constituents: summary.constituents + Number(row.constituents ?? 0),
          wards: summary.wards + Number(row.wards ?? 0),
          pollingStations:
            summary.pollingStations + Number(row.polling_stations ?? 0),
          readinessWeighted:
            summary.readinessWeighted +
            Number(row.constituency_readiness ?? 0) *
              Number(row.constituents ?? 0),
        }),
        {
          constituents: 0,
          wards: 0,
          pollingStations: 0,
          readinessWeighted: 0,
        },
      ),
    [rows],
  );

  const overallReadiness = totals.constituents
    ? Math.round(totals.readinessWeighted / totals.constituents)
    : 0;

  const ranked = useMemo(() => {
    const largest = [...rows].sort(
      (a, b) => b.constituents - a.constituents,
    )[0];
    const highestReadiness = [...rows].sort(
      (a, b) =>
        b.constituency_readiness - a.constituency_readiness,
    )[0];
    const lowestReadiness = [...rows].sort(
      (a, b) =>
        a.constituency_readiness - b.constituency_readiness,
    )[0];
    const largestYouth = [...rows].sort(
      (a, b) => b.youth - a.youth,
    )[0];
    const strongestSupport = [...rows].sort(
      (a, b) =>
        percentage(
          b.strong_support + b.leaning_support,
          b.constituents,
        ) -
        percentage(
          a.strong_support + a.leaning_support,
          a.constituents,
        ),
    )[0];
    const lowestPhone = [...rows].sort(
      (a, b) =>
        percentage(a.phone_ready, a.constituents) -
        percentage(b.phone_ready, b.constituents),
    )[0];

    return {
      largest,
      highestReadiness,
      lowestReadiness,
      largestYouth,
      strongestSupport,
      lowestPhone,
    };
  }, [rows]);

  const rankings = [
    {
      label: "LARGEST CONSTITUENCY",
      value: ranked.largest?.constituency ?? "—",
      note: `${number(ranked.largest?.constituents)} constituents`,
      icon: Users,
    },
    {
      label: "HIGHEST READINESS",
      value: ranked.highestReadiness?.constituency ?? "—",
      note: `${ranked.highestReadiness?.constituency_readiness ?? 0}% ready`,
      icon: TrendingUp,
    },
    {
      label: "LOWEST READINESS",
      value: ranked.lowestReadiness?.constituency ?? "—",
      note: `${ranked.lowestReadiness?.constituency_readiness ?? 0}% ready`,
      icon: AlertTriangle,
    },
    {
      label: "LARGEST YOUTH BASE",
      value: ranked.largestYouth?.constituency ?? "—",
      note: `${number(ranked.largestYouth?.youth)} youth`,
      icon: Target,
    },
    {
      label: "STRONGEST SUPPORT",
      value: ranked.strongestSupport?.constituency ?? "—",
      note: `${percentage(
        Number(ranked.strongestSupport?.strong_support ?? 0) +
          Number(ranked.strongestSupport?.leaning_support ?? 0),
        Number(ranked.strongestSupport?.constituents ?? 0),
      )}% classified support`,
      icon: BarChart3,
    },
    {
      label: "LOWEST PHONE COVERAGE",
      value: ranked.lowestPhone?.constituency ?? "—",
      note: `${percentage(
        Number(ranked.lowestPhone?.phone_ready ?? 0),
        Number(ranked.lowestPhone?.constituents ?? 0),
      )}% phone ready`,
      icon: Phone,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-primary">
              GEOGRAPHIC INTELLIGENCE
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Live constituency analytics, rankings and CRM drill-down.
            </p>
          </div>

          <div
            className={`border px-3 py-2 font-mono text-[9px] ${readinessClass(
              overallReadiness,
            )}`}
          >
            COUNTY READINESS · {overallReadiness}%
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["CONSTITUENCIES", rows.length, MapPin],
          ["CONSTITUENTS", totals.constituents, Users],
          ["WARD COVERAGE", totals.wards, MapPin],
          ["POLLING STATIONS", totals.pollingStations, Target],
        ].map(([label, value, Icon]) => (
          <article
            key={String(label)}
            className="border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-[8px] text-muted-foreground">
                {label}
              </p>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 font-mono text-2xl">
              {number(Number(value))}
            </p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {rows.map((row) => {
          const supportClassified =
            Number(row.strong_support ?? 0) +
            Number(row.leaning_support ?? 0) +
            Number(row.undecided ?? 0) +
            Number(row.opposed ?? 0);

          return (
            <button
              key={row.constituency}
              type="button"
              onClick={() => openConstituency(row.constituency)}
              className="border border-border bg-card p-4 text-left transition hover:border-primary/60 hover:bg-secondary/20"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-mono text-sm font-semibold">
                    {row.constituency.toUpperCase()}
                  </p>
                  <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                    {number(row.wards)} WARDS ·{" "}
                    {number(row.polling_stations)} POLLING STATIONS
                  </p>
                </div>

                <span
                  className={`border px-2 py-1 font-mono text-[8px] ${readinessClass(
                    row.constituency_readiness,
                  )}`}
                >
                  {readinessLabel(row.constituency_readiness)} ·{" "}
                  {row.constituency_readiness}%
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["CONSTITUENTS", row.constituents],
                  ["PHONE READY", row.phone_ready],
                  ["WOMEN", row.women],
                  ["YOUTH", row.youth],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="border border-border p-3"
                  >
                    <p className="font-mono text-[8px] text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-2 font-mono text-lg">
                      {number(Number(value))}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="flex justify-between font-mono text-[8px]">
                    <span>PHONE COVERAGE</span>
                    <span>
                      {percentage(row.phone_ready, row.constituents)}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 bg-secondary">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${percentage(
                          row.phone_ready,
                          row.constituents,
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-mono text-[8px]">
                    <span>SUPPORT CLASSIFIED</span>
                    <span>
                      {percentage(
                        supportClassified,
                        row.constituents,
                      )}
                      %
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 bg-secondary">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${percentage(
                          supportClassified,
                          row.constituents,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["STRONG", row.strong_support, "text-green-400"],
                  ["LEANING", row.leaning_support, "text-blue-400"],
                  ["UNDECIDED", row.undecided, "text-yellow-400"],
                  ["OPPOSED", row.opposed, "text-red-400"],
                ].map(([label, value, style]) => (
                  <div
                    key={String(label)}
                    className="border border-border p-2"
                  >
                    <p className="font-mono text-[7px] text-muted-foreground">
                      {label}
                    </p>
                    <p
                      className={`mt-1 font-mono text-sm ${style}`}
                    >
                      {number(Number(value))}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-4 font-mono text-[8px] text-primary">
                OPEN CONSTITUENCY DATABASE →
              </p>
            </button>
          );
        })}
      </div>

      <article className="border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-widest">
              EXECUTIVE GEOGRAPHIC RANKINGS
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Automatic constituency comparisons from the live database.
            </p>
          </div>
          <BarChart3 className="h-4 w-4 text-primary" />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rankings.map(({ label, value, note, icon: Icon }) => (
            <div key={label} className="border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[8px] text-muted-foreground">
                  {label}
                </p>
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="mt-3 text-sm font-medium">{value}</p>
              <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                {note}
              </p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
