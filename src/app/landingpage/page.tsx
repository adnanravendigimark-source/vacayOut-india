import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { getLandingData } from "@/lib/data/landing";
import { LandingShell } from "@/components/landing/landing-shell";

const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--vl-mono", display: "swap" });

// A design candidate for the homepage: kept out of search until it replaces "/".
export const metadata: Metadata = {
  title: { absolute: "India Travel Planner — Day-by-Day Trips | VacayOut" },
  description: "Plan your India trip day by day: explore 36 states and 700+ places, find experiences, pick a ready-made route or start planning with our AI trip planner today.",
  alternates: { canonical: "/" },
  robots: { index: false, follow: true },
};

// Same caching as the homepage: CDN-served, rebuilt at most every 5 minutes.
export const revalidate = 300;

export default async function LandingPage() {
  const data = await getLandingData();
  return <LandingShell data={data} monoClass={mono.variable} />;
}
