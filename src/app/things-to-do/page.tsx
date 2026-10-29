import type { Metadata } from "next";
import { Suspense } from "react";
import { ThingsToDoPage, ThingsToDoPageFromUrl } from "@/components/things-to-do/things-to-do-page";
import { site } from "@/lib/site";
import { PAGE_HEROES } from "@/lib/data/page-heroes";
import { thingsToDoData } from "@/lib/places/public-lists";

// Served from the CDN cache and rebuilt at most every 5 minutes; publishing in the admin refreshes it at once.
export const revalidate = 300;

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
    images: [{ url: PAGE_HEROES.thingsToDo.src, alt: PAGE_HEROES.thingsToDo.alt }],
  },
};

/** `?state=…&destination=…&category=…` preselect filters; they're read in the browser so the page can be cached. */
export default async function Page() {
  const data = await thingsToDoData();
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
      <Suspense fallback={<ThingsToDoPage data={data} hero={PAGE_HEROES.thingsToDo} />}>
        <ThingsToDoPageFromUrl data={data} hero={PAGE_HEROES.thingsToDo} />
      </Suspense>
    </>
  );
}
