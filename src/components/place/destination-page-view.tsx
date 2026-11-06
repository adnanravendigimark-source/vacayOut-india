"use client";

import { useState } from "react";
import Image from "@/components/media/image";
import Link from "next/link";
import { Icon } from "@/components/icons/icon";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";
import { MANALI_DESTINATION_DATA } from "@/lib/places/himachal-mock-data";

export function DestinationPageView() {
  const data = MANALI_DESTINATION_DATA;
  const [selectedAttractionCategory, setSelectedAttractionCategory] = useState<string>("all");
  const [selectedItineraryId, setSelectedItineraryId] = useState<string>(data.itineraries[0].id);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string>("");

  const handleOpenAi = (prompt: string) => {
    setAiPrompt(prompt);
    setIsAiModalOpen(true);
  };

  const filteredAttractions = data.placesToVisit.filter((attr) =>
    selectedAttractionCategory === "all" ? true : attr.category === selectedAttractionCategory
  );

  const activeItinerary =
    data.itineraries.find((it) => it.id === selectedItineraryId) || data.itineraries[0];

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-ink font-sans selection:bg-coral/20">
      {/* =========================================================================
          A. DESTINATION HERO
          ========================================================================= */}
      <section className="relative isolate flex min-h-[520px] sm:min-h-[580px] lg:min-h-[640px] w-full items-end pb-12 sm:pb-16 overflow-hidden">
        {/* Background Landscape Photo */}
        <div className="absolute inset-0 -z-20">
          <Image
            src={data.heroImage}
            alt={data.name}
            fill
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/30" />
        </div>

        <div className="container-site w-full text-white">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-white/80">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <span className="text-white/50">/</span>
            <Link href="/india" className="hover:text-white transition-colors">
              Explore India
            </Link>
            <span className="text-white/50">/</span>
            <Link href={data.parentStateHref} className="hover:text-white transition-colors">
              {data.parentState}
            </Link>
            <span className="text-white/50">/</span>
            <span className="text-white font-medium">{data.name}</span>
          </nav>

          <div className="max-w-3xl">
            {/* Destination Type & Altitude Pill */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white border border-white/25">
                <Icon name="mountain" size={13} className="text-coral" />
                Alpine Adventure Hub
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md px-2.5 py-1 text-xs font-medium text-white/90 border border-white/15">
                Elevation: {data.altitude}
              </span>
            </div>

            {/* Title */}
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
              {data.name} Travel Guide
            </h1>

            {/* Informative Intro */}
            <p className="mt-3 text-sm sm:text-base text-white/90 leading-relaxed font-light">
              {data.intro}
            </p>

            {/* Key Fact Badges */}
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1.5 rounded-lg bg-black/40 backdrop-blur-md px-3 py-1.5 border border-white/15 text-white/90">
                <Icon name="calendar" size={14} className="text-coral" />
                <span><strong>Best season:</strong> {data.bestSeason}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-black/40 backdrop-blur-md px-3 py-1.5 border border-white/15 text-white/90">
                <Icon name="clock" size={14} className="text-coral" />
                <span><strong>Stay duration:</strong> {data.recommendedDuration}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-black/40 backdrop-blur-md px-3 py-1.5 border border-white/15 text-white/90">
                <Icon name="plane" size={14} className="text-coral" />
                <span>{data.nearestAirport}</span>
              </div>
            </div>

            {/* Important Permit / Access Notice Banner */}
            <div className="mt-4 rounded-xl bg-amber-500/20 backdrop-blur-md border border-amber-400/40 p-3 text-xs text-amber-100 flex items-start gap-2.5">
              <Icon name="shield" size={16} className="text-amber-300 shrink-0 mt-0.5" />
              <span>{data.permitNotice}</span>
            </div>

            {/* CTAs */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="#places-to-visit"
                className="inline-flex items-center gap-2 rounded-xl bg-coral px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-coral-dark transition-all"
              >
                <span>Explore places to see</span>
                <Icon name="arrowRight" size={14} />
              </a>
              <button
                type="button"
                onClick={() =>
                  handleOpenAi(
                    "Plan a 4-day trip to Manali covering Hadimba Temple, Solang Valley, Atal Tunnel to Sissu, and Old Manali cafes."
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/30 transition-all cursor-pointer"
              >
                <Icon name="sparkles" size={15} className="text-amber-300" />
                <span>Plan Manali with AI</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          STICKY SUBNAV BAR
          ========================================================================= */}
      <nav className="sticky top-0 z-30 border-b border-[#E5E2DC] bg-white/95 backdrop-blur-md shadow-xs hidden md:block">
        <div className="container-site flex items-center justify-between overflow-x-auto py-3 text-xs font-semibold text-[#555] scrollbar-none">
          <div className="flex items-center gap-6">
            <a href="#about" className="hover:text-coral transition-colors">
              About Manali
            </a>
            <a href="#nearby" className="hover:text-coral transition-colors">
              Nearby Places
            </a>
            <a href="#places-to-visit" className="text-coral transition-colors font-bold">
              Places to Visit
            </a>
            <a href="#areas" className="hover:text-coral transition-colors">
              Where to Stay & Areas
            </a>
            <a href="#things-to-do" className="hover:text-coral transition-colors">
              Things to Do
            </a>
            <a href="#itineraries" className="hover:text-coral transition-colors">
              Itineraries
            </a>
            <a href="#guides" className="hover:text-coral transition-colors">
              Travel Guides
            </a>
            <a href="#food-shopping" className="hover:text-coral transition-colors">
              Food & Shopping
            </a>
            <a href="#practical-plan" className="hover:text-coral transition-colors">
              Practical Info
            </a>
            <a href="#faqs" className="hover:text-coral transition-colors">
              FAQs
            </a>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAi("Plan a customized Manali itinerary")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FAF8F5] border border-[#E0DCD4] px-3 py-1 text-xs font-bold text-ink hover:border-coral hover:text-coral transition-all"
          >
            <Icon name="sparkles" size={12} className="text-coral" />
            AI Plan
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT CONTAINER */}
      <main className="container-site py-10 sm:py-14 space-y-16 sm:space-y-20">
        {/* =========================================================================
            B. ABOUT MANALI
            ========================================================================= */}
        <section id="about" className="scroll-mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            <div className="lg:col-span-8 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-coral">
                  Destination Deep-Dive
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
                  Why Visit Manali?
                </h2>
              </div>

              <div className="prose prose-sm sm:prose-base text-[#444] leading-relaxed space-y-4">
                <p>{data.about.setting}</p>
                <p>{data.about.whyFamous}</p>
              </div>

              {/* What makes it different card */}
              <div className="rounded-2xl border border-[#E8EDE6] bg-white p-6 shadow-xs space-y-2">
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <Icon name="compass" size={18} className="text-coral" />
                  What Makes Manali Different From Shimla or Kasol?
                </h3>
                <p className="text-xs sm:text-sm text-[#555] leading-relaxed">
                  {data.about.differentiator}
                </p>
              </div>
            </div>

            {/* Quick Who Should Visit Card */}
            <div className="lg:col-span-4 rounded-2xl border border-[#E5E2DC] bg-[#FAF8F5] p-5 shadow-xs space-y-4">
              <h3 className="font-serif text-base font-bold text-ink flex items-center gap-2">
                <Icon name="user" size={16} className="text-coral" />
                Who Should Visit Manali?
              </h3>
              <p className="text-xs text-[#555] leading-relaxed">
                {data.about.whoShouldVisit}
              </p>
              <div className="pt-3 border-t border-[#E5E2DC] text-xs text-[#666] space-y-1.5">
                <p><strong>Recommended stay:</strong> {data.recommendedDuration}</p>
                <p><strong>Elevation:</strong> {data.altitude}</p>
                <p><strong>State:</strong> <Link href={data.parentStateHref} className="text-coral font-bold hover:underline">{data.parentState}</Link></p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            C. DESTINATIONS AND NEARBY PLACES (DAY TRIPS)
            ========================================================================= */}
        <section id="nearby" className="scroll-mt-20">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-coral">
              Excursions & Day Trips
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
              Surrounding Hamlets & Places Near Manali
            </h2>
            <p className="text-xs sm:text-sm text-[#666] mt-1">
              Extend your stay by exploring these picturesque villages and valley viewpoints within 45 minutes of Manali town.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.nearbyPlaces.map((place) => (
              <div
                key={place.name}
                className="group rounded-2xl border border-[#EAE7E0] bg-white overflow-hidden shadow-xs hover:border-coral transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#ECE8E0]">
                    <Image
                      src={place.image}
                      alt={place.name}
                      fill
                      sizes="(min-width: 1024px) 33vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="rounded-md bg-black/60 px-2 py-0.5 text-[0.6875rem] font-bold text-white">
                        {place.distance}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-base font-bold text-ink group-hover:text-coral transition-colors">
                        {place.name}
                      </h3>
                      <span className="text-[0.6875rem] text-[#888] font-medium shrink-0">
                        {place.journeyTime}
                      </span>
                    </div>
                    <p className="text-xs text-[#555] leading-relaxed">{place.highlights}</p>
                  </div>
                </div>

                <div className="p-3 bg-[#FAF8F5] border-t border-[#EAE7E0] flex items-center justify-between text-[0.6875rem] text-[#666]">
                  <span><strong>Suggested time:</strong> {place.timeToSpend}</span>
                  <span className="text-coral font-bold">{place.bestSeason}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            D. PLACES TO VISIT IN MANALI (ATTRACTION DIRECTORY)
            ========================================================================= */}
        <section id="places-to-visit" className="scroll-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-coral">
                Complete Attraction Collection
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
                Places to Visit in Manali
              </h2>
              <p className="text-xs sm:text-sm text-[#666] mt-1">
                Verified sights with distances from town, entry fees, visiting times, and insider tips.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
              {[
                { key: "all", label: "All Sights" },
                { key: "temple", label: "Temples & Heritage" },
                { key: "pass", label: "Passes & Tunnels" },
                { key: "nature", label: "Nature & Waterfalls" },
                { key: "heritage", label: "Castles & Forts" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedAttractionCategory(tab.key)}
                  className={`rounded-full px-3.5 py-1.5 font-bold transition-all cursor-pointer shrink-0 ${
                    selectedAttractionCategory === tab.key
                      ? "bg-ink text-white"
                      : "bg-white border border-[#E5E2DC] text-[#666] hover:border-ink hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAttractions.map((place) => (
              <div
                key={place.id}
                className="rounded-2xl border border-[#E5E2DC] bg-white overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#ECE8E0]">
                    <Image
                      src={place.image}
                      alt={place.name}
                      fill
                      sizes="(min-width: 1024px) 33vw, 50vw"
                      className="object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="rounded-md bg-white/95 backdrop-blur-xs px-2 py-0.5 text-[0.6875rem] font-bold text-ink shadow-xs">
                        {place.distance}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-serif text-base font-bold text-ink">{place.name}</h3>
                      <p className="text-xs text-[#555] mt-1 leading-relaxed">{place.description}</p>
                    </div>

                    <div className="space-y-1 rounded-lg bg-[#FAF8F5] p-2.5 text-[0.6875rem] text-[#666] border border-[#EFECE6]">
                      <div className="flex justify-between">
                        <span><strong>Entry fee:</strong> {place.entryFee}</span>
                        <span><strong>Timings:</strong> {place.timings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span><strong>Duration:</strong> {place.visitingDuration}</span>
                        <span><strong>Access:</strong> {place.seasonalAccess}</span>
                      </div>
                    </div>

                    {place.permitsRequired && (
                      <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-[0.6875rem] text-amber-900 font-medium">
                        ⚠️ {place.permitsRequired}
                      </div>
                    )}

                    <div className="text-[0.6875rem] text-[#666]">
                      <strong className="text-ink">Visitor Tip:</strong> {place.insiderTips}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            E. AREAS OF MANALI (NEIGHBORHOODS & WHERE TO STAY)
            ========================================================================= */}
        <section id="areas" className="scroll-mt-20">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-coral">
              Neighborhoods Breakdown
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
              Areas of Manali & Where to Stay
            </h2>
            <p className="text-xs sm:text-sm text-[#666] mt-1">
              Choose the right base for your travel style, budget, and daily activities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.areas.map((area) => (
              <div
                key={area.id}
                className="rounded-2xl border border-[#E5E2DC] bg-white p-5 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-[#F0EFEA] pb-3">
                    <div>
                      <h3 className="font-serif text-base font-bold text-ink">{area.name}</h3>
                      <span className="text-[0.6875rem] font-bold text-coral">{area.vibe}</span>
                    </div>
                    <span className="text-[0.6875rem] text-[#777] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E5E2DC]">
                      {area.distanceToCenter}
                    </span>
                  </div>

                  <div className="pt-3 space-y-2 text-xs text-[#555] leading-relaxed">
                    <p><strong>Food & Atmosphere:</strong> {area.foodAndShopping}</p>
                    <p><strong>Stays:</strong> {area.accommodationType}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F0EFEA] text-xs">
                  <span className="font-bold text-ink">Best for:</span>{" "}
                  <span className="text-emerald-800 font-medium">{area.bestFor}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            F. THINGS TO DO IN MANALI
            ========================================================================= */}
        <section id="things-to-do" className="scroll-mt-20">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-coral">
              Curated Experiences
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
              Things to Do in Manali
            </h2>
            <p className="text-xs sm:text-sm text-[#666] mt-1">
              High-altitude activities, snow sports, cafe culture, and river expeditions with verified safety information.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {data.thingsToDo.map((act) => (
              <div
                key={act.id}
                className="group rounded-2xl border border-[#E5E2DC] bg-white overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#ECE8E0]">
                    <Image
                      src={act.image}
                      alt={act.title}
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="rounded-md bg-black/60 px-2 py-0.5 text-[0.6875rem] font-bold text-white">
                        {act.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="font-serif text-sm sm:text-base font-bold text-ink">{act.title}</h3>
                    <p className="text-xs text-[#555] line-clamp-3 leading-relaxed">
                      {act.description}
                    </p>

                    <div className="space-y-1 pt-2 border-t border-[#F0EFEA] text-[0.6875rem] text-[#666]">
                      <p><strong>Where:</strong> {act.location}</p>
                      <p><strong>Best season:</strong> {act.bestSeason}</p>
                      <p><strong>Duration:</strong> {act.duration}</p>
                      <p><strong>Difficulty:</strong> {act.difficulty}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#FAF8F5] border-t border-[#EAE7E0] text-[0.6875rem] text-[#666]">
                  <strong className="text-ink">Safety note:</strong> {act.safetyNote}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            G. SUGGESTED MANALI ITINERARIES
            ========================================================================= */}
        <section id="itineraries" className="scroll-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-coral">
                Tested Ready-Made Plans
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
                Suggested Manali Itineraries
              </h2>
              <p className="text-xs sm:text-sm text-[#666] mt-1">
                Sequenced plans with realistic road travel times, resting breaks, and seasonal options.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {data.itineraries.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setSelectedItineraryId(it.id)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                    selectedItineraryId === it.id
                      ? "bg-coral text-white shadow-xs"
                      : "bg-white border border-[#E5E2DC] text-ink hover:border-coral"
                  }`}
                >
                  {it.duration}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#E5E2DC] bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#F0EFEA]">
              <div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-ink">
                  {activeItinerary.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#666] mt-1">
                  <strong>Route:</strong> {activeItinerary.route} · <strong>Pace:</strong> {activeItinerary.pace}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenAi(`Customize this Manali itinerary: ${activeItinerary.title}`)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FAF8F5] border border-[#E0DCD4] px-4 py-2 text-xs font-bold text-ink hover:border-coral hover:text-coral transition-all shrink-0 cursor-pointer"
              >
                <Icon name="sparkles" size={13} className="text-coral" />
                Customize in AI
              </button>
            </div>

            <div className="space-y-4">
              {activeItinerary.days.map((day) => (
                <div
                  key={day.day}
                  className="rounded-xl border border-[#EAE7E0] bg-[#FAF8F5] p-4.5 space-y-2 hover:border-[#BED6C4] transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-coral">
                      Day 0{day.day} · {day.title}
                    </span>
                    <span className="text-[0.6875rem] font-medium text-[#777] bg-white px-2 py-0.5 rounded border border-[#E5E2DC]">
                      Travel: {day.travelTime}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-[#555] pt-1">
                    <div>
                      <strong className="block text-ink text-[0.6875rem] mb-0.5">Morning</strong>
                      {day.morning}
                    </div>
                    <div>
                      <strong className="block text-ink text-[0.6875rem] mb-0.5">Afternoon</strong>
                      {day.afternoon}
                    </div>
                    <div>
                      <strong className="block text-ink text-[0.6875rem] mb-0.5">Evening</strong>
                      {day.evening}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================================
            H. TRAVEL GUIDES FOR MANALI
            ========================================================================= */}
        <section id="guides" className="scroll-mt-20">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-coral">
              Actionable Intelligence
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
              Manali Travel Guides
            </h2>
            <p className="text-xs sm:text-sm text-[#666] mt-1">
              Read step-by-step guides answering actual questions travelers face on arrival.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {data.guides.map((guide) => (
              <div
                key={guide.id}
                className="group rounded-2xl border border-[#E5E2DC] bg-white overflow-hidden shadow-xs flex flex-col justify-between hover:border-coral transition-colors"
              >
                <div>
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#ECE8E0]">
                    <Image
                      src={guide.image}
                      alt={guide.title}
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="rounded-md bg-white/95 backdrop-blur-xs px-2 py-0.5 text-[0.6875rem] font-bold text-ink">
                        {guide.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <span className="text-[0.6875rem] text-[#888] font-medium">{guide.readTime}</span>
                    <h3 className="font-serif text-sm font-bold text-ink group-hover:text-coral transition-colors line-clamp-2">
                      {guide.title}
                    </h3>
                    <p className="text-xs text-[#555] line-clamp-2 leading-relaxed">
                      {guide.summary}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-[#FAF8F5] border-t border-[#EAE7E0] text-right">
                  <span className="text-xs font-bold text-coral group-hover:translate-x-1 inline-flex items-center gap-1 transition-all">
                    Read guide <Icon name="arrowRight" size={12} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            I. FOOD AND SHOPPING
            ========================================================================= */}
        <section id="food-shopping" className="scroll-mt-20 rounded-3xl border border-[#E5E2DC] bg-white p-6 sm:p-8 shadow-xs">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-coral">
              Local Flavors & Artisanal Crafts
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
              Food, Cafes & Shopping in Manali
            </h2>
            <p className="text-xs sm:text-sm text-[#666] mt-1 max-w-2xl">
              Authentic Himachali specialties, iconic Old Manali cafes, and genuine regional handicrafts:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {/* Himachali Dishes */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Icon name="utensils" size={16} className="text-coral" />
                Must-Try Local Dishes
              </h3>
              <div className="space-y-2">
                {data.foodAndShopping.dishes.map((dish) => (
                  <div key={dish.name} className="text-xs rounded-lg bg-[#FAF8F5] p-2.5 border border-[#EAE7E0]">
                    <strong className="block text-ink">{dish.name}</strong>
                    <span className="text-[#666] text-[0.6875rem]">{dish.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Old Manali Cafes */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Icon name="star" size={16} className="text-coral" />
                Iconic Mountain Cafes
              </h3>
              <div className="space-y-2 text-xs text-[#555]">
                {data.foodAndShopping.cafes.map((cafe) => (
                  <div key={cafe} className="rounded-lg bg-[#FAF8F5] p-2.5 border border-[#EAE7E0]">
                    {cafe}
                  </div>
                ))}
              </div>
            </div>

            {/* What to Buy */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Icon name="bag" size={16} className="text-coral" />
                Shopping & What to Buy
              </h3>
              <div className="space-y-2">
                {data.foodAndShopping.shopping.map((item) => (
                  <div key={item.item} className="text-xs rounded-lg bg-[#FAF8F5] p-2.5 border border-[#EAE7E0]">
                    <strong className="block text-ink">{item.item}</strong>
                    <span className="text-[#666] text-[0.6875rem]">Tip: {item.tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            J. PLAN YOUR MANALI TRIP (PRACTICAL INFORMATION)
            ========================================================================= */}
        <section id="practical-plan" className="scroll-mt-20 rounded-3xl border border-[#E5E2DC] bg-white p-6 sm:p-8 shadow-xs">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-coral">
              Practical Logistics & Budgets
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
              Plan Your Manali Trip
            </h2>
            <p className="text-xs sm:text-sm text-[#666] mt-1 max-w-2xl">
              Verified details on seasonal climate, arrival routes, daily expenses, and local taxi rates:
            </p>
          </div>

          {/* Climate by Season */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6">
            {data.practicalPlan.seasons.map((season) => (
              <div key={season.name} className="rounded-xl border border-[#EAE7E0] bg-[#FAF8F5] p-4 space-y-1.5">
                <strong className="block text-xs font-bold text-coral">{season.name}</strong>
                <span className="block text-[0.6875rem] font-bold text-ink">{season.temp}</span>
                <p className="text-[0.6875rem] text-[#666] leading-relaxed">{season.advice}</p>
              </div>
            ))}
          </div>

          {/* Transport & Budget Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-[#F0EFEA]">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Icon name="route" size={16} className="text-coral" />
                Getting There & Around
              </h3>
              <div className="space-y-2 text-xs text-[#555] leading-relaxed">
                <p><strong>By Air:</strong> {data.practicalPlan.gettingThere.byAir}</p>
                <p><strong>By Train:</strong> {data.practicalPlan.gettingThere.byTrain}</p>
                <p><strong>By Road:</strong> {data.practicalPlan.gettingThere.byRoad}</p>
                <p><strong>Local Cabs:</strong> {data.practicalPlan.localTransport.options}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Icon name="coins" size={16} className="text-coral" />
                Realistic Daily Budget
              </h3>
              <div className="space-y-2">
                {data.practicalPlan.budgetBreakdown.map((b) => (
                  <div key={b.tier} className="rounded-lg bg-[#FAF8F5] p-2.5 border border-[#EAE7E0] text-xs">
                    <div className="flex justify-between font-bold text-ink mb-1">
                      <span>{b.tier}</span>
                      <span className="text-coral">{b.dailyCost}</span>
                    </div>
                    <p className="text-[0.6875rem] text-[#666]">{b.details}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            K. SEARCH & BOOK
            ========================================================================= */}
        <section id="book" className="scroll-mt-20 rounded-2xl border border-[#E5E2DC] bg-[#FAF8F5] p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                <Icon name="ticket" size={18} className="text-coral" />
                Search Stays & Transport for Manali
              </h3>
              <p className="text-xs text-[#666] mt-0.5">
                Check verified options with our integrated travel partners (opens external secure portals).
              </p>
            </div>
            <span className="text-[0.6875rem] text-[#888] bg-white px-2.5 py-1 rounded-md border border-[#E5E2DC]">
              Affiliate Partner Links
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <a
              href="https://www.booking.com"
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-white p-3 border border-[#E0DCD4] font-bold text-ink hover:border-coral hover:text-coral transition-colors shadow-xs"
            >
              <Icon name="hotel" size={15} />
              Hotels & Chalets
            </a>
            <a
              href="https://www.redbus.in"
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-white p-3 border border-[#E0DCD4] font-bold text-ink hover:border-coral hover:text-coral transition-colors shadow-xs"
            >
              <Icon name="bus" size={15} />
              Delhi Volvo Buses
            </a>
            <a
              href="https://www.makemytrip.com"
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-white p-3 border border-[#E0DCD4] font-bold text-ink hover:border-coral hover:text-coral transition-colors shadow-xs"
            >
              <Icon name="plane" size={15} />
              Bhuntar Flights
            </a>
            <a
              href="https://www.tripadvisor.com"
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-white p-3 border border-[#E0DCD4] font-bold text-ink hover:border-coral hover:text-coral transition-colors shadow-xs"
            >
              <Icon name="route" size={15} />
              Tours & Activities
            </a>
          </div>
        </section>

        {/* =========================================================================
            L. FAQS
            ========================================================================= */}
        <section id="faqs" className="scroll-mt-20">
          <div className="max-w-3xl space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-coral">
                Helpful Clarifications
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-0.5">
                Frequently Asked Questions about Manali
              </h2>
            </div>

            <div className="space-y-3">
              {data.faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={faq.question}
                    className="rounded-xl border border-[#EAE7E0] bg-white overflow-hidden shadow-xs transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between p-4 text-left font-serif text-sm font-bold text-ink hover:text-coral transition-colors cursor-pointer"
                    >
                      <span>{faq.question}</span>
                      <Icon
                        name="chevronDown"
                        size={16}
                        className={`text-[#888] transition-transform duration-200 shrink-0 ml-2 ${
                          isOpen ? "rotate-180 text-coral" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-xs text-[#555] leading-relaxed border-t border-[#F5F4F0] pt-3">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================================
            O. CONTEXTUAL AI PLANNER CARD
            ========================================================================= */}
        <section className="rounded-3xl border border-[#E0DCD4] bg-gradient-to-r from-[#1C3326] to-[#2B4E3A] p-8 sm:p-10 text-white shadow-md">
          <div className="max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-emerald-200">
              <Icon name="sparkles" size={13} />
              AI Itinerary Builder
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
              Plan Your Custom Manali Trip
            </h2>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              Our travel intelligence already understands that you are planning Manali, Himachal Pradesh. Customize travel dates, budget tier, family or couple pace, and snow activity preferences.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  handleOpenAi(
                    "Create a custom Manali travel itinerary for 4 days including Atal Tunnel, Solang paragliding, Hadimba Temple, and Old Manali cafes with estimated costs."
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl bg-coral px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-coral-dark transition-all cursor-pointer"
              >
                <Icon name="sparkles" size={15} />
                <span>Start AI Planning for Manali</span>
              </button>
              <Link
                href={data.parentStateHref}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white transition-all"
              >
                <span>Back to Himachal Pradesh State Guide</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* AI Planner Modal */}
      <AiPlannerModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        initialPrompt={aiPrompt}
      />
    </div>
  );
}
