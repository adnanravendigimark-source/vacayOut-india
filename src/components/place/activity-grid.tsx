"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icons/icon";
import type { SnapshotImage } from "@/lib/db/schema";
import { ACTIVITY_CATEGORIES } from "@/lib/places/categories";

export type ActivityCard = { slug: string; name: string; summary: string | null; category: string | null; where: string | null; href: string | null; hero: SnapshotImage | null };

/** Things-to-do records as cards, filterable by category. */
export function ActivityGrid({ items }: { items: ActivityCard[] }) {
  const [cat, setCat] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const cats = useMemo(() => ACTIVITY_CATEGORIES.map((c) => ({ ...c, count: items.filter((i) => i.category === c.key).length })).filter((c) => c.count > 0), [items]);
  const filtered = cat ? items.filter((i) => i.category === cat) : items;
  const shown = all ? filtered : filtered.slice(0, 8);
  const ICON: Record<string, "route" | "mountain" | "palace" | "temple" | "heart" | "utensils" | "calendar"> = { adventure: "route", nature: "mountain", culture: "palace", spiritual: "temple", wellness: "heart", food_shopping: "utensils", events: "calendar" };
  const label = (k: string | null) => ACTIVITY_CATEGORIES.find((c) => c.key === k)?.label ?? "Experience";
  return (
    <div className="space-y-5">
      {cats.length > 1 ? (
        <div role="group" aria-label="Filter things to do" className="flex flex-wrap gap-2">
          {[{ key: null as string | null, label: "All", count: items.length }, ...cats].map((c) => (
            <button
              key={c.key ?? "all"}
              type="button"
              aria-pressed={cat === c.key}
              onClick={() => { setCat(c.key); setAll(false); }}
              className={`min-h-10 rounded-full border px-4 text-[0.8125rem] font-medium transition-all ${cat === c.key ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:-translate-y-0.5 hover:border-ink"}`}
            >
              {c.label} <span className={cat === c.key ? "text-white/70" : "text-muted"}>{c.count}</span>
            </button>
          ))}
        </div>
      ) : null}
      <ul className="grid gap-4 @lg:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4">
        {shown.map((a) => {
          const inner = (
            <>
              <span className="relative block aspect-[16/9] overflow-hidden bg-sand">
                {a.hero ? <Image src={a.hero.url} alt={a.hero.alt} fill sizes="(min-width: 1024px) 360px, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" /> : <span className="flex size-full items-center justify-center bg-gradient-to-br from-[#FBEDE8] via-[#F7F2EA] to-[#EEF4F0] text-coral/70 transition-transform duration-500 group-hover:scale-105"><Icon name={ICON[a.category ?? ""] ?? "compass"} size={34} /></span>}
                {a.hero?.kind === "ai_generated" ? <span className="absolute left-2 top-2 rounded bg-black/65 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white">AI illustration</span> : null}
              </span>
              <span className="flex flex-1 flex-col gap-1 p-3.5">
                <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[#B9442B]">{label(a.category)}</span>
                <span className="text-[0.9375rem] font-semibold leading-snug text-ink group-hover:text-coral">{a.name}</span>
                {a.summary ? <span className="line-clamp-2 text-[0.8125rem] leading-relaxed text-[#555]">{a.summary}</span> : null}
                {a.where ? <span className="mt-auto flex items-center gap-1 pt-1 text-xs text-muted"><Icon name="pin" size={12} /> {a.where}</span> : null}
              </span>
            </>
          );
          return (
            <li key={a.slug} className="flex">
              {a.href ? (
                <Link href={a.href} className="group flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition duration-300 hover:-translate-y-1 hover:shadow-card-hover">{inner}</Link>
              ) : (
                <div className="group flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-white">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
      {filtered.length > 8 ? (
        <button type="button" onClick={() => setAll((x) => !x)} className="mx-auto flex items-center gap-1.5 rounded-full border border-line bg-white px-5 py-2 text-sm font-semibold text-ink transition hover:border-ink">
          {all ? "Show fewer" : `Show all ${filtered.length}`} <Icon name="chevronDown" size={15} className={`transition-transform ${all ? "rotate-180" : ""}`} />
        </button>
      ) : null}
    </div>
  );
}
