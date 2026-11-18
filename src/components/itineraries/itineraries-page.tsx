"use client";

import Image from "@/components/media/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/icon";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";
import type { PageHero } from "@/components/explore/explore-page";
import type { CardImage } from "@/lib/places/public-lists";
import { TRIP_TYPES } from "@/lib/places/trip-types";
import { ItinerariesHero } from "./itineraries-hero";
import "@/components/explore/explore.css";
import { AiBanner } from "@/components/ai-planner/ai-banner";

export type ItineraryCard = {
  slug: string;
  title: string;
  summary: string;
  durationDays: number;
  tripTypes: string[];
  image: CardImage | null;
  placeName: string;
  stateName: string | null;
  placePath: string | null;
};

const DURATIONS = [
  { id: "all", label: "Any length", test: () => true },
  { id: "2-3", label: "2–3 Days", test: (d: number) => d >= 2 && d <= 3 },
  { id: "4-5", label: "4–5 Days", test: (d: number) => d >= 4 && d <= 5 },
  { id: "6-7", label: "6–7 Days", test: (d: number) => d >= 6 && d <= 7 },
  { id: "1week", label: "8+ Days", test: (d: number) => d >= 8 },
];

const labelOf = (key: string) => TRIP_TYPES.find((t) => t.key === key)?.label ?? key;

// `hero` stays in the props for the page file; this page no longer shows a photo hero.
export function ItinerariesPage({ itineraries }: { itineraries: ItineraryCard[]; hero: PageHero }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [duration, setDuration] = useState("all");
  const [tripType, setTripType] = useState("");
  const [destination, setDestination] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string | undefined>(undefined);

  const handleStartPlan = (prompt: string) => {
    setActivePrompt(prompt);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const handleOpenAi = (e: Event) => {
      const custom = e as CustomEvent<{ prompt?: string }>;
      if (custom.detail?.prompt) setActivePrompt(custom.detail.prompt);
      setIsModalOpen(true);
    };
    window.addEventListener("vacayout:open-ai", handleOpenAi);
    return () => window.removeEventListener("vacayout:open-ai", handleOpenAi);
  }, []);

  const typesInUse = TRIP_TYPES.filter((t) => itineraries.some((i) => i.tripTypes.includes(t.key)));
  const durations = DURATIONS.map((d) => ({ ...d, count: itineraries.filter((i) => d.test(i.durationDays)).length })).filter((d) => d.id === "all" || d.count > 0);
  const destinations = [...new Map(itineraries.map((i) => [i.placeName, i])).values()].sort((a, b) => a.placeName.localeCompare(b.placeName));
  const states = new Set(itineraries.map((i) => i.stateName).filter(Boolean));

  // A plain filter: the list is small and the React Compiler memoises it.
  const q = searchQuery.toLowerCase().trim();
  const dur = DURATIONS.find((d) => d.id === duration) ?? DURATIONS[0];
  const filtered = itineraries.filter(
    (i) =>
      dur.test(i.durationDays) &&
      (!tripType || i.tripTypes.includes(tripType)) &&
      (!destination || i.placeName === destination) &&
      (!q || i.title.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q) || i.placeName.toLowerCase().includes(q) || (i.stateName ?? "").toLowerCase().includes(q)),
  );

  // Typing filters the list; submitting jumps to it, or asks the AI planner when nothing matches.
  const handleSearchSubmit = () => {
    if (searchQuery.trim() && filtered.length === 0) handleStartPlan(`Create an itinerary: ${searchQuery.trim()}`);
    else document.getElementById("plans")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const filtersOn = duration !== "all" || !!tripType || !!destination || !!searchQuery.trim();
  const clearAll = () => {
    setDuration("all");
    setTripType("");
    setDestination("");
    setSearchQuery("");
  };
  const select = "h-9 min-w-0 flex-1 rounded-full border border-[#E5E2DC] bg-white px-3.5 lg:flex-none text-[0.8125rem] font-medium text-ink focus:border-ink focus:outline-none";

  return (
    <div className="min-h-screen bg-white">
      {/* 1. Header: white, gently moving, live search */}
      <ItinerariesHero itineraries={itineraries} states={states.size} query={searchQuery} onQuery={setSearchQuery} onSubmit={handleSearchSubmit} />

      {/* 2. Trip length first (it's what people choose first), then type and place; sticky under the site header */}
      {itineraries.length ? (
        <div className="sticky top-[4.5rem] z-20 border-b border-[#EFECE6] bg-white/95 backdrop-blur-md lg:top-20">
          <div className="container-site flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div role="radiogroup" aria-label="Trip length" className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 scrollbar-none lg:mx-0 lg:px-0">
              {durations.map((d) => {
                const on = duration === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setDuration(d.id)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${on ? "bg-ink text-white shadow-sm" : "bg-[#F5F3EE] text-ink/75 hover:bg-[#ECE8E0] hover:text-ink"}`}
                  >
                    {d.id === "all" ? <Icon name="grid" size={14} /> : <Icon name="calendar" size={14} className={on ? "text-white" : "text-coral"} />}
                    {d.id === "all" ? "Any length" : d.label} <span className={on ? "text-white/60" : "text-[#999999]"}>{d.count}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex shrink-0 gap-2">
              {typesInUse.length ? (
                <>
                  <label htmlFor="it-type" className="sr-only">Trip type</label>
                  <select id="it-type" value={tripType} onChange={(e) => setTripType(e.target.value)} className={select}>
                    <option value="">Any trip type</option>
                    {typesInUse.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </>
              ) : null}
              <label htmlFor="it-dest" className="sr-only">Destination</label>
              <select id="it-dest" value={destination} onChange={(e) => setDestination(e.target.value)} className={select}>
                <option value="">Any destination</option>
                {destinations.map((d) => <option key={d.placeName} value={d.placeName}>{d.placeName}</option>)}
              </select>
            </div>
          </div>
        </div>
      ) : null}

      <main id="plans" className="container-site scroll-mt-32 py-8 sm:py-10">
        {itineraries.length ? (
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-bold text-ink sm:text-xl">{searchQuery.trim() ? `Results for “${searchQuery.trim()}”` : duration === "all" ? "All itineraries" : `${dur.label} itineraries`}</h2>
            <p className="shrink-0 text-xs text-[#888888]" aria-live="polite">
              {filtered.length} {filtered.length === 1 ? "plan" : "plans"}
              {filtersOn ? <button type="button" onClick={clearAll} className="ml-3 font-semibold text-coral hover:underline">Clear filters</button> : null}
            </p>
          </div>
        ) : null}

        {itineraries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5E2DC] bg-[#FAF9F5] px-6 py-16 text-center">
            <p className="text-base font-semibold text-ink">Our itineraries are being researched and reviewed.</p>
            <p className="mt-1 text-xs text-[#777777]">Each plan is checked against official sources and approved by an editor before it appears here.</p>
            <button type="button" onClick={() => handleStartPlan("Create a custom day-by-day travel itinerary for my trip to India")} className="mt-4 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white">Plan my trip with AI</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-[#FAF9F5] px-6 py-14 text-center">
            <p className="text-base font-semibold text-ink">No itineraries matched.</p>
            <p className="mt-1 text-sm text-[#777777]">Try another length or place, or let the AI planner build one.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {searchQuery.trim() ? (
                <button type="button" onClick={() => handleStartPlan(`Create an itinerary: ${searchQuery.trim()}`)} className="inline-flex items-center gap-1.5 rounded-full bg-coral px-4 py-2 text-xs font-semibold text-white">
                  <Icon name="sparkles" size={13} /> Build “{searchQuery.trim()}” with AI
                </button>
              ) : null}
              <button type="button" onClick={clearAll} className="rounded-full border border-[#E5E2DC] px-4 py-2 text-xs font-semibold text-ink">Show all plans</button>
            </div>
          </div>
        ) : (
          <ul key={`${duration}|${tripType}|${destination}|${q}`} className="grid gap-4 lg:grid-cols-2 lg:gap-5">
            {filtered.map((it, i) => (
              <li key={it.slug} className="explore-card" style={{ ["--i" as string]: Math.min(i, 12) }}>
                <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#ECE9E2] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_18px_40px_-20px_rgba(25,25,25,0.35)] sm:flex-row">
                  <Link href={`/itineraries/${it.slug}`} tabIndex={-1} aria-hidden className="relative block aspect-[16/10] shrink-0 overflow-hidden bg-[#EFECE6] sm:aspect-auto sm:w-[42%]">
                    {it.image ? (
                      <Image src={it.image.url} alt="" fill sizes="(min-width: 1024px) 22vw, (min-width: 640px) 40vw, 95vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                    ) : (
                      <span className="flex size-full items-center justify-center text-[#B9B4AA]"><Icon name="route" size={26} /></span>
                    )}
                    {it.image?.kind === "ai_generated" ? <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white">AI illustration</span> : null}
                    <span className="absolute left-3 top-3 flex flex-col items-center rounded-xl bg-white/95 px-2.5 py-1.5 leading-none text-ink shadow-sm backdrop-blur-sm">
                      <span className="font-serif text-xl">{it.durationDays}</span>
                      <span className="mt-0.5 text-[0.5625rem] font-bold uppercase tracking-wider text-[#888888]">{it.durationDays === 1 ? "day" : "days"}</span>
                    </span>
                  </Link>
                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <p className="flex items-center gap-1 truncate text-xs text-[#888888]">
                      <Icon name="pin" size={12} className="shrink-0 text-coral" />
                      <span className="truncate">{it.placeName}{it.stateName && it.stateName !== it.placeName ? `, ${it.stateName}` : ""}</span>
                    </p>
                    <h3 className="mt-1.5 font-serif text-lg leading-snug text-ink transition-colors group-hover:text-coral">
                      <Link href={`/itineraries/${it.slug}`}>{it.title}</Link>
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-[0.8125rem] leading-relaxed text-[#666666]">{it.summary}</p>
                    {it.tripTypes.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {it.tripTypes.slice(0, 2).map((t) => <span key={t} className="rounded-full bg-[#F5F3EE] px-2.5 py-0.5 text-[0.6875rem] font-medium text-[#555555]">{labelOf(t)}</span>)}
                      </div>
                    ) : null}
                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                      <Link href={`/itineraries/${it.slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-black">
                        View plan <Icon name="arrowRight" size={12} className="transition-transform group-hover:translate-x-0.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleStartPlan(`Customise the VacayOut "${it.title}" itinerary for me`)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E2DC] px-4 py-2 text-xs font-semibold text-ink transition-colors hover:border-coral hover:text-coral"
                      >
                        <Icon name="sparkles" size={12} className="text-coral" />
                        Customise with AI
                      </button>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}

        {/* Build your own */}
        <AiBanner
          className="mt-14"
          title="No plan fits your dates?"
          accent="dates"
          text="Tell the AI planner where, how many days and your budget. It builds a day-by-day plan from our reviewed guides."
          chipsLabel="Start with a trip length"
          chips={[
            { key: "3", label: "3 days", icon: "clock", prompt: "Create a 3-day itinerary in India for me" },
            { key: "5", label: "5 days", icon: "clock", prompt: "Create a 5-day itinerary in India for me" },
            { key: "7", label: "A week", icon: "calendar", prompt: "Create a 7-day itinerary in India for me" },
            { key: "10", label: "10 days", icon: "calendar", prompt: "Create a 10-day itinerary in India for me" },
          ]}
          cta={{ label: "Build my itinerary", prompt: "Create a custom day-by-day travel itinerary for my trip to India" }}
          question="I have 5 days. Can you plan my trip?"
          answer="Here are plans from this page to start from:"
          picks={filtered.filter((i) => i.image).slice(0, 3).map((i) => ({
            href: `/itineraries/${i.slug}`,
            name: i.title,
            meta: `${i.durationDays} ${i.durationDays === 1 ? "day" : "days"} · ${i.placeName}`,
            image: i.image,
          }))}
          replayKey={`${duration}|${tripType}|${destination}|${q}`}
          onAsk={handleStartPlan}
        />

        <ul className="mt-10 grid gap-4 text-[0.8125rem] text-[#5F5F5F] sm:grid-cols-3">
          <li className="flex items-start gap-2.5"><Icon name="map" size={17} className="mt-0.5 shrink-0 text-coral" /><span><b className="text-ink">Real places.</b> Every stop links to a reviewed guide.</span></li>
          <li className="flex items-start gap-2.5"><Icon name="clock" size={17} className="mt-0.5 shrink-0 text-coral" /><span><b className="text-ink">Practical details.</b> Travel times, budget estimates, transport.</span></li>
          <li className="flex items-start gap-2.5"><Icon name="sparkles" size={17} className="mt-0.5 shrink-0 text-coral" /><span><b className="text-ink">Make it yours.</b> Customise any plan with AI.</span></li>
        </ul>
      </main>

      <AiPlannerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialPrompt={activePrompt} />
    </div>
  );
}
