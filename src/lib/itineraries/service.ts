import "server-only";
import { refreshHubs } from "@/lib/publish/hubs";
import { revalidatePath } from "next/cache";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { itineraries, media, places, researchFindings, type ItinerarySnapshot, type SnapshotImage } from "@/lib/db/schema";
import { citedFactsCheck } from "@/lib/places/review";
import { publicLocation } from "@/lib/publish/paths";
import { stopRef, validateItinerary, type ItineraryFields } from "./plan";

/**
 * Itinerary workflow: draft → (editor) publish → published; unpublish returns
 * it to draft. Publishing re-validates the plan, requires the destination to be
 * published and every cited fact to be verified (verified pending facts are
 * approved together with the itinerary), then freezes a snapshot. Public pages
 * read only that snapshot.
 */

type Result = { ok: true } | { ok: false; message: string; problems?: string[] };

const imageOf = (m: typeof media.$inferSelect | undefined): SnapshotImage | null =>
  m ? { url: m.url, alt: m.alt, caption: m.caption, kind: m.kind, license: m.license, licenseUrl: m.licenseUrl, attribution: m.attribution, sourceUrl: m.sourceUrl } : null;

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/**
 * A state-wide plan without its own photo shows a place named in its title, else the place it
 * visits most (ties: the earliest), so routes in one state don't all repeat the state's photo.
 */
async function mainStopHero(tx: Tx, itineraryId: string, stateId: string, stateSlug: string, title: string, plan: ItineraryFields["plan"]): Promise<string | null> {
  const count = new Map<string, number>();
  for (const d of plan.days)
    for (const st of d.stops) {
      const ref = st.placeSlug ? stopRef(st.placeSlug, stateSlug) : null;
      if (ref && ref.state === stateSlug && ref.slug !== stateSlug) count.set(ref.slug, (count.get(ref.slug) ?? 0) + 1);
    }
  if (!count.size) return null;
  const rows = await tx
    .select({ slug: places.slug, name: places.name, hero: places.heroMediaId, url: media.url })
    .from(places)
    .innerJoin(media, eq(media.id, places.heroMediaId))
    .where(and(eq(places.stateId, stateId), inArray(places.slug, [...count.keys()]), eq(places.status, "published")));
  // Photos other published plans of this state already show are used only when nothing else fits.
  const others = await tx
    .select({ snap: itineraries.publishedSnapshot })
    .from(itineraries)
    .where(and(eq(itineraries.placeId, stateId), eq(itineraries.status, "published"), ne(itineraries.id, itineraryId)));
  const used = new Set(others.map((o) => (o.snap as ItinerarySnapshot | null)?.hero?.url).filter(Boolean));
  const order = [...count.keys()];
  const t = title.toLowerCase();
  const score = (r: { slug: string; name: string; url: string }) => (used.has(r.url) ? 0 : 10_000) + (t.includes(r.name.toLowerCase().split(" ")[0]) ? 1000 : 0) + (count.get(r.slug) ?? 0);
  const best = rows.sort((a, b) => score(b) - score(a) || order.indexOf(a.slug) - order.indexOf(b.slug))[0];
  return best?.hero ?? null;
}

export async function publishItinerary(id: string, actorId: string): Promise<Result> {
  const db = getDb();
  const res = await db.transaction(async (tx) => {
    const [it] = await tx.select().from(itineraries).where(eq(itineraries.id, id)).for("update").limit(1);
    if (!it) return { ok: false as const, message: "Unknown itinerary." };
    const v = validateItinerary({ slug: it.slug, title: it.title, summary: it.summary, durationDays: it.durationDays, tripTypes: it.tripTypes, seoTitle: it.seoTitle ?? "", seoDescription: it.seoDescription ?? "", plan: it.plan });
    const problems: string[] = [];
    if (!v.ok) problems.push(v.error);
    const [place] = await tx.select().from(places).where(eq(places.id, it.placeId)).limit(1);
    if (!place || place.status !== "published") problems.push("Publish the destination guide first — the itinerary links to it.");
    const [state] = place?.stateId ? await tx.select().from(places).where(eq(places.id, place.stateId)).limit(1) : [];
    const [parent] = place?.parentId ? await tx.select().from(places).where(eq(places.id, place.parentId)).limit(1) : [];
    if (it.findingIds.length) await tx.select({ id: researchFindings.id }).from(researchFindings).where(inArray(researchFindings.id, it.findingIds)).for("update");
    const facts = await citedFactsCheck(tx, it.findingIds);
    problems.push(...facts.problems);
    const heroId = it.heroMediaId ?? (place?.kind === "state" && v.ok ? await mainStopHero(tx, it.id, place.id, place.slug, v.value.title, v.value.plan) : null) ?? place?.heroMediaId ?? null;
    const [heroRow] = heroId ? await tx.select().from(media).where(eq(media.id, heroId)).limit(1) : [];
    if (!heroRow) problems.push("Add a hero image (the destination’s hero is used when the itinerary has none).");
    if (problems.length || !v.ok || !place) return { ok: false as const, message: "This itinerary isn’t ready to publish yet.", problems };

    if (facts.toApprove.length) {
      await tx
        .update(researchFindings)
        .set({ status: "approved", reviewedBy: actorId, reviewedAt: new Date(), reviewNote: "Approved with the itinerary." })
        .where(and(inArray(researchFindings.id, facts.toApprove), eq(researchFindings.status, "pending")));
    }
    const stateSlug = place.kind === "state" ? place.slug : (state?.slug ?? null);
    const parentPath = parent ? (parent.kind === "state" ? `/india/${parent.slug}` : stateSlug ? `/india/${stateSlug}/${parent.slug}` : null) : null;
    const snapshot: ItinerarySnapshot = {
      slug: it.slug,
      title: v.value.title,
      summary: v.value.summary,
      durationDays: v.value.durationDays,
      tripTypes: v.value.tripTypes,
      seoTitle: v.value.seoTitle,
      seoDescription: v.value.seoDescription,
      plan: v.value.plan,
      sources: it.sources,
      hero: imageOf(heroRow),
      place: {
        name: place.name,
        slug: place.slug,
        kind: place.kind,
        stateSlug,
        stateName: place.kind === "state" ? place.name : (state?.name ?? null),
        path: publicLocation({ kind: place.kind, slug: place.slug, displayMode: place.displayMode, stateSlug, parentPath }),
      },
    };
    await tx.update(itineraries).set({ status: "published", publishedSnapshot: snapshot, publishedAt: new Date(), publishedBy: actorId, updatedAt: new Date() }).where(eq(itineraries.id, id));
    await audit({ actorId, action: "itinerary.publish", entityType: "itinerary", entityId: id, details: { slug: it.slug, factsApproved: facts.toApprove.length } }, tx);
    return { ok: true as const, slug: it.slug };
  });
  if (res.ok) refresh(res.slug);
  return res.ok ? { ok: true } : res;
}

export async function unpublishItinerary(id: string, actorId: string): Promise<Result> {
  const db = getDb();
  const [row] = await db.update(itineraries).set({ status: "draft", publishedSnapshot: null, publishedAt: null, updatedAt: new Date() }).where(eq(itineraries.id, id)).returning({ slug: itineraries.slug });
  if (!row) return { ok: false, message: "Unknown itinerary." };
  await audit({ actorId, action: "itinerary.unpublish", entityType: "itinerary", entityId: id, details: { slug: row.slug } });
  refresh(row.slug);
  return { ok: true };
}

/** Saves an editor's changes. Locks the itinerary so re-seeding never overwrites it; the live copy changes only on publish. */
export async function saveItinerary(id: string, input: ItineraryFields, actorId: string): Promise<Result> {
  const db = getDb();
  const [row] = await db
    .update(itineraries)
    .set({ ...input, locked: true, updatedAt: new Date() })
    .where(eq(itineraries.id, id))
    .returning({ id: itineraries.id });
  if (!row) return { ok: false, message: "Unknown itinerary." };
  await audit({ actorId, action: "itinerary.save", entityType: "itinerary", entityId: id, details: { slug: input.slug } });
  return { ok: true };
}

function refresh(slug: string) {
  refreshHubs();
  try {
    revalidatePath("/itineraries");
    revalidatePath(`/itineraries/${slug}`);
  } catch {
    // Outside a request (scripts/tests): pages read the database on each request anyway.
  }
}

// ---------- reads ----------

export async function listItinerariesForAdmin() {
  return getDb()
    .select({ id: itineraries.id, slug: itineraries.slug, title: itineraries.title, durationDays: itineraries.durationDays, status: itineraries.status, locked: itineraries.locked, updatedAt: itineraries.updatedAt, placeName: places.name, placeStatus: places.status })
    .from(itineraries)
    .innerJoin(places, eq(places.id, itineraries.placeId))
    .orderBy(places.name, itineraries.durationDays);
}

export async function getItineraryForAdmin(id: string) {
  const [row] = await getDb()
    .select({ it: itineraries, placeName: places.name, placeStatus: places.status })
    .from(itineraries)
    .innerJoin(places, eq(places.id, itineraries.placeId))
    .where(eq(itineraries.id, id))
    .limit(1);
  return row ?? null;
}

/** Published itineraries (snapshots only) whose destination is still published, newest first. */
export async function listPublishedItineraries(): Promise<(ItinerarySnapshot & { publishedAt: Date | null })[]> {
  const rows = await getDb()
    .select({ snap: itineraries.publishedSnapshot, publishedAt: itineraries.publishedAt })
    .from(itineraries)
    .innerJoin(places, eq(places.id, itineraries.placeId))
    .where(and(eq(itineraries.status, "published"), eq(places.status, "published")))
    .orderBy(desc(itineraries.publishedAt));
  return rows.filter((r) => r.snap).map((r) => ({ ...(r.snap as ItinerarySnapshot), publishedAt: r.publishedAt }));
}

export async function getPublishedItinerary(slug: string) {
  const [row] = await getDb()
    .select({ snap: itineraries.publishedSnapshot, publishedAt: itineraries.publishedAt })
    .from(itineraries)
    .innerJoin(places, eq(places.id, itineraries.placeId))
    .where(and(eq(itineraries.slug, slug), eq(itineraries.status, "published"), eq(places.status, "published")))
    .limit(1);
  return row?.snap ? { ...(row.snap as ItinerarySnapshot), publishedAt: row.publishedAt } : null;
}

/** Published itineraries for one destination (links on its guide page). */
export async function listPublishedItinerariesForPlace(placeId: string) {
  const rows = await getDb()
    .select({ snap: itineraries.publishedSnapshot })
    .from(itineraries)
    .where(and(eq(itineraries.placeId, placeId), eq(itineraries.status, "published")))
    .orderBy(itineraries.durationDays);
  return rows
    .map((r) => r.snap as ItinerarySnapshot | null)
    .filter((x): x is ItinerarySnapshot => Boolean(x))
    .map((x) => ({ slug: x.slug, title: x.title, durationDays: x.durationDays, summary: x.summary }));
}

/**
 * Public links for an itinerary's stops, resolved now (not frozen at publish):
 * a stop links only while its place is published, to wherever that place
 * currently lives (its own page, or a section of its parent's page).
 */
export async function resolveStopLinks(refs: string[], stateSlug: string | null): Promise<Record<string, string>> {
  const wanted = new Map<string, string[]>(); // "state/slug" -> the refs that point at it
  for (const r of new Set(refs)) {
    const x = stopRef(r, stateSlug);
    if (x) wanted.set(`${x.state}/${x.slug}`, [...(wanted.get(`${x.state}/${x.slug}`) ?? []), r]);
  }
  if (!wanted.size) return {};
  const st = alias(places, "st");
  const par = alias(places, "par");
  const slugs = [...new Set([...wanted.keys()].map((k) => k.split("/")[1]))];
  const rows = await getDb()
    .select({ slug: places.slug, kind: places.kind, displayMode: places.displayMode, stateSlug: st.slug, parentSlug: par.slug, parentKind: par.kind, parentStatus: par.status })
    .from(places)
    .leftJoin(st, eq(st.id, places.stateId))
    .leftJoin(par, eq(par.id, places.parentId))
    .where(and(eq(places.status, "published"), inArray(places.slug, slugs)));
  const out: Record<string, string> = {};
  for (const r of rows) {
    const state = r.kind === "state" ? r.slug : r.stateSlug;
    const refsHere = state ? wanted.get(`${state}/${r.slug}`) : undefined;
    if (!refsHere) continue;
    const parentPath = r.parentSlug && r.parentStatus === "published" ? (r.parentKind === "state" ? `/india/${r.parentSlug}` : `/india/${state}/${r.parentSlug}`) : null;
    if (r.displayMode === "parent_section" && !parentPath) continue;
    const path = publicLocation({ kind: r.kind, slug: r.slug, displayMode: r.displayMode, stateSlug: state, parentPath });
    if (path) for (const ref of refsHere) out[ref] = path;
  }
  return out;
}

export type StopPhoto = { name: string; image: SnapshotImage };

/** Real photos (published places' hero images) for the stops of a plan, in route order, one per place. */
export async function stopPhotos(refs: string[], stateSlug: string | null): Promise<StopPhoto[]> {
  const order: string[] = [];
  for (const r of refs) {
    const x = stopRef(r, stateSlug);
    if (x && !order.includes(`${x.state}/${x.slug}`)) order.push(`${x.state}/${x.slug}`);
  }
  if (!order.length) return [];
  const st = alias(places, "st");
  const rows = await getDb()
    .select({ slug: places.slug, kind: places.kind, name: places.name, stateSlug: st.slug, m: media })
    .from(places)
    .innerJoin(media, eq(media.id, places.heroMediaId))
    .leftJoin(st, eq(st.id, places.stateId))
    .where(and(eq(places.status, "published"), inArray(places.slug, [...new Set(order.map((k) => k.split("/")[1]))])));
  const out: StopPhoto[] = [];
  for (const key of order) {
    const r = rows.find((x) => `${x.kind === "state" ? x.slug : x.stateSlug}/${x.slug}` === key);
    const image = r ? imageOf(r.m) : null;
    if (r && image && image.kind === "photo" && !out.some((o) => o.image.url === image.url)) out.push({ name: r.name, image });
  }
  return out;
}
