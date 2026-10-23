"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export type DirectoryGroup = {
  state: { slug: string; name: string; summary: string | null };
  places: { id: string; slug: string; name: string; summary: string | null; hero: { url: string; alt: string; ai: boolean } | null }[];
};

/** Published destinations grouped by state. A search box appears once the list is long enough to need one. */
export function DirectoryList({ groups }: { groups: DirectoryGroup[] }) {
  const [q, setQ] = useState("");
  const total = groups.reduce((n, g) => n + 1 + g.places.length, 0);
  const term = q.trim().toLowerCase();
  const shown = groups
    .map((g) => {
      if (!term || g.state.name.toLowerCase().includes(term)) return g;
      return { ...g, places: g.places.filter((p) => p.name.toLowerCase().includes(term)) };
    })
    .filter((g) => !term || g.places.length > 0 || g.state.name.toLowerCase().includes(term));

  return (
    <div>
      {total >= 12 ? (
        <>
          <label htmlFor="dir-q" className="sr-only">Search destinations</label>
          <input
            id="dir-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search destinations"
            className="mb-8 h-11 w-full max-w-md rounded-full border border-line bg-white px-4 text-sm outline-none focus:border-ink"
          />
        </>
      ) : null}
      {shown.length === 0 ? <p className="text-muted">No destinations match “{q}”.</p> : null}
      <div className="space-y-12">
        {shown.map(({ state, places }) => (
          <section key={state.slug} aria-labelledby={`st-${state.slug}`}>
            <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
              <h2 id={`st-${state.slug}`} className="font-serif text-2xl font-medium">
                <Link href={`/india/${state.slug}`} className="hover:underline">{state.name}</Link>
              </h2>
              <Link href={`/india/${state.slug}`} className="text-sm font-semibold underline underline-offset-4">State guide</Link>
            </div>
            {places.length ? (
              <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {places.map((p) => (
                  <li key={p.id} className="overflow-hidden rounded-2xl border border-line bg-white">
                    <Link href={`/india/${state.slug}/${p.slug}`} className="group block">
                      <div className="relative aspect-[4/3] bg-sand">
                        {p.hero ? <Image src={p.hero.url} alt={p.hero.alt} fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover" /> : null}
                        {p.hero?.ai ? <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">AI-generated image</span> : null}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold group-hover:underline">{p.name}</h3>
                        {p.summary ? <p className="mt-1 line-clamp-2 text-sm text-muted">{p.summary}</p> : null}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : state.summary ? (
              <p className="mt-4 text-sm text-muted">{state.summary}</p>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
