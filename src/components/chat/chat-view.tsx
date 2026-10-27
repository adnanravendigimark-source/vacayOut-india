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
    <div className="grid min-h-dvh lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <div className="hidden border-r border-line bg-canvas lg:block">
        <ChatSidebar activeId={activeId} />
      </div>

      {historyOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Chat history">
          <button type="button" aria-label="Close chat history" onClick={() => setHistoryOpen(false)} className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-y-0 left-0 w-[min(18rem,85vw)] overflow-y-auto bg-canvas shadow-2xl">
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
        {/* Top navigation as specified in Section 4:
            - VacayOut logo
            - Current trip or conversation title
            - New conversation control
            - Close or return-to-home control */}
        <div className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-white/95 px-4 sm:px-6 backdrop-blur-md">
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              aria-label="Show chat history"
              aria-expanded={historyOpen}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-coral hover:text-coral lg:hidden"
            >
              <Icon name="menu" size={14} />
              <span className="hidden sm:inline">History</span>
            </button>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Return to Homepage"
                className="flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-coral hover:text-coral"
              >
                <Icon name="arrowLeft" size={14} />
                <span className="hidden sm:inline">Home</span>
              </button>
            ) : (
              <Link
                href={routes.home}
                aria-label="Return to Homepage"
                className="flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-coral hover:text-coral"
              >
                <Icon name="arrowLeft" size={14} />
                <span className="hidden sm:inline">Home</span>
              </Link>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col px-2 text-center sm:px-4">
            <span className="block truncate text-[0.875rem] font-semibold text-ink">
              {chat?.title ?? "AI Travel Planner"}
            </span>
            <span className="flex items-center justify-center gap-1 text-[0.6875rem] text-muted">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              VacayOut AI Active
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={routes.chat}
              aria-label="New trip"
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-coral px-3 py-1.5 text-xs font-semibold text-white shadow-coral transition-all hover:bg-coral-hover hover:scale-105 active:scale-95"
            >
              <Icon name="sparkles" size={13} />
              <span className="hidden sm:inline">New trip</span>
            </Link>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close trip planner"
                className="flex size-8 items-center justify-center rounded-lg border border-line text-muted hover:border-ink hover:text-ink transition-colors"
              >
                <span className="text-sm leading-none">✕</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[54rem] flex-1 px-4 pb-6 pt-6 sm:px-6">
          {missing ? (
            <div className="mx-auto max-w-md py-24 text-center">
              <h1 className="font-serif text-[1.75rem] font-medium text-ink">This trip isn’t saved in this browser</h1>
              <p className="mt-2 text-muted">Trips are kept on the device you planned them on. Start a new one here.</p>
              <Link href={routes.chat} className="mt-6 inline-block rounded-lg bg-coral px-5 py-3 font-semibold text-white shadow-coral hover:bg-coral-hover">
                New trip
              </Link>
            </div>
          ) : empty && !initialPrompt ? (
            <div className="py-16 text-center sm:py-24">
              <Icon name="sparkles" size={32} className="mx-auto text-coral" />
              <h1 className="mt-4 font-serif text-[clamp(1.9rem,4vw,2.6rem)] font-medium leading-tight text-ink">Where would you like to go?</h1>
              <p className="mx-auto mt-3 max-w-lg text-muted">
                Tell me the place, how many days you have, your budget and who’s travelling. Keep asking to change anything.
              </p>
              <ul className="mx-auto mt-7 flex max-w-xl flex-wrap justify-center gap-2">
                {examples.map((ex) => (
                  <li key={ex.label}>
                    <button
                      type="button"
                      onClick={() => send(ex.prompt)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-[0.8125rem] font-medium text-ink hover:border-coral hover:text-coral transition-colors"
                    >
                      <Icon name={ex.icon} size={15} className="text-coral" />
                      {ex.label}
                    </button>
                  </li>
                ))}
              </ul>
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
          <div className="sticky bottom-0 bg-gradient-to-t from-canvas via-canvas to-canvas/0 px-4 pb-4 pt-6 sm:px-6">
            <div className="mx-auto max-w-[54rem]">
              <Composer onSend={send} onStop={() => controller.current?.abort()} busy={busy} autoFocus={!initialPrompt} />
              <FreeMessagesHint />
              <p className="mt-2 text-center text-[0.6875rem] text-muted">
                Answers come from VacayOut’s guides and live web research, with sources. Check prices and timings before you book.
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

