import { MapPin, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";

type ConstituencyRow = {
  constituency: string;
  constituents: number;
  phone_ready: number;
  women: number;
  youth: number;
  wards: number;
  polling_stations: number;
  constituency_readiness: number;
};

type WardRow = {
  ward: string;
  constituency?: string | null;
  constituents: number;
  phone_ready: number;
  email_ready?: number;
  women: number;
  men?: number;
  youth?: number;
  polling_stations?: number;
  strong_support?: number;
  leaning_support?: number;
  undecided?: number;
  opposed?: number;
  ward_readiness?: number;
};

type Props = {
  constituencies: ConstituencyRow[];
  wards: WardRow[];
};

const BASE = import.meta.env.BASE_URL;
const ALL_CONSTITUENCIES = [
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
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function readinessClass(score: number) {
  if (score >= 80) return "text-green-400 border-green-400/40";
  if (score >= 60) return "text-yellow-400 border-yellow-400/40";
  if (score >= 40) return "text-orange-400 border-orange-400/40";
  return "text-red-400 border-red-400/40";
}

function openDatabase(filters: Record<string, string>) {
  const query = new URLSearchParams(filters);
  window.location.assign(`${BASE}campaign-database?${query.toString()}`);
}

export default function GeographicIntelligence({
  constituencies,
  wards,
}: Props) {
  const [search, setSearch] = useState("");
  const [constituency, setConstituency] = useState("all");

  const constituencyRows = useMemo(() => {
    const live = new Map(
      constituencies.map((row) => [
        row.constituency.trim().toLowerCase(),
        row,
      ]),
    );

    return ALL_CONSTITUENCIES.map(
      (name) =>
        live.get(name.toLowerCase()) ?? {
          constituency: name,
          constituents: 0,
          phone_ready: 0,
          women: 0,
          youth: 0,
          wards: 0,
          polling_stations: 0,
          constituency_readiness: 0,
        },
    );
  }, [constituencies]);

  const filteredWards = useMemo(() => {
    const term = search.trim().toLowerCase();

    return [...wards]
      .filter((row) => {
        const matchesConstituency =
          constituency === "all" ||
          String(row.constituency ?? "").toLowerCase() ===
            constituency.toLowerCase();
        const matchesSearch =
          !term || row.ward.toLowerCase().includes(term);
        return matchesConstituency && matchesSearch;
      })
      .sort((a, b) => b.constituents - a.constituents);
  }, [wards, constituency, search]);

  const largestWard = [...wards].sort(
    (a, b) => b.constituents - a.constituents,
  )[0];
  const lowestReadiness = [...wards].sort(
    (a, b) =>
      Number(a.ward_readiness ?? 0) -
      Number(b.ward_readiness ?? 0),
  )[0];
  const lowestPhone = [...wards].sort(
    (a, b) =>
      percentage(a.phone_ready, a.constituents) -
      percentage(b.phone_ready, b.constituents),
  )[0];

  return (
    <section className="space-y-4">
      <header className="border border-border bg-card p-4">
        <p className="font-mono text-[10px] tracking-widest text-primary">
          GEOGRAPHIC INTELLIGENCE
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Live constituency and ward analytics with filtered CRM drill-down.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["CONSTITUENCIES", constituencyRows.length],
          ["IMPORTED WARDS", wards.length],
          [
            "CONSTITUENTS",
            wards.reduce((sum, row) => sum + Number(row.constituents), 0),
          ],
          [
            "POLLING STATIONS",
            wards.reduce(
              (sum, row) => sum + Number(row.polling_stations ?? 0),
              0,
            ),
          ],
        ].map(([label, value]) => (
          <article key={String(label)} className="border border-border bg-card p-4">
            <p className="font-mono text-[8px] text-muted-foreground">
              {label}
            </p>
            <p className="mt-3 font-mono text-2xl">
              {number(Number(value))}
            </p>
          </article>
        ))}
      </div>

      <article className="border border-border bg-card p-4">
        <p className="font-mono text-[10px] tracking-widest">
          CONSTITUENCY COVERAGE
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {constituencyRows.map((row) => (
            <button
              key={row.constituency}
              type="button"
              onClick={() =>
                openDatabase({ constituency: row.constituency })
              }
              className="border border-border p-4 text-left transition hover:border-primary/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm">
                    {row.constituency.toUpperCase()}
                  </p>
                  <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                    {number(row.wards)} WARDS ·{" "}
                    {number(row.polling_stations)} POLLING STATIONS
                  </p>
                </div>
                {row.constituents > 0 ? (
                  <span
                    className={`border px-2 py-1 font-mono text-[8px] ${readinessClass(
                      row.constituency_readiness,
                    )}`}
                  >
                    {row.constituency_readiness}% READY
                  </span>
                ) : (
                  <span className="border border-border px-2 py-1 font-mono text-[8px] text-muted-foreground">
                    NO DATA IMPORTED
                  </span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["CONSTITUENTS", row.constituents],
                  ["PHONE READY", row.phone_ready],
                  ["WOMEN", row.women],
                  ["YOUTH", row.youth],
                ].map(([label, value]) => (
                  <div key={String(label)} className="border border-border p-2">
                    <p className="font-mono text-[7px] text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-1 font-mono text-sm">
                      {number(Number(value))}
                    </p>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      </article>

      <article className="border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-widest">
              WARD INTELLIGENCE
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Search, compare and open filtered ward records.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex items-center gap-2 border border-border bg-secondary px-3 py-2">
              <Search className="h-3.5 w-3.5" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search ward"
                className="w-40 bg-transparent text-xs outline-none"
              />
            </label>
            <select
              value={constituency}
              onChange={(event) => setConstituency(event.target.value)}
              className="border border-border bg-secondary px-3 py-2 font-mono text-[9px]"
            >
              <option value="all">ALL CONSTITUENCIES</option>
              {ALL_CONSTITUENCIES.map((name) => (
                <option key={name} value={name}>
                  {name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {filteredWards.map((row) => {
            const readiness = Number(row.ward_readiness ?? 0);
            const supportClassified =
              Number(row.strong_support ?? 0) +
              Number(row.leaning_support ?? 0) +
              Number(row.undecided ?? 0) +
              Number(row.opposed ?? 0);

            return (
              <button
                key={`${row.constituency}-${row.ward}`}
                type="button"
                onClick={() =>
                  openDatabase({
                    constituency: row.constituency || "MAKUENI",
                    ward: row.ward,
                  })
                }
                className="border border-border p-4 text-left transition hover:border-primary/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm">
                      {row.ward.toUpperCase()}
                    </p>
                    <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                      {(row.constituency || "MAKUENI").toUpperCase()} ·{" "}
                      {number(row.polling_stations)} POLLING STATIONS
                    </p>
                  </div>
                  <span
                    className={`border px-2 py-1 font-mono text-[8px] ${readinessClass(
                      readiness,
                    )}`}
                  >
                    {readiness}% READY
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["CONSTITUENTS", row.constituents],
                    ["PHONE READY", row.phone_ready],
                    ["WOMEN", row.women],
                    ["YOUTH", row.youth ?? 0],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="border border-border p-2">
                      <p className="font-mono text-[7px] text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-1 font-mono text-sm">
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

                <p className="mt-4 font-mono text-[8px] text-primary">
                  OPEN WARD DATABASE →
                </p>
              </button>
            );
          })}

          {filteredWards.length === 0 && (
            <div className="col-span-full border border-dashed border-border py-10 text-center font-mono text-[10px] text-muted-foreground">
              [ NO_WARDS_MATCH_THE_CURRENT_FILTER ]
            </div>
          )}
        </div>
      </article>

      <article className="border border-border bg-card p-4">
        <p className="font-mono text-[10px] tracking-widest">
          EXECUTIVE WARD RANKINGS
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {[
            [
              "LARGEST WARD",
              largestWard?.ward ?? "—",
              `${number(largestWard?.constituents)} constituents`,
            ],
            [
              "LOWEST READINESS",
              lowestReadiness?.ward ?? "—",
              `${number(lowestReadiness?.ward_readiness)}% ready`,
            ],
            [
              "LOWEST PHONE COVERAGE",
              lowestPhone?.ward ?? "—",
              `${percentage(
                Number(lowestPhone?.phone_ready ?? 0),
                Number(lowestPhone?.constituents ?? 0),
              )}% phone ready`,
            ],
          ].map(([label, value, note]) => (
            <div key={String(label)} className="border border-border p-3">
              <p className="font-mono text-[8px] text-muted-foreground">
                {label}
              </p>
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
