"use client";

import Image from "@/components/media/image";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Icon, type Name } from "@/components/icons/icon";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";
import type { PageHero } from "@/components/explore/explore-page";
import type { TravelGuidesData } from "@/lib/places/public-lists";
import { TRIP_TYPES } from "@/lib/places/trip-types";
import { AiBanner } from "@/components/ai-planner/ai-banner";
import { TravelGuidesHero } from "./travel-guides-hero";
import "@/components/explore/explore.css";
import "./travel-guides.css";

const fmt = (d: Date | string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const categoryOf = (tripTypes: string[]) => TRIP_TYPES.find((t) => tripTypes.includes(t.key))?.label ?? null;

// `hero` stays in the props for the page files; this page no longer shows a photo hero.
export function TravelGuidesPage({ data, initialTab }: { data: TravelGuidesData; hero: PageHero; initialTab?: "articles" | "destinations" }) {
  const [tab, setTab] = useState<"articles" | "destinations">(initialTab ?? (data.articles.length ? "articles" : "destinations"));
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredGuides = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return (tab === "articles" ? data.articles : data.guides).filter(
      (g) =>
        (!activeCategory || g.tripTypes.includes(activeCategory)) &&
        (!q || g.title.toLowerCase().includes(q) || g.name.toLowerCase().includes(q) || g.snippet.toLowerCase().includes(q) || g.stateName.toLowerCase().includes(q)),
    );
  }, [activeCategory, searchQuery, tab, data.guides, data.articles]);
  const current = tab === "articles" ? data.articles : data.guides;

  // Typing filters the list; submitting jumps to it, or asks the AI planner when nothing matches.
  const handleSearchSubmit = () => {
    if (searchQuery.trim() && filteredGuides.length === 0) handleStartPlan(`Travel guide: ${searchQuery.trim()}`);
    else document.getElementById("guides")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const filtersOn = !!activeCategory || !!searchQuery.trim();
  // Magazine layout: a lead story and three more beside it, then the rest.
  const showLead = !filtersOn && filteredGuides.length >= 4;
  const lead = showLead ? filteredGuides[0] : null;
  const side = showLead ? filteredGuides.slice(1, 4) : [];
  const rest = showLead ? filteredGuides.slice(4) : filteredGuides;
  type Guide = (typeof filteredGuides)[number];
  const cat = (g: Guide) => categoryOf(g.tripTypes) ?? g.kindLabel;
  const cover = (g: Guide, sizes: string, iconSize = 26) =>
    g.image ? (
      <>
        <Image src={g.image.url} alt="" fill sizes={sizes} className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
        {g.image.kind === "ai_generated" ? <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white">AI illustration</span> : null}
      </>
    ) : (
      <span className="flex size-full items-center justify-center text-[#B9B4AA]"><Icon name="book" size={iconSize} /></span>
    );
  const meta = (g: Guide) => [g.stateName && g.stateName !== g.name ? g.stateName : null, tab === "articles" ? fmt(g.publishedAt) : g.sectionCount ? `${g.sectionCount} sections` : null].filter(Boolean).join(" · ");
  const listKey = `${tab}|${activeCategory ?? ""}|${searchQuery.trim()}`;
  const clearAll = () => { setActiveCategory(null); setSearchQuery(""); };

  return (
    <div className="min-h-screen bg-white">
      {/* 1. Header: white, gently moving, live search */}
      <TravelGuidesHero data={data} query={searchQuery} onQuery={setSearchQuery} onSubmit={handleSearchSubmit} />

      {/* 2. Guide type + topics (sticky under the site header) */}
      <div className="sticky top-[4.5rem] z-20 border-b border-[#EFECE6] bg-white/95 backdrop-blur-md lg:top-20">
        <div className="container-site flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:gap-5">
          <div role="tablist" aria-label="Guide type" className="tg-switch relative grid shrink-0 grid-cols-2 self-start rounded-full bg-[#F5F3EE] p-1" data-tab={tab}>
            <span aria-hidden className="tg-switch__thumb" />
            {([["articles", "Articles", data.articles.length], ["destinations", "Destination guides", data.guides.length]] as const).map(([key, label, n]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`relative z-10 whitespace-nowrap rounded-full px-4 py-1.5 text-[0.8125rem] font-semibold transition-colors duration-300 ${tab === key ? "text-white" : "text-[#666666] hover:text-ink"}`}
              >
                {label} <span className={tab === key ? "text-white/60" : "text-[#999999]"}>{n}</span>
              </button>
            ))}
          </div>
          {data.categories.length ? (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none lg:mx-0 lg:px-0" role="group" aria-label="Topics">
              {[{ key: null as string | null, label: "All topics", icon: "grid" }, ...data.categories].map((c) => {
                const on = activeCategory === c.key;
                return (
                  <button
                    key={c.key ?? "all"}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setActiveCategory(c.key)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.8125rem] font-semibold transition-all duration-300 ${on ? "bg-[#FDF0EB] text-coral" : "text-[#555555] hover:bg-[#F5F3EE] hover:text-ink"}`}
                  >
                    <Icon name={c.icon as Name} size={14} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <main id="guides" className="container-site scroll-mt-32 py-8 sm:py-10">
        {current.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5E2DC] bg-[#FAF9F5] px-6 py-16 text-center">
            <p className="text-base font-semibold text-ink">Our travel guides are being researched and reviewed.</p>
            <p className="mt-1 text-xs text-[#777777]">Every guide is checked against official sources and approved by an editor before it appears here.</p>
            <button type="button" onClick={() => handleStartPlan("Help me plan a trip in India")} className="mt-4 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white">Ask the AI planner</button>
          </div>
        ) : filteredGuides.length === 0 ? (
          <div className="rounded-2xl bg-[#FAF9F5] px-6 py-14 text-center">
            <p className="text-base font-semibold text-ink">No guides matched.</p>
            <p className="mt-1 text-sm text-[#777777]">Try another topic or place, or ask the AI planner.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {searchQuery.trim() ? (
                <button type="button" onClick={() => handleStartPlan(`Travel guide: ${searchQuery.trim()}`)} className="inline-flex items-center gap-1.5 rounded-full bg-coral px-4 py-2 text-xs font-semibold text-white">
                  <Icon name="sparkles" size={13} /> Ask AI about “{searchQuery.trim()}”
                </button>
              ) : null}
              <button type="button" onClick={clearAll} className="rounded-full border border-[#E5E2DC] px-4 py-2 text-xs font-semibold text-ink">Show all guides</button>
            </div>
          </div>
        ) : (
          <div key={listKey}>
            {/* Lead story and three more beside it */}
            {lead ? (
              <section className="grid gap-6 lg:grid-cols-12 lg:gap-8">
                <Link href={lead.href} className="explore-card group relative block aspect-[16/11] overflow-hidden rounded-3xl bg-[#1a1714] text-white lg:col-span-7 lg:aspect-auto lg:min-h-[26rem]" style={{ ["--i" as string]: 0 }}>
                  {cover(lead, "(min-width: 1024px) 55vw, 95vw", 32)}
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full bg-white/15 px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider backdrop-blur-md">{tab === "articles" ? "Latest" : "Featured"} · {cat(lead)}</span>
                  <span className="absolute inset-x-5 bottom-5 block sm:inset-x-7 sm:bottom-7">
                    <span className="block max-w-xl font-serif text-2xl leading-tight [text-wrap:balance] sm:text-[2rem]">{lead.title}</span>
                    <span className="mt-2 line-clamp-2 block max-w-xl text-sm leading-relaxed text-white/85">{lead.snippet}</span>
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md transition-colors group-hover:bg-white group-hover:text-ink">
                      Read the guide <Icon name="arrowRight" size={12} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </Link>
                <ul className="flex flex-col gap-3 lg:col-span-5">
                  {side.map((g, i) => (
                    <li key={g.href} className="explore-card flex-1" style={{ ["--i" as string]: i + 1 }}>
                      <Link href={g.href} className="tg-row group flex h-full items-center gap-4 rounded-2xl border border-[#ECE9E2] bg-white p-3">
                        <span className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl bg-[#EFECE6] sm:w-32">{cover(g, "128px", 20)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[0.6875rem] font-semibold uppercase tracking-wider text-coral">{cat(g)}</span>
                          <span className="mt-1 line-clamp-2 block font-serif text-[1.0625rem] leading-snug text-ink transition-colors group-hover:text-coral">{g.title}</span>
                          <span className="mt-1 block truncate text-xs text-[#888888]">{meta(g)}</span>
                        </span>
                        <Icon name="arrowRight" size={15} className="mr-1 shrink-0 text-[#CCCCCC] transition-all group-hover:translate-x-0.5 group-hover:text-coral" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {rest.length ? (
              <section className={lead ? "mt-14" : ""}>
                <div className="mb-5 flex items-baseline justify-between gap-3">
                  <h2 className="text-lg font-bold text-ink sm:text-xl">
                    {searchQuery.trim() ? `Results for “${searchQuery.trim()}”` : lead ? (tab === "articles" ? "More guides" : "All destination guides") : tab === "articles" ? "Articles" : "Destination guides"}
                  </h2>
                  <p className="shrink-0 text-xs text-[#888888]">
                    {filteredGuides.length} {filteredGuides.length === 1 ? "guide" : "guides"}
                    {filtersOn ? <button type="button" onClick={clearAll} className="ml-3 font-semibold text-coral hover:underline">Clear filters</button> : null}
                  </p>
                </div>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                  {rest.map((g, i) => (
                    <li key={g.href} className="explore-card" style={{ ["--i" as string]: Math.min(i, 12) }}>
                      <Link href={g.href} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#ECE9E2] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_18px_40px_-20px_rgba(25,25,25,0.35)]">
                        <span className="relative block aspect-[3/2] overflow-hidden bg-[#EFECE6]">
                          {cover(g, "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 95vw")}
                          <span className="absolute left-2.5 top-2.5 rounded-full bg-white/92 px-2.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-ink backdrop-blur-sm">{cat(g)}</span>
                        </span>
                        <span className="flex flex-1 flex-col p-4">
                          <span className="line-clamp-2 block font-serif text-lg leading-snug text-ink transition-colors group-hover:text-coral">{g.title}</span>
                          <span className="mt-1.5 line-clamp-2 block text-[0.8125rem] leading-relaxed text-[#666666]">{g.snippet}</span>
                          <span className="mt-auto flex items-center gap-1 pt-3 text-xs text-[#888888]">
                            <span className="truncate">{meta(g)}</span>
                            <Icon name="arrowRight" size={12} className="ml-auto shrink-0 text-[#BBBBBB] transition-all group-hover:translate-x-0.5 group-hover:text-coral" />
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}

        {/* 3. Ask the planner */}
        <AiBanner
          className="mt-16"
          title="Can’t find your answer?"
          accent="answer"
          text="Ask the AI planner. It answers from these guides first and shows its sources for anything it looks up."
          chipsLabel="Start with a topic"
          chips={data.categories.slice(0, 5).map((c) => ({ key: c.key, label: c.label, icon: c.icon as Name, prompt: `Give me a travel guide for a ${c.label.toLowerCase()} trip in India` }))}
          cta={{ label: "Ask the planner", prompt: "Help me plan a trip in India" }}
          question="Which guide should I read first for my trip?"
          answer="Start with these guides from this page:"
          picks={filteredGuides.filter((g) => g.image).slice(0, 3).map((g) => ({ href: g.href, name: g.title, meta: cat(g), image: g.image }))}
          replayKey={listKey}
          onAsk={handleStartPlan}
        />

        {/* 4. How our guides are made */}
        <ul className="mt-10 grid gap-4 rounded-3xl bg-[#FAF9F5] p-6 sm:grid-cols-3 sm:p-8">
          {([
            { icon: "checkCircle", title: "Official sources", text: "Facts checked against official tourism sites, UNESCO and government data." },
            { icon: "clock", title: "Honest estimates", text: "Prices and travel times are marked as estimates; hours only from official sources." },
            { icon: "book", title: "Editor approved", text: "An editor approves every section, and each guide lists its sources." },
          ] as const).map((w) => (
            <li key={w.title} className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-coral shadow-xs"><Icon name={w.icon} size={17} /></span>
              <span>
                <span className="block text-sm font-semibold text-ink">{w.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[#666666]">{w.text}</span>
              </span>
            </li>
          ))}
          <li className="sm:col-span-3"><Link href="/sources" className="text-xs font-semibold text-coral hover:underline">Our sources policy →</Link></li>
        </ul>
      </main>

      <AiPlannerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialPrompt={activePrompt} />
    </div>
  );
}

/** The page with `?tab=` applied (read in the browser, so the server page stays cacheable). */
export function TravelGuidesPageFromUrl({ data, hero }: { data: TravelGuidesData; hero: PageHero }) {
  const tab = useSearchParams().get("tab");
  return <TravelGuidesPage key={tab ?? ""} data={data} hero={hero} initialTab={tab === "articles" || tab === "destinations" ? tab : undefined} />;
}
