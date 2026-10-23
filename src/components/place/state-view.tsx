"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons/icon";
import { routes } from "@/lib/routes";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";
import { HimachalMapCard } from "./himachal-map-card";
import type { StatePageData } from "@/lib/data/place-mock-data";

export function StateView({ data }: { data: StatePageData }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string | undefined>(undefined);

  const handleStartPlan = (prompt: string) => {
    setActivePrompt(prompt);
    setIsModalOpen(true);
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
    { id: "destinations", label: `Destinations (${data.popularDestinations.count})` },
    { id: "best-time", label: "Best Time" },
    { id: "how-to-reach", label: "How to Reach" },
    { id: "travel-guides", label: "Travel Guides" },
    { id: "itineraries", label: "Itineraries" },
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
          {/* Breadcrumbs matching Image 2 */}
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
                <Icon name="palace" size={12} />
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
                {data.regionLabel}
              </span>
              <span className="text-white/40">•</span>
              <span className="flex items-center gap-1.5">
                <Icon name="mountain" size={15} className="text-white/80" />
                {data.tagsLabel}
              </span>
              <span className="text-white/40">•</span>
              <span className="flex items-center gap-1.5">
                <Icon name="star" size={15} className="text-amber-400" />
                {data.popularForLabel}
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
            {/* Section 1: About Himachal Pradesh */}
            <section id="overview" className="scroll-mt-20">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                About {data.name}
              </h2>
              <p className="mt-3.5 text-[0.9375rem] sm:text-base leading-relaxed text-[#4A4A4A]">
                {data.about.description}
              </p>

              {/* 4 Feature Circular Cards Row */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {data.about.features.map((feat) => (
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

            {/* Section 2: Popular Destinations */}
            <section id="destinations" className="scroll-mt-20">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                  {data.popularDestinations.title}
                </h2>
                <Link
                  href="/india"
                  className="text-xs sm:text-sm font-semibold text-coral hover:underline inline-flex items-center gap-1"
                >
                  View all destinations →
                </Link>
              </div>

              {/* 4 Cards Grid / Row matching Image 2 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {data.popularDestinations.items.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="group flex flex-col text-left overflow-hidden rounded-xl border border-[#ECE9E2] bg-white shadow-2xs hover:shadow-card transition-all"
                  >
                    <div className="relative aspect-[16/11] w-full overflow-hidden bg-[#ECE9E2]">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(min-width: 640px) 25vw, 50vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-106"
                      />
                    </div>
                    <div className="p-2.5 sm:p-3">
                      <p className="font-bold text-xs sm:text-sm text-ink group-hover:text-coral transition-colors truncate">
                        {item.name}
                      </p>
                      <p className="mt-0.5 flex items-center justify-between text-[0.6875rem] sm:text-xs text-[#666666]">
                        <span className="flex items-center gap-1 truncate">
                          <Icon name="pin" size={11} className="text-coral shrink-0" />
                          <span className="truncate">{item.state}</span>
                        </span>
                        <span className="text-coral font-bold group-hover:translate-x-0.5 transition-transform">
                          →
                        </span>
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Section 3: Explore by Travel Type */}
            <section className="scroll-mt-20">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mb-4">
                Explore by Travel Type
              </h2>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3">
                {data.travelTypes.map((type) => (
                  <button
                    key={type.title}
                    type="button"
                    onClick={() => handleStartPlan(type.prompt)}
                    className="group flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl border border-[#ECE9E2] bg-[#FAF9F5] hover:bg-white hover:border-[#D0C8B8] hover:shadow-xs transition-all text-center cursor-pointer"
                  >
                    <div className="flex size-9 items-center justify-center text-ink group-hover:text-coral transition-colors">
                      <Icon name={type.icon} size={22} />
                    </div>
                    <span className="mt-2 text-xs font-bold text-ink group-hover:text-coral transition-colors">
                      {type.title}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Section 4: Ask our AI Travel Assistant Banner */}
            <section className="overflow-hidden rounded-2xl border border-[#ECE9E2] bg-[#FAF9F5] shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-12 items-center">
                <div className="sm:col-span-5 relative aspect-[16/10] sm:aspect-auto sm:h-full min-h-[190px]">
                  <Image
                    src={data.heroImage}
                    alt={`Plan your ${data.name} trip`}
                    fill
                    sizes="(min-width: 640px) 40vw, 100vw"
                    className="object-cover"
                  />
                </div>

                <div className="sm:col-span-7 p-6 sm:p-7">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#666666]">
                    Plan Your {data.name} Trip
                  </span>
                  <h3 className="mt-1 font-serif text-xl sm:text-2xl font-bold text-ink">
                    Ask our AI Travel Assistant
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#555555] leading-relaxed">
                    Get personalised suggestions, itineraries, and local tips for {data.name}. Just ask!
                  </p>
                  <button
                    type="button"
                    onClick={() => handleStartPlan(`Plan a trip to ${data.name}`)}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1B4332] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-[#143325] transition-colors"
                  >
                    <span>Start chatting</span>
                    <Icon name="arrowRight" size={14} />
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Sidebar Widgets */}
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
            {/* Widget 1: State Map Card */}
            <HimachalMapCard stateName={data.name} />

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

            {/* Widget 3: Plan Your Trip */}
            <div className="rounded-2xl border border-[#ECE9E2] bg-white p-5 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-ink mb-3.5">Plan Your Trip</h3>
              <ul className="space-y-2">
                {data.planYourTrip.map((item) => (
                  <li key={item.title}>
                    <Link
                      href={item.href}
                      className="group flex items-center justify-between gap-3 rounded-xl p-2.5 transition-colors hover:bg-[#F9F8F5]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-coral/10 text-coral">
                          <Icon name={item.icon} size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-ink group-hover:text-coral transition-colors">
                            {item.title}
                          </p>
                          <p className="text-[0.6875rem] sm:text-xs text-[#666666] truncate">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <span className="text-[#888888] group-hover:text-coral group-hover:translate-x-0.5 transition-all text-sm shrink-0">
                        ›
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Widget 4: Related States */}
            <div className="rounded-2xl border border-[#ECE9E2] bg-white p-5 shadow-2xs">
              <h3 className="font-serif text-lg font-bold text-ink mb-3.5">Related States</h3>
              <ul className="space-y-2">
                {data.relatedStates.map((state) => (
                  <li key={state.name}>
                    <Link
                      href={state.href}
                      className="group flex items-center justify-between gap-3 rounded-xl p-2 transition-colors hover:bg-[#F9F8F5]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative size-11 shrink-0 rounded-lg overflow-hidden bg-[#ECE9E2]">
                          <Image
                            src={state.image}
                            alt={state.name}
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-ink group-hover:text-coral transition-colors truncate">
                            {state.name}
                          </p>
                          <p className="text-[0.6875rem] text-[#666666]">{state.region}</p>
                        </div>
                      </div>
                      <span className="text-[#888888] group-hover:text-coral group-hover:translate-x-0.5 transition-all text-sm shrink-0 pr-1">
                        ›
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
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
