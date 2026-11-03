"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/icon";
import type { Pack } from "@/lib/assistant/types";

// The panel (search code included) loads only when someone opens it.
const AssistantPanel = dynamic(() => import("./assistant-panel").then((m) => m.AssistantPanel), { ssr: false });

const TEASER_DELAY_MS = 4000;

function seen(key: string) {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
function remember(key: string) {
  try {
    sessionStorage.setItem(key, "1");
  } catch {}
}

/** "Ask about {place}" button, a small pop-up with questions, and the chat panel. */
export function PageAssistant({ pack }: { pack: Pack }) {
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [first, setFirst] = useState<string | null>(null);
  const key = `vo_asst_teaser_${pack.place.stateSlug}_${pack.place.slug}`;

  useEffect(() => {
    if (seen(key)) return;
    const t = window.setTimeout(() => setTeaser(true), TEASER_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [key]);

  const dismiss = () => {
    setTeaser(false);
    remember(key);
  };
  const start = (q: string | null) => {
    dismiss();
    setFirst(q);
    setOpen(true);
  };

  return (
    <>
      {teaser && !open ? (
        <div role="dialog" aria-label={`Questions about ${pack.place.name}`} className="fixed bottom-[5.5rem] right-4 z-40 w-[min(22rem,calc(100vw-2rem))] animate-[fadeIn_.3s_ease-out] rounded-2xl border border-line bg-white p-4 shadow-[0_18px_50px_-12px_rgba(0,0,0,.35)] sm:right-6">
          <button type="button" onClick={dismiss} aria-label="Close" className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full text-lg text-[#888] hover:bg-[#F3F0EA] hover:text-ink">×</button>
          <p className="flex items-center gap-1.5 pr-6 text-[0.6875rem] font-semibold uppercase tracking-wider text-[#2D5A3F]"><Icon name="sparkles" size={13} /> {pack.place.name} assistant</p>
          <p className="mt-1 font-serif text-[1.0625rem] font-medium leading-snug text-ink">Planning a trip to {pack.place.name}? Ask me anything about it.</p>
          <div className="mt-3 flex flex-col gap-1.5">
            {pack.suggestions.slice(0, 3).map((q) => (
              <button key={q} type="button" onClick={() => start(q)} className="rounded-xl border border-line bg-[#FBFAF7] px-3 py-2 text-left text-[0.8125rem] text-ink transition hover:border-[#2D5A3F] hover:bg-[#EEF4F0]">{q}</button>
            ))}
          </div>
        </div>
      ) : null}

      {open ? (
        <AssistantPanel pack={pack} firstQuestion={first} onClose={() => setOpen(false)} />
      ) : (
        <button
          type="button"
          onClick={() => start(null)}
          aria-label={`Ask about ${pack.place.name}`}
          className="fixed bottom-4 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-[#2D5A3F] pl-4 pr-5 text-sm font-semibold text-white shadow-[0_12px_32px_-8px_rgba(31,63,44,.6)] transition hover:-translate-y-0.5 hover:bg-[#244A33] sm:right-6"
        >
          <Icon name="chat" size={20} />
          <span className="hidden sm:inline">Ask about {pack.place.name}</span>
          <span className="sm:hidden">Ask</span>
        </button>
      )}
    </>
  );
}
