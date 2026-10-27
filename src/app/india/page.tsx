import type { Metadata } from "next";
import { ExplorePage } from "@/components/explore/explore-page";
import { PAGE_HEROES } from "@/lib/data/page-heroes";
import { exploreIndiaData } from "@/lib/places/public-lists";

export const metadata: Metadata = {
  title: "Explore India — Destinations, States & Union Territories",
  description:
    "From snow-capped mountains to golden beaches, ancient temples to vibrant cities — discover the best destinations across India with VacayOut.",
  alternates: { canonical: "/india" },
};

// Reads published guides on each request (cheap), so new publishes appear immediately.
export const dynamic = "force-dynamic";

/** `?zone=north|south|east|west|central|northeast|islands` (from the homepage region cards) preselects a region tab. */
export default async function Page({ searchParams }: { searchParams: Promise<{ zone?: string }> }) {
  const [{ zone }, data] = await Promise.all([searchParams, exploreIndiaData()]);
  return <ExplorePage key={zone ?? "all"} data={data} hero={PAGE_HEROES.exploreIndia} initialRegion={typeof zone === "string" ? zone : "all"} />;
}
