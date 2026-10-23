"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/icon";
import { routes } from "@/lib/routes";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";
import { ManaliMapCard } from "./manali-map-card";
import type { DestinationPageData } from "@/lib/data/place-mock-data";

export function DestinationView({ data }: { data: DestinationPageData }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [aiInput, setAiInput] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string | undefined>(undefined);

  const handleStartPlan = (prompt: string) => {
    setActivePrompt(prompt);
    setIsModalOpen(true);
  };

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    handleStartPlan(aiInput.trim());
    setAiInput("");
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

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "places-to-visit", label: "Places to Visit" },
    { id: "best-time", label: "Best Time" },
    { id: "how-to-reach", label: "How to Reach" },
    { id: "itinerary", label: "Itinerary" },
    { id: "budget", label: "Budget" },
    { id: "faqs", label: "FAQs" },
    { id: "sources", label: "Sources" },
  ];

  return (
    <article className="min-h-screen bg-white">
      {/* 1. Photographic Hero Section */}
      <header className="relative min-h-[380px] sm:min-h-[460px] lg:min-h-[500px] w-full overflow-hidden bg-ink">
        <Image
          src={data.heroImage}
          alt={data.name}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center brightness-[0.9]"
        />
        {/* Cinematic Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/30" />

        <div className="container-site relative z-10 flex min-h-[380px] sm:min-h-[460px] lg:min-h-[500px] flex-col justify-between pb-8 pt-6">
          {/* Breadcrumbs matching Image 1 */}
          <nav aria-label="Breadcrumb" className="text-xs sm:text-sm text-white/90">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link
                  href="/india"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-white hover:underline"
                >
                  <Icon name="arrowLeft" size={13} className="text-white/80" />
                  <span>India</span>
                </Link>
              </li>
              <span className="text-white/60">›</span>
              <li>
                <Link
                  href={`/india/${data.stateSlug}`}
                  className="transition-colors hover:text-white hover:underline"
                >
                  {data.stateName}
                </Link>
              </li>
              <span className="text-white/60">›</span>
              <li className="font-semibold text-white" aria-current="page">
                {data.name}
              </li>
            </ol>
          </nav>

          {/* Hero Titles & Meta Chips */}
          <div className="max-w-3xl">
            {/* Pill Badge */}
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                <Icon name="mountain" size={12} />
                {data.badge}
              </span>
            </div>

            {/* Title */}
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white drop-shadow-sm">
              {data.name}
            </h1>

            {/* Subtitle */}
            <p className="mt-2.5 max-w-2xl text-base sm:text-lg text-white/95 leading-relaxed drop-shadow-xs">
              {data.subtitle}
            </p>

            {/* Metadata Pills Row */}
            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs sm:text-sm font-medium text-white/90">
              <span className="flex items-center gap-1.5">
                <Icon name="pin" size={15} className="text-coral" />
                {data.locationLabel}
              </span>
              <span className="text-white/40">•</span>
              <span className="flex items-center gap-1.5">
                <Icon name="mountain" size={15} className="text-white/80" />
                {data.typeLabel}
              </span>
              <span className="text-white/40">•</span>
              <span className="flex items-center gap-1.5">
                <Icon name="star" size={15} className="text-amber-400" />
                {data.ratingText}
              </span>
            </div>
          </div>

          {/* Bottom Right Photo Credit */}
          <div className="absolute bottom-4 right-4 sm:right-8 text-right hidden sm:block">
            <a
              href={data.photoCredit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.6875rem] text-white/75 hover:text-white hover:underline transition-colors inline-flex items-center gap-1"
            >
              Photo by {data.photoCredit.photographer} on {data.photoCredit.source}
              <span className="text-[10px]">↗</span>
            </a>
          </div>
        </div>
      </header>

      {/* 2. Sticky Subnav Bar */}
      <nav
        aria-label="In-page navigation"
        className="sticky top-0 z-30 border-b border-[#E8E5DF] bg-white/95 backdrop-blur-md"
      >
        <div className="container-site flex gap-1 sm:gap-2 overflow-x-auto [scrollbar-width:none]">
          {TABS.map((tab) => (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 border-b-2 px-3 sm:px-4 py-3.5 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-[#1B4332] text-ink font-semibold"
                  : "border-transparent text-[#666666] hover:text-ink"
              }`}
            >
              {tab.label}
            </a>
          ))}
        </div>
      </nav>

      {/* 3. Main 2-Column Content Layout */}
      <div className="container-site py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Column: Main Content Sections */}
          <div className="lg:col-span-8 space-y-12 sm:space-y-14">
            {/* Section 1: Overview */}
            <section id="overview" className="scroll-mt-20">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">Overview</h2>
              <p className="mt-3.5 text-[0.9375rem] sm:text-base leading-relaxed text-[#4A4A4A]">
                {data.overview.description}
              </p>

              {/* 4 Feature Circular Cards Row */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {data.overview.features.map((feat) => (
                  <div
                    key={feat.title}
                    className="flex flex-col items-center text-center p-4 rounded-2xl border border-[#ECE9E2] bg-[#FAF9F5] transition-shadow hover:shadow-xs"
                  >
                    <div className="flex size-11 items-center justify-center rounded-full bg-[#E5F0E7] text-[#22573B] mb-2.5">
                      <Icon name={feat.icon} size={20} />
                    </div>
                    <h3 className="text-xs sm:text-[0.8125rem] font-bold text-ink leading-tight">
                      {feat.title}
                    </h3>
                    <p className="mt-1 text-[0.6875rem] sm:text-xs text-[#666666] leading-snug">
                      {feat.subtitle}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 2: Top Places to Visit */}
            <section id="places-to-visit" className="scroll-mt-20">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                  {data.topPlaces.title}
                </h2>
                <button
                  type="button"
                  onClick={() => handleStartPlan(`Show me all top places to visit in ${data.name}`)}
                  className="text-xs sm:text-sm font-semibold text-coral hover:underline inline-flex items-center gap-1"
                >
                  View all places →
                </button>
              </div>

              {/* 4 Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {data.topPlaces.items.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => handleStartPlan(place.prompt ?? `Tell me about ${place.name} in ${data.name}`)}
                    className="group flex flex-col text-left overflow-hidden rounded-xl border border-[#ECE9E2] bg-white shadow-2xs hover:shadow-card transition-all cursor-pointer"
                  >
                    <div className="relative aspect-[16/11] w-full overflow-hidden bg-[#ECE9E2]">
                      <Image
                        src={place.image}
                        alt={place.name}
                        fill
                        sizes="(min-width: 640px) 25vw, 50vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-106"
                      />
                    </div>
                    <div className="p-2.5 sm:p-3">
                      <p className="flex items-center gap-1 text-xs sm:text-sm font-bold text-ink group-hover:text-coral transition-colors truncate">
                        <Icon name="pin" size={12} className="text-coral shrink-0" />
                        <span className="truncate">{place.name}</span>
                      </p>
                      <p className="mt-0.5 text-[0.6875rem] sm:text-xs text-[#666666] truncate">
                        {place.tag}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Section 3: Suggested Itinerary */}
            <section id="itinerary" className="scroll-mt-20">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                  Suggested Itinerary
                </h2>
                <button
                  type="button"
                  onClick={() => handleStartPlan(data.itinerary.prompt)}
                  className="text-xs sm:text-sm font-semibold text-coral hover:underline inline-flex items-center gap-1"
                >
                  View full itinerary →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 p-5 sm:p-6 rounded-2xl border border-[#ECE9E2] bg-white shadow-2xs">
                {/* Left: Timeline */}
                <div className="sm:col-span-7 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-ink mb-4">
                      {data.itinerary.heading}
                    </h3>
                    <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E9E2]">
                      {data.itinerary.days.map((day) => (
                        <div key={day.dayNumber} className="relative flex items-start gap-3 pl-6">
                          <span className="absolute left-0 top-1 size-4 rounded-full border-2 border-white bg-[#1B4332] shadow-xs" />
                          <div>
                            <span className="text-xs font-bold text-ink">
                              Day {day.dayNumber}
                            </span>
                            <p className="mt-0.5 text-xs sm:text-[0.8125rem] text-[#555555]">
                              {day.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#F0ECE4]">
                    <button
                      type="button"
                      onClick={() => handleStartPlan(`Customise this 3-day itinerary for ${data.name}`)}
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-coral hover:underline"
                    >
                      <Icon name="sparkles" size={14} />
                      Customise with AI planner
                    </button>
                  </div>
                </div>

                {/* Right: Scenic Photo */}
                <div className="sm:col-span-5 relative aspect-[16/11] sm:aspect-auto sm:min-h-[180px] rounded-xl overflow-hidden shadow-xs">
                  <Image
                    src={data.itinerary.image}
                    alt={data.itinerary.heading}
                    fill
                    sizes="(min-width: 640px) 30vw, 90vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </section>

            {/* Section 4: Best Time to Visit */}
            <section id="best-time" className="scroll-mt-20">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                  Best Time to Visit
                </h2>
                <button
                  type="button"
                  onClick={() => handleStartPlan(`What is the weather and best time to visit ${data.name}?`)}
                  className="text-xs sm:text-sm font-semibold text-coral hover:underline inline-flex items-center gap-1"
                >
                  View full details →
                </button>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl border border-[#ECE9E2] bg-white shadow-2xs">
                {/* 12 Months Status Bar */}
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 text-center pb-5 border-b border-[#F0ECE4]">
                  {data.bestTime.months.map((m) => (
                    <div key={m.name} className="flex flex-col items-center">
                      <span className="text-xs font-semibold text-[#555555]">{m.name}</span>
                      <span
                        className={`mt-2.5 size-3.5 rounded-full ${
                          m.status === "best"
                            ? "bg-[#2E7D32]"
                            : m.status === "good"
                            ? "bg-[#E6A23C]"
                            : "bg-[#D32F2F]"
                        }`}
                        title={`${m.name}: ${m.status}`}
                      />
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-6 text-xs text-[#555555]">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-[#2E7D32]" />
                    Best
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-[#E6A23C]" />
                    Good
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-[#D32F2F]" />
                    Not ideal
                  </span>
                </div>
              </div>
            </section>

            {/* Section 5: Frequently Asked Questions */}
            <section id="faqs" className="scroll-mt-20">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mb-4">
                Frequently Asked Questions
              </h2>

              <div className="divide-y divide-[#ECE9E2] rounded-2xl border border-[#ECE9E2] bg-white overflow-hidden shadow-2xs">
                {data.faqs.map((faq, index) => {
                  const isOpen = openFaq === index;
                  return (
                    <div key={faq.question} className="p-4 sm:p-5">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                        className="flex w-full items-center justify-between gap-4 text-left font-semibold text-ink text-sm sm:text-base hover:text-coral transition-colors"
                      >
                        <span>{faq.question}</span>
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#F4F2EC] text-ink text-base">
                          {isOpen ? "−" : "+"}
                        </span>
                      </button>
                      {isOpen && (
                        <p className="mt-3 text-xs sm:text-[0.9375rem] leading-relaxed text-[#555555] animate-fadeIn">
                          {faq.answer}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Section 6: Ask AI about Destination */}
            <section className="rounded-2xl bg-[#1B4332] p-5 sm:p-6 text-white shadow-md">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                <div className="sm:col-span-7 flex items-center gap-3.5">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-xs">
                    <Icon name="sparkles" size={22} className="text-coral" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      Ask AI about {data.name}
                    </h3>
                    <p className="mt-0.5 text-xs sm:text-sm text-white/80 leading-snug">
                      Get real-time answers about weather, transport, activities, budget and more.
                    </p>
                  </div>
                </div>

                <div className="sm:col-span-5">
                  <form onSubmit={handleAiSubmit} className="relative flex items-center">
                    <input
                      type="text"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      placeholder={`Ask a question about ${data.name}...`}
                      className="w-full rounded-full border border-white/20 bg-white/95 px-4 py-2.5 pr-11 text-xs sm:text-sm text-ink placeholder:text-[#888888] focus:bg-white focus:outline-none focus:ring-2 focus:ring-coral shadow-inner"
                    />
                    <button
                      type="submit"
                      aria-label="Send query"
                      className="absolute right-1.5 flex size-8 items-center justify-center rounded-full bg-[#1B4332] text-white hover:bg-[#143325] transition-colors"
                    >
                      <Icon name="send" size={14} />
                    </button>
                  </form>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Sidebar Widgets */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
            {/* Widget 1: Map Card */}
            <ManaliMapCard name={data.name} />

            {/* Widget 2: Quick Facts */}
            <div className="rounded-2xl border border-[#ECE9E2] bg-white p-5 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-ink mb-4">Quick Facts</h3>
              <dl className="divide-y divide-[#F0ECE4] text-xs sm:text-sm">
                {data.quickFacts.map((fact) => (
                  <div key={fact.label} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <dt className="flex items-center gap-2 text-[#666666]">
                      <Icon name={fact.icon} size={15} className="text-coral" />
                      <span>{fact.label}</span>
                    </dt>
                    <dd className="font-bold text-ink text-right">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Widget 3: Plan & Book */}
            <div className="rounded-2xl border border-[#ECE9E2] bg-white p-5 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-ink mb-3.5">Plan & Book</h3>
              <ul className="space-y-2">
                {data.bookingLinks.map((link) => (
                  <li key={link.title}>
                    <button
                      type="button"
                      onClick={() => handleStartPlan(`Help me with ${link.title} for ${data.name}`)}
                      className="group flex w-full items-center justify-between gap-3 rounded-xl p-2.5 transition-colors hover:bg-[#F9F8F5]"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-coral/10 text-coral">
                          <Icon name={link.icon} size={16} />
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-ink group-hover:text-coral transition-colors truncate">
                          {link.title}
                        </span>
                      </span>
                      <span className="text-xs font-semibold text-coral group-hover:underline shrink-0">
                        {link.actionLabel}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Widget 4: Travel Tips */}
            <div className="rounded-2xl border border-[#ECE9E2] bg-white p-5 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-ink mb-3.5">Travel Tips</h3>
              <ul className="space-y-2.5 text-xs sm:text-[0.8125rem] text-[#444444]">
                {data.travelTips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold shrink-0">✓</span>
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Widget 5: Sources */}
            <div id="sources" className="rounded-2xl border border-[#ECE9E2] bg-[#FAF9F5] p-5 shadow-2xs scroll-mt-20">
              <div className="flex items-start gap-2.5">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-700 mt-0.5">
                  <Icon name="book" size={14} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink">Sources</h4>
                  <p className="mt-1 text-xs text-[#666666] leading-relaxed">
                    Information sourced from official tourism websites, trusted travel guides and verified sources.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleStartPlan(`Show me verified travel sources and government tourism guides for ${data.name}`)}
                    className="mt-2 text-xs font-semibold text-blue-800 hover:underline inline-flex items-center gap-1"
                  >
                    View all sources →
                  </button>
                </div>
              </div>
            </div>

            {/* Widget 6: Affiliate Disclosure */}
            <div className="rounded-xl border border-[#E0EBF5] bg-[#F4F8FC] p-3 text-xs text-[#557799] flex items-center gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                i
              </span>
              <span>We may earn a commission if you book through our links, at no extra cost to you.</span>
            </div>
          </aside>
        </div>
      </div>

      {/* AI Planner Modal */}
      <AiPlannerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialPrompt={activePrompt}
      />
    </article>
  );
}
