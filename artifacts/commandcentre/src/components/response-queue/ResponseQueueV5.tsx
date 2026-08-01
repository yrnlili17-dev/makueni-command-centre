import {
  Bot,
  CheckCircle,
  Clipboard,
  Edit2,
  Eye,
  RefreshCw,
  Send,
  Shield,
  Trash2,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

export type QueueResponse = {
  id: number;
  mentionId?: number | null;
  platform: string;
  content: string;
  draftedBy?: string | null;
  status: string;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
  approvedBy?: string | null;
  approvedAt?: string | Date | null;
  publishedAt?: string | Date | null;
  rejectionReason?: string | null;
  sourceContent?: string;
  sourceAuthor?: string | null;
  sourcePlatform?: string | null;
  sourceHref?: string | null;
  sourceLinkLabel?: string | null;
  responseOptions?: string[];
  threatLevel?: string | null;
  sentiment?: string | null;
  hiddenDuplicateCount?: number;
};

type Props = {
  responses: QueueResponse[];
  loading: boolean;
  onRefresh: () => Promise<void> | void;
  onUpdate: (
    id: number,
    status: string,
    extra?: Record<string, string>,
  ) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onSaveContent: (id: number, content: string) => Promise<void>;
};

const STATUS_STYLES: Record<string, string> = {
  pending_approval: "border-yellow-400/30 text-yellow-400",
  approved: "border-green-400/30 text-green-400",
  published: "border-blue-400/30 text-blue-400",
  rejected: "border-red-400/30 text-red-400",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`border px-2 py-1 font-mono text-[9px] tracking-widest ${
        STATUS_STYLES[status] ?? "border-border text-muted-foreground"
      }`}
    >
      {status.replaceAll("_", " ").toUpperCase()}
    </span>
  );
}

function formatDate(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-KE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function ResponseQueueV5({
  responses,
  loading,
  onRefresh,
  onUpdate,
  onDelete,
  onSaveContent,
}: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const platforms = useMemo(
    () =>
      Array.from(
        new Set(responses.map((response) => response.platform).filter(Boolean)),
      ).sort(),
    [responses],
  );

  const visibleResponses = useMemo(
    () =>
      responses.filter((response) => {
        if (statusFilter !== "all" && response.status !== statusFilter) {
          return false;
        }
        if (
          platformFilter !== "all" &&
          response.platform !== platformFilter
        ) {
          return false;
        }
        return true;
      }),
    [responses, statusFilter, platformFilter],
  );

  async function copyResponse(response: QueueResponse) {
    await navigator.clipboard.writeText(response.content);
    setCopiedId(response.id);
    window.setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
            NARRATIVE OPERATIONS QUEUE
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Review, select, approve, copy and respond to monitored posts.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="border border-border bg-secondary px-3 py-2 font-mono text-[10px]"
          >
            <option value="all">ALL STATUS</option>
            <option value="pending_approval">PENDING</option>
            <option value="approved">APPROVED</option>
            <option value="published">RESPONDED</option>
            <option value="rejected">REJECTED</option>
          </select>

          <select
            value={platformFilter}
            onChange={(event) => setPlatformFilter(event.target.value)}
            className="border border-border bg-secondary px-3 py-2 font-mono text-[10px]"
          >
            <option value="all">ALL PLATFORMS</option>
            {platforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform.toUpperCase()}
              </option>
            ))}
          </select>

          <button
            onClick={() => void onRefresh()}
            className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-[10px] hover:bg-secondary"
          >
            <RefreshCw className="h-3 w-3" />
            REFRESH
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-44 animate-pulse border border-border bg-card"
            />
          ))}
        </div>
      ) : visibleResponses.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 border border-border bg-card py-16">
          <Shield className="h-7 w-7 text-muted-foreground" />
          <p className="font-mono text-xs text-muted-foreground">
            [ QUEUE_EMPTY ]
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleResponses.map((response) => (
            <article
              key={response.id}
              className="border border-border bg-card p-4"
            >
              <header className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={response.status} />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {response.sourcePlatform ?? response.platform}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[9px] text-green-400">
                    <Bot className="h-3 w-3" />
                    {(response.draftedBy ?? "local-engine").toUpperCase()}
                  </span>
                  {!!response.hiddenDuplicateCount && (
                    <span className="border border-yellow-400/30 px-2 py-1 font-mono text-[9px] text-yellow-400">
                      {response.hiddenDuplicateCount} OLD DUPLICATE
                      {response.hiddenDuplicateCount === 1 ? "" : "S"} HIDDEN
                    </span>
                  )}
                </div>
                <span className="font-mono text-[9px] text-muted-foreground">
                  {formatDate(response.createdAt)}
                </span>
              </header>

              {response.sourceContent && (
                <section className="mb-3 border border-border bg-secondary/30 p-3">
                  <p className="mb-1 font-mono text-[9px] tracking-widest text-muted-foreground">
                    ORIGINAL POST
                    {response.sourceAuthor
                      ? ` · ${response.sourceAuthor}`
                      : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {response.sourceContent}
                  </p>
                </section>
              )}

              {editingId === response.id ? (
                <section className="mb-3 space-y-2">
                  <textarea
                    value={editingContent}
                    onChange={(event) => setEditingContent(event.target.value)}
                    rows={4}
                    className="w-full resize-none border border-border bg-secondary px-3 py-2 font-mono text-xs focus:border-primary focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="border border-border px-3 py-1.5 font-mono text-[10px]"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={async () => {
                        await onSaveContent(response.id, editingContent);
                        setEditingId(null);
                      }}
                      className="bg-primary px-3 py-1.5 font-mono text-[10px] text-primary-foreground"
                    >
                      SAVE
                    </button>
                  </div>
                </section>
              ) : (
                <>
                  <p className="mb-3 text-sm leading-relaxed">
                    {response.content}
                  </p>

                  {!!response.responseOptions?.length && (
                    <section className="mb-4 grid gap-2 lg:grid-cols-3">
                      {response.responseOptions.map((option, index) => (
                        <button
                          key={`${response.id}-${index}`}
                          onClick={() =>
                            void onSaveContent(response.id, option)
                          }
                          className={`border p-3 text-left text-xs transition-colors hover:border-primary/60 hover:bg-primary/5 ${
                            option === response.content
                              ? "border-primary/50 bg-primary/5"
                              : "border-border"
                          }`}
                        >
                          <span className="mb-1 block font-mono text-[9px] text-primary">
                            OPTION {String.fromCharCode(65 + index)}
                          </span>
                          {option}
                        </button>
                      ))}
                    </section>
                  )}
                </>
              )}

              {rejectingId === response.id && (
                <section className="mb-3 flex flex-col gap-2 lg:flex-row">
                  <input
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    placeholder="REJECTION REASON"
                    className="flex-1 border border-red-400/30 bg-secondary px-3 py-2 font-mono text-xs"
                  />
                  <button
                    onClick={async () => {
                      await onUpdate(response.id, "rejected", {
                        rejectionReason:
                          rejectReason || "Rejected by communications team",
                      });
                      setRejectReason("");
                      setRejectingId(null);
                    }}
                    className="bg-red-500 px-3 py-2 font-mono text-[10px] text-white"
                  >
                    CONFIRM REJECT
                  </button>
                </section>
              )}

              {response.approvedBy && (
                <p className="mb-2 font-mono text-[10px] text-green-400">
                  ✓ APPROVED BY {response.approvedBy}
                  {response.approvedAt
                    ? ` · ${formatDate(response.approvedAt)}`
                    : ""}
                </p>
              )}
              {response.publishedAt && (
                <p className="mb-2 font-mono text-[10px] text-blue-400">
                  ↑ RESPONDED · {formatDate(response.publishedAt)}
                </p>
              )}
              {response.rejectionReason && (
                <p className="mb-2 font-mono text-[10px] text-red-400">
                  ✗ {response.rejectionReason}
                </p>
              )}

              <footer className="flex flex-wrap gap-2">
                <button
                  onClick={() => void copyResponse(response)}
                  className="flex items-center gap-1 border border-border px-3 py-1.5 font-mono text-[10px] hover:bg-secondary"
                >
                  <Clipboard className="h-3 w-3" />
                  {copiedId === response.id ? "COPIED" : "COPY RESPONSE"}
                </button>

                {response.sourceHref ? (
                  <a
                    href={response.sourceHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 border border-border px-3 py-1.5 font-mono text-[10px] hover:bg-secondary"
                  >
                    <Eye className="h-3 w-3" />
                    {response.sourceLinkLabel ?? "OPEN SOURCE"}
                  </a>
                ) : (
                  <span className="border border-border px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                    SOURCE LINK UNAVAILABLE
                  </span>
                )}

                {response.status === "pending_approval" && (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(response.id);
                        setEditingContent(response.content);
                      }}
                      className="flex items-center gap-1 border border-border px-3 py-1.5 font-mono text-[10px]"
                    >
                      <Edit2 className="h-3 w-3" />
                      EDIT
                    </button>
                    <button
                      onClick={() => void onUpdate(response.id, "approved")}
                      className="flex items-center gap-1 border border-green-500/40 bg-green-500/10 px-3 py-1.5 font-mono text-[10px] text-green-400"
                    >
                      <CheckCircle className="h-3 w-3" />
                      APPROVE
                    </button>
                    <button
                      onClick={() => setRejectingId(response.id)}
                      className="flex items-center gap-1 border border-red-500/40 bg-red-500/10 px-3 py-1.5 font-mono text-[10px] text-red-400"
                    >
                      <XCircle className="h-3 w-3" />
                      REJECT
                    </button>
                  </>
                )}

                {response.status === "approved" && (
                  <button
                    onClick={() => void onUpdate(response.id, "published")}
                    className="flex items-center gap-1 bg-primary px-3 py-1.5 font-mono text-[10px] text-primary-foreground"
                  >
                    <Send className="h-3 w-3" />
                    MARK RESPONDED
                  </button>
                )}

                <button
                  onClick={() => void onDelete(response.id)}
                  className="ml-auto flex items-center gap-1 border border-border px-2 py-1.5 text-muted-foreground hover:border-red-400/30 hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
