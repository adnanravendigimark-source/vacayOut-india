import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { itineraries, places, travelGuidePlaces, travelGuides, type GuideSnapshot, type ItinerarySnapshot, type SectionBody, type SnapshotImage } from "@/lib/db/schema";
import { stopRef } from "@/lib/itineraries/plan";
import { toSnapshot } from "@/lib/itineraries/service";

/**
 * Everything a shared place page links to, rolled up from the whole subtree
 * under the place (a state shows every published place inside it, at any
 * depth). Only published records with their own page are returned.
 */

export const DESTINATION_KINDS = ["region", "city", "town"] as const;

export type RollupPlace = {
  id: string;
  parentId: string | null;
  slug: string;
  kind: string;
  name: string;
  summary: string | null;
  lat: number | null;
  lng: number | null;
  hero: SnapshotImage | null;
  tripTypes: string[];
  category: string | null;
  parentName: string | null;
  parentKind: string | null;
  parentSlug: string | null;
  /** "parent_section" places live inside their parent's page (linked as parent#slug). */
  displayMode: "page" | "parent_section";
  depth: number;
  /** The place's short fact lists (key facts, visiting info), for cards. */
  facts: Partial<Record<CardSection, SectionBody>> | null;
};

/** Sections small enough to carry on every card. */
export const CARD_SECTIONS = ["key_facts", "visit_info"] as const;
export type CardSection = (typeof CARD_SECTIONS)[number];

export type RollupItinerary = { slug: string; title: string; summary: string; durationDays: number; tripTypes: string[]; hero: SnapshotImage | null; placeName: string; stopNames: string[] };
export type RollupGuide = { slug: string; title: string; summary: string; hero: SnapshotImage | null; placeName: string; placeNames: string[] };

/** Published places below `rootId` (any depth): own pages, and sections inside a published parent page. */
export async function listPublishedDescendants(rootId: string): Promise<RollupPlace[]> {
  const res = await getDb().execute(sql`
    with recursive tree as (
      select p.id, p.parent_id, 1 as depth from places p where p.parent_id = ${rootId}
      union all
      select c.id, c.parent_id, t.depth + 1 from places c join tree t on c.parent_id = t.id where t.depth < 6
    )
    select p.id, p.parent_id as "parentId", p.slug, p.kind::text as kind, p.trip_types as "tripTypes", p.category, t.depth,
           v.snapshot->'place'->>'name' as name,
           v.snapshot->'place'->>'summary' as summary,
           (v.snapshot->'place'->>'lat')::float8 as lat,
           (v.snapshot->'place'->>'lng')::float8 as lng,
           v.snapshot->'place'->'hero' as hero,
           v.snapshot->'place'->'parent'->>'name' as "parentName",
           v.snapshot->'place'->'parent'->>'kind' as "parentKind",
           v.snapshot->'place'->'parent'->>'slug' as "parentSlug",
           p.display_mode::text as "displayMode",
           (select jsonb_object_agg(s->>'key', s->'body') from jsonb_array_elements(v.snapshot->'sections') s
             where s->>'key' in ('key_facts', 'visit_info')) as facts
    from tree t
    join places p on p.id = t.id
    join place_versions v on v.id = p.published_version_id
    left join places par on par.id = p.parent_id
    where p.status = 'published'
      and (p.display_mode = 'page' or (par.status = 'published' and par.display_mode = 'page'))
    order by t.depth, p.name`);
  return (res.rows as RollupPlace[]).map((r) => ({ ...r, tripTypes: r.tripTypes ?? [] }));
}

/**
 * Published itineraries that touch this place: its own, or any whose stops
 * link to the place or something inside it. Matching uses the published
 * snapshot, so a draft edit never changes what is listed.
 */
export async function listItinerariesTouching(stateSlug: string, slugs: Set<string>, placeIds: Set<string>): Promise<RollupItinerary[]> {
  const rows = await getDb()
    .select({ placeId: itineraries.placeId, slug: itineraries.slug, snap: itineraries.publishedSnapshot })
    .from(itineraries)
    .innerJoin(places, eq(places.id, itineraries.placeId))
    .where(and(eq(itineraries.status, "published"), eq(places.status, "published")))
    .orderBy(itineraries.durationDays);
  const out: RollupItinerary[] = [];
  for (const r of rows) {
    // The row's slug is the URL key; some seeded snapshots were saved without one.
    const s = r.snap ? toSnapshot(r.snap, r.slug) : null;
    // A snapshot without a title wasn't written by publishItinerary (e.g. a raw seed insert), so it isn't listed.
    if (!s || !s.plan.days.length || !(r.snap as Partial<ItinerarySnapshot>).title || out.some((o) => o.slug === s.slug)) continue;
    const stops = s.plan.days.flatMap((d) => d.stops);
    const own = placeIds.has(r.placeId);
    const viaStop = stops.some((st) => {
      if (!st.placeSlug) return false;
      const ref = stopRef(st.placeSlug, s.place.stateSlug);
      return !!ref && ref.state === stateSlug && slugs.has(ref.slug);
    });
    if (!own && !viaStop) continue;
    const stopNames = [...new Set(stops.filter((st) => st.placeSlug).map((st) => st.name))].slice(0, 4);
    out.push({ slug: s.slug, title: s.title, summary: s.summary, durationDays: s.durationDays, tripTypes: s.tripTypes, hero: s.hero, placeName: s.place.name, stopNames });
  }
  return out;
}

/** Published guides linked to (or written for) any of these places, newest first. */
export async function listGuidesTouching(placeIds: string[]): Promise<RollupGuide[]> {
  if (!placeIds.length) return [];
  const db = getDb();
  const linked = db.select({ id: travelGuidePlaces.guideId }).from(travelGuidePlaces).where(inArray(travelGuidePlaces.placeId, placeIds));
  const rows = await db
    .select({ slug: travelGuides.slug, snap: travelGuides.publishedSnapshot })
    .from(travelGuides)
    .innerJoin(places, eq(places.id, travelGuides.placeId))
    .where(and(eq(travelGuides.status, "published"), eq(places.status, "published"), sql`(${travelGuides.id} in ${linked} or ${inArray(travelGuides.placeId, placeIds)})`))
    .orderBy(desc(travelGuides.publishedAt));
  return rows
    .map((r) => (r.snap ? { ...(r.snap as GuideSnapshot), slug: r.slug } : null))
    // Same rule as itineraries: the row's slug is the URL key; a snapshot without a title isn't listed.
    .filter((s): s is GuideSnapshot => !!s && !!s.slug && !!s.title)
    .map((s) => ({
      slug: s.slug,
      title: s.title,
      summary: s.summary,
      hero: s.hero ?? (s as GuideSnapshot & { heroImage?: GuideSnapshot["hero"] }).heroImage ?? null,
      placeName: s.place?.name ?? "",
      placeNames: s.places?.map((p) => p.name) ?? [],
    }));
}

/** The full rollup for one page. */
export async function placeRollup(place: { id: string; slug: string; kind: string }, stateSlug: string) {
  const all = await listPublishedDescendants(place.id);
  const ids = new Set([place.id, ...all.map((p) => p.id)]);
  const slugs = new Set([place.slug, ...all.map((p) => p.slug)]);
  const [its, guides] = await Promise.all([listItinerariesTouching(stateSlug, slugs, ids), listGuidesTouching([...ids])]);
  return {
    destinations: all.filter((p) => (DESTINATION_KINDS as readonly string[]).includes(p.kind)),
    attractions: all.filter((p) => p.kind !== "activity" && !(DESTINATION_KINDS as readonly string[]).includes(p.kind)),
    activities: all.filter((p) => p.kind === "activity"),
    itineraries: its,
    guides,
  };
}

export type PlaceRollup = Awaited<ReturnType<typeof placeRollup>>;
