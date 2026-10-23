"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Icon } from "@/components/icons/icon";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";
import { TRAVEL_GUIDES_MOCK, type TravelGuidesData } from "@/lib/data/travel-guides-mock";

export function TravelGuidesPage({ initialData = TRAVEL_GUIDES_MOCK }: { initialData?: TravelGuidesData }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
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

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 4000);
      setNewsletterEmail("");
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

  const filteredGuides = useMemo(() => {
    let list = initialData.guides;

    if (activeCategory) {
      list = list.filter((g) => g.categoryKey === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.snippet.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q) ||
          g.slug.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeCategory, searchQuery, initialData.guides]);

  return (
    <div className="min-h-screen bg-white">
      {/* 1. Photographic Panoramic Hero Section */}
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

      {/* 2. Main 2-Column Content Area */}
      <main className="container-site py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Column: Latest Travel Guides (3x4 Grid) */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                  Latest Travel Guides
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-[#666666]">
                  Handpicked guides with practical tips, local insights and everything you need for your next trip.
                </p>
              </div>
              {activeCategory && (
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className="text-xs font-bold text-coral hover:underline shrink-0"
                >
                  Reset filter ✕
                </button>
              )}
            </div>

            {/* 3 Columns Grid of Guides */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
              {filteredGuides.map((guide) => (
                <article
                  key={guide.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[#ECE9E2] bg-white shadow-2xs hover:shadow-card transition-all"
                >
                  {/* Photo with top-left badge */}
                  <Link href={guide.href} className="relative aspect-[16/10] w-full overflow-hidden bg-[#ECE9E2] block">
                    <Image
                      src={guide.image}
                      alt={guide.title}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 95vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />

                    {/* Category Badge on photo */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className="inline-block rounded-md bg-white/95 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-ink shadow-xs backdrop-blur-xs">
                        {guide.category}
                      </span>
                    </div>
                  </Link>

                  {/* Body */}
                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div>
                      <Link href={guide.href}>
                        <h3 className="font-bold text-sm sm:text-[0.9375rem] text-ink leading-snug group-hover:text-coral transition-colors line-clamp-2">
                          {guide.title}
                        </h3>
                      </Link>
                      <p className="mt-2 text-xs text-[#666666] leading-relaxed line-clamp-3">
                        {guide.snippet}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#F0ECE4]">
                      <div className="flex items-center gap-1.5 text-[0.6875rem] text-[#888888]">
                        <Icon name="user" size={12} className="text-[#888888]" />
                        <span>{guide.author}</span>
                        <span>•</span>
                        <span>{guide.publishedDate}</span>
                      </div>

                      <div className="mt-2.5">
                        <Link
                          href={guide.href}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-coral hover:underline"
                        >
                          <span>Read more</span>
                          <span>→</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {filteredGuides.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#DCD7CE] p-10 text-center">
                <p className="text-sm font-semibold text-ink">No travel guides matched your search.</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory(null);
                    setSearchQuery("");
                  }}
                  className="mt-3 text-xs font-bold text-coral hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Sidebar Widgets */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            {/* Widget 1: Browse by Category */}
            <div className="rounded-2xl border border-[#ECE9E2] bg-white p-5 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-ink mb-3.5">
                Browse by Category
              </h3>
              <ul className="divide-y divide-[#F0ECE4]">
                {initialData.categories.map((cat) => {
                  const isSelected = activeCategory === cat.key;
                  return (
                    <li key={cat.key}>
                      <button
                        type="button"
                        onClick={() => setActiveCategory(isSelected ? null : cat.key)}
                        className={`flex w-full items-center justify-between py-2.5 text-xs sm:text-sm font-medium transition-colors hover:text-coral ${
                          isSelected ? "text-coral font-bold" : "text-ink"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon name={cat.icon} size={16} className={isSelected ? "text-coral" : "text-[#777777]"} />
                          <span>{cat.name}</span>
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

            {/* Widget 2: Newsletter Box (Get travel tips in your inbox) */}
            <div className="rounded-2xl border border-[#DCE8D8] bg-[#F1F6EE] p-6 text-center shadow-2xs">
              {/* Cute Mountains SVG Icon */}
              <div className="flex justify-center mb-2.5">
                <svg viewBox="0 0 80 40" className="w-16 h-8 text-[#2C6E49]" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 35 L28 10 L46 35 Z" fill="#A3D4AA" stroke="#2C6E49" strokeWidth="1.5" />
                  <path d="M36 35 L54 16 L70 35 Z" fill="#C5E5CB" stroke="#2C6E49" strokeWidth="1.5" />
                  <path d="M22 35 L28 26 L34 35 Z" fill="#2C6E49" />
                  <circle cx="28" cy="10" r="1.5" fill="#2C6E49" />
                </svg>
              </div>

              <h3 className="font-serif text-base sm:text-lg font-bold text-ink">
                Get travel tips in your inbox
              </h3>
              <p className="mt-1 text-xs text-[#555555] leading-relaxed">
                Practical guides, local insights and exclusive travel tips.
              </p>

              <form onSubmit={handleSubscribe} className="mt-4 space-y-2">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Your email address"
                  required
                  className="w-full rounded-xl border border-[#D0DCD0] bg-white px-3.5 py-2.5 text-xs sm:text-sm text-ink placeholder:text-[#888888] focus:outline-none focus:ring-2 focus:ring-coral shadow-inner"
                />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#1B4332] py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-[#143325] transition-colors"
                >
                  {subscribed ? "Subscribed! ✓" : "Subscribe"}
                </button>
              </form>
            </div>

            {/* Widget 3: Popular Guides */}
            <div className="rounded-2xl border border-[#ECE9E2] bg-white p-5 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-ink mb-4">
                Popular Guides
              </h3>
              <div className="space-y-3">
                {initialData.popularGuides.map((guide) => (
                  <Link
                    key={guide.id}
                    href={guide.href}
                    className="group flex items-center gap-3 p-1 rounded-xl hover:bg-[#FAF9F5] transition-colors"
                  >
                    <div className="relative size-12 shrink-0 rounded-lg overflow-hidden bg-[#ECE9E2]">
                      <Image
                        src={guide.image}
                        alt={guide.title}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-[0.8125rem] font-bold text-ink group-hover:text-coral transition-colors truncate">
                        {guide.title}
                      </p>
                      <p className="text-[0.6875rem] text-[#888888] mt-0.5">
                        {guide.date}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Widget 4: Have a specific destination in mind? */}
            <div className="rounded-2xl border border-[#ECE9E2] bg-[#FAF9F5] p-5 shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="compass" size={16} className="text-[#2C6E49]" />
                <h4 className="font-serif text-sm font-bold text-ink">
                  Have a specific destination in mind?
                </h4>
              </div>
              <p className="text-xs text-[#555555] leading-relaxed">
                Use our AI trip planner to get a personalised travel guide with recommendations, tips and more.
              </p>
              <button
                type="button"
                onClick={() => handleStartPlan("Help me plan an in-depth travel guide for my destination")}
                className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-[#1B4332] px-4 py-2 text-xs font-semibold text-white hover:bg-[#143325] transition-colors"
              >
                <span>Plan with AI</span>
                <span className="text-coral">→</span>
              </button>
            </div>
          </aside>
        </div>
      </main>

      {/* AI Planner Modal */}
      <AiPlannerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialPrompt={activePrompt}
      />
    </div>
  );
}
