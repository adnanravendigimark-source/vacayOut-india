import type { Destination, SectionCopy } from "@/lib/data/types";
import { routes } from "@/lib/routes";
import { DestinationCard } from "./destination-card";
import { SectionHeader } from "./section-header";

const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** Section 8 — the most recently published or updated destination guides. */
export function LatestGuides({ copy, guides, sample = false }: { copy: SectionCopy; guides: Destination[]; sample?: boolean }) {
  return (
    <section id="guides" aria-labelledby="guides-title" className="bg-[#F7F5F0] py-14 lg:py-20">
      <div className="container-site">
        <SectionHeader id="guides-title" copy={copy} sample={sample} link={{ href: routes.destinations, label: "All destination guides" }} />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((d) => (
            <DestinationCard key={`${d.stateSlug}/${d.slug}`} d={d} meta={d.sample ? `${d.tagline ?? "Guide"} · ${d.stateName}` : `${d.tagline ?? "Guide"} · Updated ${fmt.format(new Date(d.publishedAt))}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
