import type { Metadata, Viewport } from "next";
import "@fontsource-variable/lora/wght.css";
import "@fontsource-variable/inter/wght.css";
import "@fontsource/caveat/500.css";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { FooterGate } from "@/components/layout/footer-gate";
import { Suspense } from "react";
import { site } from "@/lib/site";
import { AuthPanel } from "@/components/account/auth-panel";

export const metadata: Metadata = {

  metadataBase: new URL(site.url),
  title: {
    default: "VacayOut — Cinematic AI Travel Planning for India",
    template: "%s | VacayOut",
  },
  description:
    "India is waiting. Where will you go? Discover breathtaking destinations, plan personalized trips, and figure out every detail with AI on VacayOut.in.",
  keywords: ["India travel", "AI trip planner", "Rajasthan itinerary", "Kerala backwaters", "Himalayan road trip", "VacayOut India"],
  openGraph: {
    title: "VacayOut — Cinematic AI Travel Planning for India",
    description: "Discover places, plan unforgettable trips, and figure out every detail with AI.",
    url: "https://vacayout.in",
    siteName: "VacayOut",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/images/cinematic/hero-india-poster.jpg",
        width: 1920,
        height: 1080,
        alt: "VacayOut — India is waiting. Where will you go?",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#F7F5F0",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body className="min-h-dvh antialiased bg-canvas text-ink selection:bg-coral/20 selection:text-coral">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-coral focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <FooterGate>
          <SiteFooter />
        </FooterGate>
        {/* Suspense: reads ?account=… without making every page dynamic. */}
        <Suspense fallback={null}>
          <AuthPanel />
        </Suspense>
      </body>
    </html>
  );
}

