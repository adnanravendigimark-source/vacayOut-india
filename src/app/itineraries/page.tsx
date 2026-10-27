import type { Metadata } from "next";
import { ItinerariesPage } from "@/components/itineraries/itineraries-page";
import { site } from "@/lib/site";
import { PAGE_HEROES } from "@/lib/data/page-heroes";
import { listPublishedItineraries } from "@/lib/itineraries/service";

// Reads published itineraries on each request, so new publishes appear immediately.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "India Travel Itineraries — Ready-made Curated Trips | VacayOut",
  },
  description:
    "Discover ready-made travel plans for every kind of trip – from quick weekend getaways to week-long adventures, with day-wise itineraries, estimated time and must-visit places across India.",
  alternates: { canonical: "/itineraries" },
  openGraph: {
    title: "India Travel Itineraries | VacayOut",
    description:
      "Discover ready-made travel plans for every kind of trip – from quick weekend getaways to week-long adventures across India.",
    images: [{ url: PAGE_HEROES.itineraries.src, alt: PAGE_HEROES.itineraries.alt }],
  },
};

export default async function Page() {
  const rows = await listPublishedItineraries();
  const itineraries = rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    durationDays: r.durationDays,
    tripTypes: r.tripTypes,
    image: r.hero ? { url: r.hero.url, alt: r.hero.alt, kind: r.hero.kind, attribution: r.hero.attribution, license: r.hero.license } : null,
    placeName: r.place.name,
    stateName: r.place.stateName,
    placePath: r.place.path,
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "India Travel Itineraries",
    url: `${site.url}/itineraries`,
    description:
      "Discover ready-made travel plans for every kind of trip across India.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ItinerariesPage itineraries={itineraries} hero={PAGE_HEROES.itineraries} />
    </>
  );
}
