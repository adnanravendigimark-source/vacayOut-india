"use client";

import Image from "@/components/media/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/icon";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";
import type { PageHero } from "@/components/explore/explore-page";
import type { CardImage } from "@/lib/places/public-lists";
import { TRIP_TYPES } from "@/lib/places/trip-types";
import { HubHeader } from "@/components/layout/hub-header";

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && filtered.length === 0) handleStartPlan(`Create an itinerary: ${searchQuery.trim()}`);
  };

  const filtersOn = duration !== "all" || !!tripType || !!destination || !!searchQuery.trim();
  const clearAll = () => {
    setDuration("all");
    setTripType("");
    setDestination("");
    setSearchQuery("");
  };
  const select = "h-10 rounded-full border border-line bg-white px-4 text-[0.8125rem] font-medium text-ink focus:border-ink focus:outline-none";

  return (
    <div className="min-h-screen bg-white">
      <HubHeader
        crumb="Itineraries"
        eyebrow="Ready-made trip plans"
        title="India itineraries"
        intro="Day-by-day plans with realistic travel times, estimated budgets and what to book ahead. Use one as it is, or customise it with AI."
        stats={[
          { value: itineraries.length, label: "itineraries" },
          { value: states.size, label: "states" },
        ]}
        search={{
          id: "it-search",
          label: "Search itineraries",
          placeholder: "Search itineraries, e.g. 3 days in Jaipur…",
          value: searchQuery,
          onChange: setSearchQuery,
          onSubmit: handleSearchSubmit,
        }}
      />

      <main className="container-site py-8 sm:py-10">
        {/* Trip length first: it's the first thing people choose */}
        {itineraries.length ? (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div role="radiogroup" aria-label="Trip length" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
              {durations.map((d) => {
                const active = duration === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setDuration(d.id)}
                    className={`flex shrink-0 flex-col items-start rounded-2xl border px-4 py-2.5 text-left transition-all ${active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-[#CFCAC0]"}`}
                  >
                    <span className="text-sm font-semibold">{d.id === "all" ? "Any length" : d.label}</span>
                    <span className={`text-[0.6875rem] ${active ? "text-white/70" : "text-muted"}`}>{d.count} {d.count === 1 ? "plan" : "plans"}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
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
        ) : null}

        {itineraries.length ? (
          <p className="mt-6 border-b border-line-subtle pb-4 text-sm text-[#5F5F5F]">
            <span className="font-semibold text-ink">{filtered.length}</span> {filtered.length === 1 ? "itinerary" : "itineraries"}
            {filtersOn ? <button type="button" onClick={clearAll} className="ml-3 text-xs font-semibold text-coral hover:underline">Clear filters</button> : null}
          </p>
        ) : null}

        {itineraries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center">
            <p className="text-sm font-semibold text-ink">Our itineraries are being researched and reviewed.</p>
            <p className="mt-1 text-xs text-muted">Each plan is checked against official sources and approved by an editor before it appears here.</p>
            <button type="button" onClick={() => handleStartPlan("Create a custom day-by-day travel itinerary for my trip to India")} className="mt-4 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white">Plan my trip with AI</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-line p-10 text-center">
            <p className="text-sm font-semibold text-ink">No itineraries matched your filters.</p>
            <div className="mt-3 flex justify-center gap-4">
              <button type="button" onClick={clearAll} className="text-xs font-bold text-coral hover:underline">Clear filters</button>
              {searchQuery.trim() ? <button type="button" onClick={() => handleStartPlan(`Create an itinerary: ${searchQuery.trim()}`)} className="text-xs font-bold text-coral hover:underline">Build it with AI</button> : null}
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {filtered.map((it) => (
              <article key={it.slug} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-shadow hover:shadow-card sm:flex-row">
                <Link href={`/itineraries/${it.slug}`} tabIndex={-1} aria-hidden className="relative block aspect-[16/10] shrink-0 overflow-hidden bg-sand sm:aspect-auto sm:w-[42%]">
                  {it.image ? (
                    <Image src={it.image.url} alt="" fill sizes="(min-width: 1024px) 22vw, (min-width: 640px) 40vw, 95vw" className="object-cover transition-transform duration-500 ease-out group-hover:scale-105" />
                  ) : (
                    <span className="flex size-full items-center justify-center text-[#B9B4AA]"><Icon name="route" size={26} /></span>
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-wider">
                    <span className="inline-flex items-center gap-1 rounded-full bg-coral-soft px-2.5 py-1 text-coral">
                      <Icon name="calendar" size={12} />
                      {it.durationDays} {it.durationDays === 1 ? "day" : "days"}
                    </span>
                    <span className="truncate text-muted">{it.placeName}{it.stateName && it.stateName !== it.placeName ? `, ${it.stateName}` : ""}</span>
                  </div>
                  <h3 className="mt-3 font-serif text-lg font-bold leading-snug text-ink transition-colors group-hover:text-coral">
                    <Link href={`/itineraries/${it.slug}`}>{it.title}</Link>
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-[0.8125rem] leading-relaxed text-[#5F5F5F]">{it.summary}</p>
                  {it.tripTypes.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {it.tripTypes.slice(0, 3).map((t) => <span key={t} className="rounded-full bg-[#F2EFE9] px-2.5 py-0.5 text-[0.6875rem] font-medium text-[#555]">{labelOf(t)}</span>)}
                    </div>
                  ) : null}
                  <div className="mt-auto flex items-center gap-2 pt-4">
                    <Link href={`/itineraries/${it.slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-coral">
                      View plan <span aria-hidden>→</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleStartPlan(`Customise the VacayOut "${it.title}" itinerary for me`)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink transition-colors hover:border-ink"
                    >
                      <Icon name="sparkles" size={12} className="text-coral" />
                      Customise with AI
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Build your own */}
        <section className="mt-14 flex flex-col items-start gap-5 rounded-3xl bg-[#1B4332] px-6 py-8 text-white sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div>
            <h2 className="font-serif text-2xl font-bold">No plan fits your dates?</h2>
            <p className="mt-1.5 max-w-xl text-sm text-white/80">Tell the AI planner where, how many days and your budget. It builds a day-by-day plan from our reviewed guides.</p>
          </div>
          <button type="button" onClick={() => handleStartPlan("Create a custom day-by-day travel itinerary for my trip to India")} className="shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-coral hover:text-white">
            Build my itinerary →
          </button>
        </section>

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
