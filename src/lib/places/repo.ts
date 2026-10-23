import "server-only";
import { and, asc, desc, eq, isNotNull, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { alias } from "drizzle-orm/pg-core";
import { media, placeRelations, placeVersions, places, redirects, sections, users, type SnapshotImage } from "@/lib/db/schema";

// ---------------- Admin (drafts allowed) ----------------

export async function listPlacesForAdmin() {
  return getDb()
    .select({
      id: places.id,
      kind: places.kind,
      name: places.name,
      slug: places.slug,
      status: places.status,
      parentId: places.parentId,
      stateId: places.stateId,
      updatedAt: places.updatedAt,
    })
    .from(places)
    .orderBy(asc(places.name));
}

export async function getPlaceForAdmin(id: string) {
  const db = getDb();
  const [place] = await db.select().from(places).where(eq(places.id, id)).limit(1);
  if (!place) return null;
  const [secs, versions, parent, state, children] = await Promise.all([
    db.select().from(sections).where(eq(sections.placeId, id)),
    db
      .select({ id: placeVersions.id, version: placeVersions.version, publishedAt: placeVersions.publishedAt, by: users.name })
      .from(placeVersions)
      .leftJoin(users, eq(users.id, placeVersions.publishedBy))
      .where(eq(placeVersions.placeId, id))
      .orderBy(desc(placeVersions.version))
      .limit(20),
    place.parentId ? db.select().from(places).where(eq(places.id, place.parentId)).limit(1) : Promise.resolve([]),
    place.stateId ? db.select().from(places).where(eq(places.id, place.stateId)).limit(1) : Promise.resolve([]),
    db
      .select({ id: places.id, name: places.name, kind: places.kind, status: places.status })
      .from(places)
      .where(eq(places.parentId, id))
      .orderBy(asc(places.name)),
  ]);
  return { place, sections: secs, versions, parent: parent[0] ?? null, state: state[0] ?? null, children };
}

/** Places that can contain others (used for the "parent" picker). */
// ---------------- Public (published snapshots only) ----------------

async function snapshotFor(placeId: string, versionId: string | null) {
  if (!versionId) return null;
  const [v] = await getDb()
    .select({ snapshot: placeVersions.snapshot, publishedAt: placeVersions.publishedAt })
    .from(placeVersions)
    .where(and(eq(placeVersions.id, versionId), eq(placeVersions.placeId, placeId)))
    .limit(1);
  return v ?? null;
}

export async function getPublishedState(stateSlug: string) {
  const [state] = await getDb()
    .select()
    .from(places)
    .where(and(eq(places.kind, "state"), eq(places.slug, stateSlug), eq(places.status, "published")))
    .limit(1);
  if (!state) return null;
  const v = await snapshotFor(state.id, state.publishedVersionId);
  return v ? { id: state.id, tripTypes: state.tripTypes, ...v } : null;
}

export async function getPublishedPlace(stateSlug: string, slug: string) {
  const db = getDb();
  const [state] = await db
    .select({ id: places.id })
    .from(places)
    .where(and(eq(places.kind, "state"), eq(places.slug, stateSlug), eq(places.status, "published")))
    .limit(1);
  if (!state) return null;
  const [place] = await db
    .select()
    .from(places)
    .where(and(eq(places.stateId, state.id), eq(places.slug, slug), eq(places.status, "published"), eq(places.displayMode, "page")))
    .limit(1);
  if (!place) return null;
  const v = await snapshotFor(place.id, place.publishedVersionId);
  return v ? { id: place.id, tripTypes: place.tripTypes, ...v } : null;
}

/** Published places directly under a place, for internal links (names/summaries from their published snapshots). */
export async function listPublishedChildren(parentId: string) {
  return getDb()
    .select({
      slug: places.slug,
      kind: places.kind,
      name: sql<string>`${placeVersions.snapshot}->'place'->>'name'`,
      summary: sql<string | null>`${placeVersions.snapshot}->'place'->>'summary'`,
      lat: sql<number | null>`(${placeVersions.snapshot}->'place'->>'lat')::float8`,
      lng: sql<number | null>`(${placeVersions.snapshot}->'place'->>'lng')::float8`,
      hero: sql<SnapshotImage | null>`${placeVersions.snapshot}->'place'->'hero'`,
      tripTypes: places.tripTypes,
    })
    .from(places)
    .innerJoin(placeVersions, eq(placeVersions.id, places.publishedVersionId))
    .where(and(eq(places.parentId, parentId), eq(places.status, "published"), eq(places.displayMode, "page")))
    .orderBy(asc(places.name));
}

export async function listPublishedForSitemap() {
  const db = getDb();
  const rows = await db
    .select({
      kind: places.kind,
      slug: places.slug,
      stateSlug: sql<string | null>`(select s.slug from places s where s.id = ${places.stateId})`,
      updatedAt: placeVersions.publishedAt,
    })
    .from(places)
    .innerJoin(placeVersions, eq(placeVersions.id, places.publishedVersionId))
    .where(and(eq(places.status, "published"), eq(places.displayMode, "page"), isNotNull(places.publishedVersionId)));
  return rows;
}

// ---------------- Phase 1 additions ----------------

export async function getAdminExtras(placeId: string, stateId: string | null, isState: boolean) {
  const db = getDb();
  const [images, relations, relationOptions] = await Promise.all([
    db.select().from(media).where(eq(media.placeId, placeId)).orderBy(asc(media.createdAt)),
    db
      .select({ toId: placeRelations.toId, type: placeRelations.type, name: places.name, status: places.status })
      .from(placeRelations)
      .innerJoin(places, eq(places.id, placeRelations.toId))
      .where(eq(placeRelations.fromId, placeId)),
    db
      .select({ id: places.id, name: places.name, kind: places.kind })
      .from(places)
      .where(and(eq(places.stateId, isState ? placeId : (stateId ?? placeId)), ne(places.id, placeId)))
      .orderBy(asc(places.name)),
  ]);
  return { images, relations, relationOptions };
}

/** Published snapshots of places shown inside this page (display mode "parent_section"). */
export async function listInlineChildren(parentId: string) {
  return getDb()
    .select({ slug: places.slug, snapshot: placeVersions.snapshot })
    .from(places)
    .innerJoin(placeVersions, eq(placeVersions.id, places.publishedVersionId))
    .where(and(eq(places.parentId, parentId), eq(places.status, "published"), eq(places.displayMode, "parent_section")))
    .orderBy(asc(places.name));
}

/** Published related places (nearby / day trips) that have their own page. */
export async function listPublishedRelated(placeId: string) {
  const db = getDb();
  return db
    .select({
      slug: places.slug,
      kind: places.kind,
      type: placeRelations.type,
      name: sql<string>`${placeVersions.snapshot}->'place'->>'name'`,
      summary: sql<string | null>`${placeVersions.snapshot}->'place'->>'summary'`,
      stateSlug: sql<string | null>`${placeVersions.snapshot}->'place'->'state'->>'slug'`,
      lat: sql<number | null>`(${placeVersions.snapshot}->'place'->>'lat')::float8`,
      lng: sql<number | null>`(${placeVersions.snapshot}->'place'->>'lng')::float8`,
      hero: sql<SnapshotImage | null>`${placeVersions.snapshot}->'place'->'hero'`,
    })
    .from(placeRelations)
    .innerJoin(places, eq(places.id, placeRelations.toId))
    .innerJoin(placeVersions, eq(placeVersions.id, places.publishedVersionId))
    .where(and(eq(placeRelations.fromId, placeId), eq(places.status, "published"), eq(places.displayMode, "page")));
}

export async function findRedirect(path: string) {
  const [r] = await getDb().select({ to: redirects.toPath }).from(redirects).where(eq(redirects.fromPath, path)).limit(1);
  return r?.to ?? null;
}

/** A published place that lives inside its parent's page: where to send its old/direct URL. */
export async function findInlinePlacement(stateSlug: string, slug: string) {
  const st = alias(places, "st");
  const [row] = await getDb()
    .select({ parent: placeVersions.snapshot })
    .from(places)
    .innerJoin(placeVersions, eq(placeVersions.id, places.publishedVersionId))
    .innerJoin(st, and(eq(st.id, places.stateId), eq(st.slug, stateSlug)))
    .where(and(eq(places.slug, slug), eq(places.status, "published"), eq(places.displayMode, "parent_section")))
    .limit(1);
  const p = row?.parent.place;
  if (!p) return null;
  return p.parent ? `/india/${stateSlug}/${p.parent.slug}#${slug}` : `/india/${stateSlug}#${slug}`;
}

/** Published states with their published own-page places, for the /india directory and homepage. */
export async function listDirectory() {
  const db = getDb();
  const rows = await db
    .select({
      id: places.id,
      kind: places.kind,
      slug: places.slug,
      stateId: places.stateId,
      featured: places.featured,
      tripTypes: places.tripTypes,
      snapshot: placeVersions.snapshot,
      publishedAt: placeVersions.publishedAt,
    })
    .from(places)
    .innerJoin(placeVersions, eq(placeVersions.id, places.publishedVersionId))
    .where(and(eq(places.status, "published"), eq(places.displayMode, "page")))
    .orderBy(asc(places.name));
  const states = rows.filter((r) => r.kind === "state");
  return states.map((s) => ({
    state: s,
    places: rows.filter((r) => r.kind !== "state" && r.stateId === s.id),
  }));
}

// ---------------- Admin dashboard, destinations table, media library ----------------

export type DestinationFilter = { q?: string; state?: string; status?: string };

/** Every destination with what the table needs: thumbnail, state, status, public URL. */
export async function listDestinations(f: DestinationFilter = {}) {
  const st = alias(places, "st");
  const pr = alias(places, "pr");
  const conds = [];
  if (f.q?.trim()) conds.push(sql`lower(${places.name}) like ${`%${f.q.trim().toLowerCase().replace(/[%_]/g, "")}%`}`);
  if (f.state && /^[0-9a-f-]{36}$/.test(f.state)) conds.push(sql`(${places.id} = ${f.state} or ${places.stateId} = ${f.state})`);
  if (f.status && ["draft", "in_review", "published", "archived"].includes(f.status)) conds.push(sql`${places.status} = ${f.status}`);
  const rows = await getDb()
    .select({
      id: places.id,
      name: places.name,
      kind: places.kind,
      slug: places.slug,
      status: places.status,
      displayMode: places.displayMode,
      updatedAt: places.updatedAt,
      stateName: sql<string | null>`coalesce(${st.name}, case when ${places.kind} = 'state' then ${places.name} end)`,
      stateSlug: sql<string | null>`coalesce(${st.slug}, case when ${places.kind} = 'state' then ${places.slug} end)`,
      parentName: pr.name,
      parentSlug: pr.slug,
      parentKind: pr.kind,
      heroUrl: media.url,
      heroKind: media.kind,
      pending: sql<number>`(select count(*) from research_findings f where f.place_id = "places"."id" and f.status = 'pending')::int`,
    })
    .from(places)
    .leftJoin(st, eq(st.id, places.stateId))
    .leftJoin(pr, eq(pr.id, places.parentId))
    .leftJoin(media, eq(media.id, places.heroMediaId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(places.updatedAt))
    .limit(300);
  return rows.map((r) => ({
    ...r,
    publicUrl:
      r.status !== "published"
        ? null
        : r.displayMode === "parent_section" && r.parentSlug
          ? r.parentKind === "state"
            ? `/india/${r.parentSlug}#${r.slug}`
            : `/india/${r.stateSlug}/${r.parentSlug}#${r.slug}`
          : r.kind === "state"
            ? `/india/${r.slug}`
            : `/india/${r.stateSlug}/${r.slug}`,
  }));
}

export async function listStateOptions() {
  return getDb().select({ id: places.id, name: places.name }).from(places).where(eq(places.kind, "state")).orderBy(asc(places.name));
}

export async function dashboardCounts() {
  const [row] = await getDb()
    .select({
      published: sql<number>`(count(*) filter (where ${places.status} = 'published'))::int`,
      drafts: sql<number>`(count(*) filter (where ${places.status} in ('draft','in_review')))::int`,
      needsReview: sql<number>`(count(distinct ${places.id}) filter (where ${places.status} <> 'archived' and (${places.status} = 'in_review' or exists (select 1 from research_findings f where f.place_id = "places"."id" and f.status = 'pending'))))::int`,
    })
    .from(places);
  return row;
}

/** Containers a new place can sit inside, per state (for the optional "Inside" picker). */
export async function listContainers() {
  return getDb()
    .select({ id: places.id, name: places.name, kind: places.kind, stateId: places.stateId })
    .from(places)
    .where(sql`${places.kind} in ('region','city','town') and ${places.status} <> 'archived'`)
    .orderBy(asc(places.name));
}

export async function listMediaLibrary(kind?: string) {
  return getDb()
    .select({
      id: media.id,
      url: media.url,
      alt: media.alt,
      kind: media.kind,
      license: media.license,
      licenseUrl: media.licenseUrl,
      attribution: media.attribution,
      sourceUrl: media.sourceUrl,
      createdAt: media.createdAt,
      placeId: places.id,
      placeName: places.name,
      isHero: sql<boolean>`${places.heroMediaId} = ${media.id}`,
    })
    .from(media)
    .innerJoin(places, eq(places.id, media.placeId))
    .where(kind === "photo" || kind === "ai_generated" ? eq(media.kind, kind) : undefined)
    .orderBy(desc(media.createdAt))
    .limit(300);
}
