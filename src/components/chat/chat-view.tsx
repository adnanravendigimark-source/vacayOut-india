"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/icon";
import type { ExamplePrompt } from "@/lib/data/types";
import { MAX_MESSAGE_CHARS } from "@/lib/chat/constants";
import { openAuth, streamAnswer } from "@/lib/chat/client";
import { useQuota } from "@/lib/chat/quota-client";
import { quotaView, SIGN_UP_FOR_NEW_TRIP } from "@/lib/chat/quota-view";
import { FreeMessagesHint } from "./free-hint";
import { appendMessages, createChat, getChat, updateAssistant, useChats, useHydrated } from "@/lib/chat/store";
import { routes } from "@/lib/routes";
import { ChatMessageView } from "./chat-message";
import { ChatSidebar } from "./chat-sidebar";
import { Composer } from "./composer";
import "./chat.css";

function newId() {
  return crypto.randomUUID();
}

export function ChatView({
  chatId,
  initialPrompt,
  examples,
  onClose,
}: {
  chatId?: string;
  initialPrompt?: string;
  examples: ExamplePrompt[];
  onClose?: () => void;
}) {

  // The address bar is the source of truth for which conversation is open, so
  // "New trip" (/chat) and in-place starts (pushState to /chat/<id>) stay in sync.
  const pathname = usePathname();
  const activeId = chatId ?? (pathname.startsWith("/chat/") ? pathname.slice("/chat/".length) : null);
  const [busy, setBusy] = useState(false);
  // Chat history drawer for screens without the sidebar.
  const [historyOpen, setHistoryOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setHistoryOpen(false);
  }
  const controller = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const chats = useChats();
  const hydrated = useHydrated();
  const chat = activeId ? chats.find((c) => c.id === activeId) : undefined;
  const quota = quotaView(useQuota(), activeId);
  // Only follow a streaming answer while the reader is at the bottom; otherwise offer a jump.
  const [atBottom, setAtBottom] = useState(true);

  const scrollToEnd = useCallback((smooth = true) => {
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ block: "end", behavior: smooth && !reduce ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    const el = endRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    // The end marker sits below the pinned message box, so allow for its height.
    const io = new IntersectionObserver(([e]) => setAtBottom(e.isIntersecting), { rootMargin: "0px 0px 220px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /** "New trip": a free visitor already has their one conversation → offer an account instead. */
  const newTrip = (e: React.MouseEvent) => {
    if (!quota.newTripNeedsSignUp) return;
    e.preventDefault();
    openAuth({ mode: "signup", message: SIGN_UP_FOR_NEW_TRIP });
  };

  /** Streams one answer into an existing assistant message. */
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

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim().slice(0, MAX_MESSAGE_CHARS);
      if (!text || controller.current) return;
      if (quota.locked) {
        openAuth({ mode: "signup", ...(quota.reason ? { message: quota.reason } : {}) });
        return;
      }
      let id = activeId;
      if (!id || !getChat(id)) {
        id = newId();
        createChat(id, text);
        // Same screen, new address: the conversation can be reopened or shared, without a page change.
        window.history.pushState(null, "", routes.chatThread(id));
      }
      const assistantId = newId();
      appendMessages(id, [
        { id: newId(), role: "user", text },
        { id: assistantId, role: "assistant", blocks: [], status: "streaming" },
      ]);
      requestAnimationFrame(() => scrollToEnd());
      void run(id, assistantId);
    },
    [activeId, run, scrollToEnd, quota.locked, quota.reason],
  );

  const retry = useCallback(
    (assistantId: string) => {
      if (!activeId || controller.current) return;
      updateAssistant(activeId, assistantId, (m) => ({ ...m, blocks: [], status: "streaming", error: undefined }));
      void run(activeId, assistantId);
    },
    [activeId, run],
  );

  // Start the conversation when arriving with a question (homepage, ?q=…).
  useEffect(() => {
    if (!initialPrompt || started.current) return;
    started.current = true;
    const t = setTimeout(() => send(initialPrompt), 0);
    return () => clearTimeout(t);
  }, [initialPrompt, send]);

  // Stop streaming if the visitor leaves this conversation.
  useEffect(() => () => controller.current?.abort(), []);

  // Follow the answer as it streams in.
  const blockCount = chat?.messages.reduce((n, m) => n + (m.role === "assistant" ? m.blocks.length : 1), 0) ?? 0;
  const draftLen = chat?.messages.reduce((n, m) => n + (m.role === "assistant" ? (m.draft?.length ?? 0) : 0), 0) ?? 0;
  useEffect(() => {
    if (busy && atBottom) scrollToEnd(false);
    // atBottom is read, not watched: scrolling up mid-answer must not trigger a jump back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockCount, draftLen, busy, scrollToEnd]);
  const lastUser = chat ? [...chat.messages].reverse().find((m) => m.role === "user") : undefined;

  const missing = hydrated && chatId && !chat && !initialPrompt && activeId === chatId;
  const empty = !chat || chat.messages.length === 0;

  return (
    <div className="cx-root grid min-h-dvh bg-white lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <div className="hidden border-r border-line bg-[#FBFAF8] lg:block">
        <ChatSidebar activeId={activeId} />
      </div>

      {historyOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Chat history">
          <button type="button" aria-label="Close chat history" onClick={() => setHistoryOpen(false)} className="absolute inset-0 bg-black/40" />
          <div className="cx-in absolute inset-y-0 left-0 w-[min(18rem,85vw)] overflow-y-auto bg-[#FBFAF8] shadow-2xl">
            <div className="flex items-center justify-end px-3 pt-3">
              <button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close chat history" className="rounded-md p-1.5 text-muted hover:text-ink">
                <Icon name="x" size={16} />
              </button>
            </div>
            <ChatSidebar activeId={activeId} onNavigate={() => setHistoryOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col">
        {/* Top bar: history (small screens), home, the conversation title, new trip */}
        <div className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-line bg-white px-2 sm:h-16 sm:px-5">
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              aria-label="Show chat history"
              aria-expanded={historyOpen}
              className="flex size-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-black/5 lg:hidden"
            >
              <Icon name="menu" size={18} />
            </button>
            {onClose ? (
              <button type="button" onClick={onClose} aria-label="Return to Homepage" className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-semibold text-ink transition-colors hover:bg-black/5">
                <Icon name="arrowLeft" size={15} />
                <span className="hidden sm:inline">Home</span>
              </button>
            ) : (
              <Link href={routes.home} aria-label="Return to Homepage" className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-semibold text-ink transition-colors hover:bg-black/5">
                <Icon name="arrowLeft" size={15} />
                <span className="hidden sm:inline">Home</span>
              </Link>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col items-center px-2 text-center">
            <span className="block max-w-full truncate text-[0.9375rem] font-semibold text-ink">{lastUser?.role === "user" ? lastUser.text : "Trip planner"}</span>
            <span className="mt-0.5 text-[0.75rem] text-[#666666]" aria-live="polite">{busy ? "Answering…" : "VacayOut AI · travel in India"}</span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href={routes.chat}
              onClick={newTrip}
              className="inline-flex h-9 items-center whitespace-nowrap rounded-full border border-line px-3.5 text-[0.8125rem] font-semibold text-ink transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              New trip
            </Link>
            {onClose ? (
              <button type="button" onClick={onClose} aria-label="Close trip planner" className="flex size-9 items-center justify-center rounded-full text-[#888888] transition-colors hover:bg-black/5 hover:text-ink">
                <Icon name="x" size={16} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[46rem] flex-1 px-4 pb-8 pt-6 sm:px-6">
          {missing ? (
            <div className="mx-auto max-w-md py-24 text-center">
              <h1 className="font-serif text-[1.75rem] font-normal text-ink">This trip isn’t saved in this browser</h1>
              <p className="mt-2 text-muted">Trips are kept on the device you planned them on. Start a new one here.</p>
              <Link href={routes.chat} className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-semibold text-white hover:bg-black">
                New trip
              </Link>
            </div>
          ) : empty && !initialPrompt ? (
            <div className="mx-auto max-w-[40rem] pt-[clamp(1.5rem,8vh,5rem)]">
              <h1 className="font-serif text-[clamp(1.75rem,3vw,2.4rem)] font-normal leading-[1.15] tracking-[-0.015em] text-ink">Where in India are you going?</h1>
              <p className="mt-3 max-w-[34rem] text-[0.9375rem] leading-relaxed text-[#555555]">
                Name a place, the number of days, who’s travelling and your budget. I’ll answer with a plan, a comparison or the facts you need, and you can keep changing it.
              </p>
              {quota.hint && !quota.locked ? (
                <p className="mt-3 text-[0.8125rem] text-[#666666]">No account needed to try: {quota.hint}. A free account removes the limit.</p>
              ) : null}
              {examples.length ? (
                <>
                  <h2 className="mt-8 text-[0.8125rem] font-semibold text-[#666666]">Try one of these</h2>
                  <ul className="mt-2 divide-y divide-line-subtle overflow-hidden rounded-2xl border border-line">
                    {examples.map((ex) => (
                      <li key={ex.label}>
                        <button
                          type="button"
                          onClick={() => send(ex.prompt)}
                          className="group flex w-full items-center gap-3 bg-white px-4 py-3 text-left transition-colors hover:bg-[#FBFAF8] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
                        >
                          <Icon name={ex.icon} size={17} className="shrink-0 text-[#767676]" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[0.9375rem] font-medium text-ink">{ex.label}</span>
                            <span className="block truncate text-[0.8125rem] text-[#666666]">{ex.prompt}</span>
                          </span>
                          <Icon name="arrowRight" size={14} className="shrink-0 text-[#767676] transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              <p className="mt-6 flex items-center gap-2 text-[0.8125rem] text-[#666666]">
                <Icon name="checkCircle" size={14} className="shrink-0" />
                Uses VacayOut’s reviewed guides where we have them, and shows sources.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {chat?.messages.map((m) => (
                <ChatMessageView key={m.id} message={m} onAsk={send} onRetry={() => retry(m.id)} busy={busy || quota.locked} />
              ))}
            </div>
          )}
        </div>

        {!missing ? (
          <div className="sticky bottom-0 bg-gradient-to-t from-white from-70% to-white/0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-5 sm:px-6">
            <div className="relative mx-auto max-w-[46rem]">
              {busy && !atBottom ? (
                <button
                  type="button"
                  onClick={() => scrollToEnd()}
                  className="absolute -top-12 left-1/2 inline-flex h-9 -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[0.8125rem] font-semibold text-ink shadow-[0_8px_24px_-14px_rgba(25,25,25,0.35)] hover:border-ink"
                >
                  <Icon name="chevronDown" size={14} /> Jump to latest
                </button>
              ) : null}
              <Composer
                onSend={send}
                onStop={() => controller.current?.abort()}
                busy={busy}
                autoFocus={!initialPrompt}
                locked={quota.locked ? { message: quota.reason ?? "Sign up free to keep planning.", action: "Sign up free", onAction: () => openAuth({ mode: "signup", ...(quota.reason ? { message: quota.reason } : {}) }) } : null}
              />
              <FreeMessagesHint activeChatId={activeId} />
              <p className="mt-1.5 hidden text-center text-[0.75rem] text-[#767676] sm:block">
                VacayOut AI can make mistakes. Check prices, timings and permits before you book.
              </p>
            </div>
          </div>
        ) : null}
        {/* After the pinned message box, so scrolling here shows the newest reply fully above it. */}
        <div ref={endRef} className="h-px" />
      </div>
    </div>
  );
}

