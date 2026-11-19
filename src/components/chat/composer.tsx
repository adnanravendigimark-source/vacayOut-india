"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/icon";
import { MAX_MESSAGE_CHARS } from "@/lib/chat/constants";

/**
 * Message box pinned to the bottom of the conversation. Enter sends,
 * Shift+Enter adds a line. When `locked` (free questions used up), the box is
 * replaced by a sign-up row and the typed text is kept.
 */
export function Composer({
  onSend,
  onStop,
  busy,
  autoFocus = false,
  placeholder = "Ask about travel in India…",
  locked = null,
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  busy: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  locked?: { message: string; action: string; onAction: () => void } | null;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [value]);

  if (locked) {
    return (
      <div role="status" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-line bg-[#FBFAF8] px-4 py-3">
        <p className="min-w-0 flex-1 text-[0.9375rem] leading-snug text-ink">{locked.message}</p>
        <button
          type="button"
          onClick={locked.onAction}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {locked.action}
          <Icon name="arrowRight" size={14} />
        </button>
      </div>
    );
  }

  const submit = () => {
    const text = value.trim();
    if (!text || busy) return;
    onSend(text);
    setValue("");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rounded-[1.375rem] border border-line bg-white p-1.5 shadow-[0_1px_2px_rgba(25,25,25,0.04),0_8px_24px_-16px_rgba(25,25,25,0.18)] transition-[border-color,box-shadow] duration-200 focus-within:border-[#BDB7AD] focus-within:shadow-[0_1px_2px_rgba(25,25,25,0.04),0_10px_28px_-16px_rgba(25,25,25,0.28)]"
    >
      <div className="flex items-end gap-2">
        <label htmlFor="chat-input" className="sr-only">
          Message VacayOut
        </label>
        <textarea
          id="chat-input"
          ref={ref}
          rows={1}
          autoFocus={autoFocus}
          value={value}
          maxLength={MAX_MESSAGE_CHARS}
          enterKeyHint="send"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          className="max-h-42 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[0.9375rem] leading-relaxed text-ink outline-none placeholder:text-[#767676]"
        />
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop the reply"
            className="mb-0.5 mr-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <span aria-hidden className="size-3 rounded-[3px] bg-ink" />
          </button>
        ) : (
          <button
            type="submit"
            aria-label="Send"
            disabled={!value.trim()}
            className="mb-0.5 mr-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-colors duration-150 hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:bg-sand disabled:text-[#8A857C]"
          >
            <Icon name="arrowRight" size={18} strokeWidth={2.2} className="-rotate-90" />
          </button>
        )}
      </div>
      {value.length > MAX_MESSAGE_CHARS - 80 ? (
        <p className="px-3 pb-1 text-right text-[0.75rem] tabular-nums text-[#666666]">
          {value.length}/{MAX_MESSAGE_CHARS}
        </p>
      ) : null}
    </form>
  );
}
