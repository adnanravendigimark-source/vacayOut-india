"use client";

import Image from "@/components/media/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/icon";
import type { ReadyRoute } from "@/lib/data/types";
import { routes } from "@/lib/routes";
import { SectionHeader } from "./section-header";

const CYCLE_MS = 6500;
const SHOW_DAYS = 5;

/**
 * Ready-made itineraries as an animated route reel: one itinerary is open at a time and its
 * days draw in along a dotted path, with a marker travelling down it. While nobody has touched
 * it, the reel moves to the next itinerary every few seconds.
 */
export function ReadyRoutes({ items, onPlan }: { items: ReadyRoute[]; onPlan: (prompt: string) => void }) {
  const [open, setOpen] = useState(0);
  const [touched, setTouched] = useState(false);
  const [inView, setInView] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (touched || !inView || items.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setOpen((i) => (i + 1) % items.length), CYCLE_MS);
    return () => window.clearInterval(id);
  }, [touched, inView, items.length]);

  return (
    <div ref={root} onPointerDown={() => setTouched(true)}>
      <SectionHeader
        icon="fileText"
        title="Ready-made Itineraries"
        subtitle="Day-by-day routes our editors checked. Open one as it is, or let AI make it yours."
        link={{ href: routes.itineraries, label: "View all itineraries" }}
        className="mb-5 sm:mb-6"
      />

      <ul className="space-y-3">
        {items.map((r, i) => {
          const on = i === open;
          const more = r.dayTitles.length - SHOW_DAYS;
          return (
            <li key={r.slug} className={`route-card rounded-2xl border bg-white transition-[border-color,box-shadow] duration-500 ${on ? "border-coral/60 shadow-[0_18px_40px_-24px_rgba(236,98,66,0.55)]" : "border-[#EAE7E0] hover:border-coral/40"}`}>
              <button
                type="button"
                aria-expanded={on}
                aria-controls={`route-${r.slug}`}
                onClick={() => { setTouched(true); setOpen(i); }}
                className="relative flex w-full items-center gap-3.5 p-2.5 text-left sm:gap-4 sm:p-3"
              >
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-[#EFECE6] sm:size-20">
                  {r.photo ? (
                    <Image src={r.photo.src} alt={r.photo.alt} fill sizes="80px" className={`object-cover transition-transform duration-700 ${on ? "scale-110" : ""}`} />
                  ) : (
                    <div className="grid h-full place-items-center text-[#B5AFA5]"><Icon name="route" size={22} /></div>
                  )}
                  <span className="absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[0.625rem] font-bold text-white">{r.days}D</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={`line-clamp-2 text-sm font-bold leading-snug transition-colors sm:text-base ${on ? "text-coral" : "text-ink"}`}>{r.title}</h3>
                  <p className="mt-1 truncate text-xs text-[#777777]">
                    {r.place}
                    {r.tags.length ? <span className="text-[#AAAAAA]"> · {r.tags.join(" · ")}</span> : null}
                  </p>
                </div>
                <Icon name="chevronDown" size={16} className={`mr-1 shrink-0 text-[#AAAAAA] transition-transform duration-500 ${on ? "rotate-180 text-coral" : ""}`} />
                {on && !touched && inView && items.length > 1 ? (
                  <span key={open} aria-hidden className="route-card__timer" style={{ animationDuration: `${CYCLE_MS}ms` }} />
                ) : null}
              </button>

              {/* Opens with a smooth height animation (grid-rows 0fr → 1fr). */}
              <div id={`route-${r.slug}`} className={`grid transition-[grid-template-rows] duration-500 ease-out ${on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <div key={on ? "on" : "off"} className="route-reel px-4 pb-4 pt-1 sm:px-5" data-on={on}>
                      <ol className="route-path relative ml-1.5 border-l-2 border-dashed border-[#F0C9BA] pl-5">
                        <span aria-hidden className="route-path__walker" style={{ animationDuration: `${Math.min(r.dayTitles.length, SHOW_DAYS) * 450 + 600}ms` }} />
                        {r.dayTitles.slice(0, SHOW_DAYS).map((t, d) => (
                          <li key={d} className="route-day relative py-1.5" style={{ ["--d" as string]: `${120 + d * 110}ms` }}>
                            <span aria-hidden className="absolute -left-[1.6rem] top-2.5 grid size-3 place-items-center rounded-full border-2 border-coral bg-white" />
                            <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-coral">Day {d + 1}</p>
                            <p className="text-sm leading-snug text-ink">{t}</p>
                          </li>
                        ))}
                        {more > 0 ? (
                          <li className="route-day py-1 text-xs font-semibold text-[#888888]" style={{ ["--d" as string]: `${120 + SHOW_DAYS * 110}ms` }}>
                            + {more} more {more === 1 ? "day" : "days"}
                          </li>
                        ) : null}
                      </ol>
                      <div className="route-day mt-3 flex flex-wrap items-center gap-2" style={{ ["--d" as string]: "650ms" }}>
                        <Link tabIndex={on ? undefined : -1} href={`/itineraries/${r.slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-coral">
                          Open itinerary
                          <Icon name="arrowRight" size={12} />
                        </Link>
                        <button
                          type="button"
                          tabIndex={on ? undefined : -1}
                          onClick={() => onPlan(`Customise the "${r.title}" itinerary for me`)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-coral/10 px-3.5 py-1.5 text-xs font-semibold text-coral transition-colors hover:bg-coral hover:text-white"
                        >
                          <Icon name="sparkles" size={12} />
                          Make it mine with AI
                        </button>
                      </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
