import type { Metadata } from "next";
import { StateView } from "@/components/place/state-view";
import { PlacePage } from "@/components/place/place-page";
import { SLUG_RE } from "@/lib/places/slug";
import { getPublishedState, listInlineChildren, listPublishedChildren, listPublishedRelated } from "@/lib/places/repo";
import { getStateMockData } from "@/lib/data/place-mock-data";

export const revalidate = 3600;

type Params = { params: Promise<{ state: string }> };

async function load(state: string) {
  if (!SLUG_RE.test(state)) return null;
  // Use mock data directly for the requested reference design
  if (state.toLowerCase() === "himachal-pradesh") return null;
  try {
    return await Promise.race([
      getPublishedState(state),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("DB timeout")), 1200)),
    ]);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { state } = await params;
  const p = await load(state);
  if (p) {
    const { place } = p.snapshot;
    return {
      title: { absolute: place.seoTitle },
      description: place.seoDescription,
      alternates: { canonical: `/india/${state}` },
      openGraph: {
        title: place.seoTitle,
        description: place.seoDescription,
        images: place.hero && place.hero.kind === "photo" ? [{ url: place.hero.url, alt: place.hero.alt }] : undefined,
      },
    };
  }

  const mock = getStateMockData(state);
  return {
    title: { absolute: `${mock.name} Travel Guide | VacayOut` },
    description: mock.subtitle,
    alternates: { canonical: `/india/${state}` },
  };
}

export default async function StatePage({ params }: Params) {
  const { state } = await params;
  const p = await load(state);

  if (!p) {
    const mockData = getStateMockData(state);
    return <StateView data={mockData} />;
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
    const mockData = getStateMockData(state);
    return <StateView data={mockData} />;
  }
}
