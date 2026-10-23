"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon, type Name } from "@/components/icons/icon";
import { SectionHeader } from "./section-header";
import { routes } from "@/lib/routes";

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
  return (
    <section id="trip-types" className="py-10 sm:py-14 bg-white border-b border-[#ECE9E2]">
      <div className="container-site">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Left Column: Explore by State or Region */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div>
              <SectionHeader
                icon="map"
                title="Explore by State or Region"
                subtitle="Browse India's states and union territories, grouped by region."
                className="mb-5 sm:mb-6"
              />

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                {/* Visual Stylized India Regional Map with Badges */}
                <div className="sm:col-span-5 relative flex items-center justify-center p-3 rounded-2xl bg-[#F6F8F5] border border-[#E8EDE6] min-h-[260px] overflow-hidden">
                  {/* Stylized vector map graphic of India */}
                  <svg
                    viewBox="0 0 240 280"
                    className="w-full h-auto max-h-[250px] opacity-90 drop-shadow-xs"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Kashmir / North */}
                    <path
                      d="M100 20 C105 15, 120 15, 125 25 C130 35, 135 45, 125 55 C115 65, 100 65, 95 55 C90 45, 95 25, 100 20 Z"
                      fill="#D8E8DC"
                      stroke="#BED6C4"
                      strokeWidth="1.5"
                    />
                    {/* Northern Plains / Rajasthan / West */}
                    <path
                      d="M75 60 C85 55, 125 55, 130 75 C125 95, 115 110, 85 115 C65 110, 55 90, 65 75 C70 65, 75 60, 75 60 Z"
                      fill="#E2EEE4"
                      stroke="#BED6C4"
                      strokeWidth="1.5"
                    />
                    {/* Central India */}
                    <path
                      d="M85 115 C115 110, 145 115, 150 145 C145 170, 115 175, 90 165 C75 155, 70 130, 85 115 Z"
                      fill="#CDE2D3"
                      stroke="#B2D0BA"
                      strokeWidth="1.5"
                    />
                    {/* Northeast India */}
                    <path
                      d="M165 75 C185 70, 215 75, 215 95 C215 115, 185 125, 165 110 C155 100, 155 85, 165 75 Z"
                      fill="#D8E8DC"
                      stroke="#BED6C4"
                      strokeWidth="1.5"
                    />
                    {/* South India Peninsula */}
                    <path
                      d="M90 165 C115 175, 140 170, 130 205 C120 235, 110 260, 105 265 C100 260, 90 235, 80 205 C75 185, 85 170, 90 165 Z"
                      fill="#C2DDD0"
                      stroke="#A5C9B7"
                      strokeWidth="1.5"
                    />
                  </svg>

                  {/* Regional Badges Overlaid Exactly as in Design */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-xs border border-[#BED6C4] rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold text-ink shadow-xs">
                    North <span className="text-[#666666] font-normal">(8)</span>
                  </div>
                  <div className="absolute top-1/2 left-3 -translate-y-1/2 bg-white/95 backdrop-blur-xs border border-[#BED6C4] rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold text-ink shadow-xs">
                    West <span className="text-[#666666] font-normal">(5)</span>
                  </div>
                  <div className="absolute top-[42%] left-[45%] -translate-x-1/2 bg-white/95 backdrop-blur-xs border border-[#BED6C4] rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold text-ink shadow-xs">
                    Central <span className="text-[#666666] font-normal">(5)</span>
                  </div>
                  <div className="absolute top-[32%] right-2 bg-white/95 backdrop-blur-xs border border-[#BED6C4] rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold text-ink shadow-xs">
                    Northeast <span className="text-[#666666] font-normal">(8)</span>
                  </div>
                  <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-xs border border-[#BED6C4] rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold text-ink shadow-xs">
                    South <span className="text-[#666666] font-normal">(7)</span>
                  </div>
                </div>

                {/* Region Cards Grid */}
                <div className="sm:col-span-7 grid grid-cols-2 gap-2.5">
                  {REGIONS.map((region) => (
                    <Link
                      key={region.name}
                      href={`/india?zone=${region.slug}`}
                      className="group flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-[#EAE7E0] bg-white hover:border-coral hover:shadow-xs transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#FAF8F5] text-ink group-hover:text-coral transition-colors">
                          <Icon name={region.icon} size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-ink truncate group-hover:text-coral transition-colors">
                            {region.name}
                          </p>
                          <p className="text-[0.6875rem] text-[#777777] truncate">
                            {region.count}
                          </p>
                        </div>
                      </div>
                      <Icon
                        name="arrowRight"
                        size={12}
                        className="text-[#AAAAAA] group-hover:text-coral group-hover:translate-x-0.5 transition-all shrink-0 ml-1"
                      />
                    </Link>
                  ))}
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
