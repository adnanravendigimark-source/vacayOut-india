"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons/icon";
import type { Itinerary, SectionCopy } from "@/lib/data/types";
import { routes } from "@/lib/routes";
import { SectionHeader } from "./section-header";

/** Section 7 — approved itineraries from published guides. */
export function Itineraries({ copy, items, onPlan, sample = false }: { copy: SectionCopy; items: Itinerary[]; onPlan: (prompt: string) => void; sample?: boolean }) {
  return (
    <section id="itineraries" aria-labelledby="itineraries-title" className="bg-white py-14 lg:py-20">
      <div className="container-site">
        <SectionHeader id="itineraries-title" copy={copy} sample={sample} />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map(({ destination: d, days }) => {
            const n = days.length;
            const title = `${n} day${n === 1 ? "" : "s"} in ${d.name}`;
            return (
              <article key={`${d.stateSlug}/${d.slug}`} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card">
                <div className="relative aspect-[2/1] bg-sand">
                  {d.photo ? <Image src={d.photo.src} alt={d.photo.alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover" /> : <span className="flex size-full items-center justify-center text-muted/50"><Icon name="route" size={36} /></span>}
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink">{n} day{n === 1 ? "" : "s"}</span>
                  {d.aiImage ? <span className="absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">AI-generated illustration</span> : null}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-coral">{d.level === "state" ? "India" : d.stateName}</p>
                  <h3 className="mt-1 font-serif text-lg font-medium text-ink">{title}</h3>
                  <ol className="mt-3 space-y-1.5 text-sm text-[#555555]">
                    {days.slice(0, 4).map((t, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="w-12 shrink-0 text-xs font-semibold uppercase leading-6 text-muted">Day {i + 1}</span>
                        <span className="line-clamp-2">{t}</span>
                      </li>
                    ))}
                    {n > 4 ? <li className="pl-15 text-sm text-muted">+ {n - 4} more day{n - 4 === 1 ? "" : "s"}</li> : null}
                  </ol>
                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-line-subtle pt-4 mt-6">
                    {d.sample ? <span className="text-xs font-semibold uppercase tracking-wide text-muted/70">Guide coming soon</span> : (
                      <Link href={`${routes.destination(d)}#s-itinerary`} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted transition-colors hover:text-ink">
                        View itinerary <Icon name="arrowRight" size={14} />
                      </Link>
                    )}
                    <button type="button" onClick={() => onPlan(d.sample ? `Plan ${title}` : `Customise the ${title} itinerary from the VacayOut guide for me`)} className="inline-flex items-center gap-1.5 rounded-full bg-coral/10 px-3.5 py-1.5 text-xs font-semibold text-coral transition-all hover:bg-coral hover:text-white">
                      <Icon name="sparkles" size={13} /> Customise with AI
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
