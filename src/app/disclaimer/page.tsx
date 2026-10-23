import type { Metadata } from "next";
import { InfoPage } from "@/components/info/info-page";

export const metadata: Metadata = { title: "Disclaimer", alternates: { canonical: "/disclaimer" } };

export default function Page() {
  return (
    <InfoPage
      eyebrow="LEGAL"
      title="Disclaimer"
      intro="We work hard to keep VacayOut accurate, but travel information changes. Please check important details before you travel."
      note="Draft — to be reviewed before launch."
      blocks={[
        { heading: "Guides", paragraphs: ["Guides reflect what our sources said when an editor approved them. Prices, opening hours, permits, road conditions and rules can change at any time — confirm them with the operator or authority before you go."] },
        { heading: "AI planner", paragraphs: ["The AI planner answers from our published guides first and labels anything it looks up on the web. It can still make mistakes. Treat its plans as a starting point, and check bookings, timings and safety information yourself."] },
        { heading: "Estimates", paragraphs: ["Any budget figures are estimates only, based on the sources they cite."] },
        { heading: "Booking links", paragraphs: ["Booking links open each provider's own website. VacayOut doesn't sell or guarantee bookings, prices or availability. We may earn a commission when you book through some links, at no extra cost to you."] },
      ]}
    />
  );
}
