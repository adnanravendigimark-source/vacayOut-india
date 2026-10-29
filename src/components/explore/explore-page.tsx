"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Icon, type Name } from "@/components/icons/icon";
import type { ExploreData } from "@/lib/places/public-lists";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";

export type PageHero = { src: string; alt: string; caption: string; credit: string; creditUrl: string; license: string; licenseUrl: string };

const REGION_ORDER = ["north", "central", "east", "west", "south", "northeast", "islands"] as const;

export function ExplorePage({ data, hero, initialRegion = "all" }: { data: ExploreData; hero: PageHero; initialRegion?: string }) {
  const tabs = useMemo(
    () => [
      { key: "all", label: `All (${data.states.length})` },
      ...REGION_ORDER.flatMap((k) => {
        const z = data.zones.find((x) => x.key === k);
        return z ? [{ key: z.key as string, label: `${z.label} (${z.count})` }] : [];
      }),
    ],
    [data],
  );
  const [selectedRegion, setSelectedRegion] = useState(tabs.some((t) => t.key === initialRegion) ? initialRegion : "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string | undefined>(undefined);

  const handleOpenAi = (prompt: string) => {
    setActivePrompt(prompt);
    setIsModalOpen(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      handleOpenAi(`Plan a trip exploring ${q}`);
    }
  };

  // Filter published states by region & search query
  const filteredStates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.states.filter((item) => (selectedRegion === "all" || item.zone === selectedRegion) && (!q || item.name.toLowerCase().includes(q)));
  }, [data, selectedRegion, searchQuery]);

  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(filteredStates.length / ITEMS_PER_PAGE) || 1;
  const paginatedStates = filteredStates.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="bg-white min-h-screen">
      {/* 1. Panoramic Photographic Hero Banner */}
      <section className="relative isolate flex min-h-[440px] sm:min-h-[480px] lg:min-h-[520px] w-full items-center overflow-hidden">
        {/* Background Image: Udaipur Lake Pichola & City Palace at Sunset */}
        <div className="absolute inset-0 -z-20">
          <Image
            src={hero.src}
            alt={hero.alt}
            fill
            priority
            className="object-cover object-[center_35%]"
          />
        </div>

        {/* Gradient Overlay for Readability */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/45 to-transparent sm:w-3/4"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-24 -z-10 bg-gradient-to-t from-black/60 to-transparent"
        />

        {/* Hero Content */}
        <div className="container-site relative z-10 pt-20 pb-12 sm:pt-24 sm:pb-16 text-white">
          <div className="max-w-2xl">
            <p className="text-[0.6875rem] sm:text-xs font-bold tracking-[0.2em] uppercase text-white/90 mb-2">
              DISCOVER INCREDIBLE PLACES
            </p>
            <h1 className="font-serif text-[clamp(2.5rem,5vw,3.75rem)] font-bold tracking-tight text-white leading-[1.08] drop-shadow-sm">
              Explore India
            </h1>
            <p className="mt-3 text-sm sm:text-base text-white/85 leading-relaxed drop-shadow-xs max-w-xl">
              From snow-capped mountains to golden beaches, ancient temples to vibrant cities — discover the best destinations across India.
            </p>

            {/* Search Capsule Input */}
            <form
              onSubmit={handleSearchSubmit}
              className="mt-6 flex max-w-lg items-center gap-2 rounded-full bg-white p-1.5 pl-4 sm:pl-5 shadow-lg"
            >
              <Icon name="search" size={18} className="text-[#666666] shrink-0" />
              <label htmlFor="explore-search-input" className="sr-only">
                Search states, cities or destinations...
              </label>
              <input
                id="explore-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search states, cities or destinations..."
                className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-ink outline-none placeholder:text-[#888888] font-medium py-1.5"
              />
              <button
                type="submit"
                aria-label="Search or plan with AI"
                className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-full bg-[#234832] text-white hover:bg-[#1A3826] transition-transform active:scale-95 shadow-xs"
              >
                <Icon name="arrowRight" size={16} strokeWidth={2.2} />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom-right photo credit badge matching screenshot */}
        <div className="absolute right-4 bottom-4 sm:right-8 sm:bottom-6 z-10 text-right text-[0.6875rem] text-white/80 drop-shadow-xs">
          <p className="flex items-center gap-1 justify-end font-medium">
            <Icon name="pin" size={11} className="text-coral" />
            <span>{hero.caption}</span>
          </p>
          <p className="text-white/60 text-[0.625rem]">
            Photo: <a href={hero.creditUrl} target="_blank" rel="nofollow noopener noreferrer" className="underline">{hero.credit}</a> ·{" "}
            <a href={hero.licenseUrl} target="_blank" rel="license nofollow noopener noreferrer" className="underline">{hero.license}</a>
          </p>
        </div>
      </section>

      {/* 2. Main Two-Column Content Area */}
      <div className="container-site py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Main Left Column (Grid of States & Tabs) */}
          <main className="lg:col-span-8 xl:col-span-9">
            {/* Section Title */}
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink font-sans">
              Browse by State &amp; Union Territory
            </h2>

            {/* Region Filter Tabs / Pills matching screenshot */}
            <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {tabs.map((tab) => {
                const isActive = selectedRegion === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setSelectedRegion(tab.key);
                      setCurrentPage(1);
                    }}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-[#234832] text-white shadow-xs"
                        : "border border-[#E5E2DC] bg-white text-ink/80 hover:border-ink hover:text-ink shadow-xs"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* 4-Column Grid of State Cards */}
            {data.states.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-[#E5E2DC] bg-[#FAF9F5] px-6 py-16 text-center text-[#777777]">
                <p className="text-base font-semibold text-ink">Our destination guides are being researched and reviewed.</p>
                <p className="mt-1 text-xs">Each guide is checked against official sources and approved by an editor before it appears here. Meanwhile, our AI planner can help you plan.</p>
                <button
                  type="button"
                  onClick={() => handleOpenAi("Help me plan a trip in India")}
                  className="mt-4 rounded-full bg-[#234832] text-white px-4 py-1.5 text-xs font-semibold"
                >
                  Plan with AI
                </button>
              </div>
            ) : paginatedStates.length === 0 ? (
              <div className="py-16 text-center text-[#777777]">
                <p className="text-base font-semibold text-ink">No states match your search.</p>
                <p className="mt-1 text-xs">Try selecting “All” or clearing your search term.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRegion("all");
                    setSearchQuery("");
                  }}
                  className="mt-4 rounded-full bg-[#234832] text-white px-4 py-1.5 text-xs font-semibold"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
                {paginatedStates.map((st) => (
                  <Link
                    key={st.slug}
                    href={`/india/${st.slug}`}
                    className="group flex flex-col rounded-xl border border-[#ECE9E2] bg-white shadow-xs hover:border-coral hover:shadow-md transition-all overflow-hidden cursor-pointer"
                  >
                    {/* Card Thumbnail */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#EFECE6]">
                      {st.image ? (
                        <Image
                          src={st.image.url}
                          alt={st.image.alt}
                          fill
                          sizes="(min-width: 1280px) 20vw, (min-width: 768px) 25vw, 50vw"
                          className="object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center text-[#B9B4AA]"><Icon name="mountain" size={28} /></span>
                      )}
                      {st.image?.kind === "ai_generated" ? <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white">AI illustration</span> : null}
                    </div>

                    {/* Card Info */}
                    <div className="p-3">
                      <h3 className="text-xs sm:text-sm font-bold text-ink group-hover:text-coral transition-colors truncate">
                        {st.name}
                      </h3>
                      <p className="mt-0.5 flex items-center gap-1 text-[0.6875rem] sm:text-xs text-[#777777]">
                        <Icon name="pin" size={11} className="text-[#999999] shrink-0" />
                        <span>{st.destinationsCount ? `${st.destinationsCount} guide${st.destinationsCount === 1 ? "" : "s"} inside` : "State guide"}</span>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination Controls matching screenshot */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pNum = i + 1;
                  const isCurrent = currentPage === pNum;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setCurrentPage(pNum)}
                      className={`size-8 rounded-full text-xs font-bold transition-all flex items-center justify-center ${
                        isCurrent
                          ? "bg-[#234832] text-white shadow-xs"
                          : "border border-[#E5E2DC] bg-white text-ink hover:border-ink"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                {currentPage < totalPages && (
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    aria-label="Next page"
                    className="size-8 rounded-full border border-[#E5E2DC] bg-white text-ink hover:border-ink flex items-center justify-center transition-all"
                  >
                    <Icon name="arrowRight" size={12} />
                  </button>
                )}
              </div>
            )}
          </main>

          {/* Right Sidebar Column (3 Widgets) */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-6">
            {/* Widget 1: 36 States & Union Territories Map Card */}
            <div className="rounded-2xl border border-[#E5E2DC] bg-[#F7F9F6] p-5 shadow-xs flex flex-col justify-between">
              {/* Soft Green India Map Silhouette */}
              <div className="relative flex items-center justify-center py-2">
                <svg
                  viewBox="0 0 200 240"
                  className="w-full h-auto max-h-[160px] opacity-85 drop-shadow-xs"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M85 20 C90 15, 105 15, 110 25 C115 35, 120 45, 110 55 C100 65, 85 65, 80 55 C75 45, 80 25, 85 20 Z"
                    fill="#CDE2D3"
                    stroke="#A5C9B7"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M60 60 C70 55, 110 55, 115 75 C110 95, 100 110, 75 115 C55 110, 45 90, 55 75 C60 65, 60 60, 60 60 Z"
                    fill="#D8E8DC"
                    stroke="#BED6C4"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M75 115 C100 110, 130 115, 135 145 C130 170, 100 175, 80 165 C65 155, 60 130, 75 115 Z"
                    fill="#C2DDD0"
                    stroke="#A5C9B7"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M145 75 C165 70, 190 75, 190 95 C190 115, 165 125, 145 110 C135 100, 135 85, 145 75 Z"
                    fill="#D8E8DC"
                    stroke="#BED6C4"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M80 165 C100 175, 125 170, 115 205 C105 235, 95 240, 90 240 C85 240, 75 235, 70 205 C65 185, 75 170, 80 165 Z"
                    fill="#B5D6C5"
                    stroke="#98BFAC"
                    strokeWidth="1.2"
                  />
                </svg>
              </div>

              <div className="mt-3">
                <h3 className="text-sm sm:text-base font-bold text-ink">
                  {data.states.length} {data.states.length === 1 ? "state" : "states"} with published guides
                </h3>
                <p className="mt-1 text-xs text-[#666666] leading-relaxed">
                  {data.placeCount} reviewed guide{data.placeCount === 1 ? "" : "s"} so far. Every guide is checked against official sources before it goes live.
                </p>

                <button
                  type="button"
                  onClick={() => handleOpenAi("Give me a complete regional overview of travel destinations in India by state")}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#D5DCD4] bg-white px-3.5 py-1.5 text-xs font-semibold text-ink shadow-xs hover:border-[#234832] hover:text-[#234832] transition-all"
                >
                  <Icon name="compass" size={14} className="text-[#234832]" />
                  <span>View Indian map</span>
                  <Icon name="arrowRight" size={11} />
                </button>
              </div>
            </div>

            {/* Widget 2: Popular Travel Interests (counts of published guides) */}
            {data.interests.length ? (
              <div className="rounded-2xl border border-[#E5E2DC] bg-white p-5 shadow-xs">
                <h3 className="text-sm sm:text-base font-bold text-ink mb-3.5">
                  Popular Travel Interests
                </h3>

                <div className="space-y-1">
                  {data.interests.map((interest) => (
                    <button
                      key={interest.key}
                      type="button"
                      onClick={() => handleOpenAi(interest.prompt)}
                      className="group flex w-full items-center justify-between p-2 rounded-xl hover:bg-[#F7F9F6] transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#FAF8F5] text-ink group-hover:text-coral transition-colors">
                          <Icon name={interest.icon as Name} size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-ink group-hover:text-coral transition-colors truncate">
                            {interest.label}
                          </p>
                          <p className="text-[0.6875rem] text-[#777777] truncate">
                            {interest.count} guide{interest.count === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                      <Icon
                        name="arrowRight"
                        size={12}
                        className="text-[#AAAAAA] group-hover:text-coral group-hover:translate-x-0.5 transition-all shrink-0 ml-1"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Widget 3: Plan your perfect trip with AI */}
            <div className="relative overflow-hidden rounded-2xl border border-[#D5E5DA] bg-gradient-to-br from-[#EEF5F0] via-[#E8F2EC] to-[#E2EFE7] p-5 shadow-xs">
              <div className="relative z-10">
                <h3 className="text-base font-bold text-ink leading-tight">
                  Plan your perfect trip with AI
                </h3>
                <p className="mt-2 text-xs text-[#55695A] leading-relaxed">
                  Get personalised itineraries, budget estimates and local tips for your next adventure.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenAi("Help me plan my next dream trip across India with AI")}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#234832] hover:bg-[#1A3826] text-white px-4 py-2 text-xs font-semibold shadow-xs transition-all active:scale-95"
                >
                  <span>Start planning</span>
                  <Icon name="arrowRight" size={12} strokeWidth={2.2} />
                </button>
              </div>

              {/* Decorative scenic mountain background in bottom right */}
              <div className="absolute right-0 bottom-0 size-28 opacity-15 pointer-events-none -mr-4 -mb-4">
                <Icon name="mountain" size={112} className="text-[#234832]" />
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Interactive AI Travel Planner Modal Dialog */}
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
