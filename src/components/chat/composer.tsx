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
      className="cx-box rounded-[1.75rem] border border-[#E8E3DB] bg-white p-2 shadow-[0_18px_44px_-24px_rgba(40,30,20,0.35)] transition-[transform,box-shadow] duration-300 focus-within:-translate-y-0.5 focus-within:border-transparent focus-within:shadow-[0_24px_56px_-24px_rgba(236,98,66,0.4)] sm:p-2.5"
    >
      <div className="flex items-end gap-2">
        <Icon name="sparkles" size={20} className="mb-3 ml-2.5 shrink-0 text-coral" />
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
            className="mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border border-[#E5E2DC] text-ink transition-colors hover:border-ink"
          >
            <span aria-hidden className="size-3.5 rounded-sm bg-ink" />
          </button>
        ) : (
          <button
            type="submit"
            aria-label="Send"
            disabled={!value.trim()}
            className="group mb-0.5 flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-all duration-200 hover:bg-coral active:scale-95 disabled:bg-[#EFECE6] disabled:text-[#AAAAAA]"
          >
            <Icon name="arrowRight" size={19} strokeWidth={2.2} className="transition-transform group-enabled:group-hover:translate-x-0.5" />
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

