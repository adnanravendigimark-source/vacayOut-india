import "server-only";
import type { PublishedSnapshot, SnapshotImage } from "@/lib/db/schema";
import { listDirectory } from "./repo";
import { zoneOf, ZONES, type Zone } from "./states";
import { TRIP_TYPES } from "./trip-types";
import { kindLabel } from "./kinds";

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

/** Published attractions and experiences, each linked to its own guide page. */
export async function thingsToDoData() {
  const dir = await listDirectory();
  const items = dir.flatMap(({ state, places }) => {
    const stateSnap = state.snapshot as PublishedSnapshot;
    return places
      .filter((r) => (EXPERIENCE_KINDS as readonly string[]).includes(r.kind))
      .map((r) => {
        const s = r.snapshot as PublishedSnapshot;
        return {
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
  const categories = TRIP_TYPES.map((t) => ({ key: t.key, label: t.label, icon: t.icon, count: items.filter((i) => i.tripTypes.includes(t.key)).length })).filter((c) => c.count > 0);
  return { items, categories };
}

export type ThingsToDoData = Awaited<ReturnType<typeof thingsToDoData>>;

/** Published destination guides (states, regions, cities, towns), newest first. */
export async function travelGuidesData() {
  const dir = await listDirectory();
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
  const categories = TRIP_TYPES.map((t) => ({ key: t.key, label: t.label, icon: t.icon, count: guides.filter((g) => g.tripTypes.includes(t.key)).length })).filter((c) => c.count > 0);
  return { guides, categories };
}

export type TravelGuidesData = Awaited<ReturnType<typeof travelGuidesData>>;
