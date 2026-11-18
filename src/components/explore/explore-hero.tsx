"use client";

import Image from "@/components/media/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons/icon";
import type { ExploreData } from "@/lib/places/public-lists";

const RM = "(prefers-reduced-motion: reduce)";
function subscribeRM(cb: () => void) {
  const m = window.matchMedia(RM);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

/** Types state names into the empty search box as a live hint. */
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
 * Explore India header: white, with soft colour slowly drifting behind the title. The search
 * filters the states below as you type and shows the best matches in a small list; Enter
 * jumps to the results.
 */
export function ExploreHero({
  data,
  query,
  onQuery,
  onSubmit,
}: {
  data: ExploreData;
  query: string;
  onQuery: (q: string) => void;
  onSubmit: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const words = useMemo(() => ["Kerala", "Ladakh", "Rajasthan", "Meghalaya", "Goa", "Himachal Pradesh"].filter((w) => data.states.some((s) => s.name === w)), [data]);
  const hint = useTypedHint(words, !focused && !query);
  const q = query.trim().toLowerCase();
  const matches = q ? data.states.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 5) : [];

  return (
    <section className="ex-hero relative isolate z-30 bg-white">
      <div aria-hidden className="ex-hero__bg">
        <span className="ex-hero__blob ex-hero__blob--a" />
        <span className="ex-hero__blob ex-hero__blob--b" />
        <span className="ex-hero__blob ex-hero__blob--c" />
        <span className="ex-hero__grid" />
      </div>

      <div className="container-site relative flex flex-col items-center justify-center pb-8 pt-10 text-center sm:pb-10 sm:pt-12">
        <p className="explore-in inline-flex items-center gap-2 rounded-full border border-[#EEE7E0] bg-white/80 px-3.5 py-1 text-xs font-semibold text-[#666666] backdrop-blur-sm" style={{ ["--d" as string]: "0ms" }}>
          <span className="size-1.5 rounded-full bg-coral" /> {data.states.length} states &amp; union territories
        </p>
        <h1 className="explore-in mt-3 font-serif text-[clamp(2.2rem,4.6vw,3.4rem)] font-normal leading-[1.02] tracking-[-0.03em] text-ink" style={{ ["--d" as string]: "80ms" }}>
          Explore <em className="italic text-coral">India</em>
        </h1>
        <p className="explore-in mt-2 max-w-md text-sm text-[#555555] sm:text-base" style={{ ["--d" as string]: "160ms" }}>
          Find a state, then open its guide.
        </p>

        <div className="explore-in relative z-30 mt-5 w-full max-w-xl" style={{ ["--d" as string]: "240ms" }} data-focus={focused} data-typing={query.length > 0}>
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
            <label htmlFor="explore-search-input" className="sr-only">Search states and union territories</label>
            <div className="relative min-w-0 flex-1 text-left">
              <input
                ref={input}
                id="explore-search-input"
                type="text"
                enterKeyHint="search"
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => window.setTimeout(() => setFocused(false), 150)}
                placeholder={focused ? "Type a state or union territory" : ""}
                autoComplete="off"
                className="w-full bg-transparent py-3 text-base font-medium text-ink outline-none placeholder:text-[#999999]"
              />
              {!focused && !query ? (
                <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-base font-medium text-[#8a8a8a]">
                  Try&nbsp;<span className="text-ink/80">{hint}</span>
                  <i className="ex-search__caret" />
                </span>
              ) : null}
            </div>
            {query ? (
              <button type="button" onClick={() => onQuery("")} aria-label="Clear search" className="grid size-10 shrink-0 place-items-center rounded-full text-[#888888] hover:bg-black/5">
                <Icon name="x" size={16} />
              </button>
            ) : null}
            <button type="submit" className="ex-search__go">
              Search
            </button>
          </form>

          {/* Best matches while typing */}
          {focused && matches.length ? (
            <ul className="ex-search__list" aria-label="Matching states">
              {matches.map((s, i) => (
                <li key={s.slug} style={{ ["--i" as string]: i }}>
                  <Link href={`/india/${s.slug}`} className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-[#FFF4EF]">
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-[#EFECE6]">
                      {s.image ? <Image src={s.image.url} alt="" fill sizes="40px" className="object-cover" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{s.name}</span>
                      <span className="block text-xs text-[#888888]">{s.destinationsCount ? `${s.destinationsCount} guides` : "State guide"}</span>
                    </span>
                    <Icon name="arrowRight" size={14} className="text-[#BBBBBB]" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

      </div>
    </section>
  );
}
