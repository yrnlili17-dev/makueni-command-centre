import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCheck2, RefreshCw, Plus, Trash2, AlertTriangle, X } from "lucide-react";

const API = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/messages/wa-templates`;

export type WaTemplate = {
  id: number; name: string; language: string; category: string; status: string;
  body: string; headerText: string | null; footerText: string | null; variableCount: number;
  metaId: string | null; rejectedReason: string | null; updatedAt: string;
};

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export function useWaTemplates() {
  return useQuery({ queryKey: ["wa-templates"], queryFn: () => call<WaTemplate[]>(API) });
}

const STATUS_CLS: Record<string, string> = {
  APPROVED: "text-green-400 border-green-400/40",
  PENDING: "text-yellow-400 border-yellow-400/40",
  IN_APPEAL: "text-yellow-400 border-yellow-400/40",
  REJECTED: "text-red-400 border-red-400/40",
  PAUSED: "text-orange-400 border-orange-400/40",
  DISABLED: "text-muted-foreground border-border",
  DRAFT: "text-muted-foreground border-border",
};
const LANGS: Record<string, string> = { en: "English", en_US: "English (US)", en_GB: "English (UK)", sw: "Kiswahili" };

/** Fills {{n}} with sample values for the live preview. */
function preview(body: string, samples: string[]) {
  return body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n) => samples[Number(n) - 1] || `{{${n}}}`);
}

const field = "w-full bg-background border border-border px-3 py-2 text-sm outline-none focus:border-primary";
const label = "block text-[10px] font-mono tracking-widest text-muted-foreground mb-1";

function CreateForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", language: "en", category: "MARKETING", headerText: "", body: "", footerText: "" });
  const [note, setNote] = useState("");
  const vars = useMemo(() => {
    let max = 0; for (const m of form.body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) max = Math.max(max, Number(m[1])); return max;
  }, [form.body]);
  const create = useMutation({
    mutationFn: () => call<WaTemplate & { note?: string }>(API, { method: "POST", body: JSON.stringify(form) }),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["wa-templates"] });
      if (t.note) setNote(t.note); else onClose();
    },
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: k === "name" ? e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") : e.target.value }));

  return (
    <div className="bg-card border border-primary/40">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="font-mono text-xs tracking-widest">NEW TEMPLATE</span>
        <button type="button" aria-label="Close" onClick={onClose}><X className="w-4 h-4" /></button>
      </div>
      <form className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6" onSubmit={e => { e.preventDefault(); setNote(""); create.mutate(); }}>
        <div className="space-y-3">
          <div>
            <label className={label} htmlFor="tpl-name">NAME</label>
            <input id="tpl-name" required className={field} placeholder="rally_reminder" value={form.name} onChange={set("name")} />
            <p className="text-[10px] text-muted-foreground mt-1">Lowercase letters, numbers and underscores. Staff see this, voters don’t.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="tpl-lang">LANGUAGE</label>
              <select id="tpl-lang" className={field} value={form.language} onChange={set("language")}>
                <option value="en">English</option><option value="sw">Kiswahili</option>
              </select>
            </div>
            <div>
              <label className={label} htmlFor="tpl-cat">CATEGORY</label>
              <select id="tpl-cat" className={field} value={form.category} onChange={set("category")}>
                <option value="MARKETING">Marketing (rallies, appeals)</option>
                <option value="UTILITY">Utility (confirmations, logistics)</option>
              </select>
            </div>
          </div>
          <div>
            <label className={label} htmlFor="tpl-header">HEADER (OPTIONAL)</label>
            <input id="tpl-header" maxLength={60} className={field} placeholder="Makueni Campaign" value={form.headerText} onChange={set("headerText")} />
          </div>
          <div>
            <label className={label} htmlFor="tpl-body">MESSAGE</label>
            <textarea id="tpl-body" required rows={5} maxLength={1024} className={field}
              placeholder={"Hello {{1}}, join us at the {{2}} town hall on Saturday at 10am. Come with a neighbour!"}
              value={form.body} onChange={set("body")} />
            <p className="text-[10px] text-muted-foreground mt-1">
              Use {"{{1}}"}, {"{{2}}"}… for details that change per person. When sending, you choose what fills each one, such as their first name or ward.
            </p>
          </div>
          <div>
            <label className={label} htmlFor="tpl-footer">FOOTER (OPTIONAL)</label>
            <input id="tpl-footer" maxLength={60} className={field} placeholder="Reply STOP to opt out" value={form.footerText} onChange={set("footerText")} />
          </div>
        </div>

        <div className="space-y-3">
          <span className={label}>PREVIEW</span>
          <div className="bg-[#0b141a] p-4 min-h-40">
            <div className="max-w-sm bg-[#005c4b] text-white text-sm px-3 py-2 rounded-lg rounded-tr-none ml-auto whitespace-pre-wrap">
              {form.headerText && <p className="font-bold mb-1">{form.headerText}</p>}
              {preview(form.body || "Your message appears here.", ["Mary", "Wote", "Saturday", "10am", "Makindu"])}
              {form.footerText && <p className="text-[11px] text-white/60 mt-1">{form.footerText}</p>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{vars} placeholder{vars === 1 ? "" : "s"}. Meta reviews new templates, usually within a day. You can send it once its status is Approved.</p>
          {create.error && <p role="alert" className="text-xs text-red-400">{(create.error as Error).message}</p>}
          {note && <p role="status" className="text-xs text-yellow-400">{note}</p>}
          <button type="submit" disabled={create.isPending} className="bg-primary text-white font-mono text-[10px] tracking-widest px-4 py-2 disabled:opacity-50">
            {create.isPending ? "SUBMITTING…" : "SUBMIT FOR APPROVAL"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function WaTemplates() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useWaTemplates();
  const [creating, setCreating] = useState(false);
  const sync = useMutation({
    mutationFn: () => call<{ synced: number }>(`${API}/sync`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-templates"] }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => call(`${API}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-templates"] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-widest">WHATSAPP TEMPLATES</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            WhatsApp only delivers free-text messages to people who messaged your number in the last 24 hours.
            To reach everyone else, send a template Meta has approved.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => sync.mutate()} disabled={sync.isPending}
            className="flex items-center gap-1.5 border border-border px-3 py-2 font-mono text-[10px] tracking-widest hover:border-primary disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${sync.isPending ? "animate-spin" : ""}`} /> SYNC WITH META
          </button>
          <button type="button" onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 font-mono text-[10px] tracking-widest">
            <Plus className="w-3 h-3" /> NEW TEMPLATE
          </button>
        </div>
      </div>

      {sync.error && (
        <div role="alert" className="flex items-center gap-2 border border-red-400/40 bg-red-400/5 px-3 py-2 text-xs text-red-400">
          <AlertTriangle className="w-4 h-4" /> {(sync.error as Error).message}
        </div>
      )}
      {sync.data && <p role="status" className="text-xs text-green-400">Synced {sync.data.synced} template(s) from Meta.</p>}

      {creating && <CreateForm onClose={() => setCreating(false)} />}

      <div className="bg-card border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {["NAME", "LANGUAGE", "CATEGORY", "STATUS", "MESSAGE", ""].map(h => (
                <th key={h} scope="col" className="px-4 py-2.5 font-mono text-[10px] tracking-widest text-muted-foreground font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map(t => (
              <tr key={t.id} className="border-b border-border align-top">
                <td className="px-4 py-3 font-mono text-xs">{t.name}</td>
                <td className="px-4 py-3 text-xs">{LANGS[t.language] ?? t.language}</td>
                <td className="px-4 py-3 text-xs capitalize">{t.category.toLowerCase()}</td>
                <td className="px-4 py-3">
                  <span className={`font-mono text-[10px] border px-2 py-0.5 ${STATUS_CLS[t.status] ?? STATUS_CLS.DRAFT}`}>{t.status}</span>
                  {t.rejectedReason && <p className="text-[10px] text-red-400 mt-1">{t.rejectedReason.replace(/_/g, " ").toLowerCase()}</p>}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-md whitespace-pre-wrap">{t.body}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" aria-label={`Delete ${t.name}`} disabled={remove.isPending}
                    onClick={() => { if (confirm(`Delete template "${t.name}"? This also deletes it in Meta.`)) remove.mutate(t.id); }}
                    className="text-muted-foreground hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && !error && (data ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <FileCheck2 className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm">No templates yet.</p>
                  <p className="text-xs text-muted-foreground">Create one, or sync to pull templates you already made in Meta’s WhatsApp Manager.</p>
                </td>
              </tr>
            )}
            {error && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-xs text-red-400">{(error as Error).message}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {remove.error && <p role="alert" className="text-xs text-red-400">{(remove.error as Error).message}</p>}
    </div>
  );
}
