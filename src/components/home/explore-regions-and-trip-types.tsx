"use client";

import type { HomepageData } from "@/lib/data/types";
import { RegionExplorer } from "./region-explorer";
import { TripFinder } from "./trip-finder";

export function ExploreRegionsAndTripTypes({
  onPlan,
  tripTypes,
}: {
  onPlan: (prompt: string) => void;
  tripTypes: HomepageData["tripTypes"];
}) {
  return (
    <section id="trip-types" className="py-10 sm:py-14 bg-white border-b border-[#ECE9E2]">
      <div className="container-site">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Left Column: Explore by State or Region */}
          <div className="lg:col-span-6">
            <RegionExplorer />
          </div>

          {/* Right Column: Find Your Kind of Trip */}
          <div className="lg:col-span-6">
            <TripFinder tripTypes={tripTypes} onPlan={onPlan} />
          </div>
        </div>
      </div>
    </section>
  );
}
