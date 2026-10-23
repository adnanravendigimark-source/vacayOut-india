import type { Metadata } from "next";
import { ItinerariesPage } from "@/components/itineraries/itineraries-page";
import { site } from "@/lib/site";

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
    images: [{ url: "/images/things-to-do/dal-lake-hero.jpg", alt: "Curated Travel Plans - India Itineraries" }],
  },
};

export default function Page() {
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
      <ItinerariesPage />
    </>
  );
}
