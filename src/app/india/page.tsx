import type { Metadata } from "next";
import { ExplorePage } from "@/components/explore/explore-page";

export const metadata: Metadata = {
  title: "Explore India — Destinations, States & Union Territories",
  description:
    "From snow-capped mountains to golden beaches, ancient temples to vibrant cities — discover the best destinations across India with VacayOut.",
  alternates: { canonical: "/india" },
};

export default function Page() {
  return <ExplorePage />;
}
