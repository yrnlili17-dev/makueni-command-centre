import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BrainCircuit,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Loader2,
  MapPinned,
  MessageSquare,
  Plus,
  Radio,
  Send,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL ?? "/";

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const STARTER_PROMPTS = [
  {
    label: "Top campaign priorities",
    prompt: "What are our top 3 strategic priorities right now?",
    icon: Target,
  },
  {
    label: "Weakest areas",
    prompt: "Where are we weakest, and how do we fix it before election day?",
    icon: ShieldAlert,
  },
  {
    label: "30-day growth plan",
    prompt: "Draft a 30-day plan to grow support in our weakest ward",
    icon: TrendingUp,
  },
  {
    label: "Resource allocation",
    prompt: "How should we allocate volunteers and funds across the wards?",
    icon: Users,
  },
  {
    label: "Turnout strategy",
    prompt: "What does our turnout forecast say about GOTV priorities?",
    icon: Activity,
  },
  {
    label: "Narrative threats",
    prompt: "Assess our narrative threats and recommend counter-moves",
    icon: Radio,
  },
];

const CAMPAIGN_METRICS = [
  {
    label: "Campaign readiness",
    value: "82%",
    detail: "Operational",
    icon: Target,
  },
  {
    label: "Grassroots coverage",
    value: "74%",
    detail: "Growing",
    icon: MapPinned,
  },
  {
    label: "Messaging strength",
    value: "88%",
    detail: "Strong",
    icon: MessageSquare,
  },
  {
    label: "Volunteer capacity",
    value: "65%",
    detail: "Needs action",
    icon: Users,
  },
];

const PRIORITY_ACTIONS = [
  "Strengthen polling-station structures",
  "Expand youth and women outreach",
  "Review high-priority ward intelligence",
  "Prepare rapid-response communications",
];

function formatSessionDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "RECENT";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  })
    .format(date)
    .toUpperCase();
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="border border-border bg-card/70 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center border border-primary/30 bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>

        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          {detail}
        </span>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}

export default function Strategist() {
  const queryClient = useQueryClient();

  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data: conversations = [], isLoading: conversationsLoading } =
    useQuery<Conversation[]>({
      queryKey: ["strategist-conversations"],
      queryFn: async () => {
        const response = await fetch(
          `${BASE}api/strategist/conversations`,
        );

        if (!response.ok) {
          throw new Error("Failed to load conversations");
        }

        return response.json();
      },
    });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const loadConversation = useCallback(async (id: number) => {
    abortRef.current?.abort();
    setStreaming(false);
    setActiveId(id);

    try {
      const response = await fetch(
        `${BASE}api/strategist/conversations/${id}`,
      );

      if (!response.ok) {
        throw new Error("Failed to load conversation");
      }

      const data = await response.json();

      setMessages(
        (data.messages ?? []).map(
          (message: { role: string; content: string }) => ({
            role:
              message.role === "assistant"
                ? "assistant"
                : "user",
            content: message.content,
          }),
        ),
      );
    } catch {
      setMessages([]);
    }
  }, []);

  const newConversation = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
    setActiveId(null);
    setMessages([]);
    setInput("");
  }, []);

  const deleteConversation = async (
    id: number,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();

    try {
      await fetch(
        `${BASE}api/strategist/conversations/${id}`,
        {
          method: "DELETE",
        },
      );

      await queryClient.invalidateQueries({
        queryKey: ["strategist-conversations"],
      });

      if (activeId === id) {
        newConversation();
      }
    } catch {
      // Preserve the current screen if deletion fails.
    }
  };

  const sendMessage = useCallback(
    async (text: string) => {
      const userMessage = text.trim();

      if (!userMessage || streaming) {
        return;
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "user",
          content: userMessage,
        },
        {
          role: "assistant",
          content: "",
          streaming: true,
        },
      ]);

      setInput("");
      setStreaming(true);

      abortRef.current = new AbortController();

      let fullContent = "";

      const finish = (content: string) => {
        setMessages((previous) => {
          if (previous.length === 0) {
            return previous;
          }

          const updated = [...previous];

          updated[updated.length - 1] = {
            role: "assistant",
            content,
            streaming: false,
          };

          return updated;
        });
      };

      try {
        const response = await fetch(
          `${BASE}api/strategist/chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: userMessage,
              conversationId: activeId ?? undefined,
            }),
            signal: abortRef.current.signal,
          },
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({
              error: "Request failed",
            }));

          finish(
            `⚠ ${errorData.error ?? "Request failed. Please retry."}`,
          );

          return;
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, {
            stream: true,
          });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) {
              continue;
            }

            try {
              const data = JSON.parse(line.slice(6));

              if (data.conversationId && !activeId) {
                setActiveId(data.conversationId);
              }

              if (data.content) {
                fullContent += data.content;

                setMessages((previous) => {
                  if (previous.length === 0) {
                    return previous;
                  }

                  const updated = [...previous];

                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: fullContent,
                    streaming: true,
                  };

                  return updated;
                });
              }

              if (data.done || data.error) {
                finish(
                  data.error
                    ? `⚠ ${data.error}`
                    : fullContent,
                );
              }
            } catch {
              // Ignore incomplete streaming data.
            }
          }
        }

        if (fullContent) {
          finish(fullContent);
        }
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          finish("⚠ Connection error. Please retry.");
        }
      } finally {
        setStreaming(false);

        await queryClient.invalidateQueries({
          queryKey: ["strategist-conversations"],
        });
      }
    },
    [activeId, queryClient, streaming],
  );

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  };

  const copyMessage = async (
    index: number,
    content: string,
  ) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(index);

      window.setTimeout(() => {
        setCopied(null);
      }, 2000);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-[640px] overflow-hidden bg-background">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-card/40 lg:flex">
        <div className="border-b border-border p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-primary/30 bg-primary/10">
              <BrainCircuit className="h-5 w-5 text-primary" />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold tracking-wide">
                STRATEGY COMMAND
              </p>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                Kaloki 2027
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={newConversation}
            className="flex w-full items-center justify-center gap-2 border border-primary bg-primary px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New strategy session
          </button>
        </div>

        <div className="border-b border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              Current briefing
            </p>

            <span className="flex items-center gap-1 font-mono text-[8px] uppercase tracking-wider text-green-500">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Live
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between border border-border bg-background/60 px-3 py-2">
              <span className="font-mono text-[9px] uppercase text-muted-foreground">
                Campaign status
              </span>
              <span className="font-mono text-[9px] font-bold uppercase text-green-500">
                Operational
              </span>
            </div>

            <div className="flex items-center justify-between border border-border bg-background/60 px-3 py-2">
              <span className="font-mono text-[9px] uppercase text-muted-foreground">
                Threat level
              </span>
              <span className="font-mono text-[9px] font-bold uppercase text-amber-500">
                Moderate
              </span>
            </div>

            <div className="flex items-center justify-between border border-border bg-background/60 px-3 py-2">
              <span className="font-mono text-[9px] uppercase text-muted-foreground">
                Readiness
              </span>
              <span className="font-mono text-[9px] font-bold uppercase text-primary">
                82%
              </span>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between px-4 pb-2 pt-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
              Previous sessions
            </p>

            <span className="font-mono text-[9px] text-muted-foreground">
              {conversations.length}
            </span>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
            {conversationsLoading && (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-mono text-[9px] uppercase tracking-wider">
                  Loading sessions
                </span>
              </div>
            )}

            {!conversationsLoading &&
              conversations.length === 0 && (
                <div className="mx-2 mt-3 border border-dashed border-border p-4 text-center">
                  <MessageSquare className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    No strategy sessions yet.
                  </p>
                </div>
              )}

            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                role="button"
                tabIndex={0}
                onClick={() =>
                  void loadConversation(conversation.id)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " "
                  ) {
                    void loadConversation(conversation.id);
                  }
                }}
                className={cn(
                  "group flex cursor-pointer items-start gap-2 border px-3 py-3 transition-colors",
                  activeId === conversation.id
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs leading-relaxed">
                    {conversation.title}
                  </p>

                  <p className="mt-1 font-mono text-[8px] uppercase tracking-wider text-muted-foreground/70">
                    {formatSessionDate(
                      conversation.updatedAt ??
                        conversation.createdAt,
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(event) =>
                    void deleteConversation(
                      conversation.id,
                      event,
                    )
                  }
                  className="shrink-0 text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
                  aria-label="Delete strategy session"
                  title="Delete session"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-border bg-card/30 px-4 py-4 md:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-primary/30 bg-primary/10">
                <BrainCircuit className="h-5 w-5 text-primary" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-lg font-bold tracking-wide md:text-xl">
                    AI CAMPAIGN WAR ROOM
                  </h1>

                  <span className="hidden border border-green-500/30 bg-green-500/10 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.18em] text-green-500 sm:inline-flex">
                    Intelligence live
                  </span>
                </div>

                <p className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground md:text-[10px]">
                  Prof. Philip Kaloki · Makueni Command Centre
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={newConversation}
              className="flex shrink-0 items-center gap-2 border border-border bg-secondary px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em] transition-colors hover:border-primary hover:text-primary lg:hidden"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New session</span>
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6 xl:px-8">
              {messages.length === 0 ? (
                <div className="mx-auto max-w-5xl">
                  <div className="mb-6 border border-border bg-card/60 p-5 md:p-7">
                    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                      <div className="max-w-2xl">
                        <div className="mb-3 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-primary">
                            Executive strategic intelligence
                          </p>
                        </div>

                        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                          Your digital campaign strategist
                        </h2>

                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                          Analyse campaign performance, field
                          operations, voter sentiment, resource
                          allocation, turnout, threats and
                          opportunities using live campaign data.
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3 border border-border bg-background/60 px-4 py-3">
                        <div className="flex h-9 w-9 items-center justify-center border border-green-500/30 bg-green-500/10">
                          <Activity className="h-4 w-4 text-green-500" />
                        </div>

                        <div>
                          <p className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                            System status
                          </p>
                          <p className="font-mono text-[10px] font-bold uppercase text-green-500">
                            Ready for briefing
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {CAMPAIGN_METRICS.map((metric) => (
                      <MetricCard
                        key={metric.label}
                        {...metric}
                      />
                    ))}
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
                            Strategic prompts
                          </p>
                          <h3 className="mt-1 text-lg font-bold">
                            Start an intelligence briefing
                          </h3>
                        </div>

                        <BrainCircuit className="h-5 w-5 text-muted-foreground" />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {STARTER_PROMPTS.map(
                          ({
                            label,
                            prompt,
                            icon: Icon,
                          }) => (
                            <button
                              key={prompt}
                              type="button"
                              onClick={() =>
                                void sendMessage(prompt)
                              }
                              disabled={streaming}
                              className="group flex min-h-28 items-start gap-3 border border-border bg-card/50 p-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-secondary transition-colors group-hover:border-primary/40 group-hover:bg-primary/10">
                                <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold">
                                  {label}
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                  {prompt}
                                </p>
                              </div>

                              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                            </button>
                          ),
                        )}
                      </div>
                    </div>

                    <aside className="border border-border bg-card/50">
                      <div className="border-b border-border px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-primary" />
                          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                            Today's priorities
                          </p>
                        </div>
                      </div>

                      <div className="divide-y divide-border">
                        {PRIORITY_ACTIONS.map(
                          (priority, index) => (
                            <div
                              key={priority}
                              className="flex items-start gap-3 px-4 py-3"
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-primary/30 bg-primary/10 font-mono text-[8px] font-bold text-primary">
                                {String(index + 1).padStart(
                                  2,
                                  "0",
                                )}
                              </span>

                              <p className="text-xs leading-relaxed text-muted-foreground">
                                {priority}
                              </p>
                            </div>
                          ),
                        )}
                      </div>
                    </aside>
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-4xl space-y-6">
                  {messages.map((message, index) =>
                    message.role === "user" ? (
                      <div
                        key={`${message.role}-${index}`}
                        className="flex justify-end"
                      >
                        <div className="max-w-[90%] md:max-w-[78%]">
                          <p className="mb-2 text-right font-mono text-[8px] uppercase tracking-[0.18em] text-muted-foreground">
                            Campaign command
                          </p>

                          <div className="border border-primary/30 bg-primary/10 px-5 py-4 text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={`${message.role}-${index}`}
                        className="flex items-start gap-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-primary/30 bg-primary/10">
                          <BrainCircuit className="h-4 w-4 text-primary" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div>
                              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-primary">
                                AI Chief Strategist
                              </p>
                              <p className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                                Strategic intelligence response
                              </p>
                            </div>

                            {!message.streaming &&
                              message.content && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void copyMessage(
                                      index,
                                      message.content,
                                    )
                                  }
                                  className="flex items-center gap-1.5 border border-border px-2 py-1.5 font-mono text-[8px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                                >
                                  {copied === index ? (
                                    <>
                                      <Check className="h-3 w-3" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3" />
                                      Copy
                                    </>
                                  )}
                                </button>
                              )}
                          </div>

                          <div className="border border-border bg-card/70 px-5 py-5 md:px-6">
                            {message.content === "" &&
                            message.streaming ? (
                              <div className="flex items-center gap-3">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />

                                <div>
                                  <p className="text-sm font-medium">
                                    Analysing the campaign
                                    picture
                                  </p>
                                  <p className="mt-1 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                                    Processing operational data
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm leading-7 whitespace-pre-wrap text-foreground/95">
                                {message.content}

                                {message.streaming && (
                                  <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-primary align-text-bottom" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ),
                  )}

                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-border bg-background/95 px-4 py-4 md:px-6 xl:px-8">
              <div className="mx-auto max-w-4xl">
                <div className="flex items-end gap-3 border border-border bg-card/70 p-2 focus-within:border-primary/50">
                  <textarea
                    value={input}
                    onChange={(event) =>
                      setInput(event.target.value)
                    }
                    onKeyDown={handleKeyDown}
                    placeholder="Ask the Chief Strategist about priorities, wards, turnout, messaging, threats or resources..."
                    rows={2}
                    maxLength={2000}
                    disabled={streaming}
                    className="min-h-12 flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      void sendMessage(input)
                    }
                    disabled={
                      streaming || !input.trim()
                    }
                    className="flex h-11 shrink-0 items-center justify-center gap-2 bg-primary px-4 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {streaming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}

                    <span className="hidden sm:inline">
                      Send
                    </span>
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between px-1">
                  <p className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
                    Enter to send · Shift + Enter for a new
                    line
                  </p>

                  <p className="font-mono text-[8px] text-muted-foreground">
                    {input.length}/2000
                  </p>
                </div>
              </div>
            </div>
          </section>

          <aside className="hidden w-72 shrink-0 border-l border-border bg-card/30 2xl:block">
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" />
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Campaign snapshot
                </p>
              </div>
            </div>

            <div className="space-y-5 p-4">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider">
                    Public sentiment
                  </p>
                  <span className="font-mono text-[9px] text-green-500">
                    +4.2%
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      label: "Positive",
                      value: 63,
                    },
                    {
                      label: "Neutral",
                      value: 22,
                    },
                    {
                      label: "Negative",
                      value: 15,
                    },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-mono text-[9px] uppercase text-muted-foreground">
                          {item.label}
                        </span>
                        <span className="font-mono text-[9px] text-foreground">
                          {item.value}%
                        </span>
                      </div>

                      <div className="h-1.5 overflow-hidden bg-secondary">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${item.value}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider">
                  Resource position
                </p>

                <div className="space-y-2">
                  <div className="flex items-center gap-3 border border-border bg-background/50 p-3">
                    <Users className="h-4 w-4 text-primary" />
                    <div className="flex-1">
                      <p className="font-mono text-[8px] uppercase text-muted-foreground">
                        Volunteers
                      </p>
                      <p className="text-sm font-bold">
                        65% capacity
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border border-border bg-background/50 p-3">
                    <Wallet className="h-4 w-4 text-primary" />
                    <div className="flex-1">
                      <p className="font-mono text-[8px] uppercase text-muted-foreground">
                        Resource mobilisation
                      </p>
                      <p className="text-sm font-bold">
                        59% target
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider">
                  Priority zones
                </p>

                <div className="space-y-2">
                  {[
                    "Wote/Nziu",
                    "Kibwezi West",
                    "Mbooni",
                    "Kaiti",
                  ].map((ward, index) => (
                    <div
                      key={ward}
                      className="flex items-center justify-between border-b border-border/60 pb-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[8px] text-primary">
                          0{index + 1}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {ward}
                        </span>
                      </div>

                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
