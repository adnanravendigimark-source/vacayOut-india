"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Icon } from "@/components/icons/icon";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";
import { THINGS_TO_DO_MOCK, type ThingsToDoData } from "@/lib/data/things-to-do-mock";

export function ThingsToDoPage({ initialData = THINGS_TO_DO_MOCK }: { initialData?: ThingsToDoData }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
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

  // Filter interest cards by category pill or search query
  const filteredInterests = useMemo(() => {
    let list = initialData.interests;

    if (activeCategory !== "all") {
      list = list.filter(
        (item) => item.category === activeCategory || item.id === activeCategory
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.prompt.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeCategory, searchQuery, initialData.interests]);

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
          className="object-cover object-center brightness-[0.88]"
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

            {/* Search Capsule Input matching reference */}
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

      {/* 2. Filter Pills Navigation Bar */}
      <section className="border-b border-[#ECE9E2] bg-white py-4 sm:py-5">
        <div className="container-site">
          <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] pb-1">
            {initialData.filterPills.map((pill) => {
              const isActive = activeCategory === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(pill.id);
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
          {/* Left Column: Explore by Interest (3x3 grid) */}
          <div className="lg:col-span-8">
            <div className="mb-6">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                Explore by Interest
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-[#666666]">
                Choose what excites you most. Discover handpicked experiences and destinations across India.
              </p>
            </div>

            {/* 3x3 Card Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
              {filteredInterests.map((interest) => (
                <div
                  key={interest.id}
                  onClick={() => handleStartPlan(interest.prompt)}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[#ECE9E2] bg-white shadow-2xs hover:shadow-card transition-all cursor-pointer text-left"
                >
                  {/* Photo with pill badge */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#ECE9E2]">
                    <Image
                      src={interest.image}
                      alt={interest.title}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 95vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                    {/* Small icon badge bottom-left of photo */}
                    <div className="absolute bottom-2.5 left-2.5 flex size-7 items-center justify-center rounded-lg bg-white/90 text-ink shadow-xs backdrop-blur-xs">
                      <Icon name={interest.icon} size={15} className="text-coral" />
                    </div>
                  </div>

                  {/* Card Info footer */}
                  <div className="flex items-center justify-between p-3.5">
                    <div className="min-w-0 pr-2">
                      <h3 className="font-bold text-sm text-ink group-hover:text-coral transition-colors truncate">
                        {interest.title}
                      </h3>
                      <p className="text-[0.6875rem] text-[#777777] mt-0.5 truncate">
                        {interest.countText}
                      </p>
                    </div>
                    <span className="text-[#888888] group-hover:text-coral group-hover:translate-x-0.5 transition-all text-sm shrink-0">
                      →
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {filteredInterests.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#DCD7CE] p-10 text-center">
                <p className="text-sm font-semibold text-ink">No interests matched your search.</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory("all");
                    setSearchQuery("");
                  }}
                  className="mt-3 text-xs font-bold text-coral hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Sidebar Widgets */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            {/* Widget 1: Not sure what to choose? (AI Planner Banner) */}
            <div className="flex flex-col items-center text-center rounded-2xl border border-[#DCE8D8] bg-[#F1F6EE] p-6 shadow-2xs">
              <div className="flex size-12 items-center justify-center rounded-full bg-white text-[#1B4332] shadow-xs mb-3">
                <Icon name="compass" size={24} className="text-[#2C6E49]" />
              </div>
              <h3 className="font-serif text-lg font-bold text-ink">
                Not sure what to choose?
              </h3>
              <p className="mt-2 text-xs sm:text-[0.8125rem] text-[#555555] leading-relaxed max-w-xs">
                Let our AI trip planner suggest experiences based on your interests, budget and travel style.
              </p>
              <button
                type="button"
                onClick={() => handleStartPlan("Help me choose the best destinations and things to do in India based on my travel style")}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1B4332] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-[#143325] transition-colors"
              >
                <span>Plan a trip with AI</span>
                <span className="text-coral">→</span>
              </button>
            </div>

            {/* Widget 2: Popular Things to Do */}
            <div className="rounded-2xl border border-[#ECE9E2] bg-white p-5 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-ink mb-4">
                Popular Things to Do
              </h3>
              <div className="space-y-3">
                {initialData.popularActivities.map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => handleStartPlan(act.prompt)}
                    className="group flex w-full items-center justify-between gap-3 text-left p-1.5 rounded-xl hover:bg-[#FAF9F5] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative size-12 shrink-0 rounded-lg overflow-hidden bg-[#ECE9E2]">
                        <Image
                          src={act.image}
                          alt={act.title}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-[0.8125rem] font-bold text-ink group-hover:text-coral transition-colors truncate">
                          {act.title}
                        </p>
                        <p className="text-[0.6875rem] text-[#777777] mt-0.5 truncate">
                          {act.tagsText}
                        </p>
                      </div>
                    </div>
                    <span className="text-[#AAAAAA] group-hover:text-coral group-hover:translate-x-0.5 transition-all text-sm shrink-0 pr-1">
                      ›
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Widget 3: Why explore with VacayOut? */}
            <div className="rounded-2xl border border-[#ECE9E2] bg-[#FAF9F5] p-5 shadow-2xs">
              <div className="flex items-center gap-2 mb-3.5">
                <Icon name="compass" size={16} className="text-[#2C6E49]" />
                <h3 className="font-serif text-sm sm:text-base font-bold text-ink">
                  Why explore with VacayOut?
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-[#555555]">
                {initialData.whyChooseUs.map((reason) => (
                  <li key={reason} className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold shrink-0">✓</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3.5 pt-3 border-t border-[#ECE9E2]">
                <Link
                  href="/about"
                  className="text-xs font-bold text-coral hover:underline inline-flex items-center gap-1"
                >
                  Learn more →
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* 4. Bottom Full-Width Section: Featured Experiences */}
      <section className="border-t border-[#ECE9E2] bg-[#FAF9F5] py-10 sm:py-14">
        <div className="container-site">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                Featured Experiences
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[#666666]">
                Unique experiences and must-do activities across India.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleStartPlan("Show me all featured travel experiences and must-do activities across India")}
              className="text-xs sm:text-sm font-semibold text-coral hover:underline inline-flex items-center gap-1 shrink-0"
            >
              View all experiences →
            </button>
          </div>

          {/* 5 Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {initialData.featuredExperiences.map((exp) => (
              <div
                key={exp.id}
                onClick={() => handleStartPlan(exp.prompt)}
                className="group flex flex-col overflow-hidden rounded-xl border border-[#ECE9E2] bg-white shadow-2xs hover:shadow-card transition-all cursor-pointer text-left"
              >
                <div className="relative aspect-[16/11] w-full overflow-hidden bg-[#ECE9E2]">
                  <Image
                    src={exp.image}
                    alt={exp.title}
                    fill
                    sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-50 group-hover:opacity-30 transition-opacity" />
                  <div className="absolute bottom-2 left-2 flex size-6 items-center justify-center rounded-md bg-white/90 text-ink shadow-xs backdrop-blur-xs">
                    <Icon name="compass" size={13} className="text-coral" />
                  </div>
                </div>

                <div className="p-3 flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-ink group-hover:text-coral transition-colors truncate">
                      {exp.title}
                    </h3>
                    <p className="mt-1 flex items-center gap-1 text-[0.6875rem] text-[#666666] truncate">
                      <Icon name="pin" size={11} className="text-coral shrink-0" />
                      <span className="truncate">{exp.location}</span>
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {exp.badges.map((b) => (
                      <span
                        key={b}
                        className="rounded-md bg-[#F2EFE9] px-1.5 py-0.5 text-[0.625rem] font-semibold text-[#555555]"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
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
