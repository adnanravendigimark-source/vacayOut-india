"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Icon } from "@/components/icons/icon";
import type { ExamplePrompt } from "@/lib/data/types";
import type { Block } from "@/lib/chat/schema";
import { streamAnswer } from "@/lib/chat/client";
import { MAX_MESSAGE_CHARS } from "@/lib/chat/constants";
import {
  appendMessages,
  createChat,
  getChat,
  useChats,
} from "@/lib/chat/store";
import { BlockList } from "./blocks/block-list";

/**
 * Highlight cards are filled ONLY from the answer's own blocks (which come from
 * approved data). If the answer has no budget or transport block, that card is
 * not shown — nothing is guessed from keywords.
 */
interface HighlightMetrics {
  budget?: { value: string; detail: string };
  transit?: { route: string; detail: string };
  trip?: { title: string; detail: string };
}

function extractMetrics(blocks: Block[]): HighlightMetrics {
  const metrics: HighlightMetrics = {};

  const budget = blocks.find((b) => b.type === "budget");
  if (budget && budget.type === "budget" && budget.tiers.length > 0) {
    const t = budget.tiers[Math.min(1, budget.tiers.length - 1)];
    metrics.budget = {
      value: t.high ? `₹${t.low.toLocaleString("en-IN")}–${t.high.toLocaleString("en-IN")}` : `₹${t.low.toLocaleString("en-IN")}+`,
      detail: `${t.label}, ${budget.basis}. ${budget.note}`,
    };
  }

  const reach = blocks.find((b) => b.type === "reach");
  if (reach && reach.type === "reach" && reach.items.length > 0) {
    metrics.transit = { route: reach.items[0].mode, detail: reach.items[0].text };
  }

  const dest = blocks.find((b) => b.type === "destination");
  if (dest && dest.type === "destination") {
    const parts = [dest.days ? `${dest.days} days` : null, dest.group ?? null, dest.bestTime ? `Best: ${dest.bestTime}` : null].filter(Boolean);
    metrics.trip = { title: `${dest.name}, ${dest.stateName}`, detail: parts.join(" • ") || dest.tagline };
  }

  return metrics;
}

/** Neutral follow-ups; destination-specific ideas come from the answer's own suggestion chips. */
function getContextualRefines(): string[] {
  return ["Make it cheaper", "Add another day", "Where should we stay?", "How do we get there?"];
}

export function AiPlannerModal({
  isOpen,
  onClose,
  initialPrompt,
  examples = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  examples?: ExamplePrompt[];
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);

  const chats = useChats();
  const currentChat = activeId ? chats.find((c) => c.id === activeId) : chats[0];

  const scrollToEnd = useCallback((smooth = true) => {
    endRef.current?.scrollIntoView({ block: "end", behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  // Streaming runner (shared with the full chat page)
  const run = useCallback(async (id: string, assistantId: string) => {
    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    setBusy(true);
    try {
      await streamAnswer(id, assistantId, ac.signal);
    } finally {
      if (controller.current === ac) {
        controller.current = null;
        setBusy(false);
      }
    }
  }, []);

  // Send turn
  const send = useCallback(
    (raw: string) => {
      const text = raw.trim().slice(0, MAX_MESSAGE_CHARS);
      if (!text || controller.current) return;

      let id = activeId;
      if (!id || !getChat(id)) {
        id = crypto.randomUUID();
        createChat(id, text);
        setActiveId(id);
      }

      const assistantId = crypto.randomUUID();
      appendMessages(id, [
        { id: crypto.randomUUID(), role: "user", text },
        { id: assistantId, role: "assistant", blocks: [], status: "streaming" },
      ]);

      requestAnimationFrame(() => scrollToEnd());
      void run(id, assistantId);
    },
    [activeId, run, scrollToEnd],
  );

  // Start initial prompt when opened
  useEffect(() => {
    if (!isOpen) {
      hasInitialized.current = false;
      return;
    }
    if (initialPrompt && !hasInitialized.current) {
      hasInitialized.current = true;
      const t = setTimeout(() => send(initialPrompt), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen, initialPrompt, send]);

  // Keep scroll pinned as blocks arrive
  const blockCount = currentChat?.messages.reduce((n, m) => n + (m.role === "assistant" ? m.blocks.length : 1), 0) ?? 0;
  useEffect(() => {
    if (busy) scrollToEnd();
  }, [blockCount, busy, scrollToEnd]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputVal.trim();
    if (!val || busy) return;
    send(val);
    setInputVal("");
  };

  const handleShare = () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      });
    }
  };

  // Find latest user prompt to extract dynamic metrics & refine pills
  const lastUserMessage = useMemo(() => {
    if (!currentChat) return initialPrompt || "Discover custom journey";
    const userMsgs = currentChat.messages.filter((m) => m.role === "user");
    return userMsgs[userMsgs.length - 1]?.text || initialPrompt || "Discover custom journey";
  }, [currentChat, initialPrompt]);

  const refineSuggestions = getContextualRefines();

  // Dynamic dialog title based on prompt
  const displayTitle = useMemo(() => {
    if (!lastUserMessage || lastUserMessage === "Discover custom journey") return "Discover custom journey";
    if (lastUserMessage.length > 36) return `${lastUserMessage.slice(0, 34)}…`;
    return lastUserMessage;
  }, [lastUserMessage]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-plan-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 md:p-8 bg-black/65 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex flex-col w-full max-w-4xl lg:max-w-5xl h-[92vh] max-h-[840px] rounded-2xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden border border-black/10 animate-scale-in">
        {/* Top Header Bar matching user's design reference */}
        <div className="flex items-center justify-between border-b border-[#ECE9E2] px-4 sm:px-6 py-3.5 bg-white/95 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* VacayOut Brand Symbol */}
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-coral/10 text-coral">
              <svg width="22" height="16" viewBox="0 0 46 34" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 29 L13 15 L21 27" />
                <path d="M15 22 L24 6 L35 25" />
                <path d="M31 19 L37 11 L43 29" />
              </svg>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="modal-plan-title" className="font-serif text-sm sm:text-base font-bold text-ink truncate capitalize">
                  {displayTitle}
                </h2>
                <span className="shrink-0 rounded-full bg-coral/10 border border-coral/20 px-2 py-0.5 text-[0.6875rem] font-bold text-coral">
                  AI Live Plan
                </span>
              </div>
              <p className="text-[0.72rem] sm:text-xs text-[#777777] truncate">
                Generated in real-time based on your preferences • October (Pleasant season)
              </p>
            </div>
          </div>

          {/* Right Action Controls: Share & Close */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-ink text-xs font-medium px-3.5 py-1.5 transition-colors active:scale-95 shadow-xs"
              title="Share this itinerary"
            >
              <Icon name="compass" size={13} className="text-coral" />
              <span>{copied ? "Copied!" : "Share"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close AI Planner"
              className="flex size-8 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-ink transition-colors active:scale-95"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Middle Scrollable Chat Conversation Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#FAF9F5]">
          {!currentChat || currentChat.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-12 rounded-full bg-coral/10 text-coral flex items-center justify-center mb-3">
                <Icon name="sparkles" size={24} />
              </div>
              <p className="font-serif text-lg font-bold text-ink">What kind of India journey are you dreaming of?</p>
              <p className="mt-1 text-xs text-[#777777] max-w-sm">
                Ask anything from weekend romantic stays in Udaipur to 7-day snow adventures in Kashmir.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-md">
                {examples.map((ex) => (
                  <button
                    key={ex.label}
                    type="button"
                    onClick={() => send(ex.prompt)}
                    className="rounded-full border border-[#E5E2DC] bg-white px-3.5 py-1.5 text-xs font-medium text-ink hover:border-coral hover:text-coral transition-all shadow-xs"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            currentChat.messages.map((m) => {
              if (m.role === "user") {
                return (
                  <div key={m.id} className="flex justify-end animate-fade-in">
                    <div className="max-w-[85%] sm:max-w-[70%] rounded-2xl rounded-tr-xs bg-ink px-4.5 py-2.5 sm:py-3 text-sm sm:text-[0.9375rem] font-medium text-white shadow-sm">
                      {m.text}
                    </div>
                  </div>
                );
              }

              // Assistant turn
              const textBlock = m.blocks.find((b) => b.type === "text");
              const otherBlocks = m.blocks.filter((b) => b.type !== "text");

              return (
                <div key={m.id} className="flex gap-3 sm:gap-4 animate-fade-in">
                  {/* Avatar Icon */}
                  <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-coral/10 border border-coral/20 text-coral shadow-xs">
                    <Icon name="sparkles" size={16} />
                  </div>

                  <div className="min-w-0 flex-1 space-y-4">
                    {/* 1. Conversational Intro Narrative Card */}
                    {textBlock && textBlock.type === "text" ? (
                      <div className="rounded-2xl border border-[#EBE8E1] bg-white p-4 sm:p-5 shadow-xs text-sm sm:text-[0.9375rem] text-[#222222] leading-relaxed font-normal">
                        {textBlock.text}
                      </div>
                    ) : m.status === "streaming" && m.blocks.length === 0 ? (
                      <div className="flex items-center gap-2.5 rounded-2xl border border-[#EBE8E1] bg-white p-4 shadow-xs text-xs sm:text-sm text-[#777777]">
                        <span className="flex gap-1.5">
                          <span className="size-2 animate-bounce rounded-full bg-coral [animation-delay:-0.3s]" />
                          <span className="size-2 animate-bounce rounded-full bg-coral [animation-delay:-0.15s]" />
                          <span className="size-2 animate-bounce rounded-full bg-coral" />
                        </span>
                        <span>Crafting your bespoke India plan in real-time…</span>
                      </div>
                    ) : null}

                    {/* 2. Highlight cards — only for data present in this answer */}
                    {(() => {
                      const mm = extractMetrics(m.blocks);
                      const cards = [
                        mm.budget && { label: "Estimated budget", value: mm.budget.value, detail: mm.budget.detail, accent: false },
                        mm.transit && { label: "Getting there", value: mm.transit.route, detail: mm.transit.detail, accent: false },
                        mm.trip && { label: "Your trip", value: mm.trip.title, detail: mm.trip.detail, accent: true },
                      ].filter(Boolean) as { label: string; value: string; detail: string; accent: boolean }[];
                      if (cards.length === 0) return null;
                      return (
                        <div className={`grid grid-cols-1 gap-3 animate-fade-in ${cards.length === 3 ? "sm:grid-cols-3" : cards.length === 2 ? "sm:grid-cols-2" : ""}`}>
                          {cards.map((c) => (
                            <div key={c.label} className="rounded-2xl border border-[#EBE8E1] bg-white p-4 shadow-xs hover:border-coral/30 transition-all">
                              <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-[#777777]">{c.label}</p>
                              <p className={`mt-1 truncate text-lg font-bold sm:text-[1.3rem] ${c.accent ? "text-coral" : "text-ink"}`}>{c.value}</p>
                              <p className="mt-1 line-clamp-2 text-xs text-[#777777]">{c.detail}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* 3. Detailed Blocks (Itinerary with [DAY 1] badge, Stays, Bookings, Food, Tips) */}
                    {otherBlocks.length > 0 && (
                      <BlockList blocks={otherBlocks} onAsk={send} busy={busy} />
                    )}

                    {/* Error state */}
                    {m.status === "error" && (
                      <div className="flex items-center justify-between rounded-xl border border-coral/30 bg-coral/5 px-4 py-3 text-xs sm:text-sm text-ink">
                        <span>{m.error ?? "Something went wrong while generating."}</span>
                        <button
                          type="button"
                          onClick={() => send("Please try planning this trip again.")}
                          className="font-semibold text-coral underline hover:text-coral-hover ml-2"
                        >
                          Try again
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {/* Bottom Fixed Refine & Chat Bar matching user's design reference */}
        <div className="border-t border-[#ECE9E2] bg-white p-3 sm:p-4 space-y-2.5 shrink-0">
          {/* Refine prompt chips row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-semibold text-[#777777] shrink-0">Refine:</span>
            <div className="flex items-center gap-2 flex-nowrap">
              {refineSuggestions.map((refineText) => (
                <button
                  key={refineText}
                  type="button"
                  disabled={busy}
                  onClick={() => send(refineText)}
                  className="shrink-0 rounded-full border border-[#E0DCD3] bg-white hover:bg-canvas hover:border-coral px-3 py-1 text-xs font-medium text-ink hover:text-coral transition-all active:scale-95 disabled:opacity-50 shadow-xs"
                >
                  {refineText}
                </button>
              ))}
            </div>
          </div>

          {/* Sticky Input Pill with Coral Update Action Button */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 rounded-full border border-[#D5D1C7] bg-white px-3 sm:px-4 py-1.5 focus-within:border-coral focus-within:ring-2 focus-within:ring-coral/25 shadow-xs transition-all"
          >
            <label htmlFor="ai-modal-input" className="sr-only">
              Ask AI to adjust days, add hidden gems, or compare stays…
            </label>
            <input
              id="ai-modal-input"
              ref={inputRef}
              type="text"
              value={inputVal}
              disabled={busy}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask AI to adjust days, add hidden gems, or compare stays…"
              autoComplete="off"
              className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-ink outline-none placeholder:text-[#888888] font-medium py-1.5"
            />
            <button
              type="submit"
              disabled={!inputVal.trim() || busy}
              className="shrink-0 flex items-center gap-1.5 rounded-full bg-coral hover:bg-coral-hover text-white px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold shadow-coral transition-all active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:shadow-none"
            >
              <span>Update</span>
              <Icon name="arrowRight" size={14} strokeWidth={2.4} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
