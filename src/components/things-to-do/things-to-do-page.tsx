"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Icon, type Name } from "@/components/icons/icon";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";
import type { PageHero } from "@/components/explore/explore-page";
import type { ThingsToDoData } from "@/lib/places/public-lists";
import { TRIP_TYPES } from "@/lib/places/trip-types";

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

export function ThingsToDoPage({ data, hero }: { data: ThingsToDoData; hero: PageHero }) {
  const [activeCategory, setActiveCategory] = useState("all");
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

  const pills = [{ id: "all", label: "All" }, ...data.categories.map((c) => ({ id: c.key, label: c.label }))];

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return data.items.filter(
      (item) =>
        (activeCategory === "all" || item.tripTypes.includes(activeCategory)) &&
        (!q || item.name.toLowerCase().includes(q) || item.location.toLowerCase().includes(q) || (item.summary ?? "").toLowerCase().includes(q)),
    );
  }, [activeCategory, searchQuery, data.items]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Typing filters the list below; submitting with no match asks the AI planner instead.
    if (searchQuery.trim() && filtered.length === 0) handleStartPlan(`Things to do in India: ${searchQuery.trim()}`);
  };

  const popular = data.items.filter((i) => i.image).slice(0, 5);
  const featured = data.items.filter((i) => i.featured).slice(0, 5);

  return (
    <div className="min-h-screen bg-white">
      {/* 1. Panoramic Hero Section */}
      <header className="relative min-h-[380px] sm:min-h-[460px] lg:min-h-[500px] w-full overflow-hidden bg-ink">
        <Image src={hero.src} alt={hero.alt} fill priority sizes="100vw" className="object-cover object-center brightness-[0.88]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/25" />

        <div className="container-site relative z-10 flex min-h-[380px] sm:min-h-[460px] lg:min-h-[500px] flex-col justify-end pb-8 pt-10 sm:pb-12">
          <div className="max-w-3xl">
            <p className="text-xs sm:text-[0.8125rem] font-bold tracking-widest text-white/90 uppercase mb-2">EXPLORE BY INTEREST</p>
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white drop-shadow-sm">Things to Do in India</h1>
            <p className="mt-2.5 max-w-2xl text-sm sm:text-base lg:text-lg text-white/95 leading-relaxed drop-shadow-xs">
              From majestic mountains to pristine beaches, sacred temples to thrilling adventures – find experiences that match your travel style.
            </p>

            <form onSubmit={handleSearchSubmit} className="mt-6 max-w-xl" role="search">
              <div className="relative flex items-center">
                <Icon name="search" size={18} className="absolute left-4 text-[#777777] pointer-events-none" />
                <label htmlFor="ttd-search" className="sr-only">Search activities, interests or destinations</label>
                <input
                  id="ttd-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search activities, interests or destinations..."
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

      {/* 2. Filter Pills Navigation Bar */}
      {pills.length > 1 ? (
        <section className="border-b border-[#ECE9E2] bg-white py-4 sm:py-5">
          <div className="container-site">
            <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] pb-1">
              {pills.map((pill) => {
                const isActive = activeCategory === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      setActiveCategory(pill.id);
                      setSearchQuery("");
                    }}
                    aria-pressed={isActive}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                      isActive ? "bg-ink text-white shadow-xs" : "border border-[#E5E2DA] bg-[#FAF9F5] text-[#444444] hover:bg-white hover:text-ink hover:border-[#D0CBC0]"
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* 3. Main 2-Column Content Area */}
      <main className="container-site py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          <div className="lg:col-span-8">
            <div className="mb-6">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">Explore by Interest</h2>
              <p className="mt-1.5 text-xs sm:text-sm text-[#666666]">
                Attractions and experiences with a reviewed guide — opening hours, entry rules and tips where an official source confirms them.
              </p>
            </div>

            {data.items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#DCD7CE] bg-[#FAF9F5] p-10 text-center">
                <p className="text-sm font-semibold text-ink">Experiences are being researched and reviewed.</p>
                <p className="mt-1 text-xs text-[#666666]">Each one is checked against official sources and approved by an editor before it appears here.</p>
                <button type="button" onClick={() => handleStartPlan("Suggest things to do in India based on my interests")} className="mt-4 rounded-full bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white">
                  Ask the AI planner
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
                {filtered.map((item) => (
                  <Link key={item.href} href={item.href} className="group flex flex-col overflow-hidden rounded-2xl border border-[#ECE9E2] bg-white shadow-2xs hover:shadow-card transition-all text-left">
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#ECE9E2]">
                      <Thumb item={item} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 95vw" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                      <div className="absolute bottom-2.5 left-2.5 flex size-7 items-center justify-center rounded-lg bg-white/90 text-ink shadow-xs backdrop-blur-xs">
                        <Icon name={iconFor(item.tripTypes)} size={15} className="text-coral" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3.5">
                      <div className="min-w-0 pr-2">
                        <h3 className="font-bold text-sm text-ink group-hover:text-coral transition-colors truncate">{item.name}</h3>
                        <p className="text-[0.6875rem] text-[#777777] mt-0.5 truncate">{item.kindLabel} · {item.location}</p>
                      </div>
                      <span className="text-[#888888] group-hover:text-coral group-hover:translate-x-0.5 transition-all text-sm shrink-0">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {data.items.length > 0 && filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#DCD7CE] p-10 text-center">
                <p className="text-sm font-semibold text-ink">No experiences matched your search.</p>
                <div className="mt-3 flex justify-center gap-4">
                  <button type="button" onClick={() => { setActiveCategory("all"); setSearchQuery(""); }} className="text-xs font-bold text-coral hover:underline">Clear filters</button>
                  {searchQuery.trim() ? <button type="button" onClick={() => handleStartPlan(`Things to do in India: ${searchQuery.trim()}`)} className="text-xs font-bold text-coral hover:underline">Ask the AI planner</button> : null}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sidebar Widgets */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            <div className="flex flex-col items-center text-center rounded-2xl border border-[#DCE8D8] bg-[#F1F6EE] p-6 shadow-2xs">
              <div className="flex size-12 items-center justify-center rounded-full bg-white text-[#1B4332] shadow-xs mb-3">
                <Icon name="compass" size={24} className="text-[#2C6E49]" />
              </div>
              <h3 className="font-serif text-lg font-bold text-ink">Not sure what to choose?</h3>
              <p className="mt-2 text-xs sm:text-[0.8125rem] text-[#555555] leading-relaxed max-w-xs">Let our AI trip planner suggest experiences based on your interests, budget and travel style.</p>
              <button type="button" onClick={() => handleStartPlan("Help me choose the best destinations and things to do in India based on my travel style")} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1B4332] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-[#143325] transition-colors">
                <span>Plan a trip with AI</span>
                <span className="text-coral">→</span>
              </button>
            </div>

            {popular.length ? (
              <div className="rounded-2xl border border-[#ECE9E2] bg-white p-5 shadow-2xs">
                <h3 className="font-serif text-lg font-bold text-ink mb-4">Popular Things to Do</h3>
                <div className="space-y-3">
                  {popular.map((act) => (
                    <Link key={act.href} href={act.href} className="group flex w-full items-center justify-between gap-3 text-left p-1.5 rounded-xl hover:bg-[#FAF9F5] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative size-12 shrink-0 rounded-lg overflow-hidden bg-[#ECE9E2]">
                          {act.image ? <Image src={act.image.url} alt="" fill sizes="48px" className="object-cover" /> : null}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-[0.8125rem] font-bold text-ink group-hover:text-coral transition-colors truncate">{act.name}</p>
                          <p className="text-[0.6875rem] text-[#777777] mt-0.5 truncate">{act.location}</p>
                        </div>
                      </div>
                      <span className="text-[#AAAAAA] group-hover:text-coral group-hover:translate-x-0.5 transition-all text-sm shrink-0 pr-1">›</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-[#ECE9E2] bg-[#FAF9F5] p-5 shadow-2xs">
              <div className="flex items-center gap-2 mb-3.5">
                <Icon name="compass" size={16} className="text-[#2C6E49]" />
                <h3 className="font-serif text-sm sm:text-base font-bold text-ink">Why explore with VacayOut?</h3>
              </div>
              <ul className="space-y-2 text-xs text-[#555555]">
                {WHY.map((reason) => (
                  <li key={reason} className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold shrink-0">✓</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3.5 pt-3 border-t border-[#ECE9E2]">
                <Link href="/about" className="text-xs font-bold text-coral hover:underline inline-flex items-center gap-1">Learn more →</Link>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* 4. Featured Experiences (editor-featured, published) */}
      {featured.length ? (
        <section className="border-t border-[#ECE9E2] bg-[#FAF9F5] py-10 sm:py-14">
          <div className="container-site">
            <div className="mb-6">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">Featured Experiences</h2>
              <p className="mt-1 text-xs sm:text-sm text-[#666666]">Unique experiences and must-do activities across India.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {featured.map((exp) => (
                <Link key={exp.href} href={exp.href} className="group flex flex-col overflow-hidden rounded-xl border border-[#ECE9E2] bg-white shadow-2xs hover:shadow-card transition-all text-left">
                  <div className="relative aspect-[16/11] w-full overflow-hidden bg-[#ECE9E2]">
                    <Thumb item={exp} sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw" />
                  </div>
                  <div className="p-3 flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="font-bold text-xs sm:text-sm text-ink group-hover:text-coral transition-colors truncate">{exp.name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-[0.6875rem] text-[#666666] truncate">
                        <Icon name="pin" size={11} className="text-coral shrink-0" />
                        <span className="truncate">{exp.location}</span>
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {TRIP_TYPES.filter((t) => exp.tripTypes.includes(t.key)).slice(0, 2).map((t) => (
                        <span key={t.key} className="rounded-md bg-[#F2EFE9] px-1.5 py-0.5 text-[0.625rem] font-semibold text-[#555555]">{t.label}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <AiPlannerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialPrompt={activePrompt} />
    </div>
  );
}
