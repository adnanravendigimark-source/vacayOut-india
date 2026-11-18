"use client";

import Image from "@/components/media/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons/icon";
import type { TravelGuidesData } from "@/lib/places/public-lists";

const RM = "(prefers-reduced-motion: reduce)";
function subscribeRM(cb: () => void) {
  const m = window.matchMedia(RM);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

/** Types example places into the empty search box as a live hint. */
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

/** Travel guides header: same white, softly moving look as Explore India; typing filters the guides below. */
export function TravelGuidesHero({ data, query, onQuery, onSubmit }: { data: TravelGuidesData; query: string; onQuery: (q: string) => void; onSubmit: () => void }) {
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const all = useMemo(() => [...data.articles, ...data.guides], [data]);
  // Hints are names of places that really have a guide.
  const words = useMemo(() => [...new Set(data.guides.map((g) => g.name).filter((n) => n.length <= 22))].slice(0, 6), [data]);
  const hint = useTypedHint(words, !focused && !query);
  const q = query.trim().toLowerCase();
  const matches = q ? all.filter((g) => g.title.toLowerCase().includes(q) || g.name.toLowerCase().includes(q)).slice(0, 5) : [];

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
          <span className="size-1.5 rounded-full bg-coral" /> {data.articles.length} articles · {data.guides.length} destination guides
        </p>
        <h1 className="explore-in mt-3 font-serif text-[clamp(2.2rem,4.6vw,3.4rem)] font-normal leading-[1.02] tracking-[-0.03em] text-ink" style={{ ["--d" as string]: "80ms" }}>
          Travel <em className="italic text-coral">guides</em>
        </h1>
        <p className="explore-in mt-2 max-w-md text-sm text-[#555555] sm:text-base" style={{ ["--d" as string]: "160ms" }}>
          Checked against official sources, approved by an editor.
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
            <label htmlFor="guides-search" className="sr-only">Search guides, places or states</label>
            <div className="relative min-w-0 flex-1 text-left">
              <input
                ref={input}
                id="guides-search"
                type="text"
                enterKeyHint="search"
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => window.setTimeout(() => setFocused(false), 150)}
                placeholder={focused ? "Guide, place or state" : ""}
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
            <ul className="ex-search__list" aria-label="Matching guides">
              {matches.map((m, i) => (
                <li key={m.href} style={{ ["--i" as string]: i }}>
                  <Link href={m.href} className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-[#FFF4EF]">
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-[#EFECE6]">
                      {m.image ? <Image src={m.image.url} alt="" fill sizes="40px" className="object-cover" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{m.title}</span>
                      <span className="block truncate text-xs text-[#888888]">{m.kindLabel}{m.stateName ? ` · ${m.stateName}` : ""}</span>
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
