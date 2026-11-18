"use client";

import Image from "@/components/media/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/icon";
import type { GuideCard } from "@/lib/data/types";
import { routes } from "@/lib/routes";
import { SectionHeader } from "./section-header";

const CYCLE_MS = 5500;

/**
 * Travel guides as "stories": one large featured guide with a slow zoom, and a strip of the
 * others underneath whose bars fill like story progress. It moves on by itself until someone
 * picks a guide; hovering the featured card pauses it.
 */
export function GuideStories({ items }: { items: GuideCard[] }) {
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const running = !touched && !paused && inView && items.length > 1;
  useEffect(() => {
    if (!running || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % items.length), CYCLE_MS);
    return () => window.clearInterval(id);
  }, [running, items.length]);

  const g = items[active];

  return (
    <div ref={root}>
      <SectionHeader
        icon="book"
        title="Travel Guides & Inspiration"
        subtitle="Best times, getting around, festivals and mistakes to avoid, from checked sources."
        link={{ href: routes.travelGuides, label: "View all guides" }}
        className="mb-5 sm:mb-6"
      />

      {/* Featured guide */}
      <Link
        href={`/travel-guides/${g.slug}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="guide-feature group relative block aspect-[16/10] w-full overflow-hidden rounded-2xl bg-[#EFECE6] shadow-[0_18px_40px_-24px_rgba(25,25,25,0.5)] sm:aspect-[16/9]"
      >
        {items.map((it, i) =>
          it.photo ? (
            <Image
              key={it.slug}
              src={it.photo.src}
              alt={i === active ? it.photo.alt : ""}
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className={`guide-feature__img object-cover ${i === active ? "is-on" : ""}`}
            />
          ) : null,
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/0" />
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-ink">Guide</span>
          {g.aiImage ? <span className="rounded-full bg-black/60 px-2.5 py-1 text-[0.6875rem] font-semibold text-white">AI-generated illustration</span> : null}
        </div>
        <div key={g.slug} className="guide-feature__copy absolute inset-x-4 bottom-4 text-white sm:inset-x-5 sm:bottom-5">
          {g.place ? (
            <p className="flex items-center gap-1 text-xs font-medium text-white/80">
              <Icon name="pin" size={12} className="text-coral" />
              {g.place}
            </p>
          ) : null}
          <h3 className="mt-1 font-serif text-xl font-medium leading-tight sm:text-2xl">{g.title}</h3>
          {g.summary ? <p className="mt-1.5 line-clamp-2 max-w-xl text-xs leading-relaxed text-white/85 sm:text-sm">{g.summary}</p> : null}
          <span className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold">
            Read the guide
            <Icon name="arrowRight" size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </Link>

      {/* Story strip */}
      <ul className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }} aria-label="More guides">
        {items.map((it, i) => {
          const on = i === active;
          return (
            <li key={it.slug}>
              <button
                type="button"
                onClick={() => { setTouched(true); setActive(i); }}
                aria-pressed={on}
                aria-label={it.title}
                className="group block w-full text-left"
              >
                <span className="block h-1 w-full overflow-hidden rounded-full bg-[#ECE9E2]">
                  <span
                    key={`${active}-${running}`}
                    className={`guide-bar block h-full rounded-full bg-coral ${on ? (running ? "is-running" : "is-full") : i < active ? "is-full" : ""}`}
                    style={{ animationDuration: `${CYCLE_MS}ms` }}
                  />
                </span>
                <span className={`mt-1.5 line-clamp-2 text-[0.6875rem] font-semibold leading-snug transition-colors sm:text-xs ${on ? "text-coral" : "text-[#666666] group-hover:text-ink"}`}>
                  {it.title}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
