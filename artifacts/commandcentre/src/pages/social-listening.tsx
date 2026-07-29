import { useMemo, useState } from "react";
import {
  useListSocialMentions,
  useScanSocial,
  useDeleteSocialMention,
  getListSocialMentionsQueryKey,
} from "@workspace/api-client-react";
import type { SocialMention } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Radio, RefreshCw, ExternalLink, Trash2, TrendingUp, TrendingDown,
  Minus, Globe, AlertCircle, Search,
} from "lucide-react";

const CATEGORIES: { key: string; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "candidate", label: "CAMPAIGN" },
  { key: "issues", label: "LOCAL ISSUES" },
  { key: "opponent", label: "OPPONENTS" },
];

const SENTIMENTS: { key: string; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "positive", label: "POSITIVE" },
  { key: "negative", label: "NEGATIVE" },
  { key: "neutral", label: "NEUTRAL" },
];

const CATEGORY_LABEL: Record<string, string> = {
  candidate: "CAMPAIGN",
  issues: "LOCAL ISSUES",
  opponent: "OPPONENTS",
};

function sentimentStyle(s: string) {
  switch (s) {
    case "positive": return { text: "text-green-400", border: "border-green-400/40", bg: "bg-green-400/10", Icon: TrendingUp };
    case "negative": return { text: "text-red-400", border: "border-red-400/40", bg: "bg-red-400/10", Icon: TrendingDown };
    default: return { text: "text-yellow-400", border: "border-yellow-400/40", bg: "bg-yellow-400/10", Icon: Minus };
  }
}

export default function SocialListening() {
  const qc = useQueryClient();
  const { data: mentions = [], isLoading } = useListSocialMentions();
  const [category, setCategory] = useState("all");
  const [sentiment, setSentiment] = useState("all");

  const invalidate = () => qc.invalidateQueries({ queryKey: getListSocialMentionsQueryKey() });
  const scan = useScanSocial({ mutation: { onSuccess: invalidate } });
  const del = useDeleteSocialMention({ mutation: { onSuccess: invalidate } });

  const all = mentions as SocialMention[];

  const counts = useMemo(() => {
    const c = { total: all.length, positive: 0, negative: 0, neutral: 0 };
    for (const m of all) {
      if (m.sentiment === "positive") c.positive++;
      else if (m.sentiment === "negative") c.negative++;
      else c.neutral++;
    }
    return c;
  }, [all]);

  const lastScan = useMemo(() => {
    if (all.length === 0) return null;
    return all.reduce<string | null>((max, m) => (!max || m.scannedAt > max ? m.scannedAt : max), null);
  }, [all]);

  const filtered = all.filter(
    (m) => (category === "all" || m.category === category) && (sentiment === "all" || m.sentiment === sentiment),
  );

  const scanResult = scan.data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-widest flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" /> SOCIAL LISTENING
          </h1>
          <p className="text-[10px] font-mono text-muted-foreground mt-0.5 tracking-wider">
            AI WEB-SCAN · MENTIONS · SENTIMENT · TRENDING ISSUES · MAKUENI
          </p>
        </div>
        <button
          onClick={() => scan.mutate()}
          disabled={scan.isPending}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 font-mono text-xs tracking-wider hover:bg-primary/90 disabled:opacity-60"
        >
          <RefreshCw className={"w-3.5 h-3.5" + (scan.isPending ? " animate-spin" : "")} />
          {scan.isPending ? "SCANNING THE WEB…" : "RUN SCAN"}
        </button>
      </div>

      {scan.isError && (
        <div className="flex items-center gap-2 bg-red-400/10 border border-red-400/40 text-red-400 px-3 py-2 font-mono text-[11px]">
          <AlertCircle className="w-3.5 h-3.5" /> Scan failed. Please try again in a moment.
        </div>
      )}
      {scanResult && !scan.isPending && (
        <div className="bg-card border border-primary/30 px-3 py-2 font-mono text-[11px] text-muted-foreground">
          Last scan found <span className="text-foreground">{scanResult.scanned}</span> items ·{" "}
          <span className="text-green-400">{scanResult.inserted} new</span> added.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="TOTAL MENTIONS" value={counts.total} tone="text-foreground" />
        <StatCard label="POSITIVE" value={counts.positive} tone="text-green-400" />
        <StatCard label="NEGATIVE" value={counts.negative} tone="text-red-400" />
        <StatCard label="NEUTRAL" value={counts.neutral} tone="text-yellow-400" />
      </div>
      {lastScan && (
        <p className="font-mono text-[10px] text-muted-foreground">
          LAST SCAN: {new Date(lastScan).toLocaleString()}
        </p>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <FilterRow label="TOPIC" items={CATEGORIES} value={category} onChange={setCategory} />
        <FilterRow label="SENTIMENT" items={SENTIMENTS} value={sentiment} onChange={setSentiment} />
      </div>

      {/* Feed */}
      <div className="bg-card border border-border">
        <div className="p-3 border-b border-border bg-secondary/30 flex items-center justify-between">
          <h3 className="font-mono text-xs tracking-widest flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" /> MENTIONS FEED
          </h3>
          <span className="font-mono text-[10px] text-muted-foreground">{filtered.length} SHOWN</span>
        </div>

        {isLoading ? (
          <div className="p-10 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : all.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <Search className="w-8 h-8 mx-auto text-muted-foreground/50" />
            <p className="font-mono text-xs text-muted-foreground">NO MENTIONS YET</p>
            <p className="font-mono text-[10px] text-muted-foreground/70 max-w-md mx-auto">
              Press RUN SCAN to search the public web for the latest mentions of Hon. Mule,
              trending local issues, and opponent activity. A scan takes about 30 seconds.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center font-mono text-xs text-muted-foreground">NO MENTIONS MATCH THESE FILTERS</div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((m) => {
              const st = sentimentStyle(m.sentiment);
              return (
                <li key={m.id} className="p-4 flex gap-3">
                  <div className={"shrink-0 mt-0.5 w-7 h-7 flex items-center justify-center border " + st.border + " " + st.bg}>
                    <st.Icon className={"w-3.5 h-3.5 " + st.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">{m.summary}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 font-mono text-[10px] text-muted-foreground">
                      <span className={"px-1.5 py-0.5 border " + st.border + " " + st.text}>{m.sentiment.toUpperCase()}</span>
                      <span className="px-1.5 py-0.5 border border-border">{CATEGORY_LABEL[m.category] ?? m.category.toUpperCase()}</span>
                      {m.topic && <span className="px-1.5 py-0.5 bg-secondary/60">{m.topic}</span>}
                      {m.source && <span>· {m.source}</span>}
                      {m.publishedAt && <span>· {m.publishedAt}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-start gap-1">
                    {m.url && (
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 border border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
                        title="Open source"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => del.mutate({ id: m.id })}
                      className="p-1.5 border border-border hover:bg-red-400/10 text-muted-foreground hover:text-red-400"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="bg-card border border-border p-4">
      <p className="font-mono text-[10px] text-muted-foreground mb-1 tracking-wider">{label}</p>
      <span className={"text-2xl font-bold " + tone}>{value}</span>
    </div>
  );
}

function FilterRow({
  label, items, value, onChange,
}: { label: string; items: { key: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] text-muted-foreground tracking-wider">{label}:</span>
      <div className="flex flex-wrap gap-1">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={() => onChange(it.key)}
            className={
              "px-2 py-1 font-mono text-[10px] tracking-wider border " +
              (value === it.key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary")
            }
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
