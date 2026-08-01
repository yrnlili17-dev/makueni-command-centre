import {
  Database,
  Layers,
  MapPin,
  RefreshCw,
  Target,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Segment = {
  name: string;
  category: string;
  members: number;
  rule: string;
};

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error ?? `Request failed (${response.status})`);
  }

  return data as T;
}

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

export default function AudienceSegmentationV8C() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [category, setCategory] = useState("all");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      setSegments(
        await requestJson<Segment[]>("/api/campaign-database/segments"),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load segments");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(
    () =>
      category === "all"
        ? segments
        : segments.filter((segment) => segment.category === category),
    [segments, category],
  );

  const totalReach = Math.max(
    0,
    ...segments.map((segment) => Number(segment.members ?? 0)),
  );

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <section className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">
            PHASE 8C LIVE SEGMENTATION
          </p>
          <h1 className="mt-1 text-xl font-semibold">Audience Segmentation</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Automatically calculated from the master constituent database.
          </p>
        </div>

        <button
          onClick={() => void load()}
          className="flex items-center gap-1 border border-border px-3 py-2 font-mono text-[9px]"
        >
          <RefreshCw className="h-3 w-3" />
          REFRESH
        </button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["TOTAL SEGMENTS", segments.length, Layers],
          ["LARGEST REACH", totalReach, Users],
          ["GEOGRAPHIC", segments.filter((item) => item.category === "geographic").length, MapPin],
          ["STRATEGIC", segments.filter((item) => item.category === "strategic").length, Target],
        ].map(([label, value, Icon]) => (
          <div key={String(label)} className="border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[9px] text-muted-foreground">{label}</p>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 font-mono text-xl">{number(Number(value))}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-wrap gap-2 border border-border bg-card p-3">
        {["all", "geographic", "demographic", "behavioral", "strategic", "data_quality"].map((value) => (
          <button
            key={value}
            onClick={() => setCategory(value)}
            className={`border px-3 py-2 font-mono text-[9px] ${
              category === value
                ? "border-primary text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            {value.replaceAll("_", " ").toUpperCase()}
          </button>
        ))}
      </section>

      {error && (
        <div className="border border-red-400/30 bg-red-400/10 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((segment) => (
          <article key={`${segment.category}-${segment.name}`} className="border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[8px] tracking-widest text-primary">
                  {segment.category.replaceAll("_", " ").toUpperCase()}
                </p>
                <h2 className="mt-1 font-semibold">{segment.name}</h2>
              </div>
              <Database className="h-4 w-4 text-muted-foreground" />
            </div>

            <p className="mt-4 font-mono text-2xl">{number(segment.members)}</p>
            <p className="mt-1 text-xs text-muted-foreground">constituents</p>

            <div className="mt-4 border border-border bg-secondary/20 p-3">
              <p className="font-mono text-[8px] text-muted-foreground">RULE</p>
              <p className="mt-1 font-mono text-[10px]">{segment.rule}</p>
            </div>
          </article>
        ))}
      </section>

      {visible.length === 0 && (
        <div className="border border-border bg-card py-16 text-center font-mono text-xs text-muted-foreground">
          [ NO_SEGMENTS_IN_CATEGORY ]
        </div>
      )}
    </div>
  );
}
