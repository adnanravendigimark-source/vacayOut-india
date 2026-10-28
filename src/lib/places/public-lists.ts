import "server-only";
import type { PublishedSnapshot, SnapshotImage } from "@/lib/db/schema";
import { listDirectory } from "./repo";
import { listPublishedGuides } from "@/lib/guides/service";
import { zoneOf, ZONES, type Zone } from "./states";
import { TRIP_TYPES } from "./trip-types";
import { kindLabel } from "./kinds";
import { ACTIVITY_CATEGORIES } from "./categories";

/**
 * Data for the public listing pages (Explore India, Things to Do, Travel
 * Guides). Everything comes from PUBLISHED snapshots via listDirectory — no
 * drafts, no mock content. Empty arrays mean "nothing published yet".
 */

export const DESTINATION_KINDS = ["state", "region", "city", "town"] as const;
export const EXPERIENCE_KINDS = ["attraction", "temple", "lake", "viewpoint", "trek", "activity", "nature", "museum"] as const;

export type CardImage = Pick<SnapshotImage, "url" | "alt" | "kind" | "attribution" | "license">;

const image = (h: SnapshotImage | null | undefined): CardImage | null => (h ? { url: h.url, alt: h.alt, kind: h.kind, attribution: h.attribution, license: h.license } : null);

function pathOf(s: PublishedSnapshot): string {
  const p = s.place;
  if (p.kind === "state") return `/india/${p.slug}`;
  return `/india/${p.state?.slug ?? ""}/${p.slug}`;
}

export type ZoneKey = Lowercase<Zone>;
const zoneKey = (z: Zone | null): ZoneKey | null => (z ? (z.toLowerCase() as ZoneKey) : null);

export async function exploreIndiaData() {
  const dir = await listDirectory();
  const states = dir.map(({ state, places }) => {
    const snap = state.snapshot as PublishedSnapshot;
    return {
      name: snap.place.name,
      slug: snap.place.slug,
      zone: zoneKey(zoneOf(snap.place.name)),
      summary: snap.place.summary,
      image: image(snap.place.hero),
      destinationsCount: places.length,
    };
  });
  const all = dir.flatMap(({ state, places }) => [state, ...places]);
  const interests = TRIP_TYPES.map((t) => ({ key: t.key, label: t.label, icon: t.icon, prompt: t.prompt, count: all.filter((r) => r.tripTypes.includes(t.key)).length })).filter((i) => i.count > 0);
  const zones = ZONES.map((z) => ({ key: z.toLowerCase() as ZoneKey, label: z, count: states.filter((s) => s.zone === z.toLowerCase()).length })).filter((z) => z.count > 0);
  return { states, interests, zones, placeCount: all.length };
}

export type ExploreData = Awaited<ReturnType<typeof exploreIndiaData>>;

/**
 * Published activities and attractions, each linked to its own page, with the
 * destination they belong to (nearest town/city/region above them) so the hub
 * can filter by state, destination and category.
 */
export async function thingsToDoData() {
  const dir = await listDirectory();
  const items = dir.flatMap(({ state, places }) => {
    const stateSnap = state.snapshot as PublishedSnapshot;
    const byId = new Map(places.map((r) => [r.id, r]));
    const destinationOf = (r: (typeof places)[number]) => {
      let cur = r.parentId ? byId.get(r.parentId) : undefined;
      for (let i = 0; cur && i < 6; i++) {
        if ((DESTINATION_KINDS as readonly string[]).includes(cur.kind) && cur.kind !== "state") return { slug: cur.slug, name: (cur.snapshot as PublishedSnapshot).place.name };
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
      }
      return null;
    };
    return places
      .filter((r) => (EXPERIENCE_KINDS as readonly string[]).includes(r.kind))
      .map((r) => {
        const s = r.snapshot as PublishedSnapshot;
        const dest = destinationOf(r);
        return {
          category: r.kind === "activity" && r.category ? r.category : "sightseeing",
          isActivity: r.kind === "activity",
          stateSlug: stateSnap.place.slug,
          destination: dest,
          name: s.place.name,
          slug: s.place.slug,
          kind: s.place.kind,
          kindLabel: kindLabel(s.place.kind),
          href: pathOf(s),
          summary: s.place.summary,
          image: image(s.place.hero),
          stateName: stateSnap.place.name,
          location: s.place.parent?.name ? `${s.place.parent.name}, ${stateSnap.place.name}` : stateSnap.place.name,
          tripTypes: r.tripTypes,
          featured: r.featured,
          zone: zoneKey(zoneOf(stateSnap.place.name)),
        };
      });
  });
  // Activities first (they are the experiences), then sightseeing places.
  items.sort((a, b) => Number(b.isActivity) - Number(a.isActivity) || a.name.localeCompare(b.name));
  const categories = [...ACTIVITY_CATEGORIES, { key: "sightseeing", label: "Places to visit" }]
    .map((c) => ({ key: c.key, label: c.label, count: items.filter((i) => i.category === c.key).length }))
    .filter((c) => c.count > 0);
  const states = [...new Map(items.map((i) => [i.stateSlug, i.stateName])).entries()].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name));
  const destinations = [...new Map(items.filter((i) => i.destination).map((i) => [`${i.stateSlug}/${i.destination!.slug}`, { key: `${i.stateSlug}/${i.destination!.slug}`, stateSlug: i.stateSlug, name: i.destination!.name }])).values()].sort((a, b) => a.name.localeCompare(b.name));
  return { items, categories, states, destinations };
}

export type ThingsToDoData = Awaited<ReturnType<typeof thingsToDoData>>;

/** Published guide articles and destination guides (states, regions, cities, towns), newest first. */
export async function travelGuidesData() {
  const [dir, published] = await Promise.all([listDirectory(), listPublishedGuides()]);
  const articles = published.map((g) => ({
    name: g.place.name,
    slug: g.slug,
    title: g.title,
    href: `/travel-guides/${g.slug}`,
    snippet: g.summary,
    image: image(g.hero),
    stateName: g.place.stateName ?? "",
    kindLabel: "Guide",
    tripTypes: g.tripTypes,
    publishedAt: g.publishedAt ?? new Date(0),
    sectionCount: g.body.sections.length,
    featured: false,
  }));
  const guides = dir
    .flatMap(({ state, places }) => [state, ...places])
    .filter((r) => (DESTINATION_KINDS as readonly string[]).includes(r.kind))
    .map((r) => {
      const s = r.snapshot as PublishedSnapshot;
      const sectionKeys = s.sections.map((x) => x.key);
      return {
        name: s.place.name,
        slug: s.place.slug,
        title: s.place.seoTitle,
        href: pathOf(s),
        snippet: s.place.summary ?? s.place.seoDescription,
        image: image(s.place.hero),
        stateName: s.place.kind === "state" ? s.place.name : (s.place.state?.name ?? ""),
        kindLabel: kindLabel(s.place.kind),
        tripTypes: r.tripTypes,
        publishedAt: r.publishedAt,
        sectionCount: sectionKeys.length,
        featured: r.featured,
      };
    })
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  const categories = TRIP_TYPES.map((t) => ({ key: t.key, label: t.label, icon: t.icon, count: [...guides, ...articles].filter((g) => g.tripTypes.includes(t.key)).length })).filter((c) => c.count > 0);
  return { guides, articles, categories };
}

export type TravelGuidesData = Awaited<ReturnType<typeof travelGuidesData>>;
