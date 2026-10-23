import "server-only";
import type { Destination, HomepageData, Itinerary, SampleSection, ZoneGroup } from "./types";
import { sampleContentEnabled, sampleDestinations, sampleGuides, sampleItineraries, sampleZones } from "./sample";
import { homepageSeed } from "./seed";
import { affiliateActive } from "@/lib/booking/links";
import { listDirectory } from "@/lib/places/repo";
import { ZONES, zoneOf } from "@/lib/places/states";
import { TRIP_TYPES } from "@/lib/places/trip-types";
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

const newestFirst = (a: Row, b: Row) => b.publishedAt.getTime() - a.publishedAt.getTime();

/**
 * Homepage data. Section copy is static; every destination, state, itinerary
 * and guide comes ONLY from published places. Empty lists hide their sections.
 */
export async function getHomepageData(): Promise<HomepageData> {
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
    tripTypes: TRIP_TYPES.map((t) => ({ key: t.key, label: t.label, icon: t.icon, prompt: t.prompt, places: tagged.filter((x) => x.tripTypes.includes(t.key)) })),
    featured: pick("featured", real.featured, sampleDestinations.filter((x) => x.featured)),
    itineraries: pick("itineraries", real.itineraries, sampleItineraries),
    latestGuides: pick("guides", real.latestGuides, sampleGuides),
    affiliateLinks: affiliateActive(),
    sampleSections,
  };
}
