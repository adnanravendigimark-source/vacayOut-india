import type { Metadata } from "next";
import { InfoPage } from "@/components/info/info-page";

export const metadata: Metadata = { title: "Terms & Conditions", alternates: { canonical: "/terms" } };

export default function Page() {
  return (
    <InfoPage
      eyebrow="LEGAL"
      title="Terms & Conditions"
      intro="Our terms of use are being prepared and will be published here before launch."
      note="This page is a placeholder. The final terms need legal review before VacayOut launches."
      blocks={[{ paragraphs: ["Until then, please read our disclaimer, and contact us with any questions."] }]}
    />
  );
}
