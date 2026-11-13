import type { Metadata } from "next";
import { InfoPage } from "@/components/info/info-page";

export const metadata: Metadata = { title: "Terms & Conditions", alternates: { canonical: "/terms" } };

export default function Page() {
  return (
    <InfoPage
      eyebrow="LEGAL"
      title="Terms & Conditions"
      intro="The rules for using VacayOut. By using the site you agree to them. Last updated 13 November 2026."
      note="Draft. It still needs legal review before launch."
      blocks={[
        {
          heading: "What VacayOut is",
          paragraphs: [
            "VacayOut is a free travel information and trip-planning service for India. We publish destination guides, itineraries and travel guides, and offer an AI planner. We are not a travel agent: we do not sell trips, tickets or rooms.",
          ],
        },
        {
          heading: "Travel information and AI answers",
          list: [
            "Guides are researched from cited sources, but prices, timings, permits, road access and safety advisories change. Check them with the official source before you book or travel.",
            "AI answers can be wrong or out of date. Treat them as a starting point, not advice.",
            "Follow official travel advisories and local rules. You are responsible for your own travel decisions.",
          ],
        },
        {
          heading: "Your account",
          list: [
            "Give accurate details and keep your password private.",
            "Free AI questions are limited; signed-in accounts get a daily allowance. We may change these limits.",
            "Don't misuse the service: no automated scraping, attempts to break security or limits, or using the AI for anything other than travel planning.",
            "We may suspend accounts that break these rules. You can delete your account at any time.",
          ],
        },
        {
          heading: "Booking links",
          paragraphs: [
            "Some links go to booking partners and may earn us a commission at no extra cost to you. Your booking is with that partner, under their terms.",
          ],
        },
        {
          heading: "Content",
          paragraphs: [
            "Text and design on VacayOut belong to us. Photos are credited and used under their own licences (mostly Wikimedia Commons). Map data © OpenStreetMap contributors.",
          ],
        },
        {
          heading: "Liability",
          paragraphs: [
            "The service is provided as it is. To the extent the law allows, we are not liable for losses arising from travel decisions made using it. These terms are governed by the laws of India.",
          ],
        },
        {
          heading: "Contact",
          paragraphs: ["Questions about these terms: hello@vacayout.in."],
        },
      ]}
    />
  );
}
