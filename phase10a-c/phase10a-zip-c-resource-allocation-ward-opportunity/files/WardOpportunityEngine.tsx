import {
  AlertTriangle,
  ArrowUpRight,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCw,
  Target,
  UserPlus,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

type AllocationRow = {
  ward: string;
  constituency?: string | null;
  constituents: number;
  phoneReady: number;
  supportClassified: number;
  undecided: number;
  opportunityScore: number;
  riskScore: number;
  recommendedVolunteers: number;
  recommendedFieldVisits: number;
  messagingPriority: string;
  contactRecoveryPriority: string;
  supportClassificationPriority: string;
  rationale: string;
};

type Props = {
  onPrompt: (prompt: string) => void;
};

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function scoreClass(score: number) {
  if (score >= 70) return "text-red-400";
  if (score >= 45) return "text-orange-400";
  if (score >= 25) return "text-yellow-400";
  return "text-green-400";
}

function priorityClass(priority: string) {
  if (priority === "critical") return "text-red-400 border-red-400/40";
  if (priority === "high") return "text-orange-400 border-orange-400/40";
  if (priority === "medium") return "text-yellow-400 border-yellow-400/40";
  return "text-blue-400 border-blue-400/40";
}

export default function WardOpportunityEngine({ onPrompt }: Props) {
  const [rows, setRows] = useState<AllocationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingWard, setCreatingWard] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${BASE}api/strategist/resource-allocation`,
        { credentials: "include" },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load allocation data");
      }

      setRows(await response.json());
    } catch (error) {
      alert(error instanceof Error ? error.message : "Allocation load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createAction(row: AllocationRow) {
    setCreatingWard(row.ward);
    try {
      const response = await fetch(
        `${BASE}api/strategist/resource-allocation/${encodeURIComponent(
          row.ward,
        )}/action`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create action");
      }

      alert(`Action created for ${row.ward}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Action creation failed");
    } finally {
      setCreatingWard(null);
    }
  }

  return (
    <section className="space-y-4 border-b border-border/50 bg-background/40 p-4 md:p-6">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">
            STRATEGIC RESOURCE ALLOCATION & WARD OPPORTUNITY ENGINE
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ward-level risk, opportunity and recommended campaign deployment.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          REFRESH
        </button>
      </header>

      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((row, index) => (
          <article key={row.ward} className="border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] text-primary">
                  PRIORITY {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mt-1 font-mono text-sm">
                  {row.ward.toUpperCase()}
                </p>
                <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                  {(row.constituency || "MAKUENI").toUpperCase()} ·{" "}
                  {number(row.constituents)} CONSTITUENTS
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="border border-border p-2 text-center">
                  <p className="font-mono text-[7px] text-muted-foreground">
                    OPPORTUNITY
                  </p>
                  <p className={`mt-1 font-mono text-lg ${scoreClass(row.opportunityScore)}`}>
                    {row.opportunityScore}
                  </p>
                </div>
                <div className="border border-border p-2 text-center">
                  <p className="font-mono text-[7px] text-muted-foreground">
                    RISK
                  </p>
                  <p className={`mt-1 font-mono text-lg ${scoreClass(row.riskScore)}`}>
                    {row.riskScore}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["VOLUNTEERS", row.recommendedVolunteers, Users],
                ["FIELD VISITS", row.recommendedFieldVisits, MapPin],
                ["PHONE READY", row.phoneReady, UserPlus],
                ["CLASSIFIED", row.supportClassified, Target],
              ].map(([label, value, Icon]) => (
                <div key={String(label)} className="border border-border p-2">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[7px] text-muted-foreground">
                      {label}
                    </p>
                    <Icon className="h-3 w-3 text-primary" />
                  </div>
                  <p className="mt-2 font-mono text-sm">
                    {number(Number(value))}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {[
                ["MESSAGING", row.messagingPriority],
                ["CONTACT RECOVERY", row.contactRecoveryPriority],
                [
                  "SUPPORT CLASSIFICATION",
                  row.supportClassificationPriority,
                ],
              ].map(([label, priority]) => (
                <div key={String(label)} className="border border-border p-2">
                  <p className="font-mono text-[7px] text-muted-foreground">
                    {label}
                  </p>
                  <p
                    className={`mt-2 border px-2 py-1 text-center font-mono text-[8px] ${priorityClass(
                      String(priority),
                    )}`}
                  >
                    {String(priority).toUpperCase()}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              {row.rationale}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  onPrompt(
                    `Create a complete ward strategy for ${row.ward}. Allocate ${row.recommendedVolunteers} volunteers, schedule ${row.recommendedFieldVisits} field visits, and address these priorities: messaging ${row.messagingPriority}, contact recovery ${row.contactRecoveryPriority}, support classification ${row.supportClassificationPriority}.`,
                  )
                }
                className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]"
              >
                <MessageSquare className="h-3 w-3" />
                ASK STRATEGIST
              </button>

              <button
                type="button"
                onClick={() => createAction(row)}
                disabled={creatingWard === row.ward}
                className="flex items-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
              >
                {creatingWard === row.ward ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ArrowUpRight className="h-3 w-3" />
                )}
                ADD TO ACTION QUEUE
              </button>
            </div>
          </article>
        ))}

        {!loading && rows.length === 0 && (
          <div className="col-span-full border border-dashed border-border py-12 text-center font-mono text-[10px] text-muted-foreground">
            [ NO_WARD_ALLOCATION_DATA ]
          </div>
        )}
      </div>
    </section>
  );
}
