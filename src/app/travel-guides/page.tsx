import type { Metadata } from "next";
import { TravelGuidesPage } from "@/components/travel-guides/travel-guides-page";
import { site } from "@/lib/site";
import { PAGE_HEROES } from "@/lib/data/page-heroes";
import { travelGuidesData } from "@/lib/places/public-lists";

// Reads published guides on each request, so new publishes appear immediately.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "India Travel Guides — Plan Smarter, Travel Better | VacayOut",
  },
  description:
    "Discover in-depth travel guides, local tips and expert advice to help you explore India's most incredible destinations with confidence.",
  alternates: { canonical: "/travel-guides" },
  openGraph: {
    title: "India Travel Guides | VacayOut",
    description:
      "Discover in-depth travel guides, local tips and expert advice to help you explore India's most incredible destinations with confidence.",
    images: [{ url: PAGE_HEROES.travelGuides.src, alt: PAGE_HEROES.travelGuides.alt }],
  },
};

export default async function Page() {
  const data = await travelGuidesData();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "India Travel Guides",
    url: `${site.url}/travel-guides`,
    description:
      "Discover in-depth travel guides, local tips and expert advice for India's best destinations.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <TravelGuidesPage data={data} hero={PAGE_HEROES.travelGuides} />
    </>
  );
}
