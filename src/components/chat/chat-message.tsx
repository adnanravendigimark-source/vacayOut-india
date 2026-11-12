"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/icon";
import type { Block } from "@/lib/chat/schema";
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

/** Plain-text version of an answer for the clipboard. */
function answerText(blocks: Block[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.type === "text" || b.type === "notice") out.push(b.text);
    else if (b.type === "picks") out.push(b.items.map((p) => `• ${p.name}${p.place !== "India" ? ` (${p.place})` : ""}: ${p.why}`).join("\n"));
    else if (b.type === "itinerary") out.push(`${b.title}\n${b.days.map((d) => `${d.title}: ${d.items.join("; ")}`).join("\n")}`);
    else if (b.type === "compare") out.push([`| | ${b.columns.join(" | ")} |`, ...b.rows.map((r) => `| ${r.label} | ${r.values.join(" | ")} |`)].join("\n"));
    else if (b.type === "tips") out.push(b.items.map((t) => `• ${t}`).join("\n"));
    else if (b.type === "reach") out.push(b.items.map((r) => `${r.mode}: ${r.text}`).join("\n"));
    else if (b.type === "bestTime") out.push(b.summary);
    else if (b.type === "stay" || b.type === "food") out.push(b.body);
  }
  return out.join("\n\n");
}

function CopyButton({ blocks }: { blocks: Block[] }) {
  const [copied, setCopied] = useState(false);
  const text = answerText(blocks);
  if (!text) return null;
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }, () => {});
      }}
      className="inline-flex items-center gap-1 text-[0.75rem] text-muted hover:text-ink"
    >
      <Icon name={copied ? "checkCircle" : "fileText"} size={13} />
      {copied ? "Copied" : "Copy"}
    </button>
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
      <div className="min-w-0 flex-1 space-y-3" aria-live={message.status === "streaming" ? "polite" : undefined}>
        <span className="sr-only">VacayOut: </span>
        {message.blocks.length > 0 ? <BlockList blocks={message.blocks} onAsk={onAsk} busy={busy} /> : null}
        {message.status === "streaming" && (message.blocks.length === 0 || message.statusText) ? <Thinking text={message.statusText} /> : null}
        {message.status === "done" && message.blocks.length ? <CopyButton blocks={message.blocks} /> : null}
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

