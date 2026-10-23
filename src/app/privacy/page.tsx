import type { Metadata } from "next";
import { InfoPage } from "@/components/info/info-page";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

export default function Page() {
  return (
    <InfoPage
      eyebrow="LEGAL"
      title="Privacy Policy"
      intro="Our full privacy policy is being prepared and will be published here before launch."
      note="This page is a placeholder. The final policy needs legal review before VacayOut launches."
      blocks={[{ paragraphs: ["If you have a question about your data or want it deleted, email us and we'll help."] }]}
    />
  );
}
