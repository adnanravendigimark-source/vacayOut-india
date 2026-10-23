"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/icon";
import { MAX_MESSAGE_CHARS } from "@/lib/chat/constants";

/** Message box pinned to the bottom of the conversation. Enter sends, Shift+Enter adds a line. */
export function Composer({
  onSend,
  onStop,
  busy,
  autoFocus = false,
  placeholder = "Ask anything about your trip…",
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  busy: boolean;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [value]);

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
      className="rounded-2xl border border-line bg-white/95 p-2 sm:p-2.5 shadow-[var(--shadow-float)] backdrop-blur-md transition-all focus-within:ring-2 focus-within:ring-coral/40 focus-within:border-coral"
    >
      <div className="flex items-end gap-2">
        <Icon name="sparkles" size={20} className="mb-3 ml-2 shrink-0 text-coral" />
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
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          className="max-h-42 min-h-11 flex-1 resize-none bg-transparent px-1 py-2.5 text-[0.9375rem] leading-relaxed text-ink outline-none placeholder:text-muted/80 font-normal"
        />
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop the reply"
            className="mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border border-line text-ink hover:border-ink transition-colors"
          >
            <span aria-hidden className="size-3.5 rounded-sm bg-ink" />
          </button>
        ) : (
          <button
            type="submit"
            aria-label="Send"
            disabled={!value.trim()}
            className="mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-coral text-white shadow-coral transition-all duration-200 hover:bg-coral-hover hover:scale-105 active:scale-95 disabled:bg-line disabled:text-muted disabled:shadow-none disabled:scale-100"
          >
            <Icon name="arrowRight" size={19} strokeWidth={2.2} />
          </button>
        )}
      </div>
      {value.length > MAX_MESSAGE_CHARS - 80 ? (
        <p className="px-3 pt-1 text-right text-[0.75rem] text-muted">
          {value.length}/{MAX_MESSAGE_CHARS}
        </p>
      ) : null}
    </form>
  );
}

