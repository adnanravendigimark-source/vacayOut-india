"use client";

import { useState } from "react";
import { Icon, type Name } from "@/components/icons/icon";
import type { SectionCopy, TripTypeGroup } from "@/lib/data/types";
import { DestinationCard } from "./destination-card";
import { SectionHeader } from "./section-header";

/**
 * Section 4 — trip types. A type with editor-tagged guides shows them; a type
 * without any yet opens the AI planner instead of showing nothing.
 */
export function TripTypes({ copy, types, onPlan, sample = false }: { copy: SectionCopy; types: TripTypeGroup[]; onPlan: (prompt: string) => void; sample?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const current = types.find((t) => t.key === open);

  return (
    <section id="trip-types" aria-labelledby="trip-types-title" className="bg-white py-14 lg:py-20">
      <div className="container-site">
        <SectionHeader id="trip-types-title" copy={copy} sample={sample} />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {types.map((t) => {
            const active = open === t.key;
            const has = t.places.length > 0;
            return (
              <li key={t.key}>
                <button
                  type="button"
                  aria-expanded={has ? active : undefined}
                  aria-controls={has ? "trip-type-panel" : undefined}
                  onClick={() => (has ? setOpen(active ? null : t.key) : onPlan(t.prompt))}
                  className={`flex h-full w-full flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all ${active ? "border-ink bg-ink text-white" : "border-line bg-[#F7F5F0] text-ink hover:-translate-y-0.5 hover:border-ink"}`}
                >
                  <span className={`flex size-10 items-center justify-center rounded-xl ${active ? "bg-white/15 text-white" : "bg-coral/10 text-coral"}`}>
                    <Icon name={t.icon as Name} size={20} />
                  </span>
                  <span className="font-semibold leading-snug">{t.label}</span>
                  <span className={`mt-auto inline-flex items-center gap-1 text-xs font-medium ${active ? "text-white/80" : "text-muted"}`}>
                    {has ? `${t.places.length} guide${t.places.length === 1 ? "" : "s"}` : <><Icon name="sparkles" size={12} /> Plan with AI</>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {current ? (
          <div id="trip-type-panel" className="mt-10">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-serif text-xl text-ink">{current.label}</h3>
              <button type="button" onClick={() => onPlan(current.prompt)} className="inline-flex items-center gap-1.5 rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-coral-hover">
                <Icon name="sparkles" size={14} /> Plan a {current.label.toLowerCase()} trip with AI
              </button>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {current.places.slice(0, 6).map((d) => <DestinationCard key={`${d.stateSlug}/${d.slug}`} d={d} onPlan={onPlan} />)}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
