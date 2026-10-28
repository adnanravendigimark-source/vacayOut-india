"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Icon, type Name } from "@/components/icons/icon";
import type { SnapshotImage } from "@/lib/db/schema";
import { TRIP_TYPES } from "@/lib/places/trip-types";

export type ExplorerPlace = { name: string; slug: string; kind: string; kindLabel: string; href: string | null; hero: SnapshotImage | null; tripTypes: string[] };

/**
 * Published places inside a destination as photo cards, plus "Explore by
 * travel type" tiles (from editor-confirmed tags) that filter the cards.
 */
export function PlacesExplorer({ title, stateName, places }: { title: string; stateName: string; places: ExplorerPlace[] }) {
  const [type, setType] = useState<string | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const types = useMemo(() => TRIP_TYPES.map((t) => ({ ...t, count: places.filter((p) => p.tripTypes.includes(t.key)).length })).filter((t) => t.count > 0), [places]);
  const shown = type ? places.filter((p) => p.tripTypes.includes(type)) : places;
  const current = types.find((t) => t.key === type);

  return (
    <div>
      <div ref={top} className="mb-5 flex flex-wrap items-end justify-between gap-3 scroll-mt-24">
        <h2 className="font-serif text-[1.75rem] font-medium text-ink">{title}</h2>
        {current ? (
          <button type="button" onClick={() => setType(null)} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white">
            {current.label} <Icon name="x" size={12} />
          </button>
        ) : null}
      </div>
      <ul className="grid grid-cols-2 gap-4 @2xl:grid-cols-3 @4xl:grid-cols-4">
        {shown.map((p) => {
          const card = (
            <>
              <span className="relative block aspect-[4/3] overflow-hidden bg-sand">
                {p.hero ? <Image src={p.hero.url} alt={p.hero.alt} fill sizes="(min-width: 1024px) 220px, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" /> : <span className="flex size-full items-center justify-center text-muted/50"><Icon name="mountain" size={32} /></span>}
                {p.hero?.kind === "ai_generated" ? <span className="absolute left-2 top-2 rounded bg-black/65 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white">AI illustration</span> : null}
              </span>
              <span className="flex items-start justify-between gap-2 p-3">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{p.name}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-muted"><Icon name="pin" size={12} className="shrink-0" /> <span className="truncate">{p.kindLabel} · {stateName}</span></span>
                </span>
                {p.href ? <Icon name="arrowRight" size={16} className="mt-0.5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" /> : null}
              </span>
            </>
          );
          return (
            <li key={p.slug}>
              {p.href ? (
                <Link href={p.href} className="group block overflow-hidden rounded-xl border border-line bg-white transition-shadow hover:shadow-card-hover">{card}</Link>
              ) : (
                <div className="group block overflow-hidden rounded-xl border border-line bg-white">{card}</div>
              )}
            </li>
          );
        })}
      </ul>

      {types.length ? (
        <div className="mt-10">
          <h3 className="font-serif text-xl font-medium text-ink">Explore by travel type</h3>
          <ul className="mt-4 grid grid-cols-3 gap-3 @2xl:grid-cols-6">
            {types.map((t) => (
              <li key={t.key}>
                <button
                  type="button"
                  aria-pressed={type === t.key}
                  onClick={() => { setType(type === t.key ? null : t.key); top.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
                  className={`flex h-full w-full flex-col items-center gap-2 rounded-xl border px-2 py-4 text-center text-sm font-medium transition-colors ${type === t.key ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink"}`}
                >
                  <Icon name={t.icon as Name} size={24} className={type === t.key ? "text-white" : "text-coral"} />
                  <span className="leading-tight">{t.label}</span>
                  <span className={`text-xs ${type === t.key ? "text-white/75" : "text-muted"}`}>{t.count} place{t.count === 1 ? "" : "s"}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
