import React, { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, X, Send, ChevronDown, RotateCcw, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface AiAssistPanelProps {
  module: string;
  context?: Record<string, unknown>;
}

const BASE = import.meta.env.BASE_URL ?? "/";

async function fetchQuickPrompts(module: string): Promise<string[]> {
  try {
    const response = await fetch(
      `${BASE}api/ai/quick-prompts?module=${encodeURIComponent(module)}`,
    );
    if (!response.ok) return [];
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) return [];
    const data = await response.json();
    return Array.isArray(data.prompts) ? data.prompts : [];
  } catch {
    return [];
  }
}

export function AiAssistPanel({ module, context = {} }: AiAssistPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [quickPrompts, setQuickPrompts] = useState<string[]>([]);
  const [copied, setCopied] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open && quickPrompts.length === 0) {
      void fetchQuickPrompts(module).then(setQuickPrompts);
    }
  }, [open, module, quickPrompts.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    if (window.matchMedia("(max-width: 639px)").matches) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    const userMessage = text.trim();
    if (!userMessage || streaming) return;

    setMessages((current) => [...current, { role: "user", content: userMessage }]);
    setInput("");
    setStreaming(true);
    setMessages((current) => [
      ...current,
      { role: "assistant", content: "", streaming: true },
    ]);

    abortRef.current = new AbortController();
    let fullContent = "";

    try {
      const response = await fetch(`${BASE}api/ai/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, context, message: userMessage }),
        signal: abortRef.current.signal,
      });

      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok) {
        throw new Error(`Smart Assist request failed (${response.status}).`);
      }
      if (!contentType.includes("text/event-stream")) {
        throw new Error(
          "Smart Assist received a web page instead of assistant data. Deploy the updated API server.",
        );
      }
      if (!response.body) throw new Error("Smart Assist returned no response.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const dataLine = event
            .split("\n")
            .find((line) => line.startsWith("data: "));
          if (!dataLine) continue;

          try {
            const data = JSON.parse(dataLine.slice(6));
            if (data.content) {
              fullContent += String(data.content);
              setMessages((current) => {
                const updated = [...current];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: fullContent,
                  streaming: true,
                };
                return updated;
              });
            }

            if (data.done || data.error) {
              const finalContent = data.error
                ? `⚠ ${data.error}`
                : fullContent || "Smart Assist completed the request.";
              setMessages((current) => {
                const updated = [...current];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: finalContent,
                };
                return updated;
              });
            }
          } catch {
            // Ignore incomplete individual server-sent events.
          }
        }

        if (done) break;
      }
    } catch (error: unknown) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        const message =
          error instanceof Error
            ? error.message
            : "Connection error. Please retry.";
        setMessages((current) => {
          const updated = [...current];
          updated[updated.length - 1] = {
            role: "assistant",
            content: `⚠ ${message}`,
          };
          return updated;
        });
      }
    } finally {
      setStreaming(false);
      window.setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [context, module, streaming]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  };

  const copyMessage = async (index: number, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(index);
    window.setTimeout(() => setCopied(null), 2000);
  };

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setStreaming(false);
  };

  const moduleLabel = module.replace(/-/g, " ").toUpperCase();

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="smart-assist-panel"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "fixed z-[70] flex items-center gap-2 border px-3 py-2.5 font-mono text-[11px] font-bold tracking-widest shadow-lg transition-all",
          "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-3",
          "sm:bottom-6 sm:right-6 sm:px-4 sm:text-xs",
          open
            ? "border-primary bg-primary text-primary-foreground"
            : "border-primary/50 bg-card text-primary hover:bg-primary/10",
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
        SMART ASSIST
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close Smart Assist"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[71] bg-black/55 backdrop-blur-[1px] sm:hidden"
          />

          <section
            id="smart-assist-panel"
            role="dialog"
            aria-label="Smart Assist — Chief Strategist"
            className={cn(
              "fixed z-[72] flex min-h-0 flex-col overflow-hidden border border-primary/30 bg-card shadow-2xl",
              "inset-x-2 bottom-[calc(4.25rem+env(safe-area-inset-bottom))]",
              "h-[min(82dvh,720px)] max-h-[calc(100dvh-5.25rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))]",
              "sm:inset-auto sm:bottom-20 sm:right-6 sm:h-[min(74vh,720px)] sm:w-[min(440px,calc(100vw-3rem))]",
            )}
          >
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-primary/5 px-3 py-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate font-mono text-[11px] font-bold tracking-widest text-primary sm:text-xs">
                  SMART ASSIST
                </span>
                <span className="hidden max-w-36 truncate border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground min-[390px]:block">
                  [ {moduleLabel} ]
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={clearChat}
                    className="grid h-9 w-9 place-items-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    title="Clear conversation"
                    aria-label="Clear conversation"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-9 w-9 place-items-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Close Smart Assist"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            {messages.length === 0 && quickPrompts.length > 0 && (
              <div className="shrink-0 border-b border-border px-3 py-2.5">
                <p className="mb-2 font-mono text-[9px] tracking-widest text-muted-foreground">
                  QUICK ACTIONS
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible">
                  {quickPrompts.slice(0, 3).map((prompt) => (
                    <button
                      type="button"
                      key={prompt}
                      onClick={() => void sendMessage(prompt)}
                      className="min-w-[220px] border border-border px-2.5 py-2 text-left font-mono text-[10px] text-muted-foreground transition-all hover:border-primary/50 hover:bg-secondary/50 hover:text-foreground sm:min-w-0"
                    >
                      → {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
              {messages.length === 0 && (
                <div className="flex min-h-52 flex-col items-center justify-center px-4 text-center">
                  <Sparkles className="mb-3 h-7 w-7 text-primary/50" />
                  <p className="font-mono text-xs text-foreground">
                    Smart Assist — Chief Strategist
                  </p>
                  <p className="mt-2 max-w-xs font-mono text-[10px] leading-5 text-muted-foreground">
                    Search campaign contacts, wards and polling stations, review
                    priorities, or research a public issue.
                  </p>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={cn(
                    "flex min-w-0 flex-col gap-1",
                    message.role === "user" ? "items-end" : "items-start",
                  )}
                >
                  <span className="px-1 font-mono text-[8px] tracking-widest text-muted-foreground/70">
                    {message.role === "user" ? "YOU" : "SMART ASSIST"}
                  </span>

                  <div
                    className={cn(
                      "group relative min-w-0 max-w-[94%] overflow-hidden border px-3 py-2.5 text-[12px] leading-5 sm:max-w-[92%]",
                      message.role === "user"
                        ? "border-primary/30 bg-primary/15 text-foreground"
                        : "border-border bg-secondary/60 text-foreground",
                    )}
                  >
                    {message.streaming && message.content === "" ? (
                      <span className="flex gap-1 py-1">
                        {[0, 150, 300].map((delay) => (
                          <span
                            key={delay}
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary"
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </span>
                    ) : (
                      <span className="block whitespace-pre-wrap break-words">
                        {message.content}
                      </span>
                    )}

                    {message.role === "assistant" &&
                      !message.streaming &&
                      message.content && (
                        <button
                          type="button"
                          onClick={() => void copyMessage(index, message.content)}
                          className="absolute right-1 top-1 grid h-7 w-7 place-items-center bg-card/80 text-muted-foreground opacity-100 transition-opacity hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
                          aria-label="Copy response"
                        >
                          {copied === index ? (
                            <Check className="h-3.5 w-3.5 text-green-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <footer className="shrink-0 border-t border-border bg-card px-3 pb-[calc(.65rem+env(safe-area-inset-bottom))] pt-2.5 sm:px-4 sm:pb-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={streaming}
                  rows={1}
                  placeholder="Ask Smart Assist…"
                  className="max-h-28 min-h-11 flex-1 resize-none overflow-y-auto border border-border bg-secondary px-3 py-3 font-mono text-[12px] outline-none placeholder:text-muted-foreground/60 focus:border-primary disabled:opacity-50"
                  style={{ fieldSizing: "content" } as React.CSSProperties}
                />
                <button
                  type="button"
                  onClick={() => void sendMessage(input)}
                  disabled={streaming || !input.trim()}
                  className="grid h-11 w-11 shrink-0 place-items-center bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 truncate font-mono text-[8px] text-muted-foreground/60">
                Enter to send · Shift+Enter for a new line · Campaign data and public research
              </p>
            </footer>
          </section>
        </>
      )}
    </>
  );
}
