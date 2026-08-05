import {
  AlertTriangle,
  BrainCircuit,
  Bus,
  Car,
  CheckCircle2,
  Fuel,
  Gauge,
  Loader2,
  MapPinned,
  Navigation,
  Phone,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

type Asset = {
  id: number;
  assetType: string;
  name: string;
  registration?: string | null;
  ward?: string | null;
  constituency?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: string;
  assignedTo?: string | null;
  phone?: string | null;
  fuelLevel?: number | null;
  lastSeenAt?: string | null;
};

type Ward = {
  ward: string;
  constituency?: string | null;
  registered?: number;
  turnoutForecast?: number;
  supportShare?: number;
  projectedTurnout?: number;
  projectedCandidateVotes?: number;
  activeAssets?: number;
  incidents?: number;
  riskScore?: number;
  opportunityScore?: number;
};

type Recommendation = {
  id: number;
  ward?: string | null;
  constituency?: string | null;
  category: string;
  title: string;
  rationale?: string | null;
  priority: string;
  recommendedAction?: string | null;
  recommendedOwner?: string | null;
  status: string;
};

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function formatTime(value?: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function tone(score: number) {
  if (score >= 80) return "border-red-400/40 text-red-300";
  if (score >= 60) return "border-orange-400/40 text-orange-300";
  if (score >= 40) return "border-yellow-400/40 text-yellow-300";
  return "border-green-400/30 text-green-300";
}

export default function GisIntelligencePage() {
  const [tab, setTab] = useState<"predictive" | "tracking" | "recommendations">(
    "predictive",
  );
  const [wards, setWards] = useState<Ward[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [summary, setSummary] = useState({
    wards: 0,
    highRiskWards: 0,
    criticalWards: 0,
    projectedTurnout: 0,
    projectedCandidateVotes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [layer, setLayer] = useState<"risk" | "opportunity" | "turnout">("risk");
  const [assetFilter, setAssetFilter] = useState("all");
  const [form, setForm] = useState({
    assetType: "vehicle",
    name: "",
    registration: "",
    ward: "",
    constituency: "",
    assignedTo: "",
    phone: "",
    fuelLevel: 100,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [aiResponse, assetsResponse] = await Promise.all([
        fetch(`${BASE}api/election-day/gis-ai-situation`, {
          credentials: "include",
        }),
        fetch(`${BASE}api/election-day/gis-field-assets`, {
          credentials: "include",
        }),
      ]);

      if (!aiResponse.ok || !assetsResponse.ok) {
        throw new Error("Failed to load GIS command suite");
      }

      const [aiPayload, assetsPayload] = await Promise.all([
        aiResponse.json(),
        assetsResponse.json(),
      ]);

      setWards(Array.isArray(aiPayload?.wards) ? aiPayload.wards : []);
      setRecommendations(
        Array.isArray(aiPayload?.recommendations)
          ? aiPayload.recommendations
          : [],
      );
      setSummary(aiPayload?.summary ?? {});
      setAssets(Array.isArray(assetsPayload) ? assetsPayload : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load GIS command suite",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function request(path: string, method: string, body?: unknown) {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`${BASE}api/election-day${path}`, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Operation failed");
      }

      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function createAsset() {
    if (!form.name.trim()) {
      setError("Asset name is required.");
      return;
    }

    const ok = await request("/gis-field-assets", "POST", form);

    if (ok) {
      setForm({
        assetType: "vehicle",
        name: "",
        registration: "",
        ward: "",
        constituency: "",
        assignedTo: "",
        phone: "",
        fuelLevel: 100,
      });
    }
  }

  const sortedWards = useMemo(
    () =>
      wards.slice().sort((a, b) => {
        if (layer === "opportunity") {
          return (
            Number(b.opportunityScore ?? 0) -
            Number(a.opportunityScore ?? 0)
          );
        }
        if (layer === "turnout") {
          return (
            Number(b.turnoutForecast ?? 0) -
            Number(a.turnoutForecast ?? 0)
          );
        }
        return Number(b.riskScore ?? 0) - Number(a.riskScore ?? 0);
      }),
    [layer, wards],
  );

  const filteredAssets = useMemo(
    () =>
      assetFilter === "all"
        ? assets
        : assets.filter((asset) => asset.assetType === assetFilter),
    [assetFilter, assets],
  );

  return (
    <div className="mx-auto max-w-[2200px] space-y-4">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold tracking-widest sm:text-xl">
              GIS COMMAND SUITE
            </h1>
          </div>
          <p className="mt-1 font-mono text-[9px] tracking-widest text-muted-foreground">
            AI PREDICTIONS · FIELD TRACKING · LOGISTICS · EXECUTIVE RECOMMENDATIONS
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="flex min-h-10 items-center justify-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          REFRESH
        </button>
      </header>

      {error && (
        <div className="border border-red-400/40 bg-red-400/5 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[
          ["predictive", "AI PREDICTIVE INTELLIGENCE", BrainCircuit],
          ["tracking", "FIELD TRACKING & LOGISTICS", Navigation],
          ["recommendations", "EXECUTIVE RECOMMENDATIONS", Sparkles],
        ].map(([value, label, Icon]) => (
          <button
            key={String(value)}
            type="button"
            onClick={() => setTab(value as any)}
            className={`flex min-h-11 items-center justify-center gap-2 border px-3 py-2 font-mono text-[8px] ${
              tab === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "predictive" && (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
            {[
              ["WARDS", summary.wards, MapPinned],
              ["HIGH RISK", summary.highRiskWards, AlertTriangle],
              ["CRITICAL", summary.criticalWards, Gauge],
              ["PROJECTED TURNOUT", summary.projectedTurnout, TrendingUp],
              ["PROJECTED KALOKI VOTES", summary.projectedCandidateVotes, Target],
            ].map(([label, value, Icon]) => (
              <article key={String(label)} className="border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[8px] text-muted-foreground">
                    {label}
                  </p>
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-3 truncate font-mono text-xl">
                  {number(Number(value))}
                </p>
              </article>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ["risk", "RISK"],
              ["opportunity", "OPPORTUNITY"],
              ["turnout", "TURNOUT"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setLayer(value as any)}
                className={`min-h-10 border px-3 py-2 font-mono text-[8px] ${
                  layer === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <section className="border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest">
              PREDICTIVE WARD PRIORITY MATRIX
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {sortedWards.map((ward) => {
                const score =
                  layer === "opportunity"
                    ? Number(ward.opportunityScore ?? 0)
                    : layer === "turnout"
                      ? Number(ward.turnoutForecast ?? 0)
                      : Number(ward.riskScore ?? 0);

                return (
                  <article key={ward.ward} className="border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {ward.ward}
                        </p>
                        <p className="mt-1 truncate font-mono text-[8px] text-muted-foreground">
                          {ward.constituency || "CONSTITUENCY NOT SET"}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 border px-2 py-1 font-mono text-[8px] ${tone(
                          layer === "risk" ? score : 100 - score,
                        )}`}
                      >
                        {score}%
                      </span>
                    </div>

                    <div className="mt-3 h-1.5 bg-secondary">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(100, score)}%` }}
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[7px] text-muted-foreground">
                      <span>{number(ward.registered)} REGISTERED</span>
                      <span>{number(ward.activeAssets)} ACTIVE ASSETS</span>
                      <span>{number(ward.incidents)} INCIDENTS</span>
                      <span>
                        {number(ward.projectedCandidateVotes)} PROJECTED
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}

      {tab === "tracking" && (
        <>
          <section className="border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest">
              REGISTER FIELD ASSET
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <select
                value={form.assetType}
                onChange={(event) =>
                  setForm({ ...form, assetType: event.target.value })
                }
                className="min-h-10 border border-border bg-background px-3 py-2 text-xs"
              >
                <option value="vehicle">VEHICLE</option>
                <option value="motorbike">MOTORBIKE</option>
                <option value="agent">AGENT</option>
                <option value="coordinator">COORDINATOR</option>
                <option value="supply">SUPPLY ASSET</option>
              </select>

              <input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Asset or officer name"
                className="min-h-10 border border-border bg-background px-3 py-2 text-xs"
              />

              <input
                value={form.registration}
                onChange={(event) =>
                  setForm({ ...form, registration: event.target.value })
                }
                placeholder="Registration / identifier"
                className="min-h-10 border border-border bg-background px-3 py-2 text-xs"
              />

              <input
                value={form.assignedTo}
                onChange={(event) =>
                  setForm({ ...form, assignedTo: event.target.value })
                }
                placeholder="Assigned officer"
                className="min-h-10 border border-border bg-background px-3 py-2 text-xs"
              />

              <input
                value={form.ward}
                onChange={(event) =>
                  setForm({ ...form, ward: event.target.value })
                }
                placeholder="Ward"
                className="min-h-10 border border-border bg-background px-3 py-2 text-xs"
              />

              <input
                value={form.constituency}
                onChange={(event) =>
                  setForm({ ...form, constituency: event.target.value })
                }
                placeholder="Constituency"
                className="min-h-10 border border-border bg-background px-3 py-2 text-xs"
              />

              <input
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
                placeholder="Phone"
                className="min-h-10 border border-border bg-background px-3 py-2 text-xs"
              />

              <button
                type="button"
                onClick={createAsset}
                disabled={saving || !form.name.trim()}
                className="flex min-h-10 items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                ADD ASSET
              </button>
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            {[
              ["all", "ALL"],
              ["vehicle", "VEHICLES"],
              ["motorbike", "MOTORBIKES"],
              ["agent", "AGENTS"],
              ["coordinator", "COORDINATORS"],
              ["supply", "SUPPLIES"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setAssetFilter(value)}
                className={`min-h-10 border px-3 py-2 font-mono text-[8px] ${
                  assetFilter === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {filteredAssets.map((asset) => {
              const Icon =
                asset.assetType === "vehicle"
                  ? Car
                  : asset.assetType === "motorbike"
                    ? Bus
                    : asset.assetType === "agent" ||
                        asset.assetType === "coordinator"
                      ? UserRound
                      : MapPinned;

              return (
                <article key={asset.id} className="border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center border border-border">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{asset.name}</p>
                        <p className="mt-1 truncate font-mono text-[8px] text-muted-foreground">
                          {String(asset.assetType).toUpperCase()} ·{" "}
                          {asset.registration || "NO IDENTIFIER"}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 border border-border px-2 py-1 font-mono text-[8px]">
                      {String(asset.status).toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="border border-border p-3">
                      <p className="font-mono text-[7px] text-muted-foreground">
                        LOCATION
                      </p>
                      <p className="mt-2 truncate text-xs">
                        {asset.ward || "Not assigned"}
                      </p>
                    </div>

                    <div className="border border-border p-3">
                      <p className="font-mono text-[7px] text-muted-foreground">
                        FUEL
                      </p>
                      <p className="mt-2 flex items-center gap-2 font-mono text-xs">
                        <Fuel className="h-3 w-3" />
                        {Number(asset.fuelLevel ?? 0)}%
                      </p>
                    </div>

                    <div className="border border-border p-3">
                      <p className="font-mono text-[7px] text-muted-foreground">
                        ASSIGNED
                      </p>
                      <p className="mt-2 truncate text-xs">
                        {asset.assignedTo || "Unassigned"}
                      </p>
                    </div>

                    <div className="border border-border p-3">
                      <p className="font-mono text-[7px] text-muted-foreground">
                        LAST SEEN
                      </p>
                      <p className="mt-2 text-xs">
                        {formatTime(asset.lastSeenAt)}
                      </p>
                    </div>
                  </div>

                  {asset.phone && (
                    <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {asset.phone}
                    </p>
                  )}

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void request(`/gis-field-assets/${asset.id}`, "PATCH", {
                          status: "deployed",
                        })
                      }
                      disabled={saving}
                      className="min-h-10 border border-border px-2 py-2 font-mono text-[8px]"
                    >
                      DEPLOY
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void request(`/gis-field-assets/${asset.id}`, "PATCH", {
                          status: "en-route",
                        })
                      }
                      disabled={saving}
                      className="min-h-10 border border-orange-400/40 px-2 py-2 font-mono text-[8px] text-orange-400"
                    >
                      EN ROUTE
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void request(`/gis-field-assets/${asset.id}`, "PATCH", {
                          status: "available",
                        })
                      }
                      disabled={saving}
                      className="min-h-10 bg-primary px-2 py-2 font-mono text-[8px] text-primary-foreground"
                    >
                      AVAILABLE
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {tab === "recommendations" && (
        <>
          <section className="flex flex-col gap-3 border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-widest">
                EXECUTIVE GIS RECOMMENDATIONS
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Generate and manage current operational advice.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void request("/gis-ai-recommendations/generate", "POST", {})
              }
              disabled={saving}
              className="flex min-h-10 items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              GENERATE ADVICE
            </button>
          </section>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3">
            {recommendations.map((item) => (
              <article key={item.id} className="border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium">
                      {item.title}
                    </p>
                    <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                      {(item.ward || "COUNTY").toUpperCase()} ·{" "}
                      {(item.recommendedOwner || "UNASSIGNED").toUpperCase()}
                    </p>
                  </div>
                  <span className="shrink-0 border border-border px-2 py-1 font-mono text-[8px]">
                    {item.priority.toUpperCase()}
                  </span>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  {item.rationale || "No rationale recorded."}
                </p>

                <p className="mt-3 text-xs">
                  {item.recommendedAction || "No action recorded."}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void request(`/gis-ai-recommendations/${item.id}`, "PATCH", {
                        status: "accepted",
                      })
                    }
                    disabled={saving}
                    className="flex min-h-10 items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    ACCEPT
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void request(`/gis-ai-recommendations/${item.id}`, "PATCH", {
                        status: "dismissed",
                      })
                    }
                    disabled={saving}
                    className="flex min-h-10 items-center justify-center gap-2 border border-red-400/40 px-3 py-2 font-mono text-[8px] text-red-400"
                  >
                    <XCircle className="h-3 w-3" />
                    DISMISS
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
