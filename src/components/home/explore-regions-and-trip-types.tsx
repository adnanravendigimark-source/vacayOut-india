"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Icon, type Name } from "@/components/icons/icon";
import { SectionHeader } from "./section-header";
import { IndiaRegionalMap } from "./india-regional-map";

interface RegionItem {
  name: string;
  count: string;
  icon: Name;
  slug: string;
}

const REGIONS: RegionItem[] = [
  { name: "North India", count: "8 states & UTs", icon: "palace", slug: "north" },
  { name: "South India", count: "7 states & UTs", icon: "palm", slug: "south" },
  { name: "East India", count: "5 states & UTs", icon: "temple", slug: "east" },
  { name: "West India", count: "6 states & UTs", icon: "sun", slug: "west" },
  { name: "Central India", count: "5 states & UTs", icon: "compass", slug: "central" },
  { name: "Northeast India", count: "8 states & UTs", icon: "mountain", slug: "northeast" },
];

interface TripCategory {
  title: string;
  icon: Name;
  image: string;
  prompt: string;
}

const TRIP_CATEGORIES: TripCategory[] = [
  {
    title: "Mountains",
    icon: "mountain",
    image: "/images/unsplash/manali.jpg",
    prompt: "Suggest a peaceful mountain or hill retreat in India",
  },
  {
    title: "Beaches",
    icon: "waves",
    image: "/images/cinematic/dest-goa.jpg",
    prompt: "Suggest the best beach and coastal escape in India",
  },
  {
    title: "Heritage",
    icon: "palace",
    image: "/images/cinematic/dest-jaipur.jpg",
    prompt: "Suggest a royal palace and heritage trip in India",
  },
  {
    title: "Spiritual",
    icon: "temple",
    image: "/images/cinematic/dest-varanasi.jpg",
    prompt: "Suggest a spiritual and peaceful journey in India",
  },
  {
    title: "Wildlife",
    icon: "paw",
    image: "/images/destinations/wildlife.jpg",
    prompt: "Suggest a tiger safari and wildlife adventure in India",
  },
  {
    title: "Adventure",
    icon: "route",
    image: "/images/destinations/rishikesh.jpg",
    prompt: "Suggest an adventure trekking or river rafting trip in India",
  },
  {
    title: "Family",
    icon: "family",
    image: "/images/unsplash/trip-family.jpg",
    prompt: "Suggest a fun, comfortable family holiday itinerary in India",
  },
  {
    title: "Honeymoon",
    icon: "heart",
    image: "/images/unsplash/trip-romantic.jpg",
    prompt: "Suggest a romantic couple honeymoon itinerary in India",
  },
  {
    title: "Weekend",
    icon: "calendar",
    image: "/images/unsplash/trip-weekend.jpg",
    prompt: "Suggest a quick 2-3 day weekend getaway in India",
  },
];

export function ExploreRegionsAndTripTypes({
  onPlan,
}: {
  onPlan: (prompt: string) => void;
}) {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  return (
    <section id="trip-types" className="py-10 sm:py-14 bg-white border-b border-[#ECE9E2]">
      <div className="container-site">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Left Column: Explore by State or Region */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div className="flex flex-col h-full">
              <SectionHeader
                icon="map"
                title="Explore by State or Region"
                subtitle="Browse India's states and union territories, grouped by region."
                className="mb-5 sm:mb-6"
              />

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 flex-1 items-stretch">
                {/* Visual Authentic India Regional Map with Badges */}
                <IndiaRegionalMap
                  activeZone={hoveredZone}
                  onHoverZone={setHoveredZone}
                  className="sm:col-span-7"
                />

                {/* Region Cards Stack */}
                <div className="sm:col-span-5 flex flex-col justify-between gap-1.5 sm:gap-2">
                  {REGIONS.map((region) => {
                    const isHovered = hoveredZone === region.slug;
                    return (
                      <Link
                        key={region.name}
                        href={`/india?zone=${region.slug}`}
                        onMouseEnter={() => setHoveredZone(region.slug)}
                        onMouseLeave={() => setHoveredZone(null)}
                        className={`group flex items-center justify-between px-3 py-2.5 sm:px-3.5 sm:py-2.5 rounded-xl border transition-all cursor-pointer ${
                          isHovered
                            ? "border-coral bg-[#FAF8F5] shadow-xs translate-x-1"
                            : "border-[#EAE7E0] bg-white hover:border-coral hover:shadow-xs"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                              isHovered
                                ? "bg-coral text-white"
                                : "bg-[#FAF8F5] text-ink group-hover:bg-coral group-hover:text-white"
                            }`}
                          >
                            <Icon name={region.icon} size={16} />
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`text-xs sm:text-sm font-bold truncate transition-colors ${
                                isHovered ? "text-coral" : "text-ink group-hover:text-coral"
                              }`}
                            >
                              {region.name}
                            </p>
                            <p className="text-[0.6875rem] text-[#777777] truncate">
                              {region.count}
                            </p>
                          </div>
                        </div>
                        <Icon
                          name="arrowRight"
                          size={13}
                          className={`transition-all shrink-0 ml-1.5 ${
                            isHovered
                              ? "text-coral translate-x-0.5"
                              : "text-[#AAAAAA] group-hover:text-coral group-hover:translate-x-0.5"
                          }`}
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Find Your Kind of Trip */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div>
              <SectionHeader
                icon="compass"
                title="Find Your Kind of Trip"
                subtitle="Explore destinations based on your travel interests."
                className="mb-5 sm:mb-6"
              />

              {/* 3x3 Grid of Trip Types */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {TRIP_CATEGORIES.map((cat) => (
                  <button
                    key={cat.title}
                    type="button"
                    onClick={() => onPlan(cat.prompt)}
                    className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#EFECE6] shadow-xs text-left cursor-pointer"
                  >
                    <Image
                      src={cat.image}
                      alt={cat.title}
                      fill
                      sizes="(min-width: 1024px) 15vw, 30vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-108"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                    {/* Bottom Translucent Pill matching user screenshot */}
                    <div className="absolute inset-x-0 bottom-2 flex justify-center px-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md sm:rounded-lg bg-white/95 px-2 py-1 text-[0.6875rem] sm:text-xs font-bold text-ink shadow-xs backdrop-blur-xs transition-colors group-hover:text-coral">
                        <Icon name={cat.icon} size={12} className="shrink-0 text-coral" />
                        <span className="truncate">{cat.title}</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
