import type { Metadata } from "next";
import { InfoPage } from "@/components/info/info-page";

export const metadata: Metadata = { title: "Sources & Editorial Policy", alternates: { canonical: "/sources" } };

export default function Page() {
  return (
    <InfoPage
      eyebrow="HOW WE WORK"
      title="Sources & Editorial Policy"
      intro="Every VacayOut guide goes through the same research and review process before it's published."
      blocks={[
        { heading: "Research", list: ["Each fact in a guide must quote a source page.", "We open each source ourselves and confirm the quoted text is really there.", "Facts are labelled as backed by one source, by several independent sources, or as conflicting.", "Prices, hours, schedules and rules are flagged as time-sensitive."] },
        { heading: "Review", list: ["An editor reviews every section before it's published.", "Approving a section also approves the facts it cites; conflicting or unsupported facts must be resolved first.", "If a fact is later rejected, every section that uses it goes back for review."] },
        { heading: "Sources on the page", paragraphs: ["Each guide lists the pages its facts were checked against, so you can read them yourself."] },
        { heading: "Images", paragraphs: ["We use photos with a licence that allows reuse, credited to their authors. If no suitable photo exists we may use an AI-generated illustration, always clearly labelled and never presented as a photograph of the place."] },
        { heading: "Corrections", paragraphs: ["Spotted something out of date or wrong? Email us and we'll check it."] },
      ]}
    />
  );
}
