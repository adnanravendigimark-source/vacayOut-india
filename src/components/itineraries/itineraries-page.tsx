"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Icon } from "@/components/icons/icon";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";
import type { PageHero } from "@/components/explore/explore-page";
import type { CardImage } from "@/lib/places/public-lists";
import { TRIP_TYPES } from "@/lib/places/trip-types";

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
  { id: "all", label: "All", test: () => true },
  { id: "2-3", label: "2–3 Days", test: (d: number) => d >= 2 && d <= 3 },
  { id: "4-5", label: "4–5 Days", test: (d: number) => d >= 4 && d <= 5 },
  { id: "6-7", label: "6–7 Days", test: (d: number) => d >= 6 && d <= 7 },
  { id: "1week", label: "1 Week +", test: (d: number) => d >= 7 },
];

const labelOf = (key: string) => TRIP_TYPES.find((t) => t.key === key)?.label ?? key;

export function ItinerariesPage({ itineraries, hero }: { itineraries: ItineraryCard[]; hero: PageHero }) {
  const [activePill, setActivePill] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("all");
  const [selectedTripTypes, setSelectedTripTypes] = useState<string[]>([]);
  const [destination, setDestination] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string | undefined>(undefined);

  const handleStartPlan = (prompt: string) => {
    setActivePrompt(prompt);
    setIsModalOpen(true);
  };

  const toggleTripType = (type: string) => setSelectedTripTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));

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
  const pills = [
    ...DURATIONS.slice(0, 4).filter((d) => d.id === "all" || itineraries.some((i) => d.test(i.durationDays))),
    ...typesInUse.slice(0, 5).map((t) => ({ id: t.key, label: t.label })),
  ];
  const destinations = [...new Map(itineraries.map((i) => [i.placeName, i])).values()];

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const pillDur = DURATIONS.find((d) => d.id === activePill);
    const sideDur = DURATIONS.find((d) => d.id === selectedDuration) ?? DURATIONS[0];
    return itineraries.filter(
      (i) =>
        (activePill === "all" || (pillDur ? pillDur.test(i.durationDays) : i.tripTypes.includes(activePill))) &&
        sideDur.test(i.durationDays) &&
        (!selectedTripTypes.length || selectedTripTypes.some((t) => i.tripTypes.includes(t))) &&
        (!destination || i.placeName === destination) &&
        (!q || i.title.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q) || i.placeName.toLowerCase().includes(q) || (i.stateName ?? "").toLowerCase().includes(q)),
    );
  }, [activePill, selectedDuration, selectedTripTypes, destination, searchQuery, itineraries]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && filtered.length === 0) handleStartPlan(`Create an itinerary: ${searchQuery.trim()}`);
  };

  const clearAll = () => {
    setActivePill("all");
    setSelectedDuration("all");
    setSelectedTripTypes([]);
    setDestination("");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 1. Panoramic Hero Section */}
      <header className="relative min-h-[380px] sm:min-h-[460px] lg:min-h-[500px] w-full overflow-hidden bg-ink">
        <Image src={hero.src} alt={hero.alt} fill priority sizes="100vw" className="object-cover object-center brightness-[0.85]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/25" />

        <div className="container-site relative z-10 flex min-h-[380px] sm:min-h-[460px] lg:min-h-[500px] flex-col justify-end pb-8 pt-10 sm:pb-12">
          <div className="max-w-3xl">
            <p className="text-xs sm:text-[0.8125rem] font-bold tracking-widest text-white/90 uppercase mb-2">CURATED TRAVEL PLANS</p>
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white drop-shadow-sm">India Itineraries</h1>
            <p className="mt-2.5 max-w-2xl text-sm sm:text-base lg:text-lg text-white/95 leading-relaxed drop-shadow-xs">
              Ready-made travel plans – from short breaks to week-long trips – with day-wise stops, realistic travel times, estimated budgets and what to book ahead.
            </p>

            <form onSubmit={handleSearchSubmit} className="mt-6 max-w-xl" role="search">
              <div className="relative flex items-center">
                <Icon name="search" size={18} className="absolute left-4 text-[#777777] pointer-events-none" />
                <label htmlFor="it-search" className="sr-only">Search itineraries</label>
                <input
                  id="it-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search itineraries (e.g. 3 days in Jaipur, Kerala...)"
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

      {/* 2. Top Filter Pills Bar */}
      {itineraries.length ? (
        <section className="border-b border-[#ECE9E2] bg-white py-4 sm:py-5">
          <div className="container-site">
            <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] pb-1">
              {pills.map((pill) => {
                const isActive = activePill === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      setActivePill(pill.id);
                      setSearchQuery("");
                    }}
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
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">Popular Itineraries</h2>
            </div>

            {itineraries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#DCD7CE] bg-[#FAF9F5] p-10 text-center">
                <p className="text-sm font-semibold text-ink">Our itineraries are being researched and reviewed.</p>
                <p className="mt-1 text-xs text-[#666666]">Each plan is checked against official sources and approved by an editor before it appears here.</p>
                <button type="button" onClick={() => handleStartPlan("Create a custom day-by-day travel itinerary for my trip to India")} className="mt-4 rounded-full bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white">
                  Plan my trip with AI
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
                {filtered.map((it) => (
                  <article key={it.slug} className="group flex flex-col overflow-hidden rounded-2xl border border-[#ECE9E2] bg-white shadow-2xs hover:shadow-card transition-all">
                    <Link href={`/itineraries/${it.slug}`} className="relative aspect-[16/10] w-full overflow-hidden bg-[#ECE9E2] block" tabIndex={-1} aria-hidden>
                      {it.image ? (
                        <Image src={it.image.url} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 95vw" className="object-cover transition-transform duration-500 ease-out group-hover:scale-106" />
                      ) : (
                        <span className="flex size-full items-center justify-center text-[#B9B4AA]"><Icon name="route" size={26} /></span>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />
                      <div className="absolute bottom-2.5 left-2.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-black/75 px-2 py-0.5 text-[0.6875rem] font-bold text-white backdrop-blur-xs">
                          <Icon name="clock" size={12} className="text-coral" />
                          <span>{it.durationDays} {it.durationDays === 1 ? "Day" : "Days"}</span>
                        </span>
                      </div>
                    </Link>

                    <div className="p-4 flex flex-col justify-between flex-1">
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-ink group-hover:text-coral transition-colors line-clamp-2">
                          <Link href={`/itineraries/${it.slug}`}>{it.title}</Link>
                        </h3>
                        <p className="text-xs text-[#777777] mt-0.5 truncate">{it.placeName}{it.stateName && it.stateName !== it.placeName ? `, ${it.stateName}` : ""}</p>
                        {it.tripTypes.length ? <p className="mt-2 text-[0.6875rem] font-medium text-[#555555] line-clamp-1">{it.tripTypes.map(labelOf).join(" • ")}</p> : null}
                        <p className="mt-2 text-xs text-[#666666] leading-relaxed line-clamp-3">{it.summary}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#F0ECE4] grid grid-cols-2 gap-2">
                        <Link href={`/itineraries/${it.slug}`} className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#D5D0C5] bg-[#FAF9F5] px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-white hover:border-ink transition-colors">
                          <Icon name="route" size={12} />
                          <span className="truncate">View itinerary</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleStartPlan(`Customise the VacayOut "${it.title}" itinerary for me`)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#1B4332] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#143325] transition-colors shadow-xs"
                        >
                          <Icon name="sparkles" size={12} className="text-coral" />
                          <span className="truncate">Customise with AI</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {itineraries.length > 0 && filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#DCD7CE] p-10 text-center">
                <p className="text-sm font-semibold text-ink">No itineraries matched your filters.</p>
                <button type="button" onClick={clearAll} className="mt-3 text-xs font-bold text-coral hover:underline">Clear all filters</button>
              </div>
            )}
          </div>

          {/* Right Column: Sidebar Filters & Widgets */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            {itineraries.length ? (
              <div className="rounded-2xl border border-[#ECE9E2] bg-white p-5 shadow-2xs">
                <h3 className="font-serif text-lg font-bold text-ink mb-4">Filter Itineraries</h3>

                <fieldset className="mb-5">
                  <legend className="text-xs font-bold text-ink uppercase tracking-wider mb-2.5">Duration</legend>
                  <div className="space-y-1.5 text-xs text-[#555555]">
                    {DURATIONS.map((dur) => (
                      <label key={dur.id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-ink">
                        <input type="radio" name="duration" checked={selectedDuration === dur.id} onChange={() => setSelectedDuration(dur.id)} className="accent-[#1B4332] size-3.5 cursor-pointer" />
                        <span>{dur.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {typesInUse.length ? (
                  <fieldset className="mb-5 pt-4 border-t border-[#F0ECE4]">
                    <legend className="text-xs font-bold text-ink uppercase tracking-wider mb-2.5">Trip Type</legend>
                    <div className="space-y-1.5 text-xs text-[#555555]">
                      {typesInUse.map((type) => (
                        <label key={type.key} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-ink">
                          <input type="checkbox" checked={selectedTripTypes.includes(type.key)} onChange={() => toggleTripType(type.key)} className="accent-[#1B4332] size-3.5 rounded-sm cursor-pointer" />
                          <span>{type.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ) : null}

                <div className="pt-4 border-t border-[#F0ECE4]">
                  <label htmlFor="it-dest" className="block text-xs font-bold text-ink uppercase tracking-wider mb-2">Destination</label>
                  <select id="it-dest" value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full rounded-xl border border-[#D5D0C5] bg-[#FAF9F5] px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-coral">
                    <option value="">All destinations</option>
                    {destinations.map((d) => <option key={d.placeName} value={d.placeName}>{d.placeName}</option>)}
                  </select>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col items-center text-center rounded-2xl border border-[#DCE8D8] bg-[#F1F6EE] p-6 shadow-2xs">
              <div className="flex size-11 items-center justify-center rounded-full bg-white text-[#1B4332] shadow-xs mb-3">
                <Icon name="compass" size={22} className="text-[#2C6E49]" />
              </div>
              <h3 className="font-serif text-base sm:text-lg font-bold text-ink">Not sure which itinerary is right for you?</h3>
              <p className="mt-2 text-xs text-[#555555] leading-relaxed max-w-xs">Tell us your travel preferences, budget and dates. Our AI will create a personalised itinerary just for you.</p>
              <button type="button" onClick={() => handleStartPlan("Create a custom day-by-day travel itinerary for my trip to India")} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1B4332] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-[#143325] transition-colors">
                <span>Plan my trip with AI</span>
                <span className="text-coral">→</span>
              </button>
            </div>

            {destinations.some((d) => d.placePath) ? (
              <div className="rounded-2xl border border-[#ECE9E2] bg-white p-5 shadow-2xs">
                <h3 className="font-serif text-lg font-bold text-ink mb-4">Destination guides</h3>
                <div className="space-y-3">
                  {destinations.filter((d) => d.placePath).slice(0, 6).map((d) => (
                    <Link key={d.placeName} href={d.placePath!} className="group flex items-center justify-between gap-3 p-1 rounded-xl hover:bg-[#FAF9F5] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative size-11 shrink-0 rounded-lg overflow-hidden bg-[#ECE9E2]">
                          {d.image ? <Image src={d.image.url} alt="" fill sizes="44px" className="object-cover" /> : null}
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-ink group-hover:text-coral transition-colors truncate">{d.placeName}</p>
                      </div>
                      <span className="text-[#AAAAAA] group-hover:text-coral group-hover:translate-x-0.5 transition-all text-sm shrink-0 pr-1">›</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </main>

      {/* 4. Bottom Trust Feature Banner */}
      <section className="border-t border-[#ECE9E2] bg-[#FAF9F5] py-8 sm:py-10">
        <div className="container-site">
          <div className="rounded-2xl border border-[#ECE9E2] bg-white p-6 sm:p-8 shadow-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-4 flex items-center gap-3.5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#E5F0E7] text-[#1B4332]">
                  <Icon name="compass" size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-ink">Why choose VacayOut itineraries?</h3>
                  <p className="text-xs text-[#666666] mt-0.5">Researched from official sources, reviewed by our editors, and paced so you aren&apos;t rushing between sights.</p>
                </div>
              </div>
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-start gap-2.5">
                  <div className="text-coral mt-0.5"><Icon name="map" size={17} /></div>
                  <div>
                    <h4 className="text-xs font-bold text-ink">Real places & experiences</h4>
                    <p className="text-[0.6875rem] text-[#666666] mt-0.5">(each linked to a reviewed guide)</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="text-coral mt-0.5"><Icon name="clock" size={17} /></div>
                  <div>
                    <h4 className="text-xs font-bold text-ink">Practical details</h4>
                    <p className="text-[0.6875rem] text-[#666666] mt-0.5">(time, budget estimates, transport)</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="text-coral mt-0.5"><Icon name="sparkles" size={17} /></div>
                  <div>
                    <h4 className="text-xs font-bold text-ink">Customise with AI</h4>
                    <p className="text-[0.6875rem] text-[#666666] mt-0.5">(make it your own)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AiPlannerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialPrompt={activePrompt} />
    </div>
  );
}
