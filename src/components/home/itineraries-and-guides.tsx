"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons/icon";
import { SectionHeader } from "./section-header";
import { routes } from "@/lib/routes";

interface ItineraryItem {
  id: string;
  title: string;
  tags: string;
  days: string;
  image: string;
  prompt: string;
}

const ITINERARIES: ItineraryItem[] = [
  {
    id: "manali-3d",
    title: "3 Days in Manali",
    tags: "Mountains • Adventure",
    days: "Day 1 • Day 2 • Day 3",
    image: "/images/unsplash/manali.jpg",
    prompt: "Show me a detailed 3-day itinerary for Manali covering Solang, Old Manali, and Rohtang",
  },
  {
    id: "rajasthan-5d",
    title: "5 Days in Rajasthan",
    tags: "Heritage • Culture",
    days: "Day 1 • Day 2 • Day 3 +",
    image: "/images/cinematic/dest-jaipur.jpg",
    prompt: "Show me a detailed 5-day itinerary for Rajasthan covering Jaipur, Jodhpur, and desert forts",
  },
  {
    id: "kerala-7d",
    title: "7 Days in Kerala",
    tags: "Backwaters • Beaches",
    days: "Day 1 • Day 2 • Day 3 +",
    image: "/images/unsplash/kerala.jpg",
    prompt: "Show me a detailed 7-day itinerary for Kerala backwaters, Munnar tea hills, and Marari beach",
  },
];

interface GuideItem {
  id: string;
  title: string;
  image: string;
  href: string;
  prompt: string;
}

const GUIDES: GuideItem[] = [
  {
    id: "ladakh-best-time",
    title: "Best Time to Visit Ladakh",
    image: "/images/destinations/ladakh.jpg",
    href: "/india/ladakh",
    prompt: "When is the best time to visit Ladakh and what are weather conditions like?",
  },
  {
    id: "himachal-trekking",
    title: "Trekking in Himachal Pradesh",
    image: "/images/destinations/trekking.jpg",
    href: "/india/himachal-pradesh",
    prompt: "What are the best beginner and intermediate treks in Himachal Pradesh?",
  },
  {
    id: "first-timers",
    title: "Travel Tips for First-Time Visitors",
    image: "/images/unsplash/varanasi.jpg",
    href: "/india/uttar-pradesh/varanasi",
    prompt: "What are essential travel tips, etiquette, and transit advice for first-time India travellers?",
  },
];

export function ItinerariesAndGuides({
  onPlan,
}: {
  onPlan: (prompt: string) => void;
}) {
  return (
    <section id="itineraries" className="py-10 sm:py-14 bg-white border-b border-[#ECE9E2]">
      <div className="container-site">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Left Column: Ready-made Itineraries */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            <div>
              <SectionHeader
                icon="fileText"
                title="Ready-made Itineraries"
                subtitle="Suggested trip plans for every type of traveller."
                link={{ href: routes.chat, label: "View all itineraries" }}
                className="mb-5 sm:mb-6"
              />

              <div className="space-y-3">
                {ITINERARIES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onPlan(item.prompt)}
                    className="group flex w-full items-center gap-3.5 sm:gap-4 rounded-xl border border-[#EAE7E0] bg-white p-2.5 sm:p-3 hover:border-coral hover:shadow-xs transition-all text-left cursor-pointer"
                  >
                    <div className="relative size-16 sm:size-20 shrink-0 overflow-hidden rounded-lg bg-[#EFECE6]">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="80px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-bold text-ink group-hover:text-coral transition-colors truncate">
                        {item.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-[#777777] truncate">
                        {item.tags}
                      </p>
                      <p className="mt-1 text-[0.6875rem] font-semibold text-[#888888] tracking-wider uppercase">
                        {item.days}
                      </p>
                    </div>
                    <Icon
                      name="arrowRight"
                      size={14}
                      className="text-[#AAAAAA] group-hover:text-coral group-hover:translate-x-0.5 transition-all shrink-0 mr-1"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Travel Guides & Inspiration */}
          <div id="guides" className="lg:col-span-6 flex flex-col justify-between">
            <div>
              <SectionHeader
                icon="book"
                title="Travel Guides & Inspiration"
                subtitle="Useful guides, tips and local insights for your next trip."
                link={{ href: routes.destinations, label: "View all guides" }}
                className="mb-5 sm:mb-6"
              />

              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {GUIDES.map((guide) => (
                  <Link
                    key={guide.id}
                    href={guide.href}
                    className="group flex flex-col cursor-pointer"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-[#EFECE6] shadow-xs">
                      <Image
                        src={guide.image}
                        alt={guide.title}
                        fill
                        sizes="(min-width: 1024px) 16vw, 30vw"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    </div>
                    <div className="mt-2.5 flex-1 flex flex-col justify-between">
                      <h3 className="text-xs sm:text-sm font-bold text-ink leading-snug line-clamp-2 group-hover:text-coral transition-colors">
                        {guide.title}
                      </h3>
                      <p className="mt-2 inline-flex items-center gap-1 text-[0.6875rem] sm:text-xs font-semibold text-coral">
                        <span>Read more</span>
                        <Icon name="arrowRight" size={11} className="transition-transform group-hover:translate-x-0.5" />
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
