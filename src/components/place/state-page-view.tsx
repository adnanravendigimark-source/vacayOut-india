"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons/icon";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";
import { HIMACHAL_STATE_DATA } from "@/lib/places/himachal-mock-data";

export function StatePageView() {
  const data = HIMACHAL_STATE_DATA;
  const [selectedDestCategory, setSelectedDestCategory] = useState<string>("all");
  const [selectedAttractionCategory, setSelectedAttractionCategory] = useState<string>("all");
  const [selectedItineraryId, setSelectedItineraryId] = useState<string>(data.itineraries[0].id);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string>("");

  const handleOpenAi = (prompt: string) => {
    setAiPrompt(prompt);
    setIsAiModalOpen(true);
  };

  const filteredDestinations = data.destinations.filter((dest) =>
    selectedDestCategory === "all" ? true : dest.category === selectedDestCategory
  );

  const filteredAttractions = data.attractions.filter((attr) =>
    selectedAttractionCategory === "all" ? true : attr.category === selectedAttractionCategory
  );

  const activeItinerary =
    data.itineraries.find((it) => it.id === selectedItineraryId) || data.itineraries[0];

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-ink font-sans selection:bg-coral/20">
      {/* =========================================================================
          A. HERO SECTION
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
            <span className="text-white font-medium">{data.name}</span>
          </nav>

          <div className="max-w-3xl">
            {/* Region Pill */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white mb-3 border border-white/25">
              <Icon name="mountain" size={13} className="text-coral" />
              {data.region} · State Guide
            </span>

            {/* Title */}
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
              {data.name}
            </h1>

            {/* Tagline & Informative Introduction */}
            <p className="mt-3 text-sm sm:text-base text-white/90 leading-relaxed font-light">
              {data.intro}
            </p>

            {/* Key Fact Badges */}
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1.5 rounded-lg bg-black/40 backdrop-blur-md px-3 py-1.5 border border-white/15 text-white/90">
                <Icon name="calendar" size={14} className="text-coral" />
                <span><strong>Best season:</strong> {data.quickStats.bestSeasons}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-black/40 backdrop-blur-md px-3 py-1.5 border border-white/15 text-white/90">
                <Icon name="clock" size={14} className="text-coral" />
                <span><strong>Duration:</strong> {data.quickStats.duration}</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="#destinations"
                className="inline-flex items-center gap-2 rounded-xl bg-coral px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-coral-dark transition-all"
              >
                <span>Explore destinations</span>
                <Icon name="arrowRight" size={14} />
              </a>
              <button
                type="button"
                onClick={() =>
                  handleOpenAi(
                    "I want to plan a comprehensive 7-day trip to Himachal Pradesh covering snow peaks, culture, and nature."
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/30 transition-all cursor-pointer"
              >
                <Icon name="sparkles" size={15} className="text-amber-300" />
                <span>Plan Himachal with AI</span>
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
              About State
            </a>
            <a href="#circuits" className="hover:text-coral transition-colors">
              Travel Circuits
            </a>
            <a href="#transport" className="hover:text-coral transition-colors">
              How to Reach
            </a>
            <a href="#destinations" className="text-coral transition-colors font-bold">
              Destinations
            </a>
            <a href="#attractions" className="hover:text-coral transition-colors">
              Key Attractions
            </a>
            <a href="#experiences" className="hover:text-coral transition-colors">
              Things to Do
            </a>
            <a href="#best-time" className="hover:text-coral transition-colors">
              Best Time
            </a>
            <a href="#itineraries" className="hover:text-coral transition-colors">
              Itineraries
            </a>
            <a href="#guides" className="hover:text-coral transition-colors">
              Travel Guides
            </a>
            <a href="#faqs" className="hover:text-coral transition-colors">
              FAQs
            </a>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAi("Plan a customized Himachal itinerary")}
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
            B. ABOUT HIMACHAL PRADESH
            ========================================================================= */}
        <section id="about" className="scroll-mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            <div className="lg:col-span-8 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-coral">
                  Comprehensive State Overview
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
                  Understanding Himachal Pradesh
                </h2>
              </div>

              <div className="prose prose-sm sm:prose-base text-[#444] leading-relaxed space-y-4">
                <p>{data.about.geography}</p>
                <p>{data.about.culture}</p>
              </div>

              {/* Local Food & Culture Highlights */}
              <div className="rounded-2xl border border-[#E8EDE6] bg-white p-6 shadow-xs">
                <h3 className="text-base font-bold text-ink flex items-center gap-2 mb-2">
                  <Icon name="utensils" size={18} className="text-coral" />
                  Himachali Food, Culture & Traditions
                </h3>
                <p className="text-xs sm:text-sm text-[#555] leading-relaxed">
                  {data.about.food}
                </p>
                <div className="mt-3 pt-3 border-t border-[#F0EFEA] flex flex-wrap items-center gap-4 text-xs text-[#666]">
                  <span><strong>Languages:</strong> {data.about.languages}</span>
                </div>
              </div>
            </div>

            {/* Quick First-Time Traveler Box */}
            <div className="lg:col-span-4 rounded-2xl border border-[#E5E2DC] bg-[#FAF8F5] p-5 shadow-xs space-y-4">
              <h3 className="font-serif text-base font-bold text-ink flex items-center gap-2">
                <Icon name="shield" size={16} className="text-coral" />
                First-Time Traveler Essentials
              </h3>
              <p className="text-xs text-[#555] leading-relaxed">
                {data.about.firstTimeAdvice}
              </p>
              <div className="space-y-2 pt-2 border-t border-[#E5E2DC] text-xs">
                <div className="flex items-start gap-2">
                  <Icon name="checkCircle" size={14} className="text-emerald-700 shrink-0 mt-0.5" />
                  <span><strong>Permits:</strong> Green permit required for Rohtang Pass; Inner Line Permit needed for Spiti border zones.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Icon name="checkCircle" size={14} className="text-emerald-700 shrink-0 mt-0.5" />
                  <span><strong>Altitude Warning:</strong> Allow 24 hours of rest in Manali or Kaza before attempting high pass crossings above 3,500m.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Circuits Sub-block */}
          <div id="circuits" className="mt-12 pt-8 border-t border-[#EBE8E0]">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-ink mb-2">
              Main Tourist Circuits & Mountain Valleys
            </h3>
            <p className="text-xs sm:text-sm text-[#666] mb-6 max-w-2xl">
              Himachal is not one homogenous destination. Plan your trip around specific mountain river circuits based on your travel style:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.about.circuits.map((circuit, idx) => (
                <div
                  key={circuit.name}
                  className="rounded-xl border border-[#EAE7E0] bg-white p-4.5 shadow-xs hover:border-coral transition-colors"
                >
                  <span className="text-[0.6875rem] font-bold text-coral">Circuit 0{idx + 1}</span>
                  <h4 className="text-sm font-bold text-ink mt-0.5 mb-2">{circuit.name}</h4>
                  <p className="text-xs text-[#666] leading-relaxed">{circuit.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Transport / How to Reach Breakdown */}
          <div id="transport" className="mt-12 rounded-2xl border border-[#E5E2DC] bg-white p-6 shadow-xs">
            <h3 className="font-serif text-xl font-bold text-ink mb-1 flex items-center gap-2">
              <Icon name="route" size={20} className="text-coral" />
              How to Reach Himachal Pradesh: Transport Breakdown
            </h3>
            <p className="text-xs sm:text-sm text-[#666] mb-6">
              Practical logistics for reaching your destination from major Indian hubs like Delhi and Chandigarh.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Airports */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Icon name="plane" size={16} className="text-coral" />
                  Airports (Domestic)
                </div>
                {data.about.transport.airports.map((ap) => (
                  <div key={ap.name} className="text-xs border-l-2 border-coral/40 pl-3 space-y-1">
                    <p className="font-bold text-ink">{ap.name}</p>
                    <p className="text-[#666]">{ap.distance}</p>
                    <p className="text-[0.6875rem] text-[#777]">{ap.routes}</p>
                  </div>
                ))}
              </div>

              {/* Railways */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Icon name="train" size={16} className="text-coral" />
                  Railway Gateways
                </div>
                <div className="text-xs text-[#555] leading-relaxed space-y-2">
                  <p>{data.about.transport.railways}</p>
                  <div className="rounded-lg bg-[#FAF8F5] p-3 border border-[#EAE7E0]">
                    <strong className="block text-ink mb-1">Key Railheads:</strong>
                    Kalka (KLK) for Shimla, Chandigarh (CDG) for Kullu/Manali, Pathankot (PTK) for Dharamshala/Dalhousie.
                  </div>
                </div>
              </div>

              {/* Roads & Buses */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Icon name="bus" size={16} className="text-coral" />
                  Roads & Volvo Network
                </div>
                <div className="text-xs text-[#555] leading-relaxed space-y-2">
                  <p>{data.about.transport.roads}</p>
                  <div className="rounded-lg bg-[#FAF8F5] p-3 border border-[#EAE7E0]">
                    <strong className="block text-ink mb-1">Volvo Bus Tip:</strong>
                    Book official Himachal Road Transport Corporation (HRTC) or HPTDC luxury Volvos departing Delhi Kashmiri Gate between 6 PM–9 PM.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            C. EXPLORE DESTINATIONS IN HIMACHAL PRADESH
            ========================================================================= */}
        <section id="destinations" className="scroll-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-coral">
                Towns, Valleys & Hill Stations
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
                Explore Destinations in Himachal
              </h2>
              <p className="text-xs sm:text-sm text-[#666] mt-1">
                Click any destination to open its comprehensive travel guide.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
              {[
                { key: "all", label: "All Destinations" },
                { key: "popular", label: "Popular" },
                { key: "adventure", label: "Adventure" },
                { key: "nature", label: "Nature & Peace" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedDestCategory(tab.key)}
                  className={`rounded-full px-3.5 py-1.5 font-bold transition-all cursor-pointer shrink-0 ${
                    selectedDestCategory === tab.key
                      ? "bg-ink text-white"
                      : "bg-white border border-[#E5E2DC] text-[#666] hover:border-ink hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Destinations Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredDestinations.map((dest) => (
              <Link
                key={dest.slug}
                href={dest.href}
                className="group flex flex-col justify-between rounded-2xl border border-[#EAE7E0] bg-white overflow-hidden shadow-xs hover:border-coral hover:shadow-card transition-all"
              >
                <div>
                  {/* Photo Container */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#ECE8E0]">
                    <Image
                      src={dest.image}
                      alt={dest.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="rounded-md bg-white/95 backdrop-blur-xs px-2 py-0.5 text-[0.6875rem] font-bold text-ink shadow-xs">
                        {dest.type}
                      </span>
                    </div>
                    {dest.altitude && (
                      <div className="absolute bottom-2.5 right-2.5">
                        <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[0.625rem] font-medium text-white">
                          {dest.altitude}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-serif text-lg font-bold text-ink group-hover:text-coral transition-colors flex items-center justify-between">
                      <span>{dest.name}</span>
                      <Icon
                        name="arrowRight"
                        size={14}
                        className="text-[#AAA] group-hover:text-coral group-hover:translate-x-1 transition-all"
                      />
                    </h3>
                    <p className="text-xs text-[#555] line-clamp-2 leading-relaxed">
                      {dest.description}
                    </p>

                    <div className="pt-2 border-t border-[#F0EFEA] space-y-1 text-[0.6875rem] text-[#666]">
                      <p>
                        <strong className="text-ink">Known for:</strong> {dest.bestKnownFor}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span><strong>Duration:</strong> {dest.recommendedDuration}</span>
                        <span><strong>Season:</strong> {dest.bestSeason}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-2.5 bg-[#FAF8F5] border-t border-[#EAE7E0] text-center text-xs font-bold text-coral group-hover:bg-coral group-hover:text-white transition-colors">
                  View Detailed {dest.name} Guide →
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* =========================================================================
            D. PLACES TO VISIT ACROSS HIMACHAL PRADESH
            ========================================================================= */}
        <section id="attractions" className="scroll-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-coral">
                Monuments, Passes & Shrines
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
                Iconic Places to Visit in Himachal
              </h2>
              <p className="text-xs sm:text-sm text-[#666] mt-1">
                Individual attractions researched with distance, timing, entry fees, and visitor tips.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
              {[
                { key: "all", label: "All Attractions" },
                { key: "temple", label: "Temples" },
                { key: "pass", label: "Passes & Tunnels" },
                { key: "nature", label: "Nature & Treks" },
                { key: "heritage", label: "Heritage" },
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
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
                      <Link
                        href={place.parentDestinationHref}
                        className="rounded-md bg-white/95 backdrop-blur-xs px-2 py-0.5 text-[0.6875rem] font-bold text-ink hover:text-coral shadow-xs"
                      >
                        📍 {place.parentDestination}
                      </Link>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-serif text-base font-bold text-ink">{place.name}</h3>
                      <p className="text-xs text-[#777] mt-0.5">{place.distance}</p>
                    </div>

                    <p className="text-xs text-[#555] leading-relaxed">{place.description}</p>

                    <div className="space-y-1 rounded-lg bg-[#FAF8F5] p-2.5 text-[0.6875rem] text-[#666] border border-[#EFECE6]">
                      <div className="flex justify-between">
                        <span><strong>Entry fee:</strong> {place.entryFee}</span>
                        <span><strong>Timing:</strong> {place.timings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span><strong>Duration:</strong> {place.visitingDuration}</span>
                        <span><strong>Season:</strong> {place.seasonalAccess}</span>
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

                <div className="p-3 bg-[#FAF8F5] border-t border-[#EAE7E0] text-center">
                  <Link
                    href={place.parentDestinationHref}
                    className="text-xs font-bold text-coral hover:underline inline-flex items-center gap-1"
                  >
                    <span>Explore in {place.parentDestination} destination guide</span>
                    <Icon name="arrowRight" size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            E. THINGS TO DO IN HIMACHAL PRADESH
            ========================================================================= */}
        <section id="experiences" className="scroll-mt-20">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-coral">
              Action, Nature & Culture
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
              Top Experiences in Himachal Pradesh
            </h2>
            <p className="text-xs sm:text-sm text-[#666] mt-1">
              Activities organized by adventure, season, and verified operator guidelines.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {data.experiences.map((exp) => (
              <div
                key={exp.id}
                className="group rounded-2xl border border-[#E5E2DC] bg-white overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#ECE8E0]">
                    <Image
                      src={exp.image}
                      alt={exp.title}
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="rounded-md bg-black/60 px-2 py-0.5 text-[0.6875rem] font-bold text-white">
                        {exp.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="font-serif text-sm sm:text-base font-bold text-ink">{exp.title}</h3>
                    <p className="text-xs text-[#555] line-clamp-3 leading-relaxed">
                      {exp.description}
                    </p>

                    <div className="space-y-1 pt-2 border-t border-[#F0EFEA] text-[0.6875rem] text-[#666]">
                      <p><strong>Where:</strong> {exp.location}</p>
                      <p><strong>Best season:</strong> {exp.bestSeason}</p>
                      <p><strong>Duration:</strong> {exp.duration}</p>
                      <p><strong>Difficulty:</strong> {exp.difficulty}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#FAF8F5] border-t border-[#EAE7E0] text-[0.6875rem] text-[#666]">
                  <strong className="text-ink">Safety:</strong> {exp.safetyNote}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            F. BEST TIME TO VISIT HIMACHAL PRADESH
            ========================================================================= */}
        <section id="best-time" className="scroll-mt-20 rounded-3xl border border-[#E5E2DC] bg-white p-6 sm:p-8 shadow-xs">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-coral">
              Seasonal Climate & Road Status
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
              Best Time to Visit Himachal Pradesh
            </h2>
            <p className="text-xs sm:text-sm text-[#666] mt-1 max-w-2xl">
              Himachal spans three distinct climatic zones. Conditions vary sharply between subtropical foothills and high alpine passes:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="rounded-xl border border-[#EAE7E0] bg-[#FAF8F5] p-4.5 space-y-2">
              <span className="text-xs font-bold text-coral">March to June</span>
              <h3 className="text-sm font-bold text-ink">Spring & Summer</h3>
              <p className="text-xs text-[#555] leading-relaxed">
                Pleasant weather (15°C to 28°C). Ideal for sightseeing in Shimla, Manali, Dalhousie, and paragliding in Bir. Apple blossoms blanket Kullu and Kinnaur.
              </p>
              <span className="inline-block rounded bg-emerald-100 text-emerald-800 text-[0.625rem] px-2 py-0.5 font-bold">
                Peak Sightseeing
              </span>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4.5 space-y-2">
              <span className="text-xs font-bold text-amber-800">July to August</span>
              <h3 className="text-sm font-bold text-ink">Monsoon Rains</h3>
              <p className="text-xs text-[#555] leading-relaxed">
                Heavy rainfall in lower valleys with landslide warnings on NH-21. Spiti Valley and Lahaul (rain-shadow zone) remain mostly dry and are prime to visit.
              </p>
              <span className="inline-block rounded bg-amber-200 text-amber-900 text-[0.625rem] px-2 py-0.5 font-bold">
                Spiti Season / Hill Caution
              </span>
            </div>

            <div className="rounded-xl border border-[#EAE7E0] bg-[#FAF8F5] p-4.5 space-y-2">
              <span className="text-xs font-bold text-coral">Sept to November</span>
              <h3 className="text-sm font-bold text-ink">Autumn & Harvest</h3>
              <p className="text-xs text-[#555] leading-relaxed">
                Crystal clear Himalayan skies, comfortable temperatures (10°C to 20°C). Best season for high-altitude photography, apple harvesting, and mountain treks.
              </p>
              <span className="inline-block rounded bg-sky-100 text-sky-800 text-[0.625rem] px-2 py-0.5 font-bold">
                Best Trekking & Skies
              </span>
            </div>

            <div className="rounded-xl border border-[#EAE7E0] bg-[#FAF8F5] p-4.5 space-y-2">
              <span className="text-xs font-bold text-coral">Dec to February</span>
              <h3 className="text-sm font-bold text-ink">Winter Snowfall</h3>
              <p className="text-xs text-[#555] leading-relaxed">
                Sub-zero temperatures in higher reaches. Heavy snowfall in Solang, Rohtang, Kufri, and Sethan. Ideal for skiing, snowboarding, and cozy chalet stays.
              </p>
              <span className="inline-block rounded bg-blue-100 text-blue-800 text-[0.625rem] px-2 py-0.5 font-bold">
                Snow Sports & Skiing
              </span>
            </div>
          </div>

          {/* Road Closures Guide */}
          <div className="mt-6 pt-5 border-t border-[#F0EFEA] flex flex-wrap items-center justify-between gap-4 text-xs text-[#555]">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-600" />
              <span><strong>Atal Tunnel:</strong> Open year-round (all-weather access to Lahaul)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-500" />
              <span><strong>Rohtang Pass:</strong> Open mid-May to November (Closed winter)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-blue-500" />
              <span><strong>Kunzum Pass (Spiti):</strong> Open June to October only</span>
            </div>
          </div>
        </section>

        {/* =========================================================================
            G. SUGGESTED HIMACHAL ITINERARIES
            ========================================================================= */}
        <section id="itineraries" className="scroll-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-coral">
                Researched Travel Plans
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
                Suggested Himachal Itineraries
              </h2>
              <p className="text-xs sm:text-sm text-[#666] mt-1">
                Realistic, day-by-day routes with reasonable travel pace and verified halts.
              </p>
            </div>

            {/* Itinerary Selectors */}
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

          {/* Selected Itinerary Card */}
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
                onClick={() => handleOpenAi(`Customize this itinerary for me: ${activeItinerary.title}`)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FAF8F5] border border-[#E0DCD4] px-4 py-2 text-xs font-bold text-ink hover:border-coral hover:text-coral transition-all shrink-0 cursor-pointer"
              >
                <Icon name="sparkles" size={13} className="text-coral" />
                Customize in AI
              </button>
            </div>

            {/* Day by Day Plan */}
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
                      Overnight: {day.overnight} · Travel: {day.travelTime}
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
            H. TRAVEL GUIDES FOR HIMACHAL PRADESH
            ========================================================================= */}
        <section id="guides" className="scroll-mt-20">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-coral">
              Curated Travel Intelligence
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
              Himachal Pradesh Travel Guides
            </h2>
            <p className="text-xs sm:text-sm text-[#666] mt-1">
              Read practical advice written to answer specific traveler questions before departure.
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
            I. PRACTICAL TRAVEL PLANNING
            ========================================================================= */}
        <section id="practical" className="scroll-mt-20 rounded-3xl border border-[#E5E2DC] bg-white p-6 sm:p-8 shadow-xs">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-coral">
              On the Ground Essentials
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">
              Practical Travel Planning
            </h2>
            <p className="text-xs sm:text-sm text-[#666] mt-1 max-w-2xl">
              Key tips on getting around, budget estimates, mobile connectivity, and responsible mountain tourism:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Icon name="coins" size={16} className="text-coral" />
                Budget Guidelines
              </h3>
              <p className="text-xs text-[#555] leading-relaxed">
                <strong>Backpacker:</strong> ₹1,500–₹2,000/day (Hostels, local buses, dhabas).<br />
                <strong>Mid-Range:</strong> ₹3,500–₹5,000/day (Comfortable hotels, private cabs, cafe meals).<br />
                <strong>Luxury:</strong> ₹8,000–₹16,000+/day (Boutique mountain resorts, private SUV).
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Icon name="shield" size={16} className="text-coral" />
                Connectivity & Mobile Signal
              </h3>
              <p className="text-xs text-[#555] leading-relaxed">
                Jio and Airtel provide excellent 4G/5G across Shimla, Manali, Dharamshala, and national highways. In remote Spiti (Kaza, Tabo) and high passes, BSNL is often the only active network. Carry cash for remote areas.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Icon name="help" size={16} className="text-coral" />
                Emergency & Helplines
              </h3>
              <p className="text-xs text-[#555] leading-relaxed">
                <strong>State Emergency:</strong> 112<br />
                <strong>Himachal Tourist Police:</strong> +91-177-2625890<br />
                <strong>Disaster Management Helpline:</strong> 1077 (Toll-free across HP)
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            J. MAP & FAQS
            ========================================================================= */}
        <section id="faqs" className="scroll-mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Visual State Map Card */}
            <div className="lg:col-span-5 rounded-2xl border border-[#E5E2DC] bg-white p-5 shadow-xs space-y-4">
              <h3 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                <Icon name="map" size={18} className="text-coral" />
                Himachal Pradesh Geographic Map
              </h3>
              <p className="text-xs text-[#666]">
                Explore key destinations across Himachal&apos;s mountain circuits:
              </p>

              {/* Map Illustration with Pin Markers */}
              <div className="relative aspect-[4/3] w-full rounded-xl bg-[#F6F8F5] border border-[#E8EDE6] flex items-center justify-center p-3 overflow-hidden">
                <div className="text-center space-y-2">
                  <span className="inline-block p-3 rounded-full bg-emerald-100 text-emerald-800">
                    <Icon name="mountain" size={28} />
                  </span>
                  <p className="text-xs font-bold text-ink">Western Himalayas · 12 Districts</p>
                  <p className="text-[0.6875rem] text-[#777]">
                    Kullu · Kangra · Shimla · Lahaul & Spiti · Chamba · Kinnaur
                  </p>
                </div>
              </div>

              <div className="pt-2 text-center">
                <Link
                  href="/india"
                  className="text-xs font-bold text-coral hover:underline inline-flex items-center gap-1"
                >
                  <span>Browse all Indian state maps</span>
                  <Icon name="arrowRight" size={12} />
                </Link>
              </div>
            </div>

            {/* FAQs Accordion */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-coral">
                  Frequently Answered
                </span>
                <h3 className="font-serif text-2xl font-bold text-ink mt-0.5">
                  Frequently Asked Questions
                </h3>
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
          </div>
        </section>

        {/* =========================================================================
            K. CONNECT TO OTHER VACAYOUT PAGES
            ========================================================================= */}
        <section className="rounded-3xl border border-[#E0DCD4] bg-gradient-to-r from-[#1C3326] to-[#2B4E3A] p-8 sm:p-10 text-white shadow-md">
          <div className="max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-emerald-200">
              <Icon name="sparkles" size={13} />
              Intelligent Mountain Planning
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
              Ready to Plan Your Journey to Himachal Pradesh?
            </h2>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              Use VacayOut&apos;s travel intelligence to customize dates, mountain routes, family-friendly stops, and verified taxi budgets across the state.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  handleOpenAi("Create a complete vacation itinerary for Himachal Pradesh with budget and transport")
                }
                className="inline-flex items-center gap-2 rounded-xl bg-coral px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-coral-dark transition-all cursor-pointer"
              >
                <Icon name="sparkles" size={15} />
                <span>Plan Himachal with AI</span>
              </button>
              <Link
                href="/india"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white transition-all"
              >
                <span>Explore Other Indian States</span>
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
