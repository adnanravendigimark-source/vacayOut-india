import "server-only";
import type { Destination, GuideCard, HomepageData, Itinerary, ReadyRoute, SampleSection, ZoneGroup } from "./types";
import { sampleContentEnabled, sampleDestinations, sampleGuides, sampleItineraries, sampleZones } from "./sample";
import { homepageSeed } from "./seed";
import { affiliateActive } from "@/lib/booking/links";
import { listDirectory, listPublishedForSitemap } from "@/lib/places/repo";
import { listPublishedItineraries } from "@/lib/itineraries/service";
import { listPublishedGuides } from "@/lib/guides/service";
import { ZONES, zoneOf } from "@/lib/places/states";
import { TRIP_TYPES, tripTypeLabel } from "@/lib/places/trip-types";
import { kindLabel } from "@/lib/places/kinds";


type Row = Awaited<ReturnType<typeof listDirectory>>[number]["state"];

function toDestination(r: Row): Destination {
  const p = r.snapshot.place;
  return {
    slug: r.slug,
    name: p.name,
    stateSlug: r.kind === "state" ? r.slug : (p.state?.slug ?? ""),
    stateName: r.kind === "state" ? p.name : (p.state?.name ?? ""),
    level: r.kind === "state" ? "state" : "place",
    kind: r.kind,
    tagline: r.kind === "state" ? "State guide" : kindLabel(r.kind),
    description: p.summary ?? "",
    featured: r.featured,
    tripTypes: r.tripTypes,
    publishedAt: r.publishedAt.toISOString(),
    // Rendered with `fill`, so width/height are nominal.
    photo: p.hero ? { src: p.hero.url, alt: p.hero.alt, width: 1600, height: 900, source: p.hero.attribution ?? p.hero.license } : null,
    aiImage: p.hero?.kind === "ai_generated",
  };
}

/** Day titles of a published, approved itinerary ("Day 1: …" prefixes removed). */
function itineraryDays(r: Row): string[] {
  const it = r.snapshot.sections.find((s) => s.key === "itinerary");
  return (it?.body.items ?? [])
    .map((d, i) => (d.title?.trim() || `Day ${i + 1}`).replace(/^day\s*\d+\s*[:.–-]\s*/i, ""))
    .filter(Boolean)
    .slice(0, 10);
}

// Older research drafts saved a few non-canonical tags; count them under the matching trip type.
const TRIP_TYPE_ALIASES: Record<string, string[]> = {
  beaches: ["beach"],
  heritage: ["history"],
  romantic: ["romance"],
  adventure: ["trekking"],
  food: ["culture", "cultural"],
};

const newestFirst = (a: Row, b: Row) => b.publishedAt.getTime() - a.publishedAt.getTime();

/** Every published page path. On a database error the list is empty, so cards fall back to the AI planner. */
async function livePaths(): Promise<string[]> {
  const settle = <T,>(p: Promise<T[]>) => p.catch((err: unknown) => {
    console.warn("Homepage: couldn't list published pages.", err instanceof Error ? err.message : err);
    return [] as T[];
  });
  const [rows, its, guides] = await Promise.all([settle(listPublishedForSitemap()), settle(listPublishedItineraries()), settle(listPublishedGuides())]);
  return [
    ...rows.flatMap((r) => (r.kind === "state" ? [`/india/${r.slug}`] : r.stateSlug ? [`/india/${r.stateSlug}/${r.slug}`] : [])),
    ...its.map((i) => `/itineraries/${i.slug}`),
    ...guides.map((g) => `/travel-guides/${g.slug}`),
  ];
}

/** Up to three published itineraries from different states, preferring trips of 3+ days. */
async function readyRoutes(): Promise<ReadyRoute[]> {
  let its: Awaited<ReturnType<typeof listPublishedItineraries>> = [];
  try {
    its = await listPublishedItineraries();
  } catch (err) {
    console.warn("Homepage: couldn't list itineraries.", err instanceof Error ? err.message : err);
    return [];
  }
  const usable = its.filter((i) => i.plan.days.length > 0);
  const picked: typeof usable = [];
  const states = new Set<string>();
  const stateOf = (i: (typeof usable)[number]) => i.place?.stateSlug ?? i.place?.slug ?? i.slug;
  for (const pass of [(i: (typeof usable)[number]) => (i.durationDays || i.plan.days.length) >= 3, () => true]) {
    for (const i of usable) {
      if (picked.length >= 3) break;
      if (picked.includes(i) || states.has(stateOf(i)) || !pass(i)) continue;
      picked.push(i);
      states.add(stateOf(i));
    }
  }
  return picked.map((i) => ({
    slug: i.slug,
    title: i.title,
    days: i.durationDays || i.plan.days.length,
    place: i.place?.stateName ?? i.place?.name ?? "",
    tags: i.tripTypes.slice(0, 2).map((t) => tripTypeLabel(t)),
    photo: i.hero ? { src: i.hero.url, alt: i.hero.alt } : null,
    aiImage: i.hero?.kind === "ai_generated",
    dayTitles: i.plan.days.map((d, n) => (d.title?.trim() || `Day ${n + 1}`).replace(/^day\s*\d+\s*[:.–-]\s*/i, "")).slice(0, 10),
  }));
}

/** Up to five published guides, one per state, real photos before AI illustrations. */
async function guideCards(): Promise<GuideCard[]> {
  let gs: Awaited<ReturnType<typeof listPublishedGuides>> = [];
  try {
    gs = await listPublishedGuides();
  } catch (err) {
    console.warn("Homepage: couldn't list guides.", err instanceof Error ? err.message : err);
    return [];
  }
  const ordered = [...gs.filter((g) => g.hero?.kind === "photo"), ...gs.filter((g) => g.hero?.kind !== "photo")];
  const picked: typeof gs = [];
  const states = new Set<string>();
  for (const g of ordered) {
    if (picked.length >= 5) break;
    const key = g.place?.stateSlug ?? g.place?.slug ?? g.slug;
    if (states.has(key)) continue;
    states.add(key);
    picked.push(g);
  }
  return picked.map((g) => ({
    slug: g.slug,
    title: g.title,
    summary: g.summary ?? "",
    place: g.place?.stateName ?? g.place?.name ?? "",
    photo: g.hero ? { src: g.hero.url, alt: g.hero.alt } : null,
    aiImage: g.hero?.kind === "ai_generated",
  }));
}

/**
 * Homepage data. Section copy is static; every destination, state, itinerary
 * and guide comes ONLY from published places. Empty lists hide their sections.
 */
export async function getHomepageData(): Promise<HomepageData> {
  const live = livePaths();
  const ready = readyRoutes();
  const guides = guideCards();
  let groups: Awaited<ReturnType<typeof listDirectory>> = [];
  try {
    groups = await listDirectory();
  } catch (err) {
    // While designing with sample content, a missing or unmigrated database shouldn't break the homepage.
    if (!sampleContentEnabled()) throw err;
    console.warn("Homepage: database unavailable, showing sample content only.", err instanceof Error ? err.message : err);
  }
  const states = groups.map((g) => g.state);
  const placeRows = groups.flatMap((g) => g.places);
  const all = [...states, ...placeRows];

  const zones: ZoneGroup[] = ZONES.map((zone) => ({
    zone,
    states: groups
      .filter((g) => zoneOf(g.state.snapshot.place.name) === zone)
      .map((g) => ({ name: g.state.snapshot.place.name, slug: g.state.slug, places: g.places.length, photo: g.state.snapshot.place.hero?.kind === "photo" ? toDestination(g.state).photo : null })),
  })).filter((z) => z.states.length > 0);

  const itineraries: Itinerary[] = [...placeRows, ...states]
    .map((r) => ({ r, days: itineraryDays(r) }))
    .filter((x) => x.days.length > 0)
    .sort((a, b) => newestFirst(a.r, b.r))
    .slice(0, 6)
    .map((x) => ({ destination: toDestination(x.r), days: x.days }));

  const real = {
    destinations: [...placeRows].sort(newestFirst).slice(0, 48).map(toDestination),
    zones,
    featured: all.filter((r) => r.featured).sort(newestFirst).slice(0, 6).map(toDestination),
    itineraries,
    latestGuides: [...all].sort(newestFirst).slice(0, 3).map(toDestination),
    tagged: all.filter((r) => r.tripTypes.length).map(toDestination),
  };

  // Design-time sample content fills only sections with no published data.
  const sampleOn = sampleContentEnabled();
  const sampleSections: SampleSection[] = [];
  function pick<T>(key: SampleSection, list: T[], sample: T[]): T[] {
    if (list.length || !sampleOn) return list;
    sampleSections.push(key);
    return sample;
  }
  const destinations = pick("destinations", real.destinations, sampleDestinations);
  const tagged = pick("tripTypes", real.tagged, sampleDestinations);

  return {
    ...homepageSeed,
    destinations,
    zones: pick("zones", real.zones, sampleZones(ZONES)),
    tripTypes: TRIP_TYPES.map((t) => {
      const keys = [t.key, ...(TRIP_TYPE_ALIASES[t.key] ?? [])];
      return { key: t.key, label: t.label, icon: t.icon, prompt: t.prompt, places: tagged.filter((x) => x.tripTypes.some((k) => keys.includes(k))) };
    }),
    featured: pick("featured", real.featured, sampleDestinations.filter((x) => x.featured)),
    itineraries: pick("itineraries", real.itineraries, sampleItineraries),
    latestGuides: pick("guides", real.latestGuides, sampleGuides),
    affiliateLinks: affiliateActive(),
    sampleSections,
    livePaths: await live,
    readyRoutes: await ready,
    guideCards: await guides,
  };
}
