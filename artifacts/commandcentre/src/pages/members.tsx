import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  getGetMemberStatsQueryKey,
  getListMembersQueryKey,
  useCreateMember,
  useDeleteMember,
  useGetMemberStats,
  useListMembers,
  useUpdateMember,
} from "@workspace/api-client-react";

import type {
  Member,
  MemberInput,
} from "@workspace/api-client-react";

import {
  Check,
  CheckCircle2,
  ChevronDown,
  Edit2,
  Filter,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";

const SUPPORT_LEVELS = [
  "strong_supporter",
  "supporter",
  "undecided",
  "soft_opponent",
  "opponent",
];

const WARDS = [
  "Tulimani",
  "Mbooni",
  "Kithungo/Kitundu",
  "Kisau/Kiteta",
  "Kako/Waia",
  "Kalawa",
  "Kiima Kiu/Kalanzoni",
  "Mukaa",
  "Kasikeu",
  "Kee",
  "Kilungu",
  "Ilima",
  "Ukia",
  "Wote",
  "Muvau/Kikumini",
  "Mavindini",
  "Kitise/Kithuki",
  "Kathonzweni",
  "Nzaui/Kilili/Kalamba",
  "Mbitini",
  "Makindu",
  "Nguumo",
  "Kikumbulyu North",
  "Kikumbulyu South",
  "Nguu/Masumba",
  "Emali/Mulala",
  "Masongaleni",
  "Mtito Andei",
  "Thange",
  "Ivingoni/Nzambani",
];

const STATUSES = ["active", "inactive", "deceased"];

const EMPTY_FORM: Partial<MemberInput> = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  ward: "",
  supportLevel: "",
  smsConsent: false,
  whatsappConsent: false,
  emailConsent: false,
  notes: "",
};

function displaySupportLevel(level?: string | null) {
  if (!level) return "Not classified";

  return level
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function SupportBadge({ level }: { level?: string | null }) {
  const styles: Record<string, string> = {
    strong_supporter:
      "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    supporter:
      "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    undecided:
      "border-amber-400/20 bg-amber-400/10 text-amber-300",
    soft_opponent:
      "border-orange-400/20 bg-orange-400/10 text-orange-300",
    opponent:
      "border-red-400/20 bg-red-400/10 text-red-300",
  };

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-[9px] font-semibold ${
        styles[level ?? ""] ??
        "border-white/10 bg-white/[0.03] text-slate-500"
      }`}
    >
      {displaySupportLevel(level)}
    </span>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  const active = status === "active";

  return (
    <span
      className={
        active
          ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-2 py-1 text-[9px] font-semibold text-emerald-300"
          : "inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[9px] font-semibold text-slate-400"
      }
    >
      <span
        className={
          active
            ? "h-1.5 w-1.5 rounded-full bg-emerald-300"
            : "h-1.5 w-1.5 rounded-full bg-slate-500"
        }
      />

      {(status ?? "inactive").toUpperCase()}
    </span>
  );
}

function ConsentBadge({
  enabled,
  label,
  icon: Icon,
}: {
  enabled: boolean;
  label: string;
  icon: typeof Phone;
}) {
  return (
    <div
      title={`${label} consent ${enabled ? "granted" : "not granted"}`}
      className={
        enabled
          ? "flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300"
          : "flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-slate-600"
      }
    >
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: typeof Users;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#0c1726] p-5 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-slate-500">
            {label}
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-white">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[0.06]">
          <Icon className="h-5 w-5 text-cyan-300" />
        </div>
      </div>

      <p className="mt-3 text-[11px] text-slate-500">{description}</p>
    </article>
  );
}

function FieldLabel({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
      {children}
      {required && <span className="ml-1 text-red-300">*</span>}
    </label>
  );
}

function MemberForm({
  form,
  setForm,
  editing,
  submitting,
  onSubmit,
  onCancel,
}: {
  form: Partial<MemberInput>;
  setForm: React.Dispatch<React.SetStateAction<Partial<MemberInput>>>;
  editing: boolean;
  submitting: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const inputClass =
    "w-full rounded-xl border border-white/10 bg-[#07111e] px-3 py-2.5 text-xs text-white outline-none transition-colors placeholder:text-slate-700 focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-400/5";

  return (
    <section className="overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#0c1726] shadow-xl shadow-black/10">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/[0.07]">
            {editing ? (
              <Edit2 className="h-4 w-4 text-cyan-300" />
            ) : (
              <UserRound className="h-4 w-4 text-cyan-300" />
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">
              {editing ? "Update voter record" : "Register voter"}
            </h2>

            <p className="mt-0.5 text-[10px] text-slate-500">
              {editing
                ? "Edit the selected voter information."
                : "Add a new voter to the campaign database."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-white/10 p-2 text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div>
          <FieldLabel required>First name</FieldLabel>

          <input
            required
            value={form.firstName ?? ""}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                firstName: event.target.value,
              }))
            }
            className={inputClass}
            placeholder="Enter first name"
          />
        </div>

        <div>
          <FieldLabel required>Last name</FieldLabel>

          <input
            required
            value={form.lastName ?? ""}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                lastName: event.target.value,
              }))
            }
            className={inputClass}
            placeholder="Enter last name"
          />
        </div>

        <div>
          <FieldLabel>Phone number</FieldLabel>

          <input
            value={form.phone ?? ""}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                phone: event.target.value,
              }))
            }
            className={inputClass}
            placeholder="07XX XXX XXX"
          />
        </div>

        <div>
          <FieldLabel>Email address</FieldLabel>

          <input
            type="email"
            value={form.email ?? ""}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                email: event.target.value,
              }))
            }
            className={inputClass}
            placeholder="name@example.com"
          />
        </div>

        <div>
          <FieldLabel>Ward</FieldLabel>

          <div className="relative">
            <select
              value={form.ward ?? ""}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  ward: event.target.value,
                }))
              }
              className={`${inputClass} appearance-none pr-9`}
            >
              <option value="">Select ward</option>

              {WARDS.map((ward) => (
                <option key={ward} value={ward}>
                  {ward}
                </option>
              ))}
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          </div>
        </div>

        <div>
          <FieldLabel>Support level</FieldLabel>

          <div className="relative">
            <select
              value={form.supportLevel ?? ""}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  supportLevel: event.target.value,
                }))
              }
              className={`${inputClass} appearance-none pr-9`}
            >
              <option value="">Select support level</option>

              {SUPPORT_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {displaySupportLevel(level)}
                </option>
              ))}
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          </div>
        </div>

        <div className="sm:col-span-2">
          <FieldLabel>Communication consent</FieldLabel>

          <div className="flex min-h-[42px] flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-[#07111e] px-3 py-2">
            {(
              [
                ["smsConsent", "SMS"],
                ["whatsappConsent", "WhatsApp"],
                ["emailConsent", "Email"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-400"
              >
                <input
                  type="checkbox"
                  checked={Boolean(form[key])}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      [key]: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-cyan-300"
                />

                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2 xl:col-span-4">
          <FieldLabel>Notes</FieldLabel>

          <textarea
            rows={3}
            value={form.notes ?? ""}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                notes: event.target.value,
              }))
            }
            className={`${inputClass} resize-none`}
            placeholder="Add mobilisation notes, interests or engagement history."
          />
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-4 sm:col-span-2 xl:col-span-4">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.06]"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Check className="h-4 w-4" />

            {submitting
              ? "Saving..."
              : editing
                ? "Update record"
                : "Register voter"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function Members() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [wardFilter, setWardFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<MemberInput>>(EMPTY_FORM);

  const params = {
    search: search || undefined,
    ward: wardFilter || undefined,
    status: statusFilter || undefined,
  };

  const {
    data: membersData,
    isLoading,
  } = useListMembers(params);

  const { data: stats } = useGetMemberStats();

  const resetForm = () => {
    setShowAdd(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const refreshMemberData = () => {
    queryClient.invalidateQueries({
      queryKey: getListMembersQueryKey(),
    });

    queryClient.invalidateQueries({
      queryKey: getGetMemberStatsQueryKey(),
    });
  };

  const createMember = useCreateMember({
    mutation: {
      onSuccess: () => {
        refreshMemberData();
        resetForm();
      },
    },
  });

  const updateMember = useUpdateMember({
    mutation: {
      onSuccess: () => {
        refreshMemberData();
        resetForm();
      },
    },
  });

  const deleteMember = useDeleteMember({
    mutation: {
      onSuccess: refreshMemberData,
    },
  });

  const members = (membersData?.data ?? []) as Member[];

  const visibleMemberCount = members.length;

  const activeMemberCount = useMemo(
    () => members.filter((member) => member.status === "active").length,
    [members],
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (editingId !== null) {
      updateMember.mutate({
        id: editingId,
        data: form,
      });

      return;
    }

    createMember.mutate({
      data: form as MemberInput,
    });
  };

  const startEditing = (member: Member) => {
    setShowAdd(false);
    setEditingId(member.id);

    setForm({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email ?? "",
      phone: member.phone ?? "",
      ward: member.ward ?? "",
      supportLevel: member.supportLevel ?? "",
      smsConsent: member.smsConsent,
      whatsappConsent: member.whatsappConsent,
      emailConsent: member.emailConsent,
      notes: member.notes ?? "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const removeMember = (member: Member) => {
    const confirmed = window.confirm(
      `Delete ${member.firstName} ${member.lastName} from the voter database?`,
    );

    if (confirmed) {
      deleteMember.mutate({
        id: member.id,
      });
    }
  };

  const clearFilters = () => {
    setSearch("");
    setWardFilter("");
    setStatusFilter("");
  };

  const hasFilters = Boolean(search || wardFilter || statusFilter);

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-400/10 bg-gradient-to-br from-[#10223a] via-[#0c192b] to-[#091523] p-6 shadow-2xl shadow-black/20 sm:p-8">
        <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-cyan-400/[0.06] blur-3xl" />

        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/10 bg-cyan-400/[0.06] px-3 py-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-300" />

              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Secure voter database
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Voter Relationship Management
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Register, organise and manage voter contacts, ward information,
              political support and communication consent.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm(EMPTY_FORM);
              setShowAdd(true);
            }}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-200"
          >
            <Plus className="h-4 w-4" />
            Register voter
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total contacts"
          value={(stats?.total ?? 0).toLocaleString("en-KE")}
          description="All voter records in the database"
          icon={Users}
        />

        <MetricCard
          label="SMS consent"
          value={(stats?.consentedSms ?? 0).toLocaleString("en-KE")}
          description="Contacts approved for SMS messaging"
          icon={Phone}
        />

        <MetricCard
          label="WhatsApp consent"
          value={(stats?.consentedWhatsapp ?? 0).toLocaleString("en-KE")}
          description="Contacts approved for WhatsApp"
          icon={MessageCircle}
        />

        <MetricCard
          label="Email consent"
          value={(stats?.consentedEmail ?? 0).toLocaleString("en-KE")}
          description="Contacts approved for email outreach"
          icon={Mail}
        />
      </section>

      {(showAdd || editingId !== null) && (
        <MemberForm
          form={form}
          setForm={setForm}
          editing={editingId !== null}
          submitting={createMember.isPending || updateMember.isPending}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
      )}

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c1726]">
        <div className="border-b border-white/10 p-5">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Voter records
              </h2>

              <p className="mt-1 text-[10px] text-slate-500">
                Showing {visibleMemberCount.toLocaleString("en-KE")} records ·{" "}
                {activeMemberCount.toLocaleString("en-KE")} active
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, phone or email"
                  className="w-full rounded-xl border border-white/10 bg-[#07111e] py-2.5 pl-10 pr-3 text-xs text-white outline-none placeholder:text-slate-700 focus:border-cyan-400/30"
                />
              </div>

              <div className="relative sm:w-52">
                <select
                  value={wardFilter}
                  onChange={(event) => setWardFilter(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-[#07111e] px-3 py-2.5 pr-9 text-xs text-slate-300 outline-none focus:border-cyan-400/30"
                >
                  <option value="">All wards</option>

                  {WARDS.map((ward) => (
                    <option key={ward} value={ward}>
                      {ward}
                    </option>
                  ))}
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
              </div>

              <div className="relative sm:w-40">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-[#07111e] px-3 py-2.5 pr-9 text-xs text-slate-300 outline-none focus:border-cyan-400/30"
                >
                  <option value="">All statuses</option>

                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
              </div>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-600">
            <Filter className="h-3.5 w-3.5" />

            Filters update the voter database automatically.
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead>
              <tr className="border-b border-white/10 text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                <th className="px-5 py-3">Voter</th>
                <th className="px-5 py-3">Ward</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Support</th>
                <th className="px-5 py-3">Consent</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.06]">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={7} className="px-5 py-3">
                      <div className="h-12 animate-pulse rounded-xl bg-white/[0.025]" />
                    </td>
                  </tr>
                ))
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
                        <UserCheck className="h-6 w-6 text-slate-600" />
                      </div>

                      <h3 className="mt-4 text-sm font-semibold text-slate-300">
                        No voter records found
                      </h3>

                      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-600">
                        Adjust the current filters or register a new voter in
                        the campaign database.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr
                    key={member.id}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-400/10 bg-cyan-400/[0.06] text-xs font-bold text-cyan-200">
                          {member.firstName.charAt(0).toUpperCase()}
                          {member.lastName.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">
                            {member.firstName} {member.lastName}
                          </p>

                          <p className="mt-1 truncate text-[9px] text-slate-600">
                            Record #{member.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-400">
                      {member.ward ?? "Not assigned"}
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-xs text-slate-300">
                        {member.phone ?? "No phone"}
                      </p>

                      {member.email && (
                        <p className="mt-1 max-w-52 truncate text-[9px] text-slate-600">
                          {member.email}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <SupportBadge level={member.supportLevel} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex gap-1.5">
                        <ConsentBadge
                          enabled={member.smsConsent}
                          label="SMS"
                          icon={Phone}
                        />

                        <ConsentBadge
                          enabled={member.whatsappConsent}
                          label="WhatsApp"
                          icon={MessageCircle}
                        />

                        <ConsentBadge
                          enabled={member.emailConsent}
                          label="Email"
                          icon={Mail}
                        />
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={member.status} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          title="Edit voter"
                          onClick={() => startEditing(member)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-slate-500 transition-colors hover:border-cyan-400/20 hover:bg-cyan-400/[0.06] hover:text-cyan-300"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          title="Delete voter"
                          disabled={deleteMember.isPending}
                          onClick={() => removeMember(member)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-slate-500 transition-colors hover:border-red-400/20 hover:bg-red-400/[0.06] hover:text-red-300 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {members.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />

              Database connection active
            </div>

            <p className="text-[10px] text-slate-600">
              {visibleMemberCount.toLocaleString("en-KE")} visible records
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
