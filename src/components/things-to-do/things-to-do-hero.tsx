"use client";

import Image from "@/components/media/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons/icon";
import type { ThingsToDoData } from "@/lib/places/public-lists";

const RM = "(prefers-reduced-motion: reduce)";
function subscribeRM(cb: () => void) {
  const m = window.matchMedia(RM);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

/** Types example experiences into the empty search box as a live hint. */
function useTypedHint(words: string[], active: boolean) {
  const [text, setText] = useState("");
  const still = useSyncExternalStore(subscribeRM, () => window.matchMedia(RM).matches, () => false);
  useEffect(() => {
    if (!active || still || words.length === 0) return;
    let i = 0, c = 0, dir = 1, wait = 8;
    const id = window.setInterval(() => {
      if (wait > 0) return void wait--;
      const w = words[i];
      c += dir;
      setText(w.slice(0, Math.max(0, c)));
      if (dir === 1 && c >= w.length) { dir = -1; wait = 30; }
      else if (dir === -1 && c <= 0) { dir = 1; i = (i + 1) % words.length; wait = 5; }
    }, 70);
    return () => window.clearInterval(id);
  }, [active, still, words]);
  return still ? (words[0] ?? "") : text;
}

/**
 * Things to Do header: same white, softly moving look as Explore India. Typing filters the
 * experiences below and shows the best matches; Enter jumps to the list.
 */
export function ThingsToDoHero({
  data,
  query,
  onQuery,
  onSubmit,
}: {
  data: ThingsToDoData;
  query: string;
  onQuery: (q: string) => void;
  onSubmit: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // Hints come from real published experiences, never invented ones.
  const words = useMemo(() => {
    const names = data.items.filter((i) => i.isActivity && i.name.length <= 28).map((i) => i.name);
    const picked = (names.length ? names : data.items.filter((i) => i.name.length <= 28).map((i) => i.name)).slice(0, 6);
    return picked.length ? picked : data.categories.map((c) => c.label);
  }, [data]);
  const hint = useTypedHint(words, !focused && !query);
  const q = query.trim().toLowerCase();
  const matches = q
    ? data.items.filter((i) => i.name.toLowerCase().includes(q) || i.location.toLowerCase().includes(q)).slice(0, 5)
    : [];

  return (
    <section className="ex-hero relative isolate overflow-hidden bg-white">
      <div aria-hidden className="ex-hero__bg">
        <span className="ex-hero__blob ex-hero__blob--a" />
        <span className="ex-hero__blob ex-hero__blob--b" />
        <span className="ex-hero__blob ex-hero__blob--c" />
        <span className="ex-hero__grid" />
      </div>

      <div className="container-site relative flex min-h-[440px] flex-col items-center justify-center py-16 text-center sm:min-h-[500px]">
        <p className="explore-in inline-flex items-center gap-2 rounded-full border border-[#EEE7E0] bg-white/80 px-3.5 py-1 text-xs font-semibold text-[#666666] backdrop-blur-sm" style={{ ["--d" as string]: "0ms" }}>
          <span className="size-1.5 rounded-full bg-coral" />
          {data.items.length} experiences · {data.states.length} {data.states.length === 1 ? "state" : "states"}
        </p>
        <h1 className="explore-in mt-4 font-serif text-[clamp(2.4rem,5.6vw,4.2rem)] font-normal leading-[1.04] tracking-[-0.03em] text-ink" style={{ ["--d" as string]: "80ms" }}>
          Things to do in <em className="italic text-coral">India</em>
        </h1>
        <p className="explore-in mt-3 max-w-lg text-base text-[#555555]" style={{ ["--d" as string]: "160ms" }}>
          Treks, boat rides, temples, food streets and festivals. Each one has a guide checked against official sources.
        </p>

        <div className="explore-in relative mt-8 w-full max-w-xl" style={{ ["--d" as string]: "240ms" }} data-focus={focused} data-typing={query.length > 0}>
          <form
            className="ex-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
              input.current?.blur();
            }}
          >
            <span aria-hidden className="ex-search__ring" />
            <Icon name="search" size={20} className="ex-search__icon shrink-0 text-coral" />
            <label htmlFor="ttd-search" className="sr-only">Search activities, places or destinations</label>
            <div className="relative min-w-0 flex-1 text-left">
              <input
                ref={input}
                id="ttd-search"
                type="search"
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => window.setTimeout(() => setFocused(false), 150)}
                placeholder={focused ? "Activity, place or destination" : ""}
                autoComplete="off"
                maxLength={120}
                className="w-full bg-transparent py-3 text-base font-medium text-ink outline-none placeholder:text-[#999999]"
              />
              {!focused && !query && hint ? (
                <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center overflow-hidden whitespace-nowrap text-base font-medium text-[#8a8a8a]">
                  Try&nbsp;<span className="truncate text-ink/80">{hint}</span>
                  <i className="ex-search__caret" />
                </span>
              ) : null}
            </div>
            {query ? (
              <button type="button" onClick={() => onQuery("")} aria-label="Clear search" className="grid size-10 shrink-0 place-items-center rounded-full text-[#888888] hover:bg-black/5">
                <Icon name="x" size={16} />
              </button>
            ) : null}
            <button type="submit" className="ex-search__go">Search</button>
          </form>

          {focused && matches.length ? (
            <ul className="ex-search__list" aria-label="Matching experiences">
              {matches.map((m, i) => (
                <li key={m.href} style={{ ["--i" as string]: i }}>
                  <Link href={m.href} className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-[#FFF4EF]">
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-[#EFECE6]">
                      {m.image ? <Image src={m.image.url} alt="" fill sizes="40px" className="object-cover" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{m.name}</span>
                      <span className="block truncate text-xs text-[#888888]">{m.location}</span>
                    </span>
                    <Icon name="arrowRight" size={14} className="text-[#BBBBBB]" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <a href="#experiences" className="explore-in mt-10 inline-flex flex-col items-center gap-1 text-xs font-semibold text-[#999999] transition-colors hover:text-ink" style={{ ["--d" as string]: "360ms" }}>
          Or browse by interest
          <Icon name="chevronDown" size={16} className="ex-hero__nudge" />
        </a>
      </div>
    </section>
  );
}
