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
import { HubHeader } from "@/components/layout/hub-header";

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

const WHY = [
  "Every experience links to a full guide reviewed by an editor",
  "Opening hours and fees only when an official source states them",
  "Sources listed on every guide",
  "Photos are credited and properly licensed",
];

const iconFor = (tripTypes: string[]): Name => (TRIP_TYPES.find((t) => tripTypes.includes(t.key))?.icon ?? "compass") as Name;

function Thumb({ item, sizes }: { item: ThingsToDoData["items"][number]; sizes: string }) {
  return item.image ? (
    <>
      <Image src={item.image.url} alt={item.image.alt} fill sizes={sizes} className="object-cover transition-transform duration-500 ease-out group-hover:scale-106" />
      {item.image.kind === "ai_generated" ? <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white">AI illustration</span> : null}
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Typing filters the list below; submitting with no match asks the AI planner instead.
    if (searchQuery.trim() && filtered.length === 0) handleStartPlan(`Things to do in India: ${searchQuery.trim()}`);
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

  const card = (item: ThingsToDoData["items"][number]) => (
    <Link key={item.href} href={item.href} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sand">
        <Thumb item={item} sizes="(min-width: 1024px) 22vw, (min-width: 768px) 30vw, 46vw" />
      </div>
      <p className="mt-3 text-[0.6875rem] font-bold uppercase tracking-wider text-coral">
        {data.categories.find((c) => c.key === item.category)?.label ?? item.kindLabel}
      </p>
      <h3 className="mt-1 line-clamp-2 text-[0.9375rem] font-semibold leading-snug text-ink transition-colors group-hover:text-coral">{item.name}</h3>
      <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted">
        <Icon name="pin" size={12} className="shrink-0" />
        <span className="truncate">{item.location}</span>
      </p>
    </Link>
  );

  return (
    <div className="min-h-screen bg-white">
      <HubHeader
        crumb="Things to do"
        eyebrow="Explore by interest"
        title="Things to do in India"
        intro="Treks, boat rides, temples, food streets and festivals, each with a guide checked against official sources."
        stats={[
          { value: data.items.length, label: "experiences" },
          { value: data.states.length, label: "states" },
        ]}
        search={{
          id: "ttd-search",
          label: "Search activities, interests or destinations",
          placeholder: "Search activities, places or destinations…",
          value: searchQuery,
          onChange: setSearchQuery,
          onSubmit: handleSearchSubmit,
        }}
      />

      <main className="container-site py-8 sm:py-10">
        {/* Interest tiles: the main way to browse this page */}
        {data.categories.length ? (
          <section aria-label="Interests" className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
            <div className="grid auto-cols-[8.25rem] grid-flow-col gap-2.5 lg:auto-cols-fr">
              {tiles.map((t) => {
                const active = activeCategory === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveCategory(t.key)}
                    className={`flex min-h-[6.5rem] flex-col items-start justify-between rounded-2xl border p-3.5 text-left transition-all ${
                      active ? "border-ink bg-ink text-white shadow-card" : "border-line bg-white text-ink hover:border-[#CFCAC0] hover:shadow-card"
                    }`}
                  >
                    <span className={`flex size-9 items-center justify-center rounded-xl ${active ? "bg-white/12 text-white" : "bg-coral-soft text-coral"}`}>
                      <Icon name={CATEGORY_ICONS[t.key] ?? "compass"} size={18} />
                    </span>
                    <span>
                      <span className="block text-[0.8125rem] font-semibold leading-tight">{t.label}</span>
                      <span className={`mt-0.5 block text-[0.6875rem] ${active ? "text-white/70" : "text-muted"}`}>{t.count}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Toolbar: result count and place filters */}
        {data.items.length ? (
          <div className="mt-8 flex flex-col gap-3 border-b border-line-subtle pb-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#5F5F5F]">
              <span className="font-semibold text-ink">{filtered.length}</span> {filtered.length === 1 ? "experience" : "experiences"}
              {filtersOn ? (
                <button type="button" onClick={clearAll} className="ml-3 text-xs font-semibold text-coral hover:underline">Clear filters</button>
              ) : null}
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="ttd-state">State</label>
              <select id="ttd-state" value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setDestFilter(""); }} className="h-9 rounded-full border border-line bg-white px-3.5 text-[0.8125rem] font-medium text-ink focus:border-ink focus:outline-none">
                <option value="">All states</option>
                {data.states.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
              </select>
              {destOptions.length ? (
                <>
                  <label className="sr-only" htmlFor="ttd-dest">Destination</label>
                  <select id="ttd-dest" value={destFilter} onChange={(e) => setDestFilter(e.target.value)} className="h-9 rounded-full border border-line bg-white px-3.5 text-[0.8125rem] font-medium text-ink focus:border-ink focus:outline-none">
                    <option value="">All destinations</option>
                    {destOptions.map((d) => <option key={d.key} value={d.key}>{d.name}</option>)}
                  </select>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        {data.items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-line p-10 text-center">
            <p className="text-sm font-semibold text-ink">Experiences are being researched and reviewed.</p>
            <p className="mt-1 text-xs text-muted">Each one is checked against official sources and approved by an editor before it appears here.</p>
            <button type="button" onClick={() => handleStartPlan("Suggest things to do in India based on my interests")} className="mt-4 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white">Ask the AI planner</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-line p-10 text-center">
            <p className="text-sm font-semibold text-ink">No experiences matched your search.</p>
            <div className="mt-3 flex justify-center gap-4">
              <button type="button" onClick={clearAll} className="text-xs font-bold text-coral hover:underline">Clear filters</button>
              {searchQuery.trim() ? <button type="button" onClick={() => handleStartPlan(`Things to do in India: ${searchQuery.trim()}`)} className="text-xs font-bold text-coral hover:underline">Ask the AI planner</button> : null}
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">{head.map(card)}</div>

            <aside className="my-10 flex flex-col items-start gap-4 rounded-3xl bg-[#F4F1EA] px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div className="flex items-center gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-coral shadow-xs"><Icon name="sparkles" size={20} /></span>
                <div>
                  <p className="font-serif text-lg font-bold text-ink">Not sure what to choose?</p>
                  <p className="text-[0.8125rem] text-[#5F5F5F]">Tell the AI planner your interests and dates. It picks from the guides on this page.</p>
                </div>
              </div>
              <button type="button" onClick={() => handleStartPlan("Help me choose the best destinations and things to do in India based on my travel style")} className="shrink-0 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-coral">
                Plan with AI →
              </button>
            </aside>

            {tail.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">{tail.map(card)}</div> : null}
            {remaining > 0 ? (
              <div className="mt-10 flex flex-col items-center gap-2">
                <button type="button" onClick={() => setPage({ key: filterKey, n: shown + PAGE_SIZE })} className="rounded-full border border-ink px-6 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white">
                  Show more
                </button>
                <p className="text-xs text-muted" aria-live="polite">Showing {Math.min(shown, filtered.length)} of {filtered.length}</p>
              </div>
            ) : null}
          </>
        )}

        {/* Editor's picks */}
        {featured.length && !filtersOn ? (
          <section className="mt-14 border-t border-line-subtle pt-10">
            <h2 className="font-serif text-2xl font-bold text-ink">Editor&apos;s picks</h2>
            <p className="mt-1 text-sm text-muted">Experiences our editors recommend first.</p>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((exp) => (
                <Link key={exp.href} href={exp.href} className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-sand">
                  <Thumb item={exp} sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 92vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <p className="font-semibold leading-snug">{exp.name}</p>
                    <p className="mt-0.5 truncate text-xs text-white/80">{exp.location}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* How the guides are made */}
        <ul className="mt-14 grid gap-3 border-t border-line-subtle pt-8 text-[0.8125rem] text-[#5F5F5F] sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((reason) => (
            <li key={reason} className="flex items-start gap-2">
              <Icon name="checkCircle" size={16} className="mt-0.5 shrink-0 text-emerald-700" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </main>

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
