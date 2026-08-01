import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Database,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Constituent = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  ward?: string | null;
  constituency?: string | null;
  county?: string | null;
  national_id?: string | null;
  dob?: string | null;
  gender?: string | null;
  village?: string | null;
  polling_station?: string | null;
  status?: string | null;
  support_level?: string | null;
  sms_consent?: boolean;
  whatsapp_consent?: boolean;
  email_consent?: boolean;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
};

type Metrics = {
  total: number;
  phone_ready: number;
  email_ready: number;
  sms_consented: number;
  whatsapp_consented: number;
  email_consented: number;
  women: number;
  men: number;
  youth: number;
  wards: number;
  constituencies: number;
  strong_support: number;
  undecided: number;
};

type FilterOptions = {
  wards: string[];
  constituencies: string[];
  statuses: string[];
  supportLevels: string[];
};

type ListResponse = {
  rows: Constituent[];
  total: number;
  limit: number;
  offset: number;
};

type ProfileResponse = {
  constituent: Constituent;
  notes: Array<{
    id: number;
    note: string;
    created_by?: string | null;
    created_at?: string;
  }>;
  interactions: Array<{
    id: number;
    interaction_type: string;
    channel?: string | null;
    summary?: string | null;
    created_by?: string | null;
    created_at?: string;
  }>;
};

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

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

function date(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-KE");
}

export function ConstituentDatabaseV8C({
  title = "Constituent Database",
  subtitle = "Master campaign identity graph",
}: {
  title?: string;
  subtitle?: string;
}) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    wards: [],
    constituencies: [],
    statuses: [],
    supportLevels: [],
  });
  const [rows, setRows] = useState<Constituent[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [ward, setWard] = useState("");
  const [constituency, setConstituency] = useState("");
  const [gender, setGender] = useState("");
  const [support, setSupport] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const limit = 50;

  const load = useCallback(async () => {
    setError(null);

    try {
      const query = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });

      if (search.trim()) query.set("search", search.trim());
      if (ward) query.set("ward", ward);
      if (constituency) query.set("constituency", constituency);
      if (gender) query.set("gender", gender);
      if (support) query.set("support", support);

      const [list, metricData, filterData] = await Promise.all([
        requestJson<ListResponse>(
          `/api/campaign-database/constituents?${query.toString()}`,
        ),
        requestJson<Metrics>("/api/campaign-database/metrics"),
        requestJson<FilterOptions>("/api/campaign-database/filters"),
      ]);

      setRows(list.rows);
      setTotal(list.total);
      setMetrics(metricData);
      setFilters(filterData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load campaign database");
    }
  }, [offset, search, ward, constituency, gender, support]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setProfile(null);
      return;
    }

    void requestJson<ProfileResponse>(
      `/api/campaign-database/constituents/${selectedId}`,
    )
      .then(setProfile)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Unable to open profile"),
      );
  }, [selectedId]);

  async function addNote() {
    if (!selectedId || !note.trim()) return;

    await requestJson(
      `/api/campaign-database/constituents/${selectedId}/notes`,
      {
        method: "POST",
        body: JSON.stringify({
          note: note.trim(),
          createdBy: "Campaign Operations",
        }),
      },
    );

    setNote("");
    setProfile(
      await requestJson<ProfileResponse>(
        `/api/campaign-database/constituents/${selectedId}`,
      ),
    );
  }

  async function updateProfile(body: Record<string, unknown>) {
    if (!selectedId) return;

    await requestJson(
      `/api/campaign-database/constituents/${selectedId}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );

    setProfile(
      await requestJson<ProfileResponse>(
        `/api/campaign-database/constituents/${selectedId}`,
      ),
    );
    await load();
  }

  const end = Math.min(offset + limit, total);

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <section className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-primary">
            PHASE 8C LIVE CAMPAIGN DATABASE
          </p>
          <h1 className="mt-1 text-xl font-semibold">{title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>

        <div className="border border-border px-4 py-3 text-right">
          <p className="font-mono text-[8px] text-muted-foreground">
            TOTAL IDENTITIES
          </p>
          <p className="mt-1 font-mono text-xl">{number(metrics?.total)}</p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {[
          ["TOTAL", metrics?.total, Database],
          ["PHONE READY", metrics?.phone_ready, Phone],
          ["EMAIL READY", metrics?.email_ready, Mail],
          ["SMS CONSENT", metrics?.sms_consented, MessageSquare],
          ["WHATSAPP", metrics?.whatsapp_consented, MessageSquare],
          ["WOMEN", metrics?.women, User],
          ["YOUTH 18–35", metrics?.youth, User],
          ["WARDS", metrics?.wards, MapPin],
        ].map(([label, value, Icon]) => (
          <div key={String(label)} className="border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[8px] text-muted-foreground">{label}</p>
              <Icon className="h-3 w-3 text-primary" />
            </div>
            <p className="mt-2 font-mono text-lg">{number(Number(value))}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-2 border border-border bg-card p-3 lg:grid-cols-[1.5fr_repeat(4,minmax(140px,0.5fr))_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-3 w-3 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setOffset(0);
            }}
            placeholder="Search name, phone, ID, village or polling station"
            className="w-full border border-border bg-secondary py-2.5 pl-9 pr-3 text-xs"
          />
        </div>

        <select
          value={ward}
          onChange={(event) => {
            setWard(event.target.value);
            setOffset(0);
          }}
          className="border border-border bg-secondary px-3 py-2 text-xs"
        >
          <option value="">ALL WARDS</option>
          {filters.wards.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>

        <select
          value={constituency}
          onChange={(event) => {
            setConstituency(event.target.value);
            setOffset(0);
          }}
          className="border border-border bg-secondary px-3 py-2 text-xs"
        >
          <option value="">ALL CONSTITUENCIES</option>
          {filters.constituencies.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>

        <select
          value={gender}
          onChange={(event) => {
            setGender(event.target.value);
            setOffset(0);
          }}
          className="border border-border bg-secondary px-3 py-2 text-xs"
        >
          <option value="">ALL GENDER</option>
          <option value="female">FEMALE</option>
          <option value="male">MALE</option>
        </select>

        <select
          value={support}
          onChange={(event) => {
            setSupport(event.target.value);
            setOffset(0);
          }}
          className="border border-border bg-secondary px-3 py-2 text-xs"
        >
          <option value="">ALL SUPPORT</option>
          {filters.supportLevels.map((value) => (
            <option key={value} value={value}>{value.toUpperCase()}</option>
          ))}
        </select>

        <button
          onClick={() => void load()}
          className="bg-primary px-4 py-2 font-mono text-[10px] text-primary-foreground"
        >
          REFRESH
        </button>
      </section>

      {error && (
        <div className="border border-red-400/30 bg-red-400/10 p-3 font-mono text-xs text-red-400">
          {error}
        </div>
      )}

      <section className="overflow-x-auto border border-border bg-card">
        <table className="w-full min-w-[1200px]">
          <thead className="border-b border-border bg-secondary/40">
            <tr className="font-mono text-[8px] text-muted-foreground">
              <th className="px-3 py-3 text-left">NAME</th>
              <th className="px-3 py-3 text-left">PHONE</th>
              <th className="px-3 py-3 text-left">WARD</th>
              <th className="px-3 py-3 text-left">CONSTITUENCY</th>
              <th className="px-3 py-3 text-left">VILLAGE</th>
              <th className="px-3 py-3 text-left">POLLING STATION</th>
              <th className="px-3 py-3 text-left">GENDER</th>
              <th className="px-3 py-3 text-left">DOB</th>
              <th className="px-3 py-3 text-left">SUPPORT</th>
              <th className="px-3 py-3 text-left">STATUS</th>
              <th className="px-3 py-3 text-left">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((person) => (
              <tr key={person.id} className="border-b border-border text-xs">
                <td className="px-3 py-3 font-medium">{person.full_name ?? "Unnamed"}</td>
                <td className="px-3 py-3 font-mono">{person.phone ?? "—"}</td>
                <td className="px-3 py-3">{person.ward ?? "—"}</td>
                <td className="px-3 py-3">{person.constituency ?? "—"}</td>
                <td className="px-3 py-3">{person.village ?? "—"}</td>
                <td className="px-3 py-3">{person.polling_station ?? "—"}</td>
                <td className="px-3 py-3">{person.gender ?? "—"}</td>
                <td className="px-3 py-3">{date(person.dob)}</td>
                <td className="px-3 py-3">{person.support_level ?? "Unclassified"}</td>
                <td className="px-3 py-3">{person.status ?? "active"}</td>
                <td className="px-3 py-3">
                  <button
                    onClick={() => setSelectedId(person.id)}
                    className="border border-primary/40 px-3 py-1.5 font-mono text-[9px] text-primary"
                  >
                    OPEN PROFILE
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="py-16 text-center font-mono text-xs text-muted-foreground">
            [ NO_CONSTITUENTS_FOUND ]
          </p>
        )}
      </section>

      <section className="flex items-center justify-between border border-border bg-card p-3">
        <p className="font-mono text-[9px] text-muted-foreground">
          SHOWING {total ? offset + 1 : 0}–{end} OF {number(total)}
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => setOffset(Math.max(offset - limit, 0))}
            disabled={offset === 0}
            className="border border-border p-2 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total}
            className="border border-border p-2 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {profile && (
        <div className="fixed inset-0 z-[80] bg-black/70 p-3 lg:p-8">
          <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden border border-border bg-background">
            <header className="flex items-start justify-between border-b border-border bg-card p-4">
              <div>
                <p className="font-mono text-[9px] text-primary">
                  IDENTITY PROFILE #{profile.constituent.id}
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  {profile.constituent.full_name ?? "Unnamed constituent"}
                </h2>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="border border-border p-2"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                <div className="space-y-4">
                  <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      ["PHONE", profile.constituent.phone],
                      ["EMAIL", profile.constituent.email],
                      ["NATIONAL ID", profile.constituent.national_id],
                      ["WARD", profile.constituent.ward],
                      ["CONSTITUENCY", profile.constituent.constituency],
                      ["COUNTY", profile.constituent.county],
                      ["VILLAGE", profile.constituent.village],
                      ["POLLING STATION", profile.constituent.polling_station],
                      ["GENDER", profile.constituent.gender],
                      ["DOB", date(profile.constituent.dob)],
                      ["SUPPORT", profile.constituent.support_level],
                      ["STATUS", profile.constituent.status],
                    ].map(([label, value]) => (
                      <div key={label} className="border border-border bg-card p-3">
                        <p className="font-mono text-[8px] text-muted-foreground">{label}</p>
                        <p className="mt-1 text-xs">{value ?? "—"}</p>
                      </div>
                    ))}
                  </section>

                  <section className="border border-border bg-card p-4">
                    <p className="mb-3 font-mono text-[10px]">CONSENT & SUPPORT</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        ["SMS consent", "smsConsent", profile.constituent.sms_consent],
                        ["WhatsApp consent", "whatsappConsent", profile.constituent.whatsapp_consent],
                        ["Email consent", "emailConsent", profile.constituent.email_consent],
                      ].map(([label, key, checked]) => (
                        <label key={String(key)} className="flex items-center gap-2 border border-border p-3 text-xs">
                          <input
                            type="checkbox"
                            checked={Boolean(checked)}
                            onChange={(event) =>
                              void updateProfile({ [String(key)]: event.target.checked })
                            }
                          />
                          {label}
                        </label>
                      ))}

                      <select
                        value={profile.constituent.support_level ?? ""}
                        onChange={(event) =>
                          void updateProfile({
                            supportLevel: event.target.value || null,
                          })
                        }
                        className="border border-border bg-secondary px-3 py-2 text-xs"
                      >
                        <option value="">UNCLASSIFIED SUPPORT</option>
                        <option value="strong">STRONG</option>
                        <option value="leaning">LEANING</option>
                        <option value="undecided">UNDECIDED</option>
                        <option value="opposed">OPPOSED</option>
                      </select>
                    </div>
                  </section>

                  <section className="border border-border bg-card p-4">
                    <p className="mb-3 font-mono text-[10px]">INTERACTION TIMELINE</p>
                    <div className="space-y-2">
                      {profile.interactions.map((item) => (
                        <div key={item.id} className="border-l border-primary/40 pl-3">
                          <p className="font-mono text-[9px] text-primary">
                            {item.interaction_type.toUpperCase()}
                            {item.channel ? ` · ${item.channel}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.summary ?? "No summary"}
                          </p>
                        </div>
                      ))}

                      {profile.interactions.length === 0 && (
                        <p className="py-8 text-center font-mono text-xs text-muted-foreground">
                          [ NO_INTERACTIONS ]
                        </p>
                      )}
                    </div>
                  </section>
                </div>

                <aside className="space-y-4">
                  <section className="border border-border bg-card p-4">
                    <p className="mb-3 font-mono text-[10px]">ADD NOTE</p>
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      rows={5}
                      className="w-full resize-none border border-border bg-secondary p-3 text-xs"
                      placeholder="Campaign note, field observation, household detail..."
                    />
                    <button
                      onClick={() => void addNote()}
                      disabled={!note.trim()}
                      className="mt-2 w-full bg-primary px-3 py-2 font-mono text-[9px] text-primary-foreground disabled:opacity-40"
                    >
                      SAVE NOTE
                    </button>
                  </section>

                  <section className="border border-border bg-card p-4">
                    <p className="mb-3 font-mono text-[10px]">NOTES</p>
                    <div className="space-y-2">
                      {profile.notes.map((item) => (
                        <div key={item.id} className="border border-border p-3">
                          <p className="text-xs">{item.note}</p>
                          <p className="mt-2 font-mono text-[8px] text-muted-foreground">
                            {item.created_by ?? "Campaign Operations"}
                          </p>
                        </div>
                      ))}

                      {profile.notes.length === 0 && (
                        <p className="py-8 text-center font-mono text-xs text-muted-foreground">
                          [ NO_NOTES ]
                        </p>
                      )}
                    </div>
                  </section>
                </aside>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
