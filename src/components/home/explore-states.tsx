import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons/icon";
import type { SectionCopy, ZoneGroup } from "@/lib/data/types";
import { routes } from "@/lib/routes";
import { SectionHeader } from "./section-header";

function StateLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  const cls = "group flex items-center gap-3 rounded-xl border border-line bg-white p-2.5 transition-all";
  return href ? <Link href={href} className={`${cls} hover:border-ink hover:shadow-card`}>{children}</Link> : <div className={cls}>{children}</div>;
}

/** Section 3 — published state guides, grouped by region. */
export function ExploreStates({ copy, zones, sample = false }: { copy: SectionCopy; zones: ZoneGroup[]; sample?: boolean }) {
  return (
    <section id="states" aria-labelledby="states-title" className="border-b border-line bg-white py-14 lg:py-20">
      <div className="container-site">
        <SectionHeader id="states-title" copy={copy} sample={sample} link={{ href: routes.destinations, label: "Browse the India directory" }} />
        <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((z) => (
            <div key={z.zone}>
              <h3 className="mb-3 flex items-center gap-2 border-b border-line pb-2 font-serif text-base font-semibold text-ink">
                <span className="size-2 rounded-full bg-coral" />
                {z.zone === "Islands" ? "Islands" : `${z.zone} India`}
              </h3>
              <ul className="space-y-3">
                {z.states.map((s) => (
                  <li key={s.slug}>
                    <StateLink href={s.sample ? null : routes.state(s.slug)}>
                      <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-sand">
                        {s.photo ? <Image src={s.photo.src} alt="" fill sizes="64px" className="object-cover" /> : <span className="flex size-full items-center justify-center text-muted/50"><Icon name="map" size={24} /></span>}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink group-hover:text-coral">{s.name}</span>
                        <span className="text-sm text-muted">{s.places ? `${s.places} place${s.places === 1 ? "" : "s"} to explore` : "State guide"}</span>
                      </span>
                    </StateLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
