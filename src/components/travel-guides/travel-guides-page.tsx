"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Icon, type Name } from "@/components/icons/icon";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";
import type { PageHero } from "@/components/explore/explore-page";
import type { TravelGuidesData } from "@/lib/places/public-lists";
import { TRIP_TYPES } from "@/lib/places/trip-types";

const fmt = (d: Date | string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const categoryOf = (tripTypes: string[]) => TRIP_TYPES.find((t) => tripTypes.includes(t.key))?.label ?? null;

export function TravelGuidesPage({ data, hero }: { data: TravelGuidesData; hero: PageHero }) {
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
    return data.guides.filter(
      (g) =>
        (!activeCategory || g.tripTypes.includes(activeCategory)) &&
        (!q || g.title.toLowerCase().includes(q) || g.name.toLowerCase().includes(q) || g.snippet.toLowerCase().includes(q) || g.stateName.toLowerCase().includes(q)),
    );
  }, [activeCategory, searchQuery, data.guides]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && filteredGuides.length === 0) handleStartPlan(`Travel guide: ${searchQuery.trim()}`);
  };

  const popular = [...data.guides.filter((g) => g.featured), ...data.guides.filter((g) => !g.featured)].slice(0, 5);

  return (
    <div className="min-h-screen bg-white">
      {/* 1. Photographic Panoramic Hero Section */}
      <header className="relative min-h-[380px] sm:min-h-[460px] lg:min-h-[500px] w-full overflow-hidden bg-ink">
        <Image src={hero.src} alt={hero.alt} fill priority sizes="100vw" className="object-cover object-center brightness-[0.85]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/25" />

        <div className="container-site relative z-10 flex min-h-[380px] sm:min-h-[460px] lg:min-h-[500px] flex-col justify-end pb-8 pt-10 sm:pb-12">
          <div className="max-w-3xl">
            <p className="text-xs sm:text-[0.8125rem] font-bold tracking-widest text-white/90 uppercase mb-2">TRAVEL GUIDES</p>
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white drop-shadow-sm">Plan Smarter, Travel Better</h1>
            <p className="mt-2.5 max-w-2xl text-sm sm:text-base lg:text-lg text-white/95 leading-relaxed drop-shadow-xs">
              In-depth guides, local tips and practical advice to help you explore India&apos;s most incredible destinations with confidence.
            </p>

            <form onSubmit={handleSearchSubmit} className="mt-6 max-w-xl" role="search">
              <div className="relative flex items-center">
                <Icon name="search" size={18} className="absolute left-4 text-[#777777] pointer-events-none" />
                <label htmlFor="guides-search" className="sr-only">Search destinations or guides</label>
                <input
                  id="guides-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search destinations or guides..."
                  className="w-full rounded-full border border-white/20 bg-white/95 py-3 pl-11 pr-14 text-xs sm:text-sm text-ink placeholder:text-[#888888] shadow-md backdrop-blur-xs transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-coral"
                />
                <button type="submit" aria-label="Search" className="absolute right-2 flex size-8 items-center justify-center rounded-full bg-[#1B4332] text-white hover:bg-[#143325] transition-colors shadow-xs">
                  <Icon name="arrowRight" size={15} />
                </button>
              </div>
            </form>
          </div>

          <div className="absolute bottom-4 right-4 sm:right-8 text-right hidden sm:block text-[0.6875rem] text-white/75">
            <p>{hero.caption}</p>
            <p>
              Photo: <a href={hero.creditUrl} target="_blank" rel="nofollow noopener noreferrer" className="underline hover:text-white">{hero.credit}</a> ·{" "}
              <a href={hero.licenseUrl} target="_blank" rel="license nofollow noopener noreferrer" className="underline hover:text-white">{hero.license}</a>
            </p>
          </div>
        </div>
      </header>

      {/* 2. Main 2-Column Content Area */}
      <main className="container-site py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">Latest Travel Guides</h2>
                <p className="mt-1 text-xs sm:text-sm text-[#666666]">Guides with practical tips and sources, reviewed by an editor before publishing.</p>
              </div>
              {activeCategory && (
                <button type="button" onClick={() => setActiveCategory(null)} className="text-xs font-bold text-coral hover:underline shrink-0">
                  Reset filter ✕
                </button>
              )}
            </div>

            {data.guides.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#DCD7CE] bg-[#FAF9F5] p-10 text-center">
                <p className="text-sm font-semibold text-ink">Our travel guides are being researched and reviewed.</p>
                <p className="mt-1 text-xs text-[#666666]">Every guide is checked against official sources and approved by an editor before it appears here.</p>
                <button type="button" onClick={() => handleStartPlan("Help me plan a trip in India")} className="mt-4 rounded-full bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white">
                  Ask the AI planner
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
                {filteredGuides.map((guide) => {
                  const cat = categoryOf(guide.tripTypes) ?? guide.kindLabel;
                  return (
                    <article key={guide.href} className="group flex flex-col overflow-hidden rounded-2xl border border-[#ECE9E2] bg-white shadow-2xs hover:shadow-card transition-all">
                      <Link href={guide.href} className="relative aspect-[16/10] w-full overflow-hidden bg-[#ECE9E2] block" tabIndex={-1} aria-hidden>
                        {guide.image ? (
                          <Image src={guide.image.url} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 95vw" className="object-cover transition-transform duration-500 ease-out group-hover:scale-106" />
                        ) : (
                          <span className="flex size-full items-center justify-center text-[#B9B4AA]"><Icon name="book" size={26} /></span>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />
                        <div className="absolute top-2.5 left-2.5">
                          <span className="inline-block rounded-md bg-white/95 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-ink shadow-xs backdrop-blur-xs">{cat}</span>
                        </div>
                        {guide.image?.kind === "ai_generated" ? <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white">AI illustration</span> : null}
                      </Link>

                      <div className="p-4 flex flex-col justify-between flex-1">
                        <div>
                          <Link href={guide.href}>
                            <h3 className="font-bold text-sm sm:text-[0.9375rem] text-ink leading-snug group-hover:text-coral transition-colors line-clamp-2">{guide.title}</h3>
                          </Link>
                          <p className="mt-2 text-xs text-[#666666] leading-relaxed line-clamp-3">{guide.snippet}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#F0ECE4]">
                          <div className="flex items-center gap-1.5 text-[0.6875rem] text-[#888888]">
                            <Icon name="user" size={12} className="text-[#888888]" />
                            <span>VacayOut editors</span>
                            <span>•</span>
                            <span>{fmt(guide.publishedAt)}</span>
                          </div>
                          <div className="mt-2.5">
                            <Link href={guide.href} className="inline-flex items-center gap-1 text-xs font-semibold text-coral hover:underline">
                              <span>Read the guide</span>
                              <span>→</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {data.guides.length > 0 && filteredGuides.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#DCD7CE] p-10 text-center">
                <p className="text-sm font-semibold text-ink">No travel guides matched your search.</p>
                <div className="mt-3 flex justify-center gap-4">
                  <button type="button" onClick={() => { setActiveCategory(null); setSearchQuery(""); }} className="text-xs font-bold text-coral hover:underline">Clear all filters</button>
                  {searchQuery.trim() ? <button type="button" onClick={() => handleStartPlan(`Travel guide: ${searchQuery.trim()}`)} className="text-xs font-bold text-coral hover:underline">Ask the AI planner</button> : null}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sidebar Widgets */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            {data.categories.length ? (
              <div className="rounded-2xl border border-[#ECE9E2] bg-white p-5 shadow-2xs">
                <h3 className="font-serif text-lg font-bold text-ink mb-3.5">Browse by Category</h3>
                <ul className="divide-y divide-[#F0ECE4]">
                  {data.categories.map((cat) => {
                    const isSelected = activeCategory === cat.key;
                    return (
                      <li key={cat.key}>
                        <button
                          type="button"
                          onClick={() => setActiveCategory(isSelected ? null : cat.key)}
                          aria-pressed={isSelected}
                          className={`flex w-full items-center justify-between py-2.5 text-xs sm:text-sm font-medium transition-colors hover:text-coral ${isSelected ? "text-coral font-bold" : "text-ink"}`}
                        >
                          <span className="flex items-center gap-2.5">
                            <Icon name={cat.icon as Name} size={16} className={isSelected ? "text-coral" : "text-[#777777]"} />
                            <span>{cat.label}</span>
                          </span>
                          <span className="flex items-center gap-1 text-xs text-[#888888]">
                            <span>{cat.count}</span>
                            <span className="text-[#AAAAAA]">›</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {/* How our guides are made (replaces a newsletter form that had no backend) */}
            <div className="rounded-2xl border border-[#DCE8D8] bg-[#F1F6EE] p-6 shadow-2xs">
              <h3 className="font-serif text-base sm:text-lg font-bold text-ink">How our guides are made</h3>
              <ul className="mt-3 space-y-2 text-xs text-[#555555] leading-relaxed">
                <li className="flex gap-2"><span className="font-bold text-emerald-700">✓</span>Facts are checked against official tourism sites, UNESCO, government data and attraction websites.</li>
                <li className="flex gap-2"><span className="font-bold text-emerald-700">✓</span>Prices and travel times are marked as estimates; opening hours appear only when an official source states them.</li>
                <li className="flex gap-2"><span className="font-bold text-emerald-700">✓</span>An editor approves every section, and each guide lists its sources.</li>
              </ul>
              <Link href="/sources" className="mt-3 inline-block text-xs font-bold text-coral hover:underline">Our sources policy →</Link>
            </div>

            {popular.length ? (
              <div className="rounded-2xl border border-[#ECE9E2] bg-white p-5 shadow-2xs">
                <h3 className="font-serif text-lg font-bold text-ink mb-4">Popular Guides</h3>
                <div className="space-y-3">
                  {popular.map((guide) => (
                    <Link key={guide.href} href={guide.href} className="group flex items-center gap-3 p-1 rounded-xl hover:bg-[#FAF9F5] transition-colors">
                      <div className="relative size-12 shrink-0 rounded-lg overflow-hidden bg-[#ECE9E2]">
                        {guide.image ? <Image src={guide.image.url} alt="" fill sizes="48px" className="object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-[0.8125rem] font-bold text-ink group-hover:text-coral transition-colors truncate">{guide.name} travel guide</p>
                        <p className="text-[0.6875rem] text-[#888888] mt-0.5">{fmt(guide.publishedAt)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-[#ECE9E2] bg-[#FAF9F5] p-5 shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="compass" size={16} className="text-[#2C6E49]" />
                <h4 className="font-serif text-sm font-bold text-ink">Have a specific destination in mind?</h4>
              </div>
              <p className="text-xs text-[#555555] leading-relaxed">Use our AI trip planner to get a personalised plan with recommendations, tips and more.</p>
              <button type="button" onClick={() => handleStartPlan("Help me plan an in-depth travel guide for my destination")} className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white hover:bg-[#143325] transition-colors">
                <span>Plan with AI</span>
                <span className="text-coral">→</span>
              </button>
            </div>
          </aside>
        </div>
      </main>

      <AiPlannerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialPrompt={activePrompt} />
    </div>
  );
}
