import type { Metadata } from "next";
import { InfoPage } from "@/components/info/info-page";

export const metadata: Metadata = { title: "About VacayOut", description: "VacayOut is an India-only travel guide and AI trip planner built on checked, editor-approved guides.", alternates: { canonical: "/about" } };

export default function Page() {
  return (
    <InfoPage
      eyebrow="ABOUT US"
      title="About VacayOut"
      intro="VacayOut helps you discover places in India and plan trips around them — with guides you can trust and an AI planner that shows where its answers come from."
      blocks={[
        { heading: "What we do", paragraphs: ["We publish destination guides for India: what a place is like, what to see, when to go and how to get there. Alongside them, the AI trip planner turns a rough idea into a day-by-day plan."] },
        { heading: "How our guides are made", list: ["Facts are researched from public sources, and each one is matched to a page we opened and read.", "An editor reviews every section and approves it before it goes live.", "Time-sensitive details — prices, hours and rules — are flagged so editors re-check them.", "Photos are credited to their authors, and any AI-generated illustration is labelled as one."] },
        { heading: "India only", paragraphs: ["VacayOut covers travel within India, and the AI planner answers India-travel questions only."] },
      ]}
    />
  );
}
