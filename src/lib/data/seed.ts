/**
 * Static homepage copy. Nothing here names or describes a destination as if it
 * were in our catalogue — destinations come only from published places.
 */
import type { HomepageData } from "./types";

type Static = Pick<HomepageData, "hero" | "examplePrompts" | "copy" | "smarter">;

export const homepageSeed: Static = {
  hero: {
    eyebrow: "YOUR NEXT JOURNEY STARTS HERE",
    title: "India is waiting. Where will you go?",
    body: "Discover places, plan unforgettable trips, and figure out every detail with AI.",
    inputPlaceholder: "Where would you like to go? Ask me anything…",
    photo: {
      src: "/images/cinematic/hero-india-poster.jpg",
      width: 1920,
      height: 1080,
      source: "Gemini Imagen 3 Cinematic Production",
      alt: "Panoramic India landscape with misty Himalayan peaks and Udaipur Lake Palace at golden hour",
    },
  },
  examplePrompts: [
    { label: "3 days in Udaipur", prompt: "Plan a 3 day trip to Udaipur focusing on royal heritage and lake views", icon: "route" },
    { label: "Kerala backwaters with family", prompt: "Plan a 4 day family trip to Kerala with houseboats and Munnar tea hills", icon: "family" },
    { label: "Budget trip to Meghalaya", prompt: "Plan a 5 day budget trip to Meghalaya waterfalls and living root bridges", icon: "mountain" },
    { label: "Best time for Rajasthan", prompt: "What is the best time to visit Rajasthan and how to plan the route?", icon: "compass" },
  ],
  copy: {
    destinations: {
      eyebrow: "EXPLORE INDIA",
      title: "Explore India by destination",
      body: "Towns, treks, temples and lakes with guides our editors have checked and published.",
    },
    zones: {
      eyebrow: "BY STATE OR REGION",
      title: "Explore by state or region",
      body: "Start with a state guide, then go deeper into the places inside it.",
    },
    tripTypes: {
      eyebrow: "YOUR KIND OF TRIP",
      title: "Find your kind of trip",
      body: "Pick the trip you have in mind. We’ll show the guides that fit, or plan one with you.",
    },
    planner: {
      eyebrow: "AI TRIP PLANNER",
      title: "Plan a trip with AI",
      body: "Tell us where, how long and what you enjoy. The planner answers from our published guides first, and labels anything it looked up on the web with its source.",
      cta: "Start planning",
      includes: ["Day-by-day plans", "What to see and do", "How to get there and around", "Links to search stays, tours and trains"],
      note: "Check prices, timings and availability with the provider before you book.",
    },
    featured: {
      eyebrow: "EDITORS’ PICKS",
      title: "Featured destinations",
      body: "Guides our editors are highlighting right now.",
    },
    itineraries: {
      eyebrow: "READY-MADE ITINERARIES",
      title: "Ready-made itineraries",
      body: "Day-by-day plans from our published guides. Use one as it is, or open it in the planner and make it yours.",
    },
    guides: {
      eyebrow: "TRAVEL GUIDES",
      title: "Travel guides and inspiration",
      body: "The guides we’ve most recently published or updated.",
    },
    smarter: {
      eyebrow: "WHY VACAYOUT",
      title: "Travel smarter with VacayOut",
      body: "What you can expect from every guide and every answer.",
    },
  },
  smarter: [
    { icon: "checkCircle", title: "Facts checked against sources", body: "Each fact in a guide is matched to a source page we opened and read. Guides list their sources." },
    { icon: "shield", title: "Reviewed before publishing", body: "An editor approves every section before it goes live. Nothing is published straight from AI." },
    { icon: "sparkles", title: "AI that shows its working", body: "The planner answers from our guides first. Anything it looks up on the web is labelled, with a link." },
    { icon: "calendar", title: "Time-sensitive facts re-checked", body: "Prices, hours and rules go stale. When a source is undated or over a year old, editors are warned to check it before approving." },
    { icon: "image", title: "Honest photos", body: "Photos are credited to their authors. Any AI-generated illustration is clearly labelled as one." },
    { icon: "ticket", title: "Book where you prefer", body: "We link to providers’ own search pages for stays, tours, trains and buses. We don’t show prices we can’t vouch for." },
  ],
};
