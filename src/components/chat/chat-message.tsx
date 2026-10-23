"use client";

import { Icon } from "@/components/icons/icon";
import type { ChatMessage } from "@/lib/chat/store";
import { openAuth } from "@/lib/chat/client";
import { BlockList } from "./blocks/block-list";

function Thinking({ text }: { text?: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[0.875rem] text-muted py-2" role="status">
      <span className="flex gap-1.5" aria-hidden>
        <span className="size-2 animate-bounce rounded-full bg-coral [animation-delay:-0.3s]" />
        <span className="size-2 animate-bounce rounded-full bg-coral [animation-delay:-0.15s]" />
        <span className="size-2 animate-bounce rounded-full bg-coral" />
      </span>
      <span className="font-medium text-ink/75">{text ?? "Planning your trip…"}</span>
    </div>
  );
}

export function ChatMessageView({
  message,
  onAsk,
  onRetry,
  busy,
}: {
  message: ChatMessage;
  onAsk: (q: string) => void;
  onRetry: () => void;
  busy: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-ink px-4.5 py-3 text-[0.9375rem] leading-relaxed text-white shadow-sm sm:max-w-[75%]">
          <span className="sr-only">You: </span>
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 sm:gap-4 animate-fade-in">
      <span
        aria-hidden
        className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-coral/10 border border-coral/20 text-coral shadow-xs"
      >
        <Icon name="sparkles" size={16} />
      </span>
      <div className="min-w-0 flex-1 space-y-4" aria-live={message.status === "streaming" ? "polite" : undefined}>
        <span className="sr-only">VacayOut: </span>
        {message.blocks.length > 0 ? <BlockList blocks={message.blocks} onAsk={onAsk} busy={busy} /> : null}
        {message.status === "streaming" && (message.blocks.length === 0 || message.statusText) ? <Thinking text={message.statusText} /> : null}
        {message.status === "error" ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-coral/30 bg-coral/5 px-4 py-3 text-[0.875rem] text-ink">
            <span>{message.error ?? "Something went wrong."}</span>
            {message.needsAuth ? (
              <button type="button" onClick={() => openAuth({ mode: "signup" })} className="font-semibold text-coral underline underline-offset-4 hover:text-coral-hover">
                Sign up free
              </button>
            ) : null}
            <button
              type="button"
              onClick={onRetry}
              disabled={busy}
              className="font-semibold text-coral underline underline-offset-4 disabled:opacity-50 hover:text-coral-hover"
            >
              Try again
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

