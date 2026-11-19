"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/icon";
import type { Block } from "@/lib/chat/schema";
import type { ChatMessage } from "@/lib/chat/store";
import { openAuth } from "@/lib/chat/client";
import { BlockList } from "./blocks/block-list";
import { TextBlock } from "./blocks/misc-blocks";

/** Waiting for the first words: one status line, nothing else moving. */
function Waiting({ text }: { text?: string }) {
  return (
    <p className="flex items-center gap-2.5 py-1 text-[0.9375rem] text-[#666666]">
      <span aria-hidden className="cx-wait size-2 rounded-full bg-coral" />
      {text ?? "Thinking…"}
    </p>
  );
}

/** Where the answer's cards will appear while they are being written. */
function CardsLoading() {
  return (
    <div aria-hidden className="space-y-2.5 pt-1">
      <div className="cx-skel h-24 rounded-2xl" />
      <div className="cx-skel h-9 w-2/3 rounded-full" />
    </div>
  );
}

/** Plain-text version of an answer for the clipboard. */
function answerText(blocks: Block[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.type === "text" || b.type === "notice") out.push(b.text);
    else if (b.type === "picks") out.push(b.items.map((p) => `• ${p.name}${p.place !== "India" ? ` (${p.place})` : ""}: ${p.why}`).join("\n"));
    else if (b.type === "itinerary")
      out.push(
        `${b.title}\n${b.days
          .map((d) => {
            const parts = [d.morning?.length ? `Morning: ${d.morning.join("; ")}` : "", d.afternoon?.length ? `Afternoon: ${d.afternoon.join("; ")}` : "", d.evening?.length ? `Evening: ${d.evening.join("; ")}` : ""].filter(Boolean);
            const meta = [d.base ? `Base: ${d.base}` : "", d.travel ?? "", d.cost ?? ""].filter(Boolean).join(" · ");
            return `${d.title}${meta ? ` (${meta})` : ""}: ${parts.length ? parts.join(" | ") : d.items.join("; ")}`;
          })
          .join("\n")}`,
      );
    else if (b.type === "compare") out.push([`| | ${b.columns.join(" | ")} |`, ...b.rows.map((r) => `| ${r.label} | ${r.values.join(" | ")} |`)].join("\n"));
    else if (b.type === "tips") out.push(b.items.map((t) => `• ${t}`).join("\n"));
    else if (b.type === "reach") out.push(b.items.map((r) => `${r.mode}: ${r.text}`).join("\n"));
    else if (b.type === "bestTime") out.push(b.summary);
    else if (b.type === "budget") out.push(`${b.basis}\n${b.tiers.map((t) => `${t.label}: ₹${t.low.toLocaleString("en-IN")}${t.high ? `–${t.high.toLocaleString("en-IN")}` : "+"}`).join("\n")}`);
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
      className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[0.8125rem] font-medium text-[#666666] transition-colors hover:bg-sand hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <Icon name={copied ? "checkCircle" : "fileText"} size={14} />
      {copied ? "Copied" : "Copy answer"}
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
  /** Follow-ups and "Plan this" are off while answering or when the visitor must sign up. */
  busy: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="cx-in flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-sand px-4 py-2.5 text-[0.9375rem] leading-relaxed text-ink sm:max-w-[75%]">
          <span className="sr-only">You: </span>
          {message.text}
        </p>
      </div>
    );
  }

  const streaming = message.status === "streaming";
  const hasText = message.blocks.some((b) => b.type === "text");
  const cardsPending = streaming && (Boolean(message.draft) || (hasText && message.blocks.length < 2));

  return (
    <article className="min-w-0" aria-busy={streaming} aria-label="VacayOut answer">
      {/* Screen readers hear "Answering…" then "Answer ready", not every word as it streams. */}
      <p className="sr-only" role="status">
        {streaming ? "Answering…" : message.status === "done" ? "Answer ready." : ""}
      </p>
      <div className="space-y-3.5">
        {message.blocks.length > 0 ? <BlockList blocks={message.blocks} onAsk={onAsk} busy={busy} /> : null}
        {message.draft && !hasText ? (
          <div>
            <TextBlock block={{ type: "text", text: message.draft }} />
            <span aria-hidden className="cx-caret text-ink/70" />
          </div>
        ) : null}
        {streaming && !message.draft && message.blocks.length === 0 ? <Waiting text={message.statusText} /> : null}
        {cardsPending ? <CardsLoading /> : null}
        {message.status === "done" && message.blocks.length ? (
          <div className="-ml-2.5">
            <CopyButton blocks={message.blocks} />
          </div>
        ) : null}
        {message.status === "error" ? (
          <div role="alert" className="cx-in rounded-2xl border border-line bg-[#FBFAF8] p-4">
            <p className="flex items-start gap-2 text-[0.9375rem] leading-snug text-ink">
              <Icon name="shield" size={17} className="mt-0.5 shrink-0 text-coral-text" />
              <span>{message.error ?? "The answer didn’t come through."}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2 pl-6">
              {message.needsAuth ? (
                <button
                  type="button"
                  onClick={() => openAuth({ mode: "signup", ...(message.error ? { message: message.error } : {}) })}
                  className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-[0.8125rem] font-semibold text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  Sign up free
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={busy}
                  className="inline-flex h-9 items-center rounded-full border border-line bg-white px-4 text-[0.8125rem] font-semibold text-ink hover:border-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  Try again
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
