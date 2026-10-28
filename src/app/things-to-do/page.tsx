import type { Metadata } from "next";
import { ThingsToDoPage } from "@/components/things-to-do/things-to-do-page";
import { site } from "@/lib/site";
import { PAGE_HEROES } from "@/lib/data/page-heroes";
import { thingsToDoData } from "@/lib/places/public-lists";

// Reads published guides on each request, so new publishes appear immediately.
export const dynamic = "force-dynamic";

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

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (typeof v === "string" && v.length <= 120 ? v : undefined);

export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
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
      <ThingsToDoPage data={data} hero={PAGE_HEROES.thingsToDo} initial={{ state: one(sp.state), destination: one(sp.destination), category: one(sp.category) }} />
    </>
  );
}
