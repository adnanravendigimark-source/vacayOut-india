"use client";

import Image from "@/components/media/image";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/icon";
import type { Destination } from "@/lib/data/types";
import { SectionHeader } from "./section-header";
import { routes } from "@/lib/routes";
import { LiveLink } from "./live-link";

interface Featured {
  key: string;
  name: string;
  where: string;
  summary: string;
  image: string | null;
  imageAlt: string;
  aiImage: boolean;
  hrefs: string[];
  prompt: string;
}

/** Shown only when no place is marked as featured in the admin. */
const FALLBACK: Featured[] = [
  { key: "kashmir", name: "Kashmir", where: "Jammu & Kashmir", summary: "Lakes, meadows and snow peaks around Srinagar, Gulmarg and Pahalgam.", image: "/images/cinematic/hero-india-poster.jpg", imageAlt: "Kashmir", aiImage: false, hrefs: ["/india/jammu-and-kashmir/srinagar", "/india/jammu-and-kashmir"], prompt: "Plan a 6-day scenic holiday to Srinagar, Gulmarg, and Pahalgam in Kashmir" },
  { key: "rajasthan", name: "Rajasthan", where: "Rajasthan", summary: "Forts, palaces and desert towns from Jaipur to Jaisalmer.", image: "/images/cinematic/dest-jaipur.jpg", imageAlt: "Jaipur, Rajasthan", aiImage: false, hrefs: ["/india/rajasthan"], prompt: "Plan a 7-day trip across Jaipur, Jodhpur, and Udaipur" },
  { key: "ladakh", name: "Ladakh", where: "Ladakh", summary: "High passes, monasteries and Pangong's blue water.", image: "/images/destinations/ladakh.jpg", imageAlt: "Ladakh", aiImage: false, hrefs: ["/india/ladakh/leh", "/india/ladakh"], prompt: "Plan a 7-day road trip to Leh, Nubra Valley and Pangong Lake" },
  { key: "andaman", name: "Andaman & Nicobar", where: "Andaman & Nicobar Islands", summary: "Clear water, coral and quiet island beaches.", image: "/images/destinations/andaman.jpg", imageAlt: "Andaman Islands", aiImage: false, hrefs: ["/india/andaman-and-nicobar-islands"], prompt: "Plan a 5-day island holiday in Andaman, Havelock, and Neil Island" },
  { key: "darjeeling", name: "Darjeeling", where: "West Bengal", summary: "Tea gardens, the toy train and Kanchenjunga at sunrise.", image: "/images/destinations/darjeeling.jpg", imageAlt: "Darjeeling", aiImage: false, hrefs: ["/india/west-bengal/darjeeling", "/india/west-bengal"], prompt: "Plan a 4-day tea garden retreat in Darjeeling" },
];

const fromDestination = (d: Destination): Featured => ({
  key: `${d.stateSlug}/${d.slug}`,
  name: d.name,
  where: d.level === "state" ? "India" : d.stateName,
  summary: d.description,
  image: d.photo?.src ?? null,
  imageAlt: d.photo?.alt ?? d.name,
  aiImage: Boolean(d.aiImage),
  hrefs: [routes.destination(d)],
  prompt: d.level === "state" ? `Plan a trip to ${d.name}` : `Plan a trip to ${d.name}, ${d.stateName}`,
});

const CYCLE_MS = 5000;

/**
 * Featured destinations as an expanding gallery: one tall panel is open (photo, summary and
 * actions), the others are slim slices with their names. It moves along by itself until
 * someone hovers or taps a panel. On phones it becomes a swipe row of cards.
 */
export function FeaturedDestinations({ onPlan, items = [] }: { onPlan?: (prompt: string) => void; items?: Destination[] }) {
  const list = items.length ? items.map(fromDestination) : FALLBACK;
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
    if (touched || !inView || list.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setOpen((i) => (i + 1) % list.length), CYCLE_MS);
    return () => window.clearInterval(id);
  }, [touched, inView, list.length]);

  const pick = (i: number) => {
    setTouched(true);
    setOpen(i);
  };

  return (
    <section id="featured" aria-labelledby="featured-destinations-title" className="border-b border-[#ECE9E2] bg-white py-10 sm:py-14">
      <div ref={root} className="container-site">
        <SectionHeader
          id="featured-destinations-title"
          icon="star"
          title="Featured Destinations"
          subtitle="Places our editors picked, with full guides you can plan from."
          link={{ href: routes.destinations, label: "View all destinations" }}
        />

        {/* Desktop: expanding panels */}
        <ul className="feat-row hidden h-[30rem] gap-2.5 md:flex" aria-label="Featured destinations">
          {list.map((d, i) => {
            const on = i === open;
            return (
              <li
                key={d.key}
                onMouseEnter={() => pick(i)}
                onFocus={() => pick(i)}
                className={`feat-panel group relative min-w-0 overflow-hidden rounded-2xl bg-[#1a1714] transition-[flex-grow] duration-700 ease-[cubic-bezier(.16,1,.3,1)] ${on ? "grow-[6]" : "grow"}`}
                style={{ flexBasis: 0, ["--i" as string]: i }}
              >
                {d.image ? (
                  <Image src={d.image} alt={d.imageAlt} fill sizes="(min-width: 1024px) 50vw, 60vw" className={`object-cover transition-transform duration-[1200ms] ease-out ${on ? "scale-100" : "scale-110"}`} />
                ) : null}
                <div className={`absolute inset-0 transition-opacity duration-700 ${on ? "bg-gradient-to-t from-black/85 via-black/25 to-black/0" : "bg-black/45 group-hover:bg-black/35"}`} />
                {d.aiImage && on ? <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[0.6875rem] font-semibold text-white">AI-generated illustration</span> : null}

                {/* Closed: the name runs up the slice */}
                <span aria-hidden className={`absolute bottom-5 left-1/2 origin-center -translate-x-1/2 whitespace-nowrap font-serif text-lg text-white transition-opacity duration-300 [writing-mode:vertical-rl] rotate-180 ${on ? "opacity-0" : "opacity-100"}`}>
                  {d.name}
                </span>

                {/* Open: the details */}
                <div className={`absolute inset-x-5 bottom-5 text-white transition-all duration-500 ${on ? "translate-y-0 opacity-100 delay-200" : "pointer-events-none translate-y-4 opacity-0"}`}>
                  <p className="flex items-center gap-1 text-xs font-medium text-white/80">
                    <Icon name="pin" size={12} className="text-coral" />
                    {d.where}
                  </p>
                  <h3 className="mt-1 font-serif text-3xl font-medium leading-tight">{d.name}</h3>
                  {d.summary ? <p className="mt-2 line-clamp-2 max-w-md text-sm leading-relaxed text-white/85">{d.summary}</p> : null}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <LiveLink
                      hrefs={d.hrefs}
                      prompt={d.prompt}
                      onPlan={onPlan}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-coral hover:text-white"
                    >
                      Read the guide <Icon name="arrowRight" size={13} />
                    </LiveLink>
                    {onPlan ? (
                      <button
                        type="button"
                        tabIndex={on ? undefined : -1}
                        onClick={() => onPlan(d.prompt)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/25"
                      >
                        <Icon name="sparkles" size={13} /> Plan with AI
                      </button>
                    ) : null}
                  </div>
                </div>
                {on && !touched && inView ? <span key={open} aria-hidden className="feat-timer" style={{ animationDuration: `${CYCLE_MS}ms` }} /> : null}
              </li>
            );
          })}
        </ul>

        {/* Phones: swipe row */}
        <ul className="dest-row -mx-4 -mb-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-6 pt-1 md:hidden" aria-label="Featured destinations">
          {list.map((d, i) => (
            <li key={d.key} className="dcard relative w-[78%] shrink-0 snap-start" style={{ ["--i" as string]: i }}>
              <LiveLink hrefs={d.hrefs} prompt={d.prompt} onPlan={onPlan} className="block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#1a1714]">
                  {d.image ? <Image src={d.image} alt={d.imageAlt} fill sizes="78vw" className="object-cover" /> : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/0" />
                  {d.aiImage ? <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[0.625rem] font-semibold text-white">AI-generated illustration</span> : null}
                  <div className="absolute inset-x-4 bottom-4 text-white">
                    <p className="flex items-center gap-1 text-xs text-white/80"><Icon name="pin" size={12} className="text-coral" />{d.where}</p>
                    <h3 className="mt-1 font-serif text-2xl leading-tight">{d.name}</h3>
                    {d.summary ? <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-white/85">{d.summary}</p> : null}
                    <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold">Read the guide <Icon name="arrowRight" size={12} /></span>
                  </div>
                </div>
              </LiveLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
