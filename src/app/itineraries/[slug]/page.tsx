import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { ItineraryDetailView } from "@/components/itineraries/itinerary-detail-view";
import { getPublishedItinerary, listPublishedItineraries, resolveStopLinks, stopPhotos, stopPhotosMap } from "@/lib/itineraries/service";
import { SLUG_RE } from "@/lib/places/slug";
import { site } from "@/lib/site";

export const revalidate = 3600;

export function generateStaticParams() {
  return [];
}

type Params = { params: Promise<{ slug: string }> };

const load = cache(async (slug: string) => (SLUG_RE.test(slug) ? getPublishedItinerary(slug) : null));

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const it = await load((await params).slug);
  if (!it) return {};
  return {
    title: { absolute: it.seoTitle },
    description: it.seoDescription,
    alternates: { canonical: `/itineraries/${it.slug}` },
    openGraph: { title: it.seoTitle, description: it.seoDescription, images: it.hero && it.hero.kind === "photo" ? [{ url: it.hero.url, alt: it.hero.alt }] : undefined },
  };
}

/** A published itinerary with rich editorial presentation. */
export default async function ItineraryPage({ params }: Params) {
  const it = await load((await params).slug);
  if (!it) notFound();

  // Stops link only to guides that are published right now.
  const refs = it.plan.days.flatMap((d) => d.stops.flatMap((s) => (s.placeSlug ? [s.placeSlug] : [])));
  const [stopLinks, photos, photosByRef] = await Promise.all([
    resolveStopLinks(refs, it.place.stateSlug),
    stopPhotos(refs, it.place.stateSlug),
    stopPhotosMap(refs, it.place.stateSlug),
  ]);

  // Load related itineraries
  const allPublished = await listPublishedItineraries();
  const sameState = allPublished.filter((x) => x.slug !== it.slug && (x.place.stateSlug === it.place.stateSlug || x.place.slug === it.place.slug));
  const fallback = allPublished.filter((x) => x.slug !== it.slug && !sameState.some((s) => s.slug === x.slug));
  const relatedList = [...sameState, ...fallback].slice(0, 4).map((x) => ({
    slug: x.slug,
    title: x.title,
    durationDays: x.durationDays,
    summary: x.summary,
    heroUrl: x.hero?.url ?? null,
    stateSlug: x.place.stateSlug,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: it.title,
    description: it.seoDescription,
    url: `${site.url}/itineraries/${it.slug}`,
    itinerary: {
      "@type": "ItemList",
      itemListElement: it.plan.days.map((d, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: d.title,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ItineraryDetailView
        itinerary={it}
        stopLinks={stopLinks}
        photos={photos.filter((p) => p.image.url !== it.hero?.url).slice(0, 2)}
        photosByRef={photosByRef}
        relatedItineraries={relatedList}
      />
    </>
  );
}
