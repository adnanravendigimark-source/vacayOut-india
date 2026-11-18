"use client";

import { useEffect, useRef, useState } from "react";
import type { HomepageData } from "@/lib/data/types";
import { Hero } from "./hero";
import { ExploreDestinations } from "./explore-destinations";
import { ExploreRegionsAndTripTypes } from "./explore-regions-and-trip-types";
import { PlanWithAi } from "./plan-with-ai";
import { FeaturedDestinations } from "./featured-destinations";
import { ItinerariesAndGuides } from "./itineraries-and-guides";
import { TravelSmarter } from "./travel-smarter";
import { IndiaFinale } from "./india-finale";
import { HomeIntro } from "./home-intro";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";
import { LivePathsProvider } from "./live-link";

/**
 * VacayOut Homepage:
 * - Keeps hero section and logo exactly as they are.
 * - Formats all homepage sections with mock data matching the exact user design reference.
 * - Any AI interaction triggers the in-place conversational travel planner modal.
 */
export function HomeShell({ data }: { data: HomepageData }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string | undefined>(undefined);

  const handleStart = (prompt: string) => {
    setActivePrompt(prompt);
    setIsModalOpen(true);
  };

  // Sections below the hero rise in once as they scroll into view (added by script, so no-JS stays visible).
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = (Array.from(el.children) as HTMLElement[]).filter((c, i) => i > 0 && c.tagName === "SECTION" && !c.classList.contains("india-finale"));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          (e.target as HTMLElement).dataset.in = "true";
          io.unobserve(e.target);
        }
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    for (const s of items) {
      if (s.getBoundingClientRect().top < window.innerHeight) continue;
      s.setAttribute("data-home-reveal", "");
      io.observe(s);
    }
    return () => io.disconnect();
  }, []);

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

  return (
    <LivePathsProvider paths={data.livePaths}>
    <div ref={root} className="relative bg-white">
      {/* 0. Opening reveal (first visit of a session only) */}
      <HomeIntro />

      {/* 1. Cinematic Hero Section (Preserved exactly as requested) */}
      <Hero
        hero={data.hero}
        examples={data.examplePrompts}
        onStart={handleStart}
      />

      {/* 2. Explore India by Destination (6 cards: Manali, Goa, Jaipur, Kerala, Udaipur, Rishikesh) */}
      <ExploreDestinations onPlan={handleStart} />

      {/* 3. Side-by-side: Explore by State or Region (Map + 6 Region cards) & Find Your Kind of Trip (3x3 grid) */}
      <ExploreRegionsAndTripTypes onPlan={handleStart} tripTypes={data.tripTypes} />

      {/* 4. Plan a trip with AI (Sage green banner with search capsule and prompt pills) */}
      <PlanWithAi onPlan={handleStart} examples={data.examplePrompts} readyRoutes={data.readyRoutes} />

      {/* 5. Featured Destinations (6 cards: Kashmir, Rajasthan, Ladakh, Spiti Valley, Andaman & Nicobar, Darjeeling) */}
      <FeaturedDestinations onPlan={handleStart} items={data.featured} />

      {/* 6. Side-by-side: Ready-made Itineraries (3 horizontal cards) & Travel Guides & Inspiration (3 vertical cards) */}
      <ItinerariesAndGuides onPlan={handleStart} readyRoutes={data.readyRoutes} guideCards={data.guideCards} />

      {/* 7. Travel Smarter with VacayOut (5 trust points: Fact-checked, Expert-reviewed, AI-powered, Licensed photos, Affiliate disclosure) */}
      <TravelSmarter />

      {/* 8. Closing scene: the film through "INDIA", then "Where to first?" with the AI search */}
      <IndiaFinale examples={data.examplePrompts} onStart={handleStart} />

      {/* In-Place Conversational AI Travel Planner Modal */}
      <AiPlannerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialPrompt={activePrompt}
        examples={data.examplePrompts}
      />
    </div>
    </LivePathsProvider>
  );
}
