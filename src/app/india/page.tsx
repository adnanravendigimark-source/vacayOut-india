import type { Metadata } from "next";
import { ExplorePage } from "@/components/explore/explore-page";

export const metadata: Metadata = {
  title: "Explore India — Destinations, States & Union Territories",
  description:
    "From snow-capped mountains to golden beaches, ancient temples to vibrant cities — discover the best destinations across India with VacayOut.",
  alternates: { canonical: "/india" },
};

/** `?zone=north|south|east|west|central|northeast` (from the homepage region cards) preselects a region tab. */
export default async function Page({ searchParams }: { searchParams: Promise<{ zone?: string }> }) {
  const { zone } = await searchParams;
  return <ExplorePage key={zone ?? "all"} initialRegion={typeof zone === "string" ? zone : "all"} />;
}
