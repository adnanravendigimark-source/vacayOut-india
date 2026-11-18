"use client";

import Image from "@/components/media/image";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Icon, type Name } from "@/components/icons/icon";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";
import type { PageHero } from "@/components/explore/explore-page";
import type { ThingsToDoData } from "@/lib/places/public-lists";
import { TRIP_TYPES } from "@/lib/places/trip-types";
import { ThingsToDoHero } from "./things-to-do-hero";
import { ExperienceCard } from "./experience-card";
import { AiBanner } from "@/components/ai-planner/ai-banner";
import "@/components/explore/explore.css";

const CATEGORY_ICONS: Record<string, Name> = {
  all: "grid",
  adventure: "route",
  nature: "mountain",
  culture: "palace",
  spiritual: "temple",
  wellness: "sun",
  food_shopping: "utensils",
  events: "calendar",
  nightlife: "star",
  sightseeing: "camera",
};

const WHY: { icon: Name; title: string; text: string }[] = [
  { icon: "checkCircle", title: "Editor reviewed", text: "Every experience links to a full guide an editor has approved." },
  { icon: "clock", title: "Verified details only", text: "Hours and fees appear only when an official source states them." },
  { icon: "book", title: "Sources listed", text: "Each guide shows where its facts come from." },
  { icon: "image", title: "Licensed photos", text: "Photos are credited and used with permission." },
];

type Item = ThingsToDoData["items"][number];
const iconFor = (tripTypes: string[]): Name => (TRIP_TYPES.find((t) => tripTypes.includes(t.key))?.icon ?? "compass") as Name;

function Thumb({ item, sizes }: { item: Item; sizes: string }) {
  return item.image ? (
    <>
      <Image src={item.image.url} alt={item.image.alt} fill sizes={sizes} className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
      {item.image.kind === "ai_generated" ? <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white">AI illustration</span> : null}
    </>
  ) : (
    <span className="flex size-full items-center justify-center text-[#B9B4AA]"><Icon name={iconFor(item.tripTypes)} size={26} /></span>
  );
}

export type ThingsToDoFilters = { state?: string; destination?: string; category?: string };

// `hero` is kept in the props for the page files; this page no longer shows a photo hero.
const PAGE_SIZE = 48;

export function ThingsToDoPage({ data, initial = {} }: { data: ThingsToDoData; hero: PageHero; initial?: ThingsToDoFilters }) {
  const [activeCategory, setActiveCategory] = useState(initial.category && data.categories.some((c) => c.key === initial.category) ? initial.category : "all");
  const [stateFilter, setStateFilter] = useState(initial.state && data.states.some((s) => s.slug === initial.state) ? initial.state : "");
  const [destFilter, setDestFilter] = useState(initial.destination && data.destinations.some((d) => d.key === initial.destination) ? initial.destination : "");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string | undefined>(undefined);
  // Render cards in pages: all ~500 at once made a 1.8 MB page with 5,800 elements.
  // Paging is tied to the current filters, so changing a filter starts again from the first page.
  const filterKey = `${activeCategory}|${stateFilter}|${destFilter}|${searchQuery}`;
  const [page, setPage] = useState({ key: filterKey, n: PAGE_SIZE });
  const shown = page.key === filterKey ? page.n : PAGE_SIZE;

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

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return data.items.filter(
      (item) =>
        (activeCategory === "all" || item.category === activeCategory) &&
        (!stateFilter || item.stateSlug === stateFilter) &&
        (!destFilter || (item.destination && `${item.stateSlug}/${item.destination.slug}` === destFilter)) &&
        (!q || item.name.toLowerCase().includes(q) || item.location.toLowerCase().includes(q) || (item.summary ?? "").toLowerCase().includes(q)),
    );
  }, [activeCategory, stateFilter, destFilter, searchQuery, data.items]);
  const destOptions = data.destinations.filter((d) => !stateFilter || d.stateSlug === stateFilter);

  // Typing filters the list below; submitting jumps to it, or asks the AI planner when nothing matches.
  const handleSearchSubmit = () => {
    if (searchQuery.trim() && filtered.length === 0) handleStartPlan(`Things to do in India: ${searchQuery.trim()}`);
    else document.getElementById("experiences")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const featured = data.items.filter((i) => i.featured && i.image).slice(0, 4);
  const filtersOn = activeCategory !== "all" || !!stateFilter || !!destFilter || !!searchQuery.trim();
  const clearAll = () => {
    setActiveCategory("all");
    setStateFilter("");
    setDestFilter("");
    setSearchQuery("");
  };
  const tiles = [{ key: "all", label: "Everything", count: data.items.length }, ...data.categories];
  // The AI banner sits between rows, after the first two rows of four.
  const head = filtered.slice(0, 8);
  const tail = filtered.slice(8, shown);
  const remaining = filtered.length - Math.min(shown, filtered.length);

  const labelOf = (key: string) => data.categories.find((c) => c.key === key)?.label;
  const card = (item: Item, i: number) => (
    <ExperienceCard
      key={item.href}
      item={item}
      index={i}
      label={labelOf(item.category) ?? item.kindLabel}
      icon={CATEGORY_ICONS[item.category] ?? "compass"}
      fallbackIcon={iconFor(item.tripTypes)}
    />
  );
  const activeLabel = activeCategory === "all" ? undefined : labelOf(activeCategory);
  const where = data.destinations.find((d) => d.key === destFilter)?.name ?? data.states.find((st) => st.slug === stateFilter)?.name ?? "India";
  const grid = "grid grid-cols-2 gap-3.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4";
  const heading = searchQuery.trim()
    ? `Results for “${searchQuery.trim()}”`
    : activeCategory === "all"
      ? "All experiences"
      : (labelOf(activeCategory) ?? "Experiences");

  return (
    <div className="min-h-screen bg-white">
      {/* 1. Header: white, gently moving, live search */}
      <ThingsToDoHero
        data={data}
        query={searchQuery}
        onQuery={setSearchQuery}
        onSubmit={handleSearchSubmit}
      />

      <div id="experiences" className="container-site scroll-mt-20 pb-12 sm:pb-16">
        {/* 2. Interests + place filters (sticky under the site header) */}
        {data.items.length ? (
          <div className="sticky top-[4.5rem] z-20 -mx-4 border-b border-[#EFECE6] bg-white/95 px-4 py-3 backdrop-blur-md lg:top-20">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none" role="group" aria-label="Interests">
                {tiles.map((t) => {
                  const on = activeCategory === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setActiveCategory(t.key)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-all duration-300 ${
                        on ? "bg-ink text-white shadow-sm" : "bg-[#F5F3EE] text-ink/75 hover:bg-[#ECE8E0] hover:text-ink"
                      }`}
                    >
                      <Icon name={CATEGORY_ICONS[t.key] ?? "compass"} size={14} className={on ? "text-white" : "text-coral"} />
                      {t.label} <span className={on ? "text-white/60" : "text-[#999999]"}>{t.count}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex shrink-0 gap-2">
                <label className="sr-only" htmlFor="ttd-state">State</label>
                <select id="ttd-state" value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setDestFilter(""); }} className="h-9 min-w-0 flex-1 rounded-full border border-[#E5E2DC] bg-white px-3.5 text-[0.8125rem] font-medium text-ink focus:border-ink focus:outline-none lg:flex-none">
                  <option value="">All states</option>
                  {data.states.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                </select>
                {destOptions.length ? (
                  <>
                    <label className="sr-only" htmlFor="ttd-dest">Destination</label>
                    <select id="ttd-dest" value={destFilter} onChange={(e) => setDestFilter(e.target.value)} className="h-9 min-w-0 flex-1 rounded-full border border-[#E5E2DC] bg-white px-3.5 text-[0.8125rem] font-medium text-ink focus:border-ink focus:outline-none lg:flex-none">
                      <option value="">All destinations</option>
                      {destOptions.map((d) => <option key={d.key} value={d.key}>{d.name}</option>)}
                    </select>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* 3. Results */}
        {data.items.length ? (
          <div className="mb-4 mt-8 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-bold text-ink sm:text-xl">{heading}</h2>
            <p className="shrink-0 text-xs text-[#888888]" aria-live="polite">
              {filtered.length} {filtered.length === 1 ? "experience" : "experiences"}
              {filtersOn ? <button type="button" onClick={clearAll} className="ml-3 font-semibold text-coral hover:underline">Clear filters</button> : null}
            </p>
          </div>
        ) : null}

        {data.items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[#E5E2DC] bg-[#FAF9F5] px-6 py-16 text-center">
            <p className="text-base font-semibold text-ink">Experiences are being researched and reviewed.</p>
            <p className="mt-1 text-xs text-[#777777]">Each one is checked against official sources and approved by an editor before it appears here.</p>
            <button type="button" onClick={() => handleStartPlan("Suggest things to do in India based on my interests")} className="mt-4 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white">Ask the AI planner</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-[#FAF9F5] px-6 py-14 text-center">
            <p className="text-base font-semibold text-ink">No experiences matched.</p>
            <p className="mt-1 text-sm text-[#777777]">Try another interest or place, or ask the AI planner.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {searchQuery.trim() ? (
                <button type="button" onClick={() => handleStartPlan(`Things to do in India: ${searchQuery.trim()}`)} className="inline-flex items-center gap-1.5 rounded-full bg-coral px-4 py-2 text-xs font-semibold text-white">
                  <Icon name="sparkles" size={13} /> Ask AI about “{searchQuery.trim()}”
                </button>
              ) : null}
              <button type="button" onClick={clearAll} className="rounded-full border border-[#E5E2DC] px-4 py-2 text-xs font-semibold text-ink">Show everything</button>
            </div>
          </div>
        ) : (
          <>
            <ul key={`h-${filterKey}`} className={grid}>{head.map(card)}</ul>

            {/* One clear next step, between rows */}
            <AiBanner
              className="my-10"
              title="Not sure what to choose?"
              accent="choose"
              text="Tell the AI planner your interests and dates. It picks from the guides on this page and plans the days."
              chips={[...data.categories].sort((x, y) => y.count - x.count).slice(0, 5).map((c) => ({
                key: c.key,
                label: c.label,
                icon: CATEGORY_ICONS[c.key] ?? "compass",
                prompt: `Plan a trip in ${where} for someone who loves ${c.label.toLowerCase()}. Suggest things to do and plan the days.`,
              }))}
              cta={{
                label: "Plan with AI",
                prompt: activeLabel
                  ? `Help me choose ${activeLabel.toLowerCase()} experiences in ${where} and plan the days`
                  : `Help me choose the best things to do in ${where} based on my travel style`,
              }}
              question={activeLabel ? `I love ${activeLabel.toLowerCase()}. What should I do in ${where}?` : `What should I do in ${where}? I have a few days.`}
              answer="Here are 3 picks from the guides on this page:"
              picks={filtered.filter((i) => i.image).slice(0, 3).map((i) => ({ href: i.href, name: i.name, meta: i.location, image: i.image }))}
              replayKey={filterKey}
              onAsk={handleStartPlan}
            />

            {tail.length ? <ul key={`t-${filterKey}`} className={grid}>{tail.map(card)}</ul> : null}
            {remaining > 0 ? (
              <div className="mt-10 flex flex-col items-center gap-2">
                <button type="button" onClick={() => setPage({ key: filterKey, n: shown + PAGE_SIZE })} className="rounded-full border border-ink px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white">
                  Show more
                </button>
                <p className="text-xs text-[#888888]">Showing {Math.min(shown, filtered.length)} of {filtered.length}</p>
              </div>
            ) : null}
          </>
        )}

        {/* 4. Editor's picks */}
        {featured.length && !filtersOn ? (
          <section className="mt-16">
            <h2 className="font-serif text-2xl font-normal text-ink sm:text-3xl">Editor&apos;s picks</h2>
            <p className="mt-1 text-sm text-[#777777]">Experiences our editors recommend first.</p>
            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((exp, i) => (
                <li key={exp.href} className="explore-card" style={{ ["--i" as string]: i }}>
                  <Link href={exp.href} className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-[#EFECE6]">
                    <Thumb item={exp} sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 92vw" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-white/75">{labelOf(exp.category) ?? exp.kindLabel}</p>
                      <p className="mt-0.5 font-semibold leading-snug">{exp.name}</p>
                      <p className="mt-0.5 truncate text-xs text-white/80">{exp.location}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* 5. How the guides are made */}
        <ul className="mt-16 grid gap-4 rounded-3xl bg-[#FAF9F5] p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
          {WHY.map((w) => (
            <li key={w.title} className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-coral shadow-xs"><Icon name={w.icon} size={17} /></span>
              <span>
                <span className="block text-sm font-semibold text-ink">{w.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[#666666]">{w.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <AiPlannerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialPrompt={activePrompt} />
    </div>
  );
}

/** The page with `?state=&destination=&category=` applied (read in the browser, so the server page stays cacheable). */
export function ThingsToDoPageFromUrl({ data, hero }: { data: ThingsToDoData; hero: PageHero }) {
  const sp = useSearchParams();
  const one = (k: string) => {
    const v = sp.get(k);
    return v && v.length <= 120 ? v : undefined;
  };
  return <ThingsToDoPage key={sp.toString()} data={data} hero={hero} initial={{ state: one("state"), destination: one("destination"), category: one("category") }} />;
}
