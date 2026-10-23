import type { Metadata } from "next";
import { ThingsToDoPage } from "@/components/things-to-do/things-to-do-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    absolute: "Things to Do in India — Travel Experiences & Activities | VacayOut",
  },
  description:
    "From majestic mountains to pristine beaches, sacred temples to thrilling adventures – find curated experiences that match your travel style across India.",
  alternates: { canonical: "/things-to-do" },
  openGraph: {
    title: "Things to Do in India | VacayOut",
    description:
      "From majestic mountains to pristine beaches, sacred temples to thrilling adventures – find curated experiences that match your travel style across India.",
    images: [{ url: "/images/things-to-do/dal-lake-hero.jpg", alt: "Dal Lake Srinagar - Things to Do in India" }],
  },
};

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Things to Do in India",
    url: `${site.url}/things-to-do`,
    description:
      "Explore curated travel experiences, outdoor activities, heritage tours, and spiritual journeys across India.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ThingsToDoPage />
    </>
  );
}
