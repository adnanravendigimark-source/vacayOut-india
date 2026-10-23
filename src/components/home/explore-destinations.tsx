"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons/icon";
import { SectionHeader } from "./section-header";
import { routes } from "@/lib/routes";

export interface DestinationItem {
  id: string;
  name: string;
  state: string;
  stateSlug: string;
  slug: string;
  image: string;
  prompt: string;
}

export const POPULAR_DESTINATIONS: DestinationItem[] = [
  {
    id: "manali",
    name: "Manali",
    state: "Himachal Pradesh",
    stateSlug: "himachal-pradesh",
    slug: "manali",
    image: "/images/unsplash/manali.jpg",
    prompt: "Plan a 4-day mountain getaway to Manali and Solang Valley",
  },
  {
    id: "goa",
    name: "Goa",
    state: "Goa",
    stateSlug: "goa",
    slug: "north-goa",
    image: "/images/cinematic/dest-goa.jpg",
    prompt: "Plan a 3-day relaxed beach trip to North & South Goa",
  },
  {
    id: "jaipur",
    name: "Jaipur",
    state: "Rajasthan",
    stateSlug: "rajasthan",
    slug: "jaipur",
    image: "/images/cinematic/dest-jaipur.jpg",
    prompt: "Plan a 3-day royal heritage itinerary for Jaipur forts and bazaars",
  },
  {
    id: "kerala",
    name: "Kerala",
    state: "Kerala",
    stateSlug: "kerala",
    slug: "alappuzha",
    image: "/images/unsplash/kerala.jpg",
    prompt: "Plan a 5-day serene trip to Kerala backwaters and Munnar hills",
  },
  {
    id: "udaipur",
    name: "Udaipur",
    state: "Rajasthan",
    stateSlug: "rajasthan",
    slug: "udaipur",
    image: "/images/cinematic/dest-udaipur.jpg",
    prompt: "Plan a romantic 3-day stay in Udaipur around Lake Pichola",
  },
  {
    id: "rishikesh",
    name: "Rishikesh",
    state: "Uttarakhand",
    stateSlug: "uttarakhand",
    slug: "rishikesh",
    image: "/images/destinations/rishikesh.jpg",
    prompt: "Plan a weekend adventure and spiritual trip to Rishikesh",
  },
];

export function ExploreDestinations({
  onPlan,
}: {
  onPlan?: (prompt: string) => void;
}) {
  return (
    <section
      id="destinations"
      aria-labelledby="explore-destinations-title"
      className="py-10 sm:py-14 bg-white border-b border-[#ECE9E2]"
    >
      <div className="container-site">
        <SectionHeader
          id="explore-destinations-title"
          icon="map"
          title="Explore India by Destination"
          subtitle="Discover amazing places across India, from popular hotspots to hidden gems."
          link={{ href: routes.destinations, label: "View all destinations" }}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
          {POPULAR_DESTINATIONS.map((dest) => (
            <Link
              key={dest.id}
              href={`/india/${dest.stateSlug}/${dest.slug}`}
              onClick={(e) => {
                if (onPlan && e.metaKey === false && e.ctrlKey === false) {
                  // Allow direct click to open AI planner or browse
                }
              }}
              className="group flex flex-col cursor-pointer"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#EFECE6] shadow-xs">
                <Image
                  src={dest.image}
                  alt={`${dest.name}, ${dest.state}`}
                  fill
                  sizes="(min-width: 1024px) 16vw, (min-width: 640px) 30vw, 50vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
              </div>
              <div className="mt-2.5">
                <h3 className="text-sm font-bold text-ink group-hover:text-coral transition-colors">
                  {dest.name}
                </h3>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-[#777777]">
                  <Icon name="pin" size={12} className="text-[#999999] shrink-0" />
                  <span>{dest.state}</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
