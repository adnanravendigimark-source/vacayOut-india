"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Icon, type Name } from "@/components/icons/icon";
import type { ExploreData } from "@/lib/places/public-lists";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";
import { ExploreHero } from "./explore-hero";
import { ExploreMap } from "./explore-map";
import { StateCard } from "./state-card";
import "./explore.css";

export type PageHero = { src: string; alt: string; caption: string; credit: string; creditUrl: string; license: string; licenseUrl: string };

const REGION_ORDER = ["north", "central", "east", "west", "south", "northeast", "islands"] as const;
const REGION_LINE: Record<string, string> = {
  north: "Himalaya, deserts and the capital",
  central: "The Ganga, tiger forests and pilgrim towns",
  east: "Temples, deltas and the tea hills",
  west: "Beaches, caves and salt plains",
  south: "Backwaters, temple towns and the Ghats",
  northeast: "The seven sisters and Sikkim",
  islands: "Andaman, Nicobar and Lakshadweep",
};
const REGION_LABEL = (key: string) => (key === "all" ? "All of India" : key === "northeast" ? "Northeast" : key[0].toUpperCase() + key.slice(1));

/**
 * Explore India: a short photo header, one search box that filters the states as you type,
 * region tabs that stay in sync with the map, and a grid of state cards. Motion is kept to
 * fades: the header text, the cards when the list changes, and the map colours.
 */
export function ExplorePage({ data, initialRegion = "all" }: { data: ExploreData; hero: PageHero; initialRegion?: string }) {
  const tabs = useMemo(
    () => [
      { key: "all", count: data.states.length },
      ...REGION_ORDER.flatMap((k) => {
        const z = data.zones.find((x) => x.key === k);
        return z ? [{ key: z.key as string, count: z.count }] : [];
      }),
    ],
    [data],
  );
  const [region, setRegion] = useState(tabs.some((t) => t.key === initialRegion) ? initialRegion : "all");
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string | undefined>(undefined);

  const openAi = (prompt: string) => {
    setActivePrompt(prompt);
    setIsModalOpen(true);
  };

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => data.states.filter((s) => (region === "all" || s.zone === region) && (!q || s.name.toLowerCase().includes(q))),
    [data, region, q],
  );

  // First batch, then more cards as the visitor nears the end.
  const BATCH = 24;
  const [visible, setVisible] = useState(BATCH);
  const [filterKey, setFilterKey] = useState(`${region}|${q}`);
  if (filterKey !== `${region}|${q}`) {
    setFilterKey(`${region}|${q}`);
    setVisible(BATCH);
  }
  const shown = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setVisible((v) => v + BATCH);
    }, { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, visible]);

  return (
    <div className="min-h-screen bg-white">
      {/* 1. Header: minimal, white, live search */}
      <ExploreHero
        data={data}
        query={query}
        onQuery={setQuery}
        onSubmit={() => document.getElementById("states")?.scrollIntoView({ behavior: "smooth", block: "start" })}
      />

      {/* 2. Regions + map + states */}
      <div id="states" className="container-site scroll-mt-20 pb-8 pt-2 sm:pb-12">
        {/* Region tabs (sticky under the site header) */}
        <div className="sticky top-[4.5rem] z-20 -mx-4 border-b border-[#EFECE6] bg-white/95 px-4 py-3 backdrop-blur-md lg:top-20">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none" role="group" aria-label="Regions">
            {tabs.map((t) => {
              const on = region === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setRegion(t.key)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                    on ? "bg-ink text-white shadow-sm" : "bg-[#F5F3EE] text-ink/75 hover:bg-[#ECE8E0] hover:text-ink"
                  }`}
                >
                  {REGION_LABEL(t.key)} <span className={on ? "text-white/60" : "text-[#999999]"}>{t.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Map (desktop): the chosen region lights up; click a region to filter */}
          <aside className="hidden lg:sticky lg:top-40 lg:col-span-5 lg:block">
            <div className="rounded-2xl border border-[#E8EDE6] bg-[#F6F8F5] p-5">
              <ExploreMap data={data} region={region} onRegion={setRegion} />
              <div key={region} className="explore-fade mt-4">
                <p className="text-base font-bold text-ink">{REGION_LABEL(region)}</p>
                <p className="mt-0.5 text-sm text-[#666666]">{region === "all" ? "Hover a state for its guides, or click one to open it. Tap a region to zoom in." : REGION_LINE[region]}</p>
              </div>
            </div>
          </aside>

          {/* State cards */}
          <main className="lg:col-span-7">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-bold text-ink sm:text-xl">
                {q ? `Results for “${query.trim()}”` : region === "all" ? "All states & union territories" : `${REGION_LABEL(region)} India`}
              </h2>
              <p className="shrink-0 text-xs text-[#888888]">{filtered.length} shown</p>
            </div>

            {data.states.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#E5E2DC] bg-[#FAF9F5] px-6 py-16 text-center text-[#777777]">
                <p className="text-base font-semibold text-ink">Our destination guides are being researched and reviewed.</p>
                <p className="mt-1 text-xs">Meanwhile, the AI planner can help you plan.</p>
                <button type="button" onClick={() => openAi("Help me plan a trip in India")} className="mt-4 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white">Plan with AI</button>
              </div>
            ) : shown.length === 0 ? (
              <div className="rounded-2xl bg-[#FAF9F5] px-6 py-14 text-center">
                <p className="text-base font-semibold text-ink">No state matches “{query.trim()}”.</p>
                <p className="mt-1 text-sm text-[#777777]">Check the spelling, or ask the AI planner about it.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={() => openAi(`Plan a trip to ${query.trim()} in India`)} className="inline-flex items-center gap-1.5 rounded-full bg-coral px-4 py-2 text-xs font-semibold text-white">
                    <Icon name="sparkles" size={13} /> Ask AI about “{query.trim()}”
                  </button>
                  <button type="button" onClick={() => { setRegion("all"); setQuery(""); }} className="rounded-full border border-[#E5E2DC] px-4 py-2 text-xs font-semibold text-ink">Show all states</button>
                </div>
              </div>
            ) : (
              <ul key={filterKey} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {shown.map((st, i) => (
                  <StateCard key={st.slug} st={st} index={i} region={st.zone ? REGION_LABEL(st.zone) : null} />
                ))}
              </ul>
            )}
            {hasMore ? <div ref={sentinelRef} aria-hidden className="h-px" /> : null}
          </main>
        </div>

        {/* 3. One clear next step */}
        <section className="explore-ai relative mt-14 overflow-hidden rounded-3xl border border-[#F3DED4] p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 className="font-serif text-2xl font-normal text-ink sm:text-3xl">Not sure where to start?</h2>
              <p className="mt-1.5 text-sm text-[#555555]">Tell the AI planner what you like and how long you have. It suggests a state and plans the days.</p>
              {data.interests.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.interests.slice(0, 6).map((it) => (
                    <button key={it.key} type="button" onClick={() => openAi(it.prompt)} className="inline-flex items-center gap-1.5 rounded-full border border-[#EEDCD2] bg-white px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-coral hover:text-coral">
                      <Icon name={it.icon as Name} size={13} className="text-coral" />
                      {it.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button type="button" onClick={() => openAi("Help me choose where to go in India")} className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-coral px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-coral-hover lg:self-center">
              <Icon name="sparkles" size={16} /> Plan with AI
            </button>
          </div>
        </section>
      </div>

      <AiPlannerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialPrompt={activePrompt}
        examples={[
          { label: "5-day Golden Triangle", prompt: "Plan a 5-day trip across Delhi, Agra and Jaipur", icon: "temple" },
          { label: "Kerala backwaters", prompt: "Plan a relaxing 5-day family trip to Kerala backwaters and Munnar", icon: "palm" },
          { label: "Himachal mountain trip", prompt: "Suggest a scenic 6-day road trip through Himachal Pradesh", icon: "mountain" },
        ]}
      />
    </div>
  );
}

/** The explore page with `?zone=` applied (read in the browser, so the server page stays cacheable). */
export function ExplorePageFromUrl({ data, hero }: { data: ExploreData; hero: PageHero }) {
  const zone = useSearchParams().get("zone") ?? "all";
  return <ExplorePage key={zone} data={data} hero={hero} initialRegion={zone} />;
}
