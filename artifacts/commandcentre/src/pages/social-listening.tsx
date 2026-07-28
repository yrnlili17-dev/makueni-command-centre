import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListSocialMentionsQueryKey,
  useDeleteSocialMention,
  useListSocialMentions,
  useScanSocial,
} from "@workspace/api-client-react";
import type { SocialMention } from "@workspace/api-client-react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  BellRing,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Filter,
  Flame,
  Globe2,
  Hash,
  Loader2,
  MapPin,
  MessageCircle,
  Minus,
  Newspaper,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";

const CATEGORIES = [
  { key: "all", label: "All Topics" },
  { key: "candidate", label: "Campaign" },
  { key: "issues", label: "Local Issues" },
  { key: "opponent", label: "Opponents" },
];

const SENTIMENTS = [
  { key: "all", label: "All Sentiments" },
  { key: "positive", label: "Positive" },
  { key: "negative", label: "Negative" },
  { key: "neutral", label: "Neutral" },
];

const CATEGORY_LABEL: Record<string, string> = {
  candidate: "Campaign",
  issues: "Local Issues",
  opponent: "Opponents",
};

function formatNumber(value: number) {
  return value.toLocaleString("en-KE");
}

function formatDate(value?: string | null) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getSentimentConfig(sentiment: string) {
  switch (sentiment) {
    case "positive":
      return {
        label: "Positive",
        Icon: TrendingUp,
        text: "text-emerald-300",
        border: "border-emerald-400/20",
        background: "bg-emerald-400/[0.07]",
        dot: "bg-emerald-300",
      };

    case "negative":
      return {
        label: "Negative",
        Icon: TrendingDown,
        text: "text-red-300",
        border: "border-red-400/20",
        background: "bg-red-400/[0.07]",
        dot: "bg-red-300",
      };

    default:
      return {
        label: "Neutral",
        Icon: Minus,
        text: "text-amber-300",
        border: "border-amber-400/20",
        background: "bg-amber-400/[0.07]",
        dot: "bg-amber-300",
      };
  }
}

function getPlatformIcon(source?: string | null) {
  const normalized = source?.toLowerCase() ?? "";

  if (
    normalized.includes("news") ||
    normalized.includes("standard") ||
    normalized.includes("nation") ||
    normalized.includes("citizen")
  ) {
    return Newspaper;
  }

  if (
    normalized.includes("facebook") ||
    normalized.includes("twitter") ||
    normalized.includes("x.com") ||
    normalized.includes("tiktok") ||
    normalized.includes("instagram")
  ) {
    return MessageCircle;
  }

  return Globe2;
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "cyan",
}: {
  label: string;
  value: string | number;
  description: string;
  icon: typeof Activity;
  tone?: "cyan" | "emerald" | "red" | "amber";
}) {
  const styles = {
    cyan: {
      icon: "text-cyan-300",
      background: "bg-cyan-400/[0.07]",
      border: "border-cyan-400/10",
    },
    emerald: {
      icon: "text-emerald-300",
      background: "bg-emerald-400/[0.07]",
      border: "border-emerald-400/10",
    },
    red: {
      icon: "text-red-300",
      background: "bg-red-400/[0.07]",
      border: "border-red-400/10",
    },
    amber: {
      icon: "text-amber-300",
      background: "bg-amber-400/[0.07]",
      border: "border-amber-400/10",
    },
  };

  const style = styles[tone];

  return (
    <article className="rounded-2xl border border-white/10 bg-[#0c1726] p-5 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-slate-500">
            {label}
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-white">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border ${style.border} ${style.background}`}
        >
          <Icon className={`h-5 w-5 ${style.icon}`} />
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-slate-500">
        {description}
      </p>
    </article>
  );
}

function FilterGroup({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: { key: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>

      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = item.key === value;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={
                active
                  ? "rounded-lg border border-cyan-400/20 bg-cyan-400/[0.08] px-3 py-2 text-[10px] font-semibold text-cyan-300"
                  : "rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10px] font-semibold text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-white"
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SentimentBar({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "emerald" | "red" | "amber";
}) {
  const width = total === 0 ? 0 : Math.round((value / total) * 100);

  const barStyle = {
    emerald: "bg-emerald-300",
    red: "bg-red-300",
    amber: "bg-amber-300",
  }[tone];

  const textStyle = {
    emerald: "text-emerald-300",
    red: "text-red-300",
    amber: "text-amber-300",
  }[tone];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] text-slate-400">{label}</span>

        <span className={`text-[10px] font-semibold ${textStyle}`}>
          {value} · {width}%
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className={`h-full rounded-full ${barStyle}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function IntelligenceRecommendation({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BrainCircuit;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-400/[0.06]">
        <Icon className="h-4 w-4 text-cyan-300" />
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-200">{title}</h4>

        <p className="mt-1 text-[10px] leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function SocialListening() {
  const queryClient = useQueryClient();

  const [category, setCategory] = useState("all");
  const [sentiment, setSentiment] = useState("all");
  const [search, setSearch] = useState("");

  const {
    data: mentions = [],
    isLoading,
    isError: mentionsError,
  } = useListSocialMentions();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: getListSocialMentionsQueryKey(),
    });

  const scan = useScanSocial({
    mutation: {
      onSuccess: invalidate,
    },
  });

  const deleteMention = useDeleteSocialMention({
    mutation: {
      onSuccess: invalidate,
    },
  });

  const allMentions = mentions as SocialMention[];

  const counts = useMemo(() => {
    const result = {
      total: allMentions.length,
      positive: 0,
      negative: 0,
      neutral: 0,
      campaign: 0,
      issues: 0,
      opponent: 0,
    };

    for (const mention of allMentions) {
      if (mention.sentiment === "positive") {
        result.positive += 1;
      } else if (mention.sentiment === "negative") {
        result.negative += 1;
      } else {
        result.neutral += 1;
      }

      if (mention.category === "candidate") {
        result.campaign += 1;
      } else if (mention.category === "issues") {
        result.issues += 1;
      } else if (mention.category === "opponent") {
        result.opponent += 1;
      }
    }

    return result;
  }, [allMentions]);

  const lastScan = useMemo(() => {
    if (allMentions.length === 0) return null;

    return allMentions.reduce<string | null>((latest, mention) => {
      if (!mention.scannedAt) return latest;
      if (!latest) return mention.scannedAt;

      return new Date(mention.scannedAt).getTime() >
        new Date(latest).getTime()
        ? mention.scannedAt
        : latest;
    }, null);
  }, [allMentions]);

  const filteredMentions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return allMentions.filter((mention) => {
      const categoryMatches =
        category === "all" || mention.category === category;

      const sentimentMatches =
        sentiment === "all" || mention.sentiment === sentiment;

      const searchMatches =
        !normalizedSearch ||
        mention.summary?.toLowerCase().includes(normalizedSearch) ||
        mention.topic?.toLowerCase().includes(normalizedSearch) ||
        mention.source?.toLowerCase().includes(normalizedSearch);

      return categoryMatches && sentimentMatches && searchMatches;
    });
  }, [allMentions, category, sentiment, search]);

  const threatScore = useMemo(() => {
    if (counts.total === 0) return 0;

    return Math.min(
      100,
      Math.round(
        (counts.negative / counts.total) * 70 +
          (counts.opponent / counts.total) * 30,
      ),
    );
  }, [counts]);

  const threatLabel =
    threatScore >= 70
      ? "High"
      : threatScore >= 40
        ? "Elevated"
        : threatScore > 0
          ? "Stable"
          : "No Data";

  const dominantSentiment = useMemo(() => {
    const values = [
      { name: "Positive", value: counts.positive },
      { name: "Negative", value: counts.negative },
      { name: "Neutral", value: counts.neutral },
    ];

    return values.sort((a, b) => b.value - a.value)[0]?.name ?? "No Data";
  }, [counts]);

  const topicFrequency = useMemo(() => {
    const topicMap = new Map<string, number>();

    allMentions.forEach((mention) => {
      const topic = mention.topic?.trim();

      if (!topic) return;

      topicMap.set(topic, (topicMap.get(topic) ?? 0) + 1);
    });

    return Array.from(topicMap.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [allMentions]);

  const sourceFrequency = useMemo(() => {
    const sourceMap = new Map<string, number>();

    allMentions.forEach((mention) => {
      const source = mention.source?.trim() || "Public Web";

      sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1);
    });

    return Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [allMentions]);

  const removeMention = (mention: SocialMention) => {
    const confirmed = window.confirm(
      "Remove this mention from the intelligence feed?",
    );

    if (confirmed) {
      deleteMention.mutate({
        id: mention.id,
      });
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setSentiment("all");
  };

  const hasFilters =
    search.trim().length > 0 ||
    category !== "all" ||
    sentiment !== "all";

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-400/10 bg-gradient-to-br from-[#10223a] via-[#0c192b] to-[#091523] p-6 shadow-2xl shadow-black/20 sm:p-8">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-400/[0.06] blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-blue-500/[0.04] blur-3xl" />

        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/10 bg-cyan-400/[0.06] px-3 py-1.5">
              <Radio className="h-3.5 w-3.5 text-cyan-300" />

              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Digital Intelligence Centre
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Social Listening & Narrative Intelligence
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Monitor public conversations, campaign sentiment, emerging local
              issues and opponent narratives across the open web.
            </p>

            <div className="mt-5 flex flex-wrap gap-4 text-[10px] text-slate-500">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                Intelligence feed active
              </span>

              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-3.5 w-3.5 text-cyan-300" />
                Last scan: {lastScan ? formatDate(lastScan) : "Not yet run"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => scan.mutate()}
            disabled={scan.isPending}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {scan.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}

            {scan.isPending ? "Scanning public sources..." : "Run intelligence scan"}
          </button>
        </div>
      </section>

      {scan.isError && (
        <section className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />

          <div>
            <h3 className="text-xs font-semibold text-red-200">
              Intelligence scan failed
            </h3>

            <p className="mt-1 text-[10px] leading-5 text-red-200/60">
              The scan could not be completed. Check the API service and try
              again.
            </p>
          </div>
        </section>
      )}

      {scan.data && !scan.isPending && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] px-5 py-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-300" />

            <div>
              <p className="text-xs font-semibold text-emerald-200">
                Intelligence scan completed
              </p>

              <p className="mt-1 text-[10px] text-emerald-200/60">
                {scan.data.scanned} sources analysed and {scan.data.inserted} new
                mentions added.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total mentions"
          value={formatNumber(counts.total)}
          description="All captured public conversations"
          icon={Globe2}
        />

        <MetricCard
          label="Positive"
          value={formatNumber(counts.positive)}
          description="Supportive or favourable mentions"
          icon={TrendingUp}
          tone="emerald"
        />

        <MetricCard
          label="Negative"
          value={formatNumber(counts.negative)}
          description="Critical or hostile mentions"
          icon={TrendingDown}
          tone="red"
        />

        <MetricCard
          label="Neutral"
          value={formatNumber(counts.neutral)}
          description="Informational or non-aligned mentions"
          icon={Minus}
          tone="amber"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-white/10 bg-[#0c1726] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Sentiment distribution
              </h2>

              <p className="mt-1 text-[10px] text-slate-500">
                Current public mood across captured mentions
              </p>
            </div>

            <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10px] text-slate-400">
              Dominant:{" "}
              <span className="font-semibold text-white">
                {dominantSentiment}
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <SentimentBar
              label="Positive sentiment"
              value={counts.positive}
              total={counts.total}
              tone="emerald"
            />

            <SentimentBar
              label="Negative sentiment"
              value={counts.negative}
              total={counts.total}
              tone="red"
            />

            <SentimentBar
              label="Neutral sentiment"
              value={counts.neutral}
              total={counts.total}
              tone="amber"
            />
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#0c1726] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/10 bg-red-400/[0.06]">
              <ShieldAlert className="h-5 w-5 text-red-300" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-white">
                Narrative threat level
              </h2>

              <p className="mt-1 text-[10px] text-slate-500">
                Calculated from negative and opponent mentions
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-end justify-between">
            <div>
              <p className="text-5xl font-bold tracking-tight text-white">
                {threatScore}
              </p>

              <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-slate-500">
                Risk score out of 100
              </p>
            </div>

            <span
              className={
                threatScore >= 70
                  ? "rounded-full border border-red-400/20 bg-red-400/[0.08] px-3 py-1.5 text-[10px] font-semibold text-red-300"
                  : threatScore >= 40
                    ? "rounded-full border border-amber-400/20 bg-amber-400/[0.08] px-3 py-1.5 text-[10px] font-semibold text-amber-300"
                    : "rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-1.5 text-[10px] font-semibold text-emerald-300"
              }
            >
              {threatLabel}
            </span>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className={
                threatScore >= 70
                  ? "h-full rounded-full bg-red-300"
                  : threatScore >= 40
                    ? "h-full rounded-full bg-amber-300"
                    : "h-full rounded-full bg-emerald-300"
              }
              style={{ width: `${threatScore}%` }}
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">
                Opponent mentions
              </p>

              <p className="mt-2 text-xl font-semibold text-white">
                {counts.opponent}
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">
                Negative mentions
              </p>

              <p className="mt-2 text-xl font-semibold text-white">
                {counts.negative}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-[#0c1726] p-5">
          <div className="flex items-center gap-3">
            <Flame className="h-4 w-4 text-orange-300" />

            <h2 className="text-sm font-semibold text-white">
              Trending topics
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            {topicFrequency.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-[10px] text-slate-600">
                Run a scan to identify trending topics.
              </p>
            ) : (
              topicFrequency.map((item, index) => (
                <div
                  key={item.topic}
                  className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-400/[0.07] text-[10px] font-semibold text-orange-300">
                      {index + 1}
                    </span>

                    <span className="truncate text-[11px] text-slate-300">
                      {item.topic}
                    </span>
                  </div>

                  <span className="text-[10px] font-semibold text-slate-500">
                    {item.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#0c1726] p-5">
          <div className="flex items-center gap-3">
            <Globe2 className="h-4 w-4 text-cyan-300" />

            <h2 className="text-sm font-semibold text-white">
              Leading sources
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            {sourceFrequency.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-[10px] text-slate-600">
                Source data will appear after a scan.
              </p>
            ) : (
              sourceFrequency.map((item) => {
                const SourceIcon = getPlatformIcon(item.source);

                return (
                  <div
                    key={item.source}
                    className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <SourceIcon className="h-4 w-4 shrink-0 text-cyan-300" />

                      <span className="truncate text-[11px] text-slate-300">
                        {item.source}
                      </span>
                    </div>

                    <span className="text-[10px] font-semibold text-slate-500">
                      {item.count}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-[#0c1726] p-5">
          <div className="flex items-center gap-3">
            <BrainCircuit className="h-4 w-4 text-violet-300" />

            <h2 className="text-sm font-semibold text-white">
              Recommended actions
            </h2>
          </div>

          <div className="mt-5 space-y-3">
            <IntelligenceRecommendation
              icon={BellRing}
              title="Review negative mentions"
              description={
                counts.negative > 0
                  ? `${counts.negative} negative mentions require communications review.`
                  : "No critical negative mentions are currently detected."
              }
            />

            <IntelligenceRecommendation
              icon={Target}
              title="Strengthen campaign narrative"
              description={
                counts.campaign > 0
                  ? `${counts.campaign} campaign-related mentions are available for messaging analysis.`
                  : "Run a scan to identify campaign narrative opportunities."
              }
            />

            <IntelligenceRecommendation
              icon={Users}
              title="Respond to local concerns"
              description={
                counts.issues > 0
                  ? `${counts.issues} local-issue mentions can inform field engagement.`
                  : "No local issue trend has been captured yet."
              }
            />
          </div>
        </article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c1726]">
        <div className="border-b border-white/10 p-5">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-cyan-300" />

                <h2 className="text-sm font-semibold text-white">
                  Live intelligence feed
                </h2>
              </div>

              <p className="mt-1 text-[10px] text-slate-500">
                {filteredMentions.length} of {allMentions.length} mentions shown
              </p>
            </div>

            <div className="relative w-full xl:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search mentions, topics or sources"
                className="w-full rounded-xl border border-white/10 bg-[#07111e] py-2.5 pl-10 pr-3 text-xs text-white outline-none placeholder:text-slate-700 focus:border-cyan-400/30"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <FilterGroup
              label="Topic"
              items={CATEGORIES}
              value={category}
              onChange={setCategory}
            />

            <FilterGroup
              label="Sentiment"
              items={SENTIMENTS}
              value={sentiment}
              onChange={setSentiment}
            />
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10px] font-semibold text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
              Clear all filters
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-2xl bg-white/[0.025]"
              />
            ))}
          </div>
        ) : mentionsError ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <AlertCircle className="h-8 w-8 text-red-300" />

            <h3 className="mt-4 text-sm font-semibold text-slate-300">
              Unable to load intelligence feed
            </h3>

            <p className="mt-2 max-w-md text-xs leading-5 text-slate-600">
              The social listening API could not return the current mentions.
            </p>
          </div>
        ) : allMentions.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
              <Radio className="h-7 w-7 text-slate-600" />
            </div>

            <h3 className="mt-5 text-sm font-semibold text-slate-300">
              No mentions captured yet
            </h3>

            <p className="mt-2 max-w-md text-xs leading-5 text-slate-600">
              Run an intelligence scan to search public sources for campaign
              conversations, local issues and opponent activity.
            </p>

            <button
              type="button"
              onClick={() => scan.mutate()}
              disabled={scan.isPending}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-semibold text-slate-950 disabled:opacity-60"
            >
              <Zap className="h-4 w-4" />
              Start first scan
            </button>
          </div>
        ) : filteredMentions.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <Filter className="h-8 w-8 text-slate-600" />

            <h3 className="mt-4 text-sm font-semibold text-slate-300">
              No mentions match these filters
            </h3>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-lg border border-white/10 px-4 py-2 text-xs text-slate-400 hover:bg-white/[0.04]"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {filteredMentions.map((mention) => {
              const sentimentConfig = getSentimentConfig(
                mention.sentiment,
              );

              const SourceIcon = getPlatformIcon(mention.source);

              return (
                <li
                  key={mention.id}
                  className="p-5 transition-colors hover:bg-white/[0.015]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${sentimentConfig.border} ${sentimentConfig.background}`}
                    >
                      <sentimentConfig.Icon
                        className={`h-5 w-5 ${sentimentConfig.text}`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-6 text-slate-200">
                        {mention.summary}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold ${sentimentConfig.border} ${sentimentConfig.background} ${sentimentConfig.text}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${sentimentConfig.dot}`}
                          />

                          {sentimentConfig.label}
                        </span>

                        <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[9px] font-semibold text-slate-500">
                          {CATEGORY_LABEL[mention.category] ??
                            mention.category}
                        </span>

                        {mention.topic && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[9px] text-slate-500">
                            <Hash className="h-3 w-3" />
                            {mention.topic}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-[9px] text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <SourceIcon className="h-3.5 w-3.5" />
                          {mention.source ?? "Public Web"}
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDate(
                            mention.publishedAt ?? mention.scannedAt,
                          )}
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          Makueni County
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2 sm:flex-col">
                      {mention.url && (
                        <a
                          href={mention.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open original source"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-slate-500 transition-colors hover:border-cyan-400/20 hover:bg-cyan-400/[0.06] hover:text-cyan-300"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => removeMention(mention)}
                        disabled={deleteMention.isPending}
                        title="Remove mention"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-slate-500 transition-colors hover:border-red-400/20 hover:bg-red-400/[0.06] hover:text-red-300 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {filteredMentions.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
              AI-classified campaign intelligence
            </div>

            <p className="text-[10px] text-slate-600">
              {filteredMentions.length} visible mentions
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
