import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { PlacePage } from "@/components/place/place-page";
import { SLUG_RE } from "@/lib/places/slug";
import { findRedirect, getPublishedState, listInlineChildren, listPublishedChildren, listPublishedRelated } from "@/lib/places/repo";
import { placeRollup } from "@/lib/places/rollup";

// Rendered on first request, cached, and refreshed when an admin publishes.
export const revalidate = 3600;

type Params = { params: Promise<{ state: string }> };

async function load(state: string) {
  if (!SLUG_RE.test(state)) return null;
  return getPublishedState(state);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { state } = await params;
  const p = await load(state);
  if (!p) return {};
  const { place } = p.snapshot;
  return {
    title: { absolute: place.seoTitle },
    description: place.seoDescription,
    alternates: { canonical: `/india/${state}` },
    // AI illustrations are never used as the page's photo in social previews.
    openGraph: { title: place.seoTitle, description: place.seoDescription, images: place.hero && place.hero.kind === "photo" ? [{ url: place.hero.url, alt: place.hero.alt }] : undefined },
  };
}

/** A published state guide. Only published snapshots are shown; anything else is a 404 (or a redirect for moved pages). */
export default async function StatePage({ params }: Params) {
  const { state } = await params;
  const p = await load(state);
  if (!p) {
    const to = SLUG_RE.test(state) ? await findRedirect(`/india/${state}`) : null;
    if (to) permanentRedirect(to);
    notFound();
  }
  const [items, inline, related, rollup] = await Promise.all([listPublishedChildren(p.id), listInlineChildren(p.id), listPublishedRelated(p.id), placeRollup({ id: p.id, slug: p.snapshot.place.slug, kind: p.snapshot.place.kind }, state)]);
  return <PlacePage snapshot={p.snapshot} items={items} inline={inline} related={related} stateSlug={state} tripTypes={p.tripTypes} rollup={rollup} />;
}
