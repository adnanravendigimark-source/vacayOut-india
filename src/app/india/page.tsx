import type { Metadata } from "next";
import { Suspense } from "react";
import { ExplorePage, ExplorePageFromUrl } from "@/components/explore/explore-page";
import { PAGE_HEROES } from "@/lib/data/page-heroes";
import { exploreIndiaData } from "@/lib/places/public-lists";

export const metadata: Metadata = {
  title: "Explore India — Destinations, States & Union Territories",
  description:
    "From snow-capped mountains to golden beaches, ancient temples to vibrant cities — discover the best destinations across India with VacayOut.",
  alternates: { canonical: "/india" },
};

// Served from the CDN cache and rebuilt at most every 5 minutes; publishing in the admin refreshes it at once.
export const revalidate = 300;

/**
 * `?zone=north|south|…` (from the homepage region cards) preselects a region tab. The query is read
 * in the browser so the page itself can be cached; the cached HTML shows all regions.
 */
export default async function Page() {
  const data = await exploreIndiaData();
  return (
    <Suspense fallback={<ExplorePage data={data} hero={PAGE_HEROES.exploreIndia} />}>
      <ExplorePageFromUrl data={data} hero={PAGE_HEROES.exploreIndia} />
    </Suspense>
  );
}
