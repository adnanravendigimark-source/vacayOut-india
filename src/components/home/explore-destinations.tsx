"use client";

import Image from "@/components/media/image";
import { Icon } from "@/components/icons/icon";
import { SectionHeader } from "./section-header";
import { routes } from "@/lib/routes";
import { LiveLink } from "./live-link";

export interface DestinationItem {
  id: string;
  name: string;
  state: string;
  stateSlug: string;
  slug: string;
  /** Published pages to try, in order; none published → the card opens the AI planner. */
  hrefs: string[];
  image: string;
  prompt: string;
  /** Short tag and one-line pitch shown on the card. */
  kind: string;
  pitch: string;
}

export const POPULAR_DESTINATIONS: DestinationItem[] = [
  {
    id: "manali",
    name: "Manali",
    state: "Himachal Pradesh",
    stateSlug: "himachal-pradesh",
    slug: "manali",
    hrefs: ["/india/himachal-pradesh/manali", "/india/himachal-pradesh"],
    image: "/images/unsplash/manali.jpg",
    prompt: "Plan a 4-day mountain getaway to Manali and Solang Valley",
    kind: "Mountains",
    pitch: "Snow peaks, apple orchards and Solang Valley",
  },
  {
    id: "goa",
    name: "Goa",
    state: "Goa",
    stateSlug: "goa",
    slug: "north-goa",
    hrefs: ["/india/goa"],
    image: "/images/cinematic/dest-goa.jpg",
    prompt: "Plan a 3-day relaxed beach trip to North & South Goa",
    kind: "Beaches",
    pitch: "Beaches, old churches and long sunsets",
  },
  {
    id: "jaipur",
    name: "Jaipur",
    state: "Rajasthan",
    stateSlug: "rajasthan",
    slug: "jaipur",
    hrefs: ["/india/rajasthan/jaipur", "/india/rajasthan"],
    image: "/images/cinematic/dest-jaipur.jpg",
    prompt: "Plan a 3-day royal heritage itinerary for Jaipur forts and bazaars",
    kind: "Heritage",
    pitch: "Forts, palaces and the Pink City bazaars",
  },
  {
    id: "kerala",
    name: "Kerala",
    state: "Kerala",
    stateSlug: "kerala",
    slug: "alappuzha",
    hrefs: ["/india/kerala/alappuzha", "/india/kerala"],
    image: "/images/unsplash/kerala.jpg",
    prompt: "Plan a 5-day serene trip to Kerala backwaters and Munnar hills",
    kind: "Backwaters",
    pitch: "Houseboats, backwaters and tea hills",
  },
  {
    id: "udaipur",
    name: "Udaipur",
    state: "Rajasthan",
    stateSlug: "rajasthan",
    slug: "udaipur",
    hrefs: ["/india/rajasthan/udaipur", "/india/rajasthan"],
    image: "/images/cinematic/dest-udaipur.jpg",
    prompt: "Plan a romantic 3-day stay in Udaipur around Lake Pichola",
    kind: "Romance",
    pitch: "Lakes, palaces and rooftop sunsets",
  },
  {
    id: "rishikesh",
    name: "Rishikesh",
    state: "Uttarakhand",
    stateSlug: "uttarakhand",
    slug: "rishikesh",
    hrefs: ["/india/uttarakhand/rishikesh", "/india/uttarakhand"],
    image: "/images/destinations/rishikesh.jpg",
    prompt: "Plan a weekend adventure and spiritual trip to Rishikesh",
    kind: "Adventure",
    pitch: "Ganga aarti, yoga and river rafting",
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
          subtitle="Start with India's most-loved places. Open a guide, or let AI plan the trip for you."
          link={{ href: routes.destinations, label: "View all destinations" }}
        />

        <ul className="dest-row -mx-4 flex snap-x snap-mandatory -mb-4 gap-3 overflow-x-auto px-4 pb-6 pt-1 sm:mx-0 sm:mb-0 sm:pt-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6">
          {POPULAR_DESTINATIONS.map((dest, i) => (
            <li key={dest.id} className="dcard relative w-[62%] shrink-0 snap-start sm:w-auto" style={{ ["--i" as string]: i }}>
              <LiveLink
                hrefs={dest.hrefs}
                prompt={dest.prompt}
                onPlan={onPlan}
                className="group block w-full cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
              >
                <div className="relative isolate aspect-[3/4] w-full transform-gpu overflow-hidden rounded-2xl bg-[#EFECE6] shadow-[0_10px_30px_-18px_rgba(25,25,25,0.45)] transition-[transform,box-shadow] duration-500 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_22px_44px_-20px_rgba(25,25,25,0.55)]">
                  <Image
                    src={dest.image}
                    alt={`${dest.name}, ${dest.state}`}
                    fill
                    sizes="(min-width: 1024px) 16vw, (min-width: 640px) 30vw, 68vw"
                    className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/0" />
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-ink backdrop-blur-md">
                    {dest.kind}
                  </span>
                  <div className="absolute inset-x-3 bottom-3 text-white">
                    <h3 className="font-serif text-xl font-medium leading-tight sm:text-[1.35rem]">{dest.name}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-white/80">
                      <Icon name="pin" size={12} className="shrink-0 text-coral" />
                      <span>{dest.state}</span>
                    </p>
                    <p className="dcard__pitch mt-1.5 text-[0.75rem] leading-snug text-white/90">{dest.pitch}</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-[0.75rem] font-semibold text-white">
                      Explore
                      <Icon name="arrowRight" size={13} className="transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </LiveLink>
              {onPlan ? (
                <button
                  type="button"
                  onClick={() => onPlan(dest.prompt)}
                  aria-label={`Plan a trip to ${dest.name} with AI`}
                  className="dcard__plan absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-coral px-2.5 py-1 text-[0.6875rem] font-semibold text-white shadow-md transition-all duration-300 hover:bg-coral-hover"
                >
                  <Icon name="sparkles" size={12} />
                  Plan
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
