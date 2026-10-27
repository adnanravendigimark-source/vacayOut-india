import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { PlacePage } from "@/components/place/place-page";
import { SLUG_RE } from "@/lib/places/slug";
import { findInlinePlacement, findRedirect, getPublishedPlace, listInlineChildren, listPublishedChildren, listPublishedRelated } from "@/lib/places/repo";
import { listPublishedItinerariesForPlace } from "@/lib/itineraries/service";

// Rendered on first request, cached, and refreshed when an admin publishes.
export const revalidate = 3600;

type Params = { params: Promise<{ state: string; place: string }> };

async function load(state: string, place: string) {
  if (!SLUG_RE.test(state) || !SLUG_RE.test(place)) return null;
  return getPublishedPlace(state, place);
}

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
  const [items, inline, related, itineraries] = await Promise.all([listPublishedChildren(p.id), listInlineChildren(p.id), listPublishedRelated(p.id), listPublishedItinerariesForPlace(p.id)]);
  return <PlacePage snapshot={p.snapshot} items={items} inline={inline} related={related} stateSlug={state} tripTypes={p.tripTypes} itineraries={itineraries} />;
}
