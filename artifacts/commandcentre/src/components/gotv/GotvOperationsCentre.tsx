import {
  Bus,
  CheckCircle2,
  Home,
  Loader2,
  MessageSquare,
  PhoneCall,
  Plus,
  RefreshCw,
  Target,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const BASE = import.meta.env.BASE_URL ?? "/";

type GotvPayload = {
  generatedAt: string;
  summary: {
    households: number;
    householdsVisited: number;
    followUps: number;
    contacts: number;
    contactsCompleted: number;
    pendingCalls: number;
    pendingSms: number;
    pendingWhatsapp: number;
    transportRequests: number;
    transportCompleted: number;
    volunteers: number;
    activeVolunteers: number;
  };
  wards: Array<{
    ward: string;
    stations: number;
    registered: number;
    turnoutTarget: number;
    householdTarget: number;
    householdsVisited: number;
    contactTarget: number;
    contactsCompleted: number;
    transportRequests: number;
    transportCompleted: number;
    mobilisationScore: number;
  }>;
  households: Array<any>;
  contacts: Array<any>;
  transport: Array<any>;
  targets: Array<any>;
};

function number(value?: number | null) {
  return Number(value ?? 0).toLocaleString("en-KE");
}

function tone(score: number) {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

export default function GotvOperationsCentre() {
  const [data, setData] = useState<GotvPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<
    "dashboard" | "households" | "contacts" | "transport" | "targets"
  >("dashboard");

  const [householdForm, setHouseholdForm] = useState({
    ward: "",
    householdName: "",
    contactName: "",
    phone: "",
    visitStatus: "pending",
    supportStatus: "unknown",
    followUpRequired: false,
  });

  const [contactForm, setContactForm] = useState({
    ward: "",
    contactName: "",
    phone: "",
    channel: "call",
    status: "pending",
  });

  const [transportForm, setTransportForm] = useState({
    ward: "",
    voterName: "",
    phone: "",
    pickupPoint: "",
    vehicleRegistration: "",
    status: "requested",
  });

  const [targetForm, setTargetForm] = useState({
    ward: "",
    householdTarget: "",
    contactTarget: "",
    turnoutTarget: "65",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${BASE}api/turnout/operations-centre`,
        { credentials: "include" },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load GOTV operations");
      }

      setData(await response.json());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load GOTV Operations Centre",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const wards = useMemo(
    () =>
      [...(data?.wards ?? [])].sort(
        (a, b) => b.mobilisationScore - a.mobilisationScore,
      ),
    [data?.wards],
  );

  const overallMobilisation = wards.length
    ? Math.round(
        wards.reduce(
          (sum, ward) => sum + ward.mobilisationScore,
          0,
        ) / wards.length,
      )
    : 0;

  async function request(path: string, method: string, body: unknown) {
    setSaving(true);
    try {
      const response = await fetch(`${BASE}api/turnout${path}`, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Operation failed");
      }

      await load();
      return true;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Operation failed");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function addHousehold() {
    if (!householdForm.ward) return;
    const ok = await request(
      "/operations-centre/households",
      "POST",
      householdForm,
    );

    if (ok) {
      setHouseholdForm({
        ward: "",
        householdName: "",
        contactName: "",
        phone: "",
        visitStatus: "pending",
        supportStatus: "unknown",
        followUpRequired: false,
      });
    }
  }

  async function addContact() {
    if (!contactForm.contactName) return;
    const ok = await request(
      "/operations-centre/contacts",
      "POST",
      contactForm,
    );

    if (ok) {
      setContactForm({
        ward: "",
        contactName: "",
        phone: "",
        channel: "call",
        status: "pending",
      });
    }
  }

  async function addTransport() {
    if (!transportForm.ward || !transportForm.voterName) return;
    const ok = await request(
      "/operations-centre/transport",
      "POST",
      transportForm,
    );

    if (ok) {
      setTransportForm({
        ward: "",
        voterName: "",
        phone: "",
        pickupPoint: "",
        vehicleRegistration: "",
        status: "requested",
      });
    }
  }

  async function saveTargets() {
    if (!targetForm.ward) return;

    const ok = await request(
      "/operations-centre/targets",
      "PUT",
      {
        ward: targetForm.ward,
        householdTarget: Number(targetForm.householdTarget || 0),
        contactTarget: Number(targetForm.contactTarget || 0),
        turnoutTarget: Number(targetForm.turnoutTarget || 65),
      },
    );

    if (ok) {
      setTargetForm({
        ward: "",
        householdTarget: "",
        contactTarget: "",
        turnoutTarget: "65",
      });
    }
  }

  const summary = data?.summary;

  return (
    <section className="space-y-4 border-b border-border/50 pb-5">
      <header className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">
            PHASE 11B · GOTV OPERATIONS CENTRE
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Household mobilisation, voter contact, volunteers and transport readiness.
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

      {error && (
        <div className="border border-red-400/40 p-3 font-mono text-[9px] text-red-400">
          [ GOTV_OPERATIONS_ERROR ] {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {[
          ["MOBILISATION", `${overallMobilisation}%`, Target],
          ["HOUSEHOLDS", summary?.households ?? 0, Home],
          ["VISITED", summary?.householdsVisited ?? 0, CheckCircle2],
          ["FOLLOW-UPS", summary?.followUps ?? 0, MessageSquare],
          ["CONTACTS", summary?.contacts ?? 0, PhoneCall],
          ["COMPLETED", summary?.contactsCompleted ?? 0, CheckCircle2],
          ["ACTIVE VOLUNTEERS", summary?.activeVolunteers ?? 0, Users],
          ["TRANSPORT COMPLETE", summary?.transportCompleted ?? 0, Bus],
        ].map(([label, value, Icon]) => (
          <article key={String(label)} className="border border-border bg-card p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-[7px] text-muted-foreground">
                {label}
              </p>
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="mt-3 font-mono text-lg">{value}</p>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["dashboard", "DASHBOARD"],
          ["households", "HOUSEHOLDS"],
          ["contacts", "CONTACT CENTRE"],
          ["transport", "TRANSPORT"],
          ["targets", "WARD TARGETS"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setPanel(value as any)}
            className={`border px-3 py-2 font-mono text-[8px] ${
              panel === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {panel === "dashboard" && (
        <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
          <article className="border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest">
              WARD MOBILISATION RANKING
            </p>

            <div className="mt-4 space-y-3">
              {wards.map((ward, index) => (
                <div key={ward.ward} className="border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[9px]">
                        {String(index + 1).padStart(2, "0")} ·{" "}
                        {ward.ward.toUpperCase()}
                      </p>
                      <p className="mt-1 font-mono text-[8px] text-muted-foreground">
                        {number(ward.registered)} REGISTERED · TURNOUT TARGET{" "}
                        {ward.turnoutTarget}%
                      </p>
                    </div>
                    <span
                      className={`font-mono text-sm ${tone(
                        ward.mobilisationScore,
                      )}`}
                    >
                      {ward.mobilisationScore}%
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                    <div className="border border-border p-2">
                      <p className="font-mono text-[7px] text-muted-foreground">
                        HOUSEHOLDS
                      </p>
                      <p className="mt-1 font-mono text-[9px]">
                        {ward.householdsVisited}/{ward.householdTarget}
                      </p>
                    </div>
                    <div className="border border-border p-2">
                      <p className="font-mono text-[7px] text-muted-foreground">
                        CONTACTS
                      </p>
                      <p className="mt-1 font-mono text-[9px]">
                        {ward.contactsCompleted}/{ward.contactTarget}
                      </p>
                    </div>
                    <div className="border border-border p-2">
                      <p className="font-mono text-[7px] text-muted-foreground">
                        TRANSPORT
                      </p>
                      <p className="mt-1 font-mono text-[9px]">
                        {ward.transportCompleted}/{ward.transportRequests}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 bg-secondary">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${ward.mobilisationScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest">
              CONTACT & LOGISTICS QUEUES
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                ["PENDING CALLS", summary?.pendingCalls ?? 0],
                ["PENDING SMS", summary?.pendingSms ?? 0],
                ["PENDING WHATSAPP", summary?.pendingWhatsapp ?? 0],
                ["TRANSPORT REQUESTS", summary?.transportRequests ?? 0],
                ["TRANSPORT COMPLETE", summary?.transportCompleted ?? 0],
                ["TOTAL VOLUNTEERS", summary?.volunteers ?? 0],
              ].map(([label, value]) => (
                <div key={String(label)} className="border border-border p-3">
                  <p className="font-mono text-[7px] text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-2 font-mono text-lg">
                    {number(Number(value))}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}

      {panel === "households" && (
        <section className="space-y-4">
          <article className="border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest">
              ADD HOUSEHOLD VISIT
            </p>

            <div className="mt-4 grid gap-2 md:grid-cols-4">
              <input
                value={householdForm.ward}
                onChange={(event) =>
                  setHouseholdForm({
                    ...householdForm,
                    ward: event.target.value,
                  })
                }
                placeholder="Ward"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <input
                value={householdForm.householdName}
                onChange={(event) =>
                  setHouseholdForm({
                    ...householdForm,
                    householdName: event.target.value,
                  })
                }
                placeholder="Household name"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <input
                value={householdForm.contactName}
                onChange={(event) =>
                  setHouseholdForm({
                    ...householdForm,
                    contactName: event.target.value,
                  })
                }
                placeholder="Contact person"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <input
                value={householdForm.phone}
                onChange={(event) =>
                  setHouseholdForm({
                    ...householdForm,
                    phone: event.target.value,
                  })
                }
                placeholder="Phone"
                className="border border-border bg-background px-3 py-2 text-xs"
              />

              <select
                value={householdForm.visitStatus}
                onChange={(event) =>
                  setHouseholdForm({
                    ...householdForm,
                    visitStatus: event.target.value,
                  })
                }
                className="border border-border bg-background px-3 py-2 font-mono text-[8px]"
              >
                <option value="pending">PENDING</option>
                <option value="visited">VISITED</option>
                <option value="not-home">NOT HOME</option>
                <option value="refused">REFUSED</option>
              </select>

              <select
                value={householdForm.supportStatus}
                onChange={(event) =>
                  setHouseholdForm({
                    ...householdForm,
                    supportStatus: event.target.value,
                  })
                }
                className="border border-border bg-background px-3 py-2 font-mono text-[8px]"
              >
                <option value="unknown">UNKNOWN</option>
                <option value="strong">STRONG SUPPORT</option>
                <option value="leaning">LEANING SUPPORT</option>
                <option value="undecided">UNDECIDED</option>
                <option value="opposed">OPPOSED</option>
              </select>

              <label className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[8px]">
                <input
                  type="checkbox"
                  checked={householdForm.followUpRequired}
                  onChange={(event) =>
                    setHouseholdForm({
                      ...householdForm,
                      followUpRequired: event.target.checked,
                    })
                  }
                />
                FOLLOW-UP REQUIRED
              </label>

              <button
                type="button"
                onClick={addHousehold}
                disabled={saving || !householdForm.ward}
                className="flex items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                ADD HOUSEHOLD
              </button>
            </div>
          </article>

          <article className="border border-border bg-card p-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Ward</th>
                    <th className="px-3 py-2">Household</th>
                    <th className="px-3 py-2">Contact</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Visit</th>
                    <th className="px-3 py-2">Support</th>
                    <th className="px-3 py-2">Follow-up</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.households ?? []).map((item) => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="px-3 py-3">{item.ward}</td>
                      <td className="px-3 py-3">
                        {item.household_name || item.householdName || "—"}
                      </td>
                      <td className="px-3 py-3">
                        {item.contact_name || item.contactName || "—"}
                      </td>
                      <td className="px-3 py-3">{item.phone || "—"}</td>
                      <td className="px-3 py-3">
                        {item.visit_status || item.visitStatus}
                      </td>
                      <td className="px-3 py-3">
                        {item.support_status || item.supportStatus}
                      </td>
                      <td className="px-3 py-3">
                        {item.follow_up_required || item.followUpRequired
                          ? "YES"
                          : "NO"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {panel === "contacts" && (
        <section className="space-y-4">
          <article className="border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest">
              ADD CONTACT QUEUE ITEM
            </p>

            <div className="mt-4 grid gap-2 md:grid-cols-5">
              <input
                value={contactForm.ward}
                onChange={(event) =>
                  setContactForm({
                    ...contactForm,
                    ward: event.target.value,
                  })
                }
                placeholder="Ward"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <input
                value={contactForm.contactName}
                onChange={(event) =>
                  setContactForm({
                    ...contactForm,
                    contactName: event.target.value,
                  })
                }
                placeholder="Contact name"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <input
                value={contactForm.phone}
                onChange={(event) =>
                  setContactForm({
                    ...contactForm,
                    phone: event.target.value,
                  })
                }
                placeholder="Phone"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <select
                value={contactForm.channel}
                onChange={(event) =>
                  setContactForm({
                    ...contactForm,
                    channel: event.target.value,
                  })
                }
                className="border border-border bg-background px-3 py-2 font-mono text-[8px]"
              >
                <option value="call">CALL</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WHATSAPP</option>
              </select>
              <button
                type="button"
                onClick={addContact}
                disabled={saving || !contactForm.contactName}
                className="flex items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
                ADD CONTACT
              </button>
            </div>
          </article>

          <article className="border border-border bg-card p-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-xs">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Ward</th>
                    <th className="px-3 py-2">Contact</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Channel</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.contacts ?? []).map((item) => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="px-3 py-3">{item.ward || "—"}</td>
                      <td className="px-3 py-3">
                        {item.contact_name || item.contactName}
                      </td>
                      <td className="px-3 py-3">{item.phone || "—"}</td>
                      <td className="px-3 py-3">{item.channel}</td>
                      <td className="px-3 py-3">{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {panel === "transport" && (
        <section className="space-y-4">
          <article className="border border-border bg-card p-4">
            <p className="font-mono text-[10px] tracking-widest">
              ADD VOTER TRANSPORT REQUEST
            </p>

            <div className="mt-4 grid gap-2 md:grid-cols-5">
              <input
                value={transportForm.ward}
                onChange={(event) =>
                  setTransportForm({
                    ...transportForm,
                    ward: event.target.value,
                  })
                }
                placeholder="Ward"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <input
                value={transportForm.voterName}
                onChange={(event) =>
                  setTransportForm({
                    ...transportForm,
                    voterName: event.target.value,
                  })
                }
                placeholder="Voter name"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <input
                value={transportForm.phone}
                onChange={(event) =>
                  setTransportForm({
                    ...transportForm,
                    phone: event.target.value,
                  })
                }
                placeholder="Phone"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <input
                value={transportForm.pickupPoint}
                onChange={(event) =>
                  setTransportForm({
                    ...transportForm,
                    pickupPoint: event.target.value,
                  })
                }
                placeholder="Pickup point"
                className="border border-border bg-background px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={addTransport}
                disabled={
                  saving ||
                  !transportForm.ward ||
                  !transportForm.voterName
                }
                className="flex items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
                ADD REQUEST
              </button>
            </div>
          </article>

          <article className="border border-border bg-card p-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-xs">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Ward</th>
                    <th className="px-3 py-2">Voter</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Pickup</th>
                    <th className="px-3 py-2">Vehicle</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.transport ?? []).map((item) => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="px-3 py-3">{item.ward}</td>
                      <td className="px-3 py-3">
                        {item.voter_name || item.voterName}
                      </td>
                      <td className="px-3 py-3">{item.phone || "—"}</td>
                      <td className="px-3 py-3">
                        {item.pickup_point || item.pickupPoint || "—"}
                      </td>
                      <td className="px-3 py-3">
                        {item.vehicle_registration ||
                          item.vehicleRegistration ||
                          "—"}
                      </td>
                      <td className="px-3 py-3">{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      )}

      {panel === "targets" && (
        <article className="border border-border bg-card p-4">
          <p className="font-mono text-[10px] tracking-widest">
            SET WARD GOTV TARGETS
          </p>

          <div className="mt-4 grid gap-2 md:grid-cols-5">
            <input
              value={targetForm.ward}
              onChange={(event) =>
                setTargetForm({
                  ...targetForm,
                  ward: event.target.value,
                })
              }
              placeholder="Ward"
              className="border border-border bg-background px-3 py-2 text-xs"
            />
            <input
              type="number"
              value={targetForm.householdTarget}
              onChange={(event) =>
                setTargetForm({
                  ...targetForm,
                  householdTarget: event.target.value,
                })
              }
              placeholder="Household target"
              className="border border-border bg-background px-3 py-2 text-xs"
            />
            <input
              type="number"
              value={targetForm.contactTarget}
              onChange={(event) =>
                setTargetForm({
                  ...targetForm,
                  contactTarget: event.target.value,
                })
              }
              placeholder="Contact target"
              className="border border-border bg-background px-3 py-2 text-xs"
            />
            <input
              type="number"
              value={targetForm.turnoutTarget}
              onChange={(event) =>
                setTargetForm({
                  ...targetForm,
                  turnoutTarget: event.target.value,
                })
              }
              placeholder="Turnout target %"
              className="border border-border bg-background px-3 py-2 text-xs"
            />
            <button
              type="button"
              onClick={saveTargets}
              disabled={saving || !targetForm.ward}
              className="flex items-center justify-center gap-2 bg-primary px-3 py-2 font-mono text-[8px] text-primary-foreground disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Target className="h-3 w-3" />
              )}
              SAVE TARGETS
            </button>
          </div>
        </article>
      )}
    </section>
  );
}
