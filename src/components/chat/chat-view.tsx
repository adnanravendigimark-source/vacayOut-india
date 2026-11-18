"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/icon";
import type { ExamplePrompt } from "@/lib/data/types";
import { MAX_MESSAGE_CHARS } from "@/lib/chat/constants";
import { streamAnswer } from "@/lib/chat/client";
import { FreeMessagesHint } from "./free-hint";
import { appendMessages, createChat, getChat, updateAssistant, useChats, useHydrated } from "@/lib/chat/store";
import { routes } from "@/lib/routes";
import { ChatMessageView } from "./chat-message";
import { ChatSidebar } from "./chat-sidebar";
import { Composer } from "./composer";
import "@/components/explore/explore.css";
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

  const scrollToEnd = useCallback((smooth = true) => {
    endRef.current?.scrollIntoView({ block: "end", behavior: smooth ? "smooth" : "auto" });
  }, []);

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
    [activeId, run, scrollToEnd],
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
  useEffect(() => {
    if (busy) scrollToEnd();
  }, [blockCount, busy, scrollToEnd]);

  const missing = hydrated && chatId && !chat && !initialPrompt && activeId === chatId;
  const empty = !chat || chat.messages.length === 0;

  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <div className="hidden border-r border-[#EFECE6] bg-white lg:block">
        <ChatSidebar activeId={activeId} />
      </div>

      {historyOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Chat history">
          <button type="button" aria-label="Close chat history" onClick={() => setHistoryOpen(false)} className="absolute inset-0 bg-black/40" />
          <div className="cx-in absolute inset-y-0 left-0 w-[min(18rem,85vw)] overflow-y-auto bg-white shadow-2xl">
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
        <div className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b border-[#EFECE6] bg-white/90 px-3 backdrop-blur-md sm:px-5">
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
            <span key={chat?.title ?? "new"} className="cx-in block max-w-full truncate text-[0.875rem] font-semibold text-ink">{chat?.title ?? "AI trip planner"}</span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[0.6875rem] text-[#888888]">
              <span className="cx-dot size-1.5 rounded-full bg-coral" />
              {busy ? "Planning…" : "VacayOut AI · India only"}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href={routes.chat}
              aria-label="New trip"
              className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-3.5 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-black"
            >
              <Icon name="sparkles" size={14} className="text-coral" />
              <span className="hidden sm:inline">New trip</span>
            </Link>
            {onClose ? (
              <button type="button" onClick={onClose} aria-label="Close trip planner" className="flex size-9 items-center justify-center rounded-full text-[#888888] transition-colors hover:bg-black/5 hover:text-ink">
                <Icon name="x" size={16} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[54rem] flex-1 px-4 pb-6 pt-6 sm:px-6">
          {missing ? (
            <div className="mx-auto max-w-md py-24 text-center">
              <h1 className="font-serif text-[1.75rem] font-normal text-ink">This trip isn’t saved in this browser</h1>
              <p className="mt-2 text-muted">Trips are kept on the device you planned them on. Start a new one here.</p>
              <Link href={routes.chat} className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-semibold text-white hover:bg-black">
                New trip
              </Link>
            </div>
          ) : empty && !initialPrompt ? (
            <div className="ex-hero relative isolate -mx-4 -mt-6 px-4 pb-6 pt-12 sm:-mx-6 sm:px-6 sm:pt-16">
              <div aria-hidden className="ex-hero__bg">
                <span className="ex-hero__blob ex-hero__blob--a" />
                <span className="ex-hero__blob ex-hero__blob--b" />
                <span className="ex-hero__grid" />
              </div>
              <div className="text-center">
                <p className="explore-in inline-flex items-center gap-2 rounded-full border border-[#EEE7E0] bg-white/80 px-3.5 py-1 text-xs font-semibold text-[#666666] backdrop-blur-sm" style={{ ["--d" as string]: "0ms" }}>
                  <span className="cx-dot size-1.5 rounded-full bg-coral" /> AI trip planner for India
                </p>
                <h1 className="explore-in mt-4 font-serif text-[clamp(2rem,4.4vw,3rem)] font-normal leading-[1.05] tracking-[-0.02em] text-ink" style={{ ["--d" as string]: "80ms" }}>
                  Where would you like to <em className="italic text-coral">go</em>?
                </h1>
                <p className="explore-in mx-auto mt-3 max-w-lg text-[0.9375rem] leading-relaxed text-[#555555]" style={{ ["--d" as string]: "160ms" }}>
                  Tell me the place, how many days you have, your budget and who’s travelling. Keep asking to change anything.
                </p>
              </div>
              {examples.length ? (
                <>
                  <p className="mt-9 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[#999999]">Try one of these</p>
                  <ul className="cx-stagger mx-auto mt-3 grid max-w-2xl gap-2.5 sm:grid-cols-2">
                    {examples.map((ex, i) => (
                      <li key={ex.label} style={{ ["--i" as string]: i }}>
                        <button
                          type="button"
                          onClick={() => send(ex.prompt)}
                          className="group flex w-full items-center gap-3 rounded-2xl border border-[#ECE9E2] bg-white/90 p-3 text-left backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-transparent hover:shadow-[0_14px_32px_-20px_rgba(25,25,25,0.4)]"
                        >
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FDF0EB] text-coral transition-colors group-hover:bg-coral group-hover:text-white">
                            <Icon name={ex.icon} size={18} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-ink">{ex.label}</span>
                            <span className="mt-0.5 line-clamp-1 block text-xs text-[#888888]">{ex.prompt}</span>
                          </span>
                          <Icon name="arrowRight" size={14} className="shrink-0 text-[#CCCCCC] transition-all group-hover:translate-x-0.5 group-hover:text-coral" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              <p className="explore-in mx-auto mt-8 flex max-w-md items-center justify-center gap-2 text-center text-xs text-[#888888]" style={{ ["--d" as string]: "420ms" }}>
                <Icon name="checkCircle" size={14} className="shrink-0 text-[#2D5A3F]" />
                Answers start from VacayOut’s reviewed guides and show their sources.
              </p>
            </div>
          ) : (
            <div className="space-y-7">
              {chat?.messages.map((m) => (
                <ChatMessageView key={m.id} message={m} onAsk={send} onRetry={() => retry(m.id)} busy={busy} />
              ))}
            </div>
          )}
        </div>

        {!missing ? (
          <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-white/0 px-4 pb-4 pt-6 sm:px-6">
            <div className="mx-auto max-w-[54rem]">
              <Composer onSend={send} onStop={() => controller.current?.abort()} busy={busy} autoFocus={!initialPrompt} />
              <FreeMessagesHint />
              <p className="mt-2 text-center text-[0.6875rem] text-[#999999]">
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

