"use client";

import Image from "@/components/media/image";
import Link from "next/link";
import { useState } from "react";
import { Icon, type Name } from "@/components/icons/icon";
import type { HomepageData } from "@/lib/data/types";
import { routes } from "@/lib/routes";
import { SectionHeader } from "./section-header";
import { LiveLink } from "./live-link";

interface TripCategory {
  key: string;
  title: string;
  line: string;
  icon: Name;
  image: string;
  prompt: string;
}

const TRIP_CATEGORIES: TripCategory[] = [
  { key: "mountains", title: "Mountains", line: "Hill stations, snow passes and slow mornings", icon: "mountain", image: "/images/unsplash/manali.jpg", prompt: "Suggest a peaceful mountain or hill retreat in India" },
  { key: "beaches", title: "Beaches", line: "Sun, seafood and long coastal drives", icon: "waves", image: "/images/cinematic/dest-goa.jpg", prompt: "Suggest the best beach and coastal escape in India" },
  { key: "heritage", title: "Heritage", line: "Forts, palaces and centuries-old cities", icon: "palace", image: "/images/cinematic/dest-jaipur.jpg", prompt: "Suggest a royal palace and heritage trip in India" },
  { key: "spiritual", title: "Spiritual", line: "Ghats, temples and quiet retreats", icon: "temple", image: "/images/cinematic/dest-varanasi.jpg", prompt: "Suggest a spiritual and peaceful journey in India" },
  { key: "wildlife", title: "Wildlife", line: "Tiger reserves, birding and jungle safaris", icon: "paw", image: "/images/destinations/wildlife.jpg", prompt: "Suggest a tiger safari and wildlife adventure in India" },
  { key: "adventure", title: "Adventure", line: "Treks, rafting and high-altitude roads", icon: "route", image: "/images/destinations/rishikesh.jpg", prompt: "Suggest an adventure trekking or river rafting trip in India" },
  { key: "family", title: "Family", line: "Easy travel and something for every age", icon: "family", image: "/images/unsplash/trip-family.jpg", prompt: "Suggest a fun, comfortable family holiday itinerary in India" },
  { key: "romantic", title: "Honeymoon", line: "Lakes, beaches and romantic hideaways", icon: "heart", image: "/images/unsplash/trip-romantic.jpg", prompt: "Suggest a romantic couple honeymoon itinerary in India" },
  { key: "weekend", title: "Weekend", line: "Two- and three-day breaks", icon: "calendar", image: "/images/unsplash/trip-weekend.jpg", prompt: "Suggest a quick 2-3 day weekend getaway in India" },
];

/**
 * Find your kind of trip: pick a mood, see the published places our editors tagged for it,
 * then open one or let the AI plan it. Choosing a tile no longer jumps straight into the planner.
 */
export function TripFinder({ tripTypes, onPlan }: { tripTypes: HomepageData["tripTypes"]; onPlan: (prompt: string) => void }) {
  const [active, setActive] = useState(TRIP_CATEGORIES[0].key);
  const cat = TRIP_CATEGORIES.find((c) => c.key === active)!;
  const placesFor = (key: string) => tripTypes.find((t) => t.key === key)?.places ?? [];
  const picks = placesFor(active).slice(0, 6);

  return (
    <div className="flex h-full flex-col">
      <SectionHeader
        icon="compass"
        title="Find Your Kind of Trip"
        subtitle="Choose the trip you're in the mood for. We'll show places that fit, or plan one for you."
        className="mb-5 sm:mb-6"
      />

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3" aria-label="Kinds of trip">
        {TRIP_CATEGORIES.map((c) => {
          const on = c.key === active;
          const n = placesFor(c.key).length;
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={on}
              aria-controls="trip-finder-panel"
              onClick={() => setActive(c.key)}
              className={`trip-tile group relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#EFECE6] text-left shadow-xs transition-all duration-300 ${
                on ? "ring-2 ring-coral ring-offset-2" : "hover:-translate-y-0.5 hover:shadow-md"
              }`}
            >
              <Image
                src={c.image}
                alt=""
                fill
                sizes="(min-width: 1024px) 15vw, 30vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
              <div className={`absolute inset-0 bg-gradient-to-t transition-opacity duration-300 ${on ? "from-black/70 via-black/20 to-transparent" : "from-black/55 via-transparent to-transparent group-hover:from-black/70"}`} />
              {n > 0 ? (
                <span className="absolute right-1.5 top-1.5 rounded-full bg-black/45 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white backdrop-blur-sm">
                  {n} {n === 1 ? "place" : "places"}
                </span>
              ) : null}
              <div className="absolute inset-x-0 bottom-2 flex justify-center px-1.5">
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[0.6875rem] font-bold shadow-xs transition-colors sm:rounded-lg sm:text-xs ${on ? "bg-coral text-white" : "bg-white/95 text-ink group-hover:text-coral"}`}>
                  <Icon name={c.icon} size={12} className={`shrink-0 ${on ? "text-white" : "text-coral"}`} />
                  <span className="truncate">{c.title}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* What fits the chosen kind of trip */}
      <div id="trip-finder-panel" aria-live="polite" className="mt-3 flex-1 rounded-2xl border border-[#F1E3DC] bg-[#FFF8F5] p-3.5 sm:mt-4 sm:p-4">
        <div key={active} className="trip-panel">
          <p className="text-sm font-bold text-ink">
            {cat.title} <span className="font-normal text-[#666666]">— {cat.line}</span>
          </p>
          {picks.length ? (
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {picks.map((d, i) => (
                <li key={`${d.stateSlug}/${d.slug}`} className="region-chip" style={{ ["--i" as string]: i }}>
                  <LiveLink
                    hrefs={[routes.destination(d)]}
                    prompt={`Plan a trip to ${d.name}`}
                    onPlan={onPlan}
                    className="inline-flex items-center gap-1 rounded-full border border-[#EEDCD2] bg-white px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-coral hover:text-coral"
                  >
                    <Icon name="pin" size={11} className="text-coral" />
                    {d.name}
                    {d.level === "place" && d.stateName ? <span className="text-[#888888]">· {d.stateName}</span> : null}
                  </LiveLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-[#666666]">Our guides for this kind of trip are on the way. The AI planner can suggest places right now.</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onPlan(cat.prompt)}
              className="inline-flex items-center gap-1.5 rounded-full bg-coral px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-coral-hover"
            >
              <Icon name="sparkles" size={13} />
              Plan a {cat.title.toLowerCase()} trip with AI
            </button>
            <Link href={routes.destinations} className="group inline-flex items-center gap-1 text-xs font-semibold text-ink/80 hover:text-coral">
              Browse all destinations
              <Icon name="arrowRight" size={12} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
