"use client";

import { useEffect, useState } from "react";
import type { HomepageData } from "@/lib/data/types";
import { Hero } from "./hero";
import { ExploreDestinations } from "./explore-destinations";
import { ExploreRegionsAndTripTypes } from "./explore-regions-and-trip-types";
import { PlanWithAi } from "./plan-with-ai";
import { FeaturedDestinations } from "./featured-destinations";
import { ItinerariesAndGuides } from "./itineraries-and-guides";
import { TravelSmarter } from "./travel-smarter";
import { AiPlannerModal } from "@/components/chat/ai-planner-modal";

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
    <div className="relative bg-white">
      {/* 1. Cinematic Hero Section (Preserved exactly as requested) */}
      <Hero
        hero={data.hero}
        examples={data.examplePrompts}
        onStart={handleStart}
      />

      {/* 2. Explore India by Destination (6 cards: Manali, Goa, Jaipur, Kerala, Udaipur, Rishikesh) */}
      <ExploreDestinations onPlan={handleStart} />

      {/* 3. Side-by-side: Explore by State or Region (Map + 6 Region cards) & Find Your Kind of Trip (3x3 grid) */}
      <ExploreRegionsAndTripTypes onPlan={handleStart} />

      {/* 4. Plan a trip with AI (Sage green banner with search capsule and prompt pills) */}
      <PlanWithAi onPlan={handleStart} />

      {/* 5. Featured Destinations (6 cards: Kashmir, Rajasthan, Ladakh, Spiti Valley, Andaman & Nicobar, Darjeeling) */}
      <FeaturedDestinations onPlan={handleStart} />

      {/* 6. Side-by-side: Ready-made Itineraries (3 horizontal cards) & Travel Guides & Inspiration (3 vertical cards) */}
      <ItinerariesAndGuides onPlan={handleStart} />

      {/* 7. Travel Smarter with VacayOut (5 trust points: Fact-checked, Expert-reviewed, AI-powered, Licensed photos, Affiliate disclosure) */}
      <TravelSmarter />

      {/* In-Place Conversational AI Travel Planner Modal */}
      <AiPlannerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialPrompt={activePrompt}
        examples={data.examplePrompts}
      />
    </div>
  );
}
