import type { Metadata } from "next";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { PlacePage } from "@/components/place/place-page";
import { SLUG_RE } from "@/lib/places/slug";
import { findInlinePlacement, findRedirect, getPublishedPlace, listInlineChildren, listPublishedChildren, listPublishedRelated } from "@/lib/places/repo";
import { placeRollup } from "@/lib/places/rollup";

// Rendered on first request, cached, and refreshed when an admin publishes.
export const revalidate = 3600;

// Not pre-built: each page is rendered on its first visit, then served from the CDN cache
// (ISR) until the hour is up or an admin publishes. Without this export Next renders the
// route on every request.
export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ state: string; place: string }> };

// cache(): generateMetadata and the page share one database read per render.
const load = cache(async (state: string, place: string) => {
  if (!SLUG_RE.test(state) || !SLUG_RE.test(place)) return null;
  return getPublishedPlace(state, place);
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { state, place } = await params;
  const p = await load(state, place);
  if (!p) return {};
  const s = p.snapshot.place;
  return {
    title: { absolute: s.seoTitle },
    description: s.seoDescription,
    alternates: { canonical: `/india/${state}/${place}` },
    // AI illustrations are never used as the page's photo in social previews.
    openGraph: { title: s.seoTitle, description: s.seoDescription, images: s.hero && s.hero.kind === "photo" ? [{ url: s.hero.url, alt: s.hero.alt }] : undefined },
  };
}

/** A published destination guide. Only published snapshots are shown; anything else is a 404 (or a redirect for moved pages). */
export default async function DestinationPage({ params }: Params) {
  const { state, place } = await params;
  const p = await load(state, place);
  if (!p) {
    if (SLUG_RE.test(state) && SLUG_RE.test(place)) {
      // Places shown inside their parent page, and URLs that changed, redirect permanently.
      const to = (await findInlinePlacement(state, place)) ?? (await findRedirect(`/india/${state}/${place}`));
      if (to) permanentRedirect(to);
    }
    notFound();
  }
  const [items, inline, related, rollup] = await Promise.all([listPublishedChildren(p.id), listInlineChildren(p.id), listPublishedRelated(p.id), placeRollup({ id: p.id, slug: p.snapshot.place.slug, kind: p.snapshot.place.kind }, state)]);
  return <PlacePage snapshot={p.snapshot} items={items} inline={inline} related={related} stateSlug={state} tripTypes={p.tripTypes} rollup={rollup} />;
}
