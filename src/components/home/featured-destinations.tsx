"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons/icon";
import { SectionHeader } from "./section-header";
import { routes } from "@/lib/routes";

export interface FeaturedItem {
  id: string;
  name: string;
  state: string;
  stateSlug: string;
  slug: string;
  image: string;
  prompt: string;
}

export const FEATURED_DESTINATIONS: FeaturedItem[] = [
  {
    id: "kashmir",
    name: "Kashmir",
    state: "Jammu & Kashmir",
    stateSlug: "jammu-kashmir",
    slug: "srinagar",
    image: "/images/cinematic/hero-india-poster.jpg",
    prompt: "Plan a 6-day scenic holiday to Srinagar, Gulmarg, and Pahalgam in Kashmir",
  },
  {
    id: "rajasthan",
    name: "Rajasthan",
    state: "Rajasthan",
    stateSlug: "rajasthan",
    slug: "jaipur",
    image: "/images/cinematic/dest-jaipur.jpg",
    prompt: "Plan a 7-day royal golden triangle trip across Jaipur, Jodhpur, and Udaipur",
  },
  {
    id: "ladakh",
    name: "Ladakh",
    state: "Ladakh",
    stateSlug: "ladakh",
    slug: "leh",
    image: "/images/destinations/ladakh.jpg",
    prompt: "Plan an unforgettable 7-day road trip to Leh Ladakh, Nubra Valley, and Pangong Lake",
  },
  {
    id: "spiti",
    name: "Spiti Valley",
    state: "Himachal Pradesh",
    stateSlug: "himachal-pradesh",
    slug: "spiti",
    image: "/images/destinations/spiti.jpg",
    prompt: "Plan an adventurous road trip through Spiti Valley, Kaza, and Key Monastery",
  },
  {
    id: "andaman",
    name: "Andaman & Nicobar",
    state: "Andaman & Nicobar Islands",
    stateSlug: "andaman-nicobar",
    slug: "havelock",
    image: "/images/destinations/andaman.jpg",
    prompt: "Plan a tropical 5-day island holiday in Andaman, Havelock, and Neil Island",
  },
  {
    id: "darjeeling",
    name: "Darjeeling",
    state: "West Bengal",
    stateSlug: "west-bengal",
    slug: "darjeeling",
    image: "/images/destinations/darjeeling.jpg",
    prompt: "Plan a 4-day tea garden retreat and sunrise view in Darjeeling",
  },
];

export function FeaturedDestinations({
  onPlan,
}: {
  onPlan?: (prompt: string) => void;
}) {
  return (
    <section
      id="featured"
      aria-labelledby="featured-destinations-title"
      className="py-10 sm:py-14 bg-white border-b border-[#ECE9E2]"
    >
      <div className="container-site">
        <SectionHeader
          id="featured-destinations-title"
          icon="star"
          title="Featured Destinations"
          subtitle="Handpicked places, loved by travellers."
          link={{ href: routes.destinations, label: "View all destinations" }}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
          {FEATURED_DESTINATIONS.map((dest) => (
            <Link
              key={dest.id}
              href={`/india/${dest.stateSlug}/${dest.slug}`}
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
