import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Download, FileArchive, FileText, FolderPlus, RefreshCw, Search, ShieldCheck, UploadCloud, XCircle } from "lucide-react";

const BASE = import.meta.env.BASE_URL;

type Tab = "approvals" | "documents";

async function jsonFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${BASE}api${path}`, {
    credentials: "include",
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function StatusBadge({ status }: { status: string }) {
  const style = status === "approved" || status === "active"
    ? "border-green-500/40 text-green-400 bg-green-500/10"
    : status === "rejected" || status === "archived"
      ? "border-red-500/40 text-red-400 bg-red-500/10"
      : "border-yellow-500/40 text-yellow-400 bg-yellow-500/10";
  return <span className={`border px-2 py-1 font-mono text-[9px] tracking-wider ${style}`}>{status.toUpperCase()}</span>;
}

export default function Governance() {
  const [tab, setTab] = useState<Tab>("approvals");
  const [approvals, setApprovals] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [showFolder, setShowFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ title: "", description: "", category: "general", tags: "", folderId: "", requiresApproval: true });
  const [folderName, setFolderName] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [a, d, f] = await Promise.all([
        jsonFetch(`/approvals?status=${approvalStatus}`),
        jsonFetch(`/documents?q=${encodeURIComponent(query)}&status=all`),
        jsonFetch("/documents/folders"),
      ]);
      setApprovals(a); setDocuments(d); setFolders(f);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [approvalStatus, query]);

  useEffect(() => { load(); }, [load]);

  async function review(id: number, action: "approve" | "reject" | "return") {
    const comment = window.prompt(`${action.toUpperCase()} comment (optional)`) || "";
    try { await jsonFetch(`/approvals/${id}/${action}`, { method: "POST", body: JSON.stringify({ comment }) }); await load(); }
    catch (e: any) { setError(e.message); }
  }

  async function uploadDocument(event: React.FormEvent) {
    event.preventDefault();
    if (!file) { setError("Choose a file first"); return; }
    setUploading(true); setError("");
    const body = new FormData();
    body.append("file", file);
    Object.entries(form).forEach(([key, value]) => body.append(key, String(value)));
    try {
      await jsonFetch("/documents/upload", { method: "POST", body });
      setShowUpload(false); setFile(null); setForm({ title: "", description: "", category: "general", tags: "", folderId: "", requiresApproval: true });
      await load();
    } catch (e: any) { setError(e.message); }
    finally { setUploading(false); }
  }

  async function createFolder(event: React.FormEvent) {
    event.preventDefault();
    if (!folderName.trim()) return;
    try { await jsonFetch("/documents/folders", { method: "POST", body: JSON.stringify({ name: folderName }) }); setFolderName(""); setShowFolder(false); await load(); }
    catch (e: any) { setError(e.message); }
  }

  async function archiveDocument(id: number) {
    if (!window.confirm("Archive this document?")) return;
    try { await jsonFetch(`/documents/${id}`, { method: "DELETE" }); await load(); }
    catch (e: any) { setError(e.message); }
  }

  const stats = useMemo(() => ({
    pending: approvals.filter((x) => x.status === "pending").length,
    approved: approvals.filter((x) => x.status === "approved").length,
    docs: documents.filter((x) => x.status === "active").length,
    archived: documents.filter((x) => x.status === "archived").length,
  }), [approvals, documents]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.25em] text-primary">PHASE 3 GOVERNANCE</p>
          <h1 className="text-2xl font-bold tracking-wide">APPROVALS & DOCUMENT CONTROL</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Two-person authorization, token audit trail, secure uploads, folders and controlled publishing.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[10px] hover:border-primary"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> REFRESH</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[["PENDING APPROVALS", stats.pending, Clock3], ["APPROVED", stats.approved, ShieldCheck], ["ACTIVE DOCUMENTS", stats.docs, FileText], ["ARCHIVED", stats.archived, FileArchive]].map(([label, value, Icon]: any) => (
          <div key={label} className="border border-border bg-card p-4"><Icon className="mb-3 h-4 w-4 text-primary" /><p className="font-mono text-[9px] tracking-widest text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>
        ))}
      </div>

      {error && <div className="border border-red-500/40 bg-red-500/10 p-3 font-mono text-xs text-red-300">{error}</div>}

      <div className="flex gap-2 border-b border-border">
        {(["approvals", "documents"] as Tab[]).map((value) => <button key={value} onClick={() => setTab(value)} className={`px-4 py-3 font-mono text-[10px] tracking-wider ${tab === value ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>{value.toUpperCase()}</button>)}
      </div>

      {tab === "approvals" && <div className="space-y-4">
        <div className="flex justify-end"><select value={approvalStatus} onChange={(e) => setApprovalStatus(e.target.value)} className="border border-border bg-background px-3 py-2 font-mono text-xs"><option value="all">ALL STATUS</option><option value="pending">PENDING</option><option value="approved">APPROVED</option><option value="rejected">REJECTED</option><option value="returned">RETURNED</option></select></div>
        <div className="overflow-x-auto border border-border bg-card">
          <table className="w-full text-left"><thead className="border-b border-border bg-secondary/50 font-mono text-[9px] tracking-wider text-muted-foreground"><tr><th className="p-3">TOKEN / REQUEST</th><th className="p-3">MODULE</th><th className="p-3">REQUESTED BY</th><th className="p-3">EXPIRES</th><th className="p-3">STATUS</th><th className="p-3 text-right">ACTION</th></tr></thead>
          <tbody>{approvals.map((row) => <tr key={row.id} className="border-b border-border/60 text-xs"><td className="p-3"><p className="font-medium">{row.title}</p><p className="mt-1 font-mono text-[9px] text-muted-foreground">{row.token}</p></td><td className="p-3 font-mono text-[10px]">{row.module}.{row.action}</td><td className="p-3">{row.requestedByEmail}</td><td className="p-3 font-mono text-[10px]">{new Date(row.expiresAt).toLocaleString()}</td><td className="p-3"><StatusBadge status={row.status} /></td><td className="p-3"><div className="flex justify-end gap-2">{(row.status === "pending" || row.status === "returned") && <><button onClick={() => review(row.id, "approve")} className="border border-green-500/40 p-2 text-green-400" title="Approve"><CheckCircle2 className="h-4 w-4" /></button><button onClick={() => review(row.id, "return")} className="border border-yellow-500/40 p-2 text-yellow-400" title="Return"><Clock3 className="h-4 w-4" /></button><button onClick={() => review(row.id, "reject")} className="border border-red-500/40 p-2 text-red-400" title="Reject"><XCircle className="h-4 w-4" /></button></>}</div></td></tr>)}</tbody></table>
          {!approvals.length && <div className="p-8 text-center font-mono text-xs text-muted-foreground">NO APPROVAL REQUESTS FOUND</div>}
        </div>
      </div>}

      {tab === "documents" && <div className="space-y-4">
        <div className="flex flex-wrap gap-2"><div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents" className="w-full border border-border bg-background py-2 pl-9 pr-3 text-sm" /></div><button onClick={() => setShowFolder(true)} className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[10px]"><FolderPlus className="h-4 w-4" /> NEW FOLDER</button><button onClick={() => setShowUpload(true)} className="flex items-center gap-2 bg-primary px-3 py-2 font-mono text-[10px] text-primary-foreground"><UploadCloud className="h-4 w-4" /> UPLOAD</button></div>
        {showFolder && <form onSubmit={createFolder} className="flex gap-2 border border-border bg-card p-3"><input autoFocus value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="Folder name" className="flex-1 border border-border bg-background px-3 py-2" /><button className="bg-primary px-4 font-mono text-xs text-primary-foreground">CREATE</button><button type="button" onClick={() => setShowFolder(false)} className="border border-border px-4 font-mono text-xs">CANCEL</button></form>}
        {showUpload && <form onSubmit={uploadDocument} className="grid gap-3 border border-primary/30 bg-card p-4 md:grid-cols-2"><input type="file" required onChange={(e) => setFile(e.target.files?.[0] || null)} className="md:col-span-2 border border-dashed border-border p-4 text-sm" /><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Document title" className="border border-border bg-background px-3 py-2" /><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="border border-border bg-background px-3 py-2"><option>general</option><option>strategy</option><option>finance</option><option>field-operations</option><option>legal</option><option>communications</option></select><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="border border-border bg-background px-3 py-2 md:col-span-2" /><input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags separated by commas" className="border border-border bg-background px-3 py-2" /><select value={form.folderId} onChange={(e) => setForm({ ...form, folderId: e.target.value })} className="border border-border bg-background px-3 py-2"><option value="">No folder</option>{folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.requiresApproval} onChange={(e) => setForm({ ...form, requiresApproval: e.target.checked })} /> Require second-person approval before publication</label><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowUpload(false)} className="border border-border px-4 py-2 font-mono text-xs">CANCEL</button><button disabled={uploading} className="bg-primary px-4 py-2 font-mono text-xs text-primary-foreground">{uploading ? "UPLOADING..." : "UPLOAD DOCUMENT"}</button></div></form>}
        <div className="overflow-x-auto border border-border bg-card"><table className="w-full text-left"><thead className="border-b border-border bg-secondary/50 font-mono text-[9px] text-muted-foreground"><tr><th className="p-3">DOCUMENT</th><th className="p-3">CATEGORY</th><th className="p-3">SIZE</th><th className="p-3">UPLOADED BY</th><th className="p-3">STATUS</th><th className="p-3 text-right">ACTION</th></tr></thead><tbody>{documents.map((doc) => <tr key={doc.id} className="border-b border-border/60 text-xs"><td className="p-3"><p className="font-medium">{doc.title}</p><p className="mt-1 text-[10px] text-muted-foreground">{doc.originalName}</p></td><td className="p-3 font-mono text-[10px]">{doc.category}</td><td className="p-3 font-mono text-[10px]">{(doc.sizeBytes / 1024).toFixed(1)} KB</td><td className="p-3">{doc.uploadedByEmail}</td><td className="p-3"><StatusBadge status={doc.status} /></td><td className="p-3"><div className="flex justify-end gap-2"><a href={`${BASE}api/documents/${doc.id}/download`} className="border border-border p-2" title="Download"><Download className="h-4 w-4" /></a>{doc.status !== "archived" && <button onClick={() => archiveDocument(doc.id)} className="border border-red-500/40 p-2 text-red-400" title="Archive"><FileArchive className="h-4 w-4" /></button>}</div></td></tr>)}</tbody></table>{!documents.length && <div className="p-8 text-center font-mono text-xs text-muted-foreground">NO DOCUMENTS FOUND</div>}</div>
      </div>}
    </div>
  );
}
