import "server-only";
import { refreshHubs } from "@/lib/publish/hubs";
import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { media, places, researchFindings, travelGuidePlaces, travelGuides, type GuideSnapshot, type SnapshotImage } from "@/lib/db/schema";
import { citedFactsCheck } from "@/lib/places/review";
import { publicLocation } from "@/lib/publish/paths";
import { validateGuide, type GuideFields } from "./body";

/**
 * Travel guide workflow, the same as itineraries: draft → (editor) publish →
 * published; unpublish returns it to draft. Publishing re-validates the body,
 * requires the main place to be published and every cited fact to be verified
 * (verified pending facts are approved with the guide), then freezes a
 * snapshot. Public pages read only that snapshot.
 */

type Result = { ok: true } | { ok: false; message: string; problems?: string[] };

const imageOf = (m: typeof media.$inferSelect | undefined): SnapshotImage | null =>
  m ? { url: m.url, alt: m.alt, caption: m.caption, kind: m.kind, license: m.license, licenseUrl: m.licenseUrl, attribution: m.attribution, sourceUrl: m.sourceUrl } : null;

export async function publishGuide(id: string, actorId: string): Promise<Result> {
  const db = getDb();
  const res = await db.transaction(async (tx) => {
    const [g] = await tx.select().from(travelGuides).where(eq(travelGuides.id, id)).for("update").limit(1);
    if (!g) return { ok: false as const, message: "Unknown guide." };
    const v = validateGuide({ slug: g.slug, title: g.title, summary: g.summary, tripTypes: g.tripTypes, seoTitle: g.seoTitle ?? "", seoDescription: g.seoDescription ?? "", body: g.body });
    const problems: string[] = [];
    if (!v.ok) problems.push(v.error);
    const [place] = await tx.select().from(places).where(eq(places.id, g.placeId)).limit(1);
    if (!place || place.status !== "published") problems.push("Publish the guide’s main place first.");
    const [state] = place?.stateId ? await tx.select().from(places).where(eq(places.id, place.stateId)).limit(1) : [];
    const [parent] = place?.parentId ? await tx.select().from(places).where(eq(places.id, place.parentId)).limit(1) : [];
    if (g.findingIds.length) await tx.select({ id: researchFindings.id }).from(researchFindings).where(inArray(researchFindings.id, g.findingIds)).for("update");
    const facts = await citedFactsCheck(tx, g.findingIds);
    problems.push(...facts.problems);
    const heroId = g.heroMediaId ?? place?.heroMediaId ?? null;
    const [heroRow] = heroId ? await tx.select().from(media).where(eq(media.id, heroId)).limit(1) : [];
    if (!heroRow) problems.push("Add a hero image (the main place’s hero is used when the guide has none).");
    if (problems.length || !v.ok || !place) return { ok: false as const, message: "This guide isn’t ready to publish yet.", problems };

    if (facts.toApprove.length) {
      await tx
        .update(researchFindings)
        .set({ status: "approved", reviewedBy: actorId, reviewedAt: new Date(), reviewNote: "Approved with the travel guide." })
        .where(and(inArray(researchFindings.id, facts.toApprove), eq(researchFindings.status, "pending")));
    }
    const st = alias(places, "st");
    const linked = await tx
      .select({ name: places.name, slug: places.slug, kind: places.kind, stateSlug: st.slug, status: places.status })
      .from(travelGuidePlaces)
      .innerJoin(places, eq(places.id, travelGuidePlaces.placeId))
      .leftJoin(st, eq(st.id, places.stateId))
      .where(eq(travelGuidePlaces.guideId, id))
      .orderBy(asc(places.name));
    const stateSlug = place.kind === "state" ? place.slug : (state?.slug ?? null);
    const parentPath = parent ? (parent.kind === "state" ? `/india/${parent.slug}` : stateSlug ? `/india/${stateSlug}/${parent.slug}` : null) : null;
    const snapshot: GuideSnapshot = {
      slug: g.slug,
      title: v.value.title,
      summary: v.value.summary,
      tripTypes: v.value.tripTypes,
      seoTitle: v.value.seoTitle,
      seoDescription: v.value.seoDescription,
      body: v.value.body,
      sources: g.sources,
      hero: imageOf(heroRow),
      place: {
        name: place.name,
        slug: place.slug,
        kind: place.kind,
        stateSlug,
        stateName: place.kind === "state" ? place.name : (state?.name ?? null),
        path: publicLocation({ kind: place.kind, slug: place.slug, displayMode: place.displayMode, stateSlug, parentPath }),
      },
      places: linked.filter((l) => l.status === "published").map((l) => ({ name: l.name, slug: l.slug, kind: l.kind, stateSlug: l.kind === "state" ? l.slug : l.stateSlug })),
    };
    await tx.update(travelGuides).set({ status: "published", publishedSnapshot: snapshot, publishedAt: new Date(), publishedBy: actorId, updatedAt: new Date() }).where(eq(travelGuides.id, id));
    await audit({ actorId, action: "guide.publish", entityType: "travel_guide", entityId: id, details: { slug: g.slug, factsApproved: facts.toApprove.length } }, tx);
    return { ok: true as const, slug: g.slug };
  });
  if (res.ok) refresh(res.slug);
  return res.ok ? { ok: true } : res;
}

export async function unpublishGuide(id: string, actorId: string): Promise<Result> {
  const [row] = await getDb().update(travelGuides).set({ status: "draft", publishedSnapshot: null, publishedAt: null, updatedAt: new Date() }).where(eq(travelGuides.id, id)).returning({ slug: travelGuides.slug });
  if (!row) return { ok: false, message: "Unknown guide." };
  await audit({ actorId, action: "guide.unpublish", entityType: "travel_guide", entityId: id, details: { slug: row.slug } });
  refresh(row.slug);
  return { ok: true };
}

/** Saves an editor's changes and the linked places. Locks the guide so re-seeding never overwrites it. */
export async function saveGuide(id: string, input: GuideFields, placeIds: string[], actorId: string): Promise<Result> {
  const db = getDb();
  const ok = await db.transaction(async (tx) => {
    const [row] = await tx.update(travelGuides).set({ ...input, locked: true, updatedAt: new Date() }).where(eq(travelGuides.id, id)).returning({ id: travelGuides.id });
    if (!row) return false;
    await tx.delete(travelGuidePlaces).where(eq(travelGuidePlaces.guideId, id));
    const unique = [...new Set(placeIds)];
    if (unique.length) {
      const real = await tx.select({ id: places.id }).from(places).where(inArray(places.id, unique));
      if (real.length) await tx.insert(travelGuidePlaces).values(real.map((p) => ({ guideId: id, placeId: p.id })));
    }
    return true;
  });
  if (!ok) return { ok: false, message: "Unknown guide." };
  await audit({ actorId, action: "guide.save", entityType: "travel_guide", entityId: id, details: { slug: input.slug, places: placeIds.length } });
  return { ok: true };
}

function refresh(slug: string) {
  refreshHubs();
  try {
    revalidatePath("/travel-guides");
    revalidatePath(`/travel-guides/${slug}`);
    // Place pages list their guides; they refresh within the hour (ISR) or on their next publish.
  } catch {
    // Outside a request (scripts/tests).
  }
}

// ---------- reads ----------

export async function listGuidesForAdmin() {
  return getDb()
    .select({ id: travelGuides.id, slug: travelGuides.slug, title: travelGuides.title, status: travelGuides.status, locked: travelGuides.locked, updatedAt: travelGuides.updatedAt, placeName: places.name, placeStatus: places.status })
    .from(travelGuides)
    .innerJoin(places, eq(places.id, travelGuides.placeId))
    .orderBy(places.name, travelGuides.title);
}

export async function getGuideForAdmin(id: string) {
  const db = getDb();
  const [row] = await db
    .select({ g: travelGuides, placeName: places.name, placeStatus: places.status, stateId: places.stateId, placeKind: places.kind })
    .from(travelGuides)
    .innerJoin(places, eq(places.id, travelGuides.placeId))
    .where(eq(travelGuides.id, id))
    .limit(1);
  if (!row) return null;
  const stateId = row.placeKind === "state" ? row.g.placeId : row.stateId;
  const [linked, options] = await Promise.all([
    db.select({ placeId: travelGuidePlaces.placeId }).from(travelGuidePlaces).where(eq(travelGuidePlaces.guideId, id)),
    stateId
      ? db.select({ id: places.id, name: places.name, kind: places.kind, status: places.status }).from(places).where(eq(places.stateId, stateId)).orderBy(asc(places.name))
      : Promise.resolve([]),
  ]);
  const [state] = stateId ? await db.select({ id: places.id, name: places.name, kind: places.kind, status: places.status }).from(places).where(eq(places.id, stateId)).limit(1) : [];
  return { ...row, linked: linked.map((l) => l.placeId), options: state ? [state, ...options] : options };
}

export async function listPublishedGuides(): Promise<(GuideSnapshot & { publishedAt: Date | null })[]> {
  const rows = await getDb()
    .select({ snap: travelGuides.publishedSnapshot, publishedAt: travelGuides.publishedAt })
    .from(travelGuides)
    .innerJoin(places, eq(places.id, travelGuides.placeId))
    .where(and(eq(travelGuides.status, "published"), eq(places.status, "published")))
    .orderBy(desc(travelGuides.publishedAt));
  return rows.filter((r) => r.snap).map((r) => ({ ...(r.snap as GuideSnapshot), publishedAt: r.publishedAt }));
}

export async function getPublishedGuide(slug: string) {
  const [row] = await getDb()
    .select({ snap: travelGuides.publishedSnapshot, publishedAt: travelGuides.publishedAt })
    .from(travelGuides)
    .innerJoin(places, eq(places.id, travelGuides.placeId))
    .where(and(eq(travelGuides.slug, slug), eq(travelGuides.status, "published"), eq(places.status, "published")))
    .limit(1);
  return row?.snap ? { ...(row.snap as GuideSnapshot), publishedAt: row.publishedAt } : null;
}
