"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Icon } from "@/components/icons/icon";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";
import { ITINERARIES_MOCK, type ItinerariesPageData } from "@/lib/data/itineraries-mock";

export function ItinerariesPage({ initialData = ITINERARIES_MOCK }: { initialData?: ItinerariesPageData }) {
  const [activePill, setActivePill] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("all");
  const [selectedTripTypes, setSelectedTripTypes] = useState<string[]>([]);
  const [startingCity, setStartingCity] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string | undefined>(undefined);

  const handleStartPlan = (prompt: string) => {
    setActivePrompt(prompt);
    setIsModalOpen(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      handleStartPlan(searchQuery.trim());
    }
  };

  const toggleTripType = (type: string) => {
    setSelectedTripTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  useEffect(() => {
    const handleOpenAi = (e: Event) => {
      const custom = e as CustomEvent<{ prompt?: string }>;
      if (custom.detail?.prompt) {
        setActivePrompt(custom.detail.prompt);
      }
      setIsModalOpen(true);
    };

    window.addEventListener("vacayout:open-ai", handleOpenAi);
    return () => window.removeEventListener("vacayout:open-ai", handleOpenAi);
  }, []);

  const filteredItineraries = useMemo(() => {
    let list = initialData.itineraries;

    // Filter by Top Pill
    if (activePill === "2-3-days") {
      list = list.filter((i) => i.daysCount >= 2 && i.daysCount <= 3);
    } else if (activePill === "4-5-days") {
      list = list.filter((i) => i.daysCount >= 4 && i.daysCount <= 5);
    } else if (activePill === "6-7-days") {
      list = list.filter((i) => i.daysCount >= 6 && i.daysCount <= 7);
    } else if (activePill === "weekends") {
      list = list.filter((i) => i.isWeekend || i.daysCount <= 4);
    } else if (activePill !== "all") {
      list = list.filter((i) => i.category.toLowerCase().includes(activePill));
    }

    // Filter by Sidebar Duration
    if (selectedDuration === "2-3") {
      list = list.filter((i) => i.daysCount >= 2 && i.daysCount <= 3);
    } else if (selectedDuration === "4-5") {
      list = list.filter((i) => i.daysCount >= 4 && i.daysCount <= 5);
    } else if (selectedDuration === "6-7") {
      list = list.filter((i) => i.daysCount >= 6 && i.daysCount <= 7);
    } else if (selectedDuration === "1week") {
      list = list.filter((i) => i.daysCount >= 7);
    }

    // Filter by Sidebar Trip Types
    if (selectedTripTypes.length > 0) {
      list = list.filter((i) =>
        selectedTripTypes.some(
          (t) =>
            i.category.toLowerCase().includes(t.toLowerCase()) ||
            i.tagsText.toLowerCase().includes(t.toLowerCase())
        )
      );
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.subtitle.toLowerCase().includes(q) ||
          i.tagsText.toLowerCase().includes(q) ||
          i.snippet.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activePill, selectedDuration, selectedTripTypes, searchQuery, initialData.itineraries]);

  const TRIP_TYPE_OPTIONS = [
    "Mountains",
    "Beaches",
    "Heritage",
    "Spiritual",
    "Wildlife",
    "Adventure",
    "Family",
    "Honeymoon",
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* 1. Panoramic Hero Section */}
      <header className="relative min-h-[380px] sm:min-h-[460px] lg:min-h-[500px] w-full overflow-hidden bg-ink">
        <Image
          src={initialData.hero.image}
          alt={initialData.hero.title}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center brightness-[0.85]"
        />
        {/* Subtle cinematic gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/25" />

        <div className="container-site relative z-10 flex min-h-[380px] sm:min-h-[460px] lg:min-h-[500px] flex-col justify-end pb-8 pt-10 sm:pb-12">
          <div className="max-w-3xl">
            {/* Eyebrow */}
            <p className="text-xs sm:text-[0.8125rem] font-bold tracking-widest text-white/90 uppercase mb-2">
              {initialData.hero.eyebrow}
            </p>

            {/* Title */}
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white drop-shadow-sm">
              {initialData.hero.title}
            </h1>

            {/* Subtitle */}
            <p className="mt-2.5 max-w-2xl text-sm sm:text-base lg:text-lg text-white/95 leading-relaxed drop-shadow-xs">
              {initialData.hero.subtitle}
            </p>

            {/* Search Capsule Input */}
            <form onSubmit={handleSearchSubmit} className="mt-6 max-w-xl">
              <div className="relative flex items-center">
                <Icon
                  name="search"
                  size={18}
                  className="absolute left-4 text-[#777777] pointer-events-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={initialData.hero.searchPlaceholder}
                  className="w-full rounded-full border border-white/20 bg-white/95 py-3 pl-11 pr-14 text-xs sm:text-sm text-ink placeholder:text-[#888888] shadow-md backdrop-blur-xs transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-coral"
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className="absolute right-2 flex size-8 items-center justify-center rounded-full bg-[#1B4332] text-white hover:bg-[#143325] transition-colors shadow-xs"
                >
                  <Icon name="arrowRight" size={15} />
                </button>
              </div>
            </form>
          </div>

          {/* Bottom Right Photo Credit */}
          <div className="absolute bottom-4 right-4 sm:right-8 text-right hidden sm:block">
            <a
              href={initialData.hero.creditUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.6875rem] text-white/75 hover:text-white hover:underline transition-colors inline-flex items-center gap-1"
            >
              {initialData.hero.credit}
              <span className="text-[10px]">↗</span>
            </a>
          </div>
        </div>
      </header>

      {/* 2. Top Filter Pills Bar */}
      <section className="border-b border-[#ECE9E2] bg-white py-4 sm:py-5">
        <div className="container-site">
          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] pb-1">
            {initialData.filterPills.map((pill) => {
              const isActive = activePill === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    setActivePill(pill.id);
                    setSearchQuery("");
                  }}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-ink text-white shadow-xs"
                      : "border border-[#E5E2DA] bg-[#FAF9F5] text-[#444444] hover:bg-white hover:text-ink hover:border-[#D0CBC0]"
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Main 2-Column Content Area */}
      <main className="container-site py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Column: Popular Itineraries (3x3 Grid) */}
          <div className="lg:col-span-8">
            <div className="mb-6">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                Popular Itineraries
              </h2>
            </div>

            {/* 3 Columns Grid of Itineraries */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
              {filteredItineraries.map((itinerary) => (
                <article
                  key={itinerary.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[#ECE9E2] bg-white shadow-2xs hover:shadow-card transition-all"
                >
                  {/* Photo with duration badge */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#ECE9E2]">
                    <Image
                      src={itinerary.image}
                      alt={itinerary.title}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 95vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />

                    {/* Duration badge bottom-left */}
                    <div className="absolute bottom-2.5 left-2.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-black/75 px-2 py-0.5 text-[0.6875rem] font-bold text-white backdrop-blur-xs">
                        <Icon name="clock" size={12} className="text-coral" />
                        <span>{itinerary.daysBadge}</span>
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-ink group-hover:text-coral transition-colors line-clamp-1">
                        {itinerary.title}
                      </h3>
                      <p className="text-xs text-[#777777] mt-0.5 truncate">
                        {itinerary.subtitle}
                      </p>

                      <p className="mt-2 text-[0.6875rem] font-medium text-[#555555] line-clamp-1">
                        {itinerary.tagsText}
                      </p>

                      <p className="mt-2 text-xs text-[#666666] leading-relaxed line-clamp-3">
                        {itinerary.snippet}
                      </p>
                    </div>

                    {/* Dual Action Buttons matching reference */}
                    <div className="mt-4 pt-3 border-t border-[#F0ECE4] grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartPlan(`Show me the day-by-day itinerary for ${itinerary.title}`)}
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#D5D0C5] bg-[#FAF9F5] px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-white hover:border-ink transition-colors"
                      >
                        <span>👁</span>
                        <span className="truncate">View itinerary</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartPlan(`Customise the ${itinerary.title} for me with day by day activities`)}
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

            {filteredItineraries.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#DCD7CE] p-10 text-center">
                <p className="text-sm font-semibold text-ink">No itineraries matched your filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setActivePill("all");
                    setSelectedDuration("all");
                    setSelectedTripTypes([]);
                    setSearchQuery("");
                  }}
                  className="mt-3 text-xs font-bold text-coral hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Sidebar Filters & Widgets */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            {/* Widget 1: Filter Itineraries Card */}
            <div className="rounded-2xl border border-[#ECE9E2] bg-white p-5 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-ink mb-4">
                Filter Itineraries
              </h3>

              {/* Duration filter */}
              <div className="mb-5">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2.5">
                  Duration
                </h4>
                <div className="space-y-1.5 text-xs text-[#555555]">
                  {[
                    { id: "all", label: "All" },
                    { id: "2-3", label: "2–3 Days" },
                    { id: "4-5", label: "4–5 Days" },
                    { id: "6-7", label: "6–7 Days" },
                    { id: "1week", label: "1 Week +" },
                  ].map((dur) => (
                    <label
                      key={dur.id}
                      className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-ink"
                    >
                      <input
                        type="radio"
                        name="duration"
                        checked={selectedDuration === dur.id}
                        onChange={() => setSelectedDuration(dur.id)}
                        className="accent-[#1B4332] size-3.5 cursor-pointer"
                      />
                      <span>{dur.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Trip Type filter */}
              <div className="mb-5 pt-4 border-t border-[#F0ECE4]">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2.5">
                  Trip Type
                </h4>
                <div className="space-y-1.5 text-xs text-[#555555]">
                  {TRIP_TYPE_OPTIONS.map((type) => {
                    const isChecked = selectedTripTypes.includes(type);
                    return (
                      <label
                        key={type}
                        className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-ink"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTripType(type)}
                          className="accent-[#1B4332] size-3.5 rounded-sm cursor-pointer"
                        />
                        <span>{type}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Starting City filter */}
              <div className="pt-4 border-t border-[#F0ECE4]">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2">
                  Starting City
                </h4>
                <select
                  value={startingCity}
                  onChange={(e) => setStartingCity(e.target.value)}
                  className="w-full rounded-xl border border-[#D5D0C5] bg-[#FAF9F5] px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-coral"
                >
                  <option value="">Select city</option>
                  {initialData.startingCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Widget 2: Not sure which itinerary is right for you? */}
            <div className="flex flex-col items-center text-center rounded-2xl border border-[#DCE8D8] bg-[#F1F6EE] p-6 shadow-2xs">
              <div className="flex size-11 items-center justify-center rounded-full bg-white text-[#1B4332] shadow-xs mb-3">
                <Icon name="compass" size={22} className="text-[#2C6E49]" />
              </div>
              <h3 className="font-serif text-base sm:text-lg font-bold text-ink">
                Not sure which itinerary is right for you?
              </h3>
              <p className="mt-2 text-xs text-[#555555] leading-relaxed max-w-xs">
                Tell us your travel preferences, budget and dates. Our AI will create a personalised itinerary just for you.
              </p>
              <button
                type="button"
                onClick={() => handleStartPlan("Create a custom day-by-day travel itinerary for my trip to India")}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1B4332] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-[#143325] transition-colors"
              >
                <span>Plan my trip with AI</span>
                <span className="text-coral">→</span>
              </button>
            </div>

            {/* Widget 3: Popular Cities */}
            <div className="rounded-2xl border border-[#ECE9E2] bg-white p-5 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-ink mb-4">
                Popular Cities
              </h3>
              <div className="space-y-3">
                {initialData.popularCities.map((city) => (
                  <Link
                    key={city.name}
                    href={city.href}
                    className="group flex items-center justify-between gap-3 p-1 rounded-xl hover:bg-[#FAF9F5] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative size-11 shrink-0 rounded-lg overflow-hidden bg-[#ECE9E2]">
                        <Image
                          src={city.image}
                          alt={city.name}
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-ink group-hover:text-coral transition-colors truncate">
                        {city.name}
                      </p>
                    </div>
                    <span className="text-[#AAAAAA] group-hover:text-coral group-hover:translate-x-0.5 transition-all text-sm shrink-0 pr-1">
                      ›
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* 4. Bottom Trust Feature Banner */}
      <section className="border-t border-[#ECE9E2] bg-[#FAF9F5] py-8 sm:py-10">
        <div className="container-site">
          <div className="rounded-2xl border border-[#ECE9E2] bg-white p-6 sm:p-8 shadow-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left headline */}
              <div className="lg:col-span-4 flex items-center gap-3.5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#E5F0E7] text-[#1B4332]">
                  <Icon name="compass" size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-ink">
                    Why choose VacayOut itineraries?
                  </h3>
                  <p className="text-xs text-[#666666] mt-0.5">
                    Curated by travellers, verified by our editors, and packed with local insights to help you make the most of your trip.
                  </p>
                </div>
              </div>

              {/* 3 Pillars */}
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-start gap-2.5">
                  <div className="text-coral mt-0.5">
                    <Icon name="map" size={17} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-ink">Real places & experiences</h4>
                    <p className="text-[0.6875rem] text-[#666666] mt-0.5">(no fake destinations)</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="text-coral mt-0.5">
                    <Icon name="clock" size={17} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-ink">Practical details</h4>
                    <p className="text-[0.6875rem] text-[#666666] mt-0.5">(time, budget, transport)</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="text-coral mt-0.5">
                    <Icon name="sparkles" size={17} />
                  </div>
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

      {/* AI Planner Modal */}
      <AiPlannerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialPrompt={activePrompt}
      />
    </div>
  );
}
