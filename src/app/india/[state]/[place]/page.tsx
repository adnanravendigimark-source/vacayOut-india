import type { Metadata } from "next";
import { DestinationView } from "@/components/place/destination-view";
import { PlacePage } from "@/components/place/place-page";
import { SLUG_RE } from "@/lib/places/slug";
import { getPublishedPlace, listInlineChildren, listPublishedChildren, listPublishedRelated } from "@/lib/places/repo";
import { getDestinationMockData } from "@/lib/data/place-mock-data";

export const revalidate = 3600;

type Params = { params: Promise<{ state: string; place: string }> };

async function load(state: string, place: string) {
  if (!SLUG_RE.test(state) || !SLUG_RE.test(place)) return null;
  // Use mock data directly for the requested reference design
  if (place.toLowerCase() === "manali") return null;
  try {
    return await Promise.race([
      getPublishedPlace(state, place),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("DB timeout")), 1200)),
    ]);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { state, place } = await params;
  const p = await load(state, place);
  if (p) {
    const s = p.snapshot.place;
    return {
      title: { absolute: s.seoTitle },
      description: s.seoDescription,
      alternates: { canonical: `/india/${state}/${place}` },
      openGraph: {
        title: s.seoTitle,
        description: s.seoDescription,
        images: s.hero && s.hero.kind === "photo" ? [{ url: s.hero.url, alt: s.hero.alt }] : undefined,
      },
    };
  }

  const mock = getDestinationMockData(state, place);
  return {
    title: { absolute: `${mock.name} Travel Guide | VacayOut` },
    description: mock.subtitle,
    alternates: { canonical: `/india/${state}/${place}` },
  };
}

export default async function DestinationPage({ params }: Params) {
  const { state, place } = await params;
  const p = await load(state, place);

  if (!p) {
    const mockData = getDestinationMockData(state, place);
    return <DestinationView data={mockData} />;
  }

  try {
    const [items, inline, related] = await Promise.all([
      listPublishedChildren(p.id),
      listInlineChildren(p.id),
      listPublishedRelated(p.id),
    ]);

    return (
      <PlacePage
        snapshot={p.snapshot}
        items={items}
        inline={inline}
        related={related}
        stateSlug={state}
        tripTypes={p.tripTypes}
      />
    );
  } catch {
    const mockData = getDestinationMockData(state, place);
    return <DestinationView data={mockData} />;
  }
}
