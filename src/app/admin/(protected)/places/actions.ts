"use server";

import { cleanTripTypes } from "@/lib/places/trip-types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireAdmin, requireUser } from "@/lib/auth/guard";
import { getDb } from "@/lib/db";
import { displayMode, media, placeKind, placeRelations, placeVersions, places, redirects, relationType, sections } from "@/lib/db/schema";
import { isUniqueViolation, type ActionState } from "@/lib/admin/action-state";
import { EXT, MAX_IMAGE_BYTES, sniffImage } from "@/lib/media/sniff";
import { removeImage, storeImage } from "@/lib/media/storage";
import { searchCommons, type CommonsFile } from "@/lib/media/commons";
import { importCommonsToPlace } from "@/lib/media/import";
import { generateIllustration } from "@/lib/media/ai-image";
import { matchRegion, type RegionName } from "@/lib/places/states";
import { resumeGeneration, startGeneration } from "@/lib/generate/start";
import { geocode, type GeoResult } from "@/lib/geocode";
import { hit } from "@/lib/limiter";
import { publishPlace, runPendingJobs, unpublishPlace } from "@/lib/publish/service";
import { bodyFromForm, SECTION_KEYS, validateSectionBody, type SectionKey } from "@/lib/places/sections";
import { approveSectionWithFacts } from "@/lib/places/review";
import { slugify, SLUG_RE } from "@/lib/places/slug";

const uuid = z.string().uuid();
const optionalText = (maxLen: number) =>
  z
    .string()
    .trim()
    .max(maxLen)
    .transform((v) => (v === "" ? null : v));
const optionalCoord = (min: number, maxV: number) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const n = Number(v);
      if (!Number.isFinite(n) || n < min || n > maxV) {
        ctx.addIssue({ code: "custom", message: `Must be a number between ${min} and ${maxV}` });
        return z.NEVER;
      }
      return n;
    });

// ---------------- Details ----------------

const detailsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(80).optional(),
  summary: optionalText(400),
  lat: optionalCoord(6, 38),
  lng: optionalCoord(68, 98),
  seoTitle: optionalText(120),
  seoDescription: optionalText(300),
  displayMode: z.enum(displayMode.enumValues).optional(),
  featured: z.literal("on").optional(),
});

export async function updateDetailsAction(placeId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!uuid.safeParse(placeId).success) return { ok: false, message: "Unknown place." };
  const parsed = detailsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: `${parsed.error.issues[0]?.path.join(".")}: ${parsed.error.issues[0]?.message}` };

  const db = getDb();
  const [place] = await db.select().from(places).where(eq(places.id, placeId)).limit(1);
  if (!place) return { ok: false, message: "Unknown place." };

  const { slug: newSlug, featured, displayMode: mode, ...rest } = parsed.data;
  const update: Partial<typeof places.$inferInsert> = { ...rest, featured: featured === "on", updatedAt: new Date() };
  // Only known trip types are stored; the form always sends the full set of ticked boxes.
  if (form.has("tripTypesShown")) update.tripTypes = cleanTripTypes(form.getAll("tripTypes"));
  if (mode && place.kind !== "state") update.displayMode = mode;
  if (place.status === "published" && mode && mode !== place.displayMode) {
    return { ok: false, message: "Unpublish before changing how this place is shown." };
  }

  let redirect: { from: string; to: string } | null = null;
  if (newSlug !== undefined && newSlug.toLowerCase() !== place.slug) {
    // A live URL must not change silently: unpublish first, then the old URL redirects.
    if (place.status === "published") return { ok: false, message: "The URL can’t change while the page is published. Unpublish it first." };
    const slug = newSlug.toLowerCase();
    if (!SLUG_RE.test(slug)) return { ok: false, message: "URL slug can only use lowercase letters, numbers and hyphens." };
    if (place.kind === "state") {
      const [hasChildren] = await db.select({ id: places.id }).from(places).where(eq(places.stateId, place.id)).limit(1);
      if (hasChildren) return { ok: false, message: "A state’s URL can’t change once places exist inside it." };
    }
    update.slug = slug;
    const [everPublished] = await db.select({ id: placeVersions.id }).from(placeVersions).where(eq(placeVersions.placeId, place.id)).limit(1);
    if (everPublished) {
      const [state] = place.stateId ? await db.select({ slug: places.slug }).from(places).where(eq(places.id, place.stateId)).limit(1) : [];
      const base = place.kind === "state" ? "/india/" : state ? `/india/${state.slug}/` : null;
      if (base) redirect = { from: `${base}${place.slug}`, to: `${base}${slug}` };
    }
  }

  try {
    await db.transaction(async (tx) => {
      await tx.update(places).set(update).where(eq(places.id, placeId));
      if (redirect) {
        await tx.insert(redirects).values({ fromPath: redirect.from, toPath: redirect.to }).onConflictDoUpdate({ target: redirects.fromPath, set: { toPath: redirect.to } });
        await tx.delete(redirects).where(eq(redirects.fromPath, redirect.to)); // never redirect a live URL away
      }
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, message: "That URL slug is already used in this state." };
    throw err;
  }
  await audit({ actorId: user.id, action: "place.update", entityType: "place", entityId: placeId, details: { fields: Object.keys(parsed.data) } });
  revalidatePath(`/admin/places/${placeId}`);
  return { ok: true, message: "Saved. Publish again to update the public page." };
}

// ---------------- Sections ----------------

function assertSectionKey(key: string) {
  return (SECTION_KEYS as string[]).includes(key);
}

export async function saveSectionAction(placeId: string, key: string, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!uuid.safeParse(placeId).success || !assertSectionKey(key)) return { ok: false, message: "Unknown section." };
  const v = validateSectionBody(key, bodyFromForm(key, form));
  if (!v.ok) return { ok: false, message: v.error };

  const db = getDb();
  const [place] = await db.select({ id: places.id }).from(places).where(eq(places.id, placeId)).limit(1);
  if (!place) return { ok: false, message: "Unknown place." };

  const approveNow = form.get("intent") === "approve";
  const now = new Date();
  // Saved by a person → locked: generation will only ever suggest changes to it.
  await db
    .insert(sections)
    .values({ placeId, key: key as SectionKey, body: v.body, status: "draft", locked: true, updatedBy: user.id })
    .onConflictDoUpdate({
      target: [sections.placeId, sections.key],
      set: { body: v.body, status: "draft", locked: true, updatedBy: user.id, approvedBy: null, approvedAt: null, updatedAt: now },
    });
  await db.update(places).set({ updatedAt: now }).where(eq(places.id, placeId));
  await audit({ actorId: user.id, action: "section.save", entityType: "place", entityId: placeId, details: { key } });
  revalidatePath(`/admin/places/${placeId}`);
  if (!approveNow) return { ok: true, message: "Saved as draft." };
  const r = await approveSectionWithFacts(placeId, key as SectionKey, user.id);
  if (!r.ok) return { ok: false, message: "Saved as draft, but it can’t be approved yet:", problems: r.problems };
  return { ok: true, message: r.approvedFacts ? `Saved and approved (with ${r.approvedFacts} verified fact${r.approvedFacts === 1 ? "" : "s"}).` : "Saved and approved." };
}

/** Approve a section as it stands, together with its verified cited facts. */
export async function approveSectionAction(placeId: string, key: string): Promise<ActionState> {
  const user = await requireUser();
  if (!uuid.safeParse(placeId).success || !assertSectionKey(key)) return { ok: false, message: "Unknown section." };
  const r = await approveSectionWithFacts(placeId, key as SectionKey, user.id);
  revalidatePath(`/admin/places/${placeId}`);
  if (!r.ok) return { ok: false, message: "Can’t approve yet:", problems: r.problems };
  return { ok: true, message: r.approvedFacts ? `Approved, with ${r.approvedFacts} verified fact${r.approvedFacts === 1 ? "" : "s"}.` : "Approved." };
}

export async function reopenSectionAction(placeId: string, key: string): Promise<void> {
  const user = await requireUser();
  if (!uuid.safeParse(placeId).success || !assertSectionKey(key)) return;
  await getDb()
    .update(sections)
    .set({ status: "draft", approvedBy: null, approvedAt: null, updatedAt: new Date() })
    .where(and(eq(sections.placeId, placeId), eq(sections.key, key as (typeof SECTION_KEYS)[number])));
  await audit({ actorId: user.id, action: "section.reopen", entityType: "place", entityId: placeId, details: { key } });
  revalidatePath(`/admin/places/${placeId}`);
}

// ---------------- Workflow ----------------

export async function submitForReviewAction(placeId: string): Promise<void> {
  const user = await requireUser();
  if (!uuid.safeParse(placeId).success) return;
  await getDb()
    .update(places)
    .set({ status: "in_review", updatedAt: new Date() })
    .where(and(eq(places.id, placeId), eq(places.status, "draft")));
  await audit({ actorId: user.id, action: "place.submit", entityType: "place", entityId: placeId });
  revalidatePath(`/admin/places/${placeId}`);
}

export async function publishAction(placeId: string): Promise<ActionState> {
  const user = await requireAdmin();
  if (!uuid.safeParse(placeId).success) return { ok: false, message: "Unknown place." };
  const r = await publishPlace(placeId, user.id);
  revalidatePath(`/admin/places/${placeId}`);
  if (!r.ok) return { ok: false, message: r.message, problems: r.problems };
  return { ok: true, message: `Published version ${r.version}.` };
}

export async function unpublishAction(placeId: string): Promise<ActionState> {
  const user = await requireAdmin();
  if (!uuid.safeParse(placeId).success) return { ok: false, message: "Unknown place." };
  const r = await unpublishPlace(placeId, user.id);
  revalidatePath(`/admin/places/${placeId}`);
  return r.ok ? { ok: true, message: "Unpublished. The public page now returns 404." } : { ok: false, message: r.message };
}

export async function archiveAction(placeId: string): Promise<ActionState> {
  const user = await requireAdmin();
  if (!uuid.safeParse(placeId).success) return { ok: false, message: "Unknown place." };
  const r = await unpublishPlace(placeId, user.id, { archive: true });
  revalidatePath(`/admin/places/${placeId}`);
  return r.ok ? { ok: true, message: "Archived." } : { ok: false, message: r.message };
}

export async function retryJobsAction(placeId: string): Promise<void> {
  await requireAdmin();
  if (!uuid.safeParse(placeId).success) return;
  await runPendingJobs({ placeId });
  revalidatePath(`/admin/places/${placeId}`);
}

// ---------------- Images ----------------

const mediaSchema = z.object({
  alt: z.string().trim().min(5, "Describe the image in the alt text (at least 5 characters).").max(200),
  caption: optionalText(300),
  kind: z.enum(["photo", "ai_generated"]),
  license: z.string().trim().min(2, "Licence is required (for example “Own photo”, “CC BY-SA 4.0”).").max(100),
  attribution: optionalText(200),
  sourceUrl: z
    .string()
    .trim()
    .max(500)
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || /^https:\/\//.test(v), "Source URL must start with https://"),
});

export async function uploadImageAction(placeId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!uuid.safeParse(placeId).success) return { ok: false, message: "Unknown place." };
  const parsed = mediaSchema.safeParse({
    alt: form.get("alt") ?? "",
    caption: form.get("caption") ?? "",
    kind: form.get("kind") ?? "photo",
    license: form.get("license") ?? "",
    attribution: form.get("attribution") ?? "",
    sourceUrl: form.get("sourceUrl") ?? "",
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose an image file." };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, message: "Images must be 5 MB or smaller." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) return { ok: false, message: "Only JPG, PNG or WebP images are allowed." };

  const db = getDb();
  const [place] = await db.select({ id: places.id, slug: places.slug, heroMediaId: places.heroMediaId }).from(places).where(eq(places.id, placeId)).limit(1);
  if (!place) return { ok: false, message: "Unknown place." };

  const stored = await storeImage(`places/${place.slug}/${crypto.randomUUID()}.${EXT[type]}`, bytes, type);
  const [row] = await db
    .insert(media)
    .values({ placeId, url: stored.url, storageKey: stored.storageKey, contentType: type, bytes: bytes.length, ...parsed.data, createdBy: user.id })
    .returning({ id: media.id });
  if (!place.heroMediaId) await db.update(places).set({ heroMediaId: row.id, updatedAt: new Date() }).where(eq(places.id, placeId));
  await audit({ actorId: user.id, action: "media.upload", entityType: "place", entityId: placeId, details: { mediaId: row.id, kind: parsed.data.kind } });
  revalidatePath(`/admin/places/${placeId}`);
  return { ok: true, message: "Image uploaded." };
}

export async function setHeroAction(placeId: string, mediaId: string): Promise<void> {
  const user = await requireUser();
  if (!uuid.safeParse(placeId).success || !uuid.safeParse(mediaId).success) return;
  const db = getDb();
  const [m] = await db.select({ id: media.id }).from(media).where(and(eq(media.id, mediaId), eq(media.placeId, placeId))).limit(1);
  if (!m) return;
  await db.update(places).set({ heroMediaId: mediaId, updatedAt: new Date() }).where(eq(places.id, placeId));
  await audit({ actorId: user.id, action: "media.hero", entityType: "place", entityId: placeId, details: { mediaId } });
  revalidatePath(`/admin/places/${placeId}`);
}

export async function deleteImageAction(placeId: string, mediaId: string): Promise<void> {
  const user = await requireUser();
  if (!uuid.safeParse(placeId).success || !uuid.safeParse(mediaId).success) return;
  const db = getDb();
  const [place] = await db.select({ heroMediaId: places.heroMediaId }).from(places).where(eq(places.id, placeId)).limit(1);
  // The hero may be in a published snapshot; pick another hero before deleting it.
  if (!place || place.heroMediaId === mediaId) return;
  const [m] = await db.select().from(media).where(and(eq(media.id, mediaId), eq(media.placeId, placeId))).limit(1);
  if (!m) return;
  await db.delete(media).where(eq(media.id, mediaId));
  await removeImage(m.url, m.storageKey).catch((err) => console.error("[media] delete failed", mediaId, err));
  await audit({ actorId: user.id, action: "media.delete", entityType: "place", entityId: placeId, details: { mediaId } });
  revalidatePath(`/admin/places/${placeId}`);
}

// ---------------- Related places ----------------

export async function addRelationAction(placeId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const toId = String(form.get("toId") ?? "");
  const type = String(form.get("type") ?? "nearby");
  if (!uuid.safeParse(placeId).success || !uuid.safeParse(toId).success || !(relationType.enumValues as readonly string[]).includes(type)) {
    return { ok: false, message: "Choose a place." };
  }
  if (toId === placeId) return { ok: false, message: "A place can’t be related to itself." };
  const db = getDb();
  const [a, b] = await Promise.all([
    db.select({ stateId: places.stateId, id: places.id }).from(places).where(eq(places.id, placeId)).limit(1),
    db.select({ stateId: places.stateId, id: places.id }).from(places).where(eq(places.id, toId)).limit(1),
  ]);
  if (!a[0] || !b[0]) return { ok: false, message: "Unknown place." };
  await db.insert(placeRelations).values({ fromId: placeId, toId, type: type as "nearby" | "day_trip" }).onConflictDoNothing();
  await audit({ actorId: user.id, action: "relation.add", entityType: "place", entityId: placeId, details: { toId, type } });
  revalidatePath(`/admin/places/${placeId}`);
  return { ok: true, message: "Added." };
}

export async function removeRelationAction(placeId: string, toId: string, type: string): Promise<void> {
  const user = await requireUser();
  if (!uuid.safeParse(placeId).success || !uuid.safeParse(toId).success || !(relationType.enumValues as readonly string[]).includes(type)) return;
  await getDb()
    .delete(placeRelations)
    .where(and(eq(placeRelations.fromId, placeId), eq(placeRelations.toId, toId), eq(placeRelations.type, type as "nearby" | "day_trip")));
  await audit({ actorId: user.id, action: "relation.remove", entityType: "place", entityId: placeId, details: { toId, type } });
  revalidatePath(`/admin/places/${placeId}`);
}

// ---------------- Wikimedia Commons ----------------

export async function searchCommonsAction(query: string): Promise<{ ok: true; files: CommonsFile[] } | { ok: false; message: string }> {
  await requireUser();
  try {
    return { ok: true, files: await searchCommons(String(query ?? "")) };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Search failed." };
  }
}

const commonsImportSchema = z.object({
  pageId: z.coerce.number().int().positive(),
  alt: z.string().trim().min(5, "Describe the image for people who can’t see it (alt text).").max(200),
  caption: optionalText(200),
});

export async function importCommonsAction(placeId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!uuid.safeParse(placeId).success) return { ok: false, message: "Unknown place." };
  const parsed = commonsImportSchema.safeParse({ pageId: form.get("pageId"), alt: form.get("alt") ?? "", caption: form.get("caption") ?? "" });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  try {
    const r = await importCommonsToPlace({ placeId, pageId: parsed.data.pageId, alt: parsed.data.alt, caption: parsed.data.caption, userId: user.id });
    if (!r.ok) return { ok: false, message: r.message };
    revalidatePath(`/admin/places/${placeId}`);
    return { ok: true, message: `Imported “${r.title}”.` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Import failed." };
  }
}

// ---------------- Coordinates ----------------

export async function geocodeAction(query: string): Promise<{ ok: true; results: GeoResult[] } | { ok: false; message: string }> {
  const user = await requireUser();
  const perUser = await hit(`geo:user:${user.id}`, 60, 3600);
  if (!perUser.ok) return { ok: false, message: "Too many lookups this hour." };
  try {
    return { ok: true, results: await geocode(String(query ?? "")) };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Lookup failed." };
  }
}

// ---------------- One-click destinations (state → place → generate) ----------------

const CONTAINER_KINDS = ["state", "region", "city", "town"];

const createDestinationSchema = z.object({
  state: z.string().trim().min(2).max(80),
  name: z.string().trim().max(120).optional(),
  kind: z.enum(placeKind.enumValues).optional(),
  parentId: z.string().trim().optional(),
});

/** Finds the state destination for an official state/UT name, creating it as a draft if needed. */
async function ensureState(region: RegionName, userId: string) {
  const db = getDb();
  const slug = slugify(region);
  const [existing] = await db.select().from(places).where(and(eq(places.kind, "state"), eq(places.slug, slug))).limit(1);
  if (existing) return existing;
  try {
    const [row] = await db.insert(places).values({ kind: "state", name: region, slug, createdBy: userId }).returning();
    await audit({ actorId: userId, action: "place.create", entityType: "place", entityId: row.id, details: { kind: "state", name: region, slug } });
    return row;
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const [again] = await db.select().from(places).where(and(eq(places.kind, "state"), eq(places.slug, slug))).limit(1);
    return again;
  }
}

/** Duplicate check shown while typing a place name. */
export async function checkDestinationAction(state: string, name: string): Promise<{ existing: { id: string; name: string; status: string } | null }> {
  await requireUser();
  const region = matchRegion(state);
  const slug = slugify(String(name ?? "").slice(0, 120));
  if (!region || !slug) return { existing: null };
  const db = getDb();
  const [st] = await db.select({ id: places.id }).from(places).where(and(eq(places.kind, "state"), eq(places.slug, slugify(region)))).limit(1);
  if (!st) return { existing: null };
  const [p] = await db
    .select({ id: places.id, name: places.name, status: places.status })
    .from(places)
    .where(and(eq(places.stateId, st.id), sql`(${places.slug} = ${slug} or lower(${places.name}) = lower(${String(name).trim()}))`))
    .limit(1);
  return { existing: p ?? null };
}

/** Search by name: our destinations first, then OpenStreetMap (India only) to identify the state. */
export async function findDestinationAction(query: string) {
  await requireUser();
  const q = String(query ?? "").trim().slice(0, 120);
  if (q.length < 2) return { ok: true as const, ours: [], osm: [] };
  const db = getDb();
  const ours = await db
    .select({ id: places.id, name: places.name, kind: places.kind, status: places.status, stateName: sql<string | null>`(select s.name from places s where s.id = "places"."state_id")` })
    .from(places)
    .where(sql`lower(${places.name}) like ${`%${q.toLowerCase().replace(/[%_]/g, "")}%`}`)
    .limit(5);
  let osm: { name: string; display: string; state: RegionName; kind: string }[] = [];
  try {
    const rows = await geocode(q);
    osm = rows
      .map((r) => ({ name: r.name, display: r.display, state: matchRegion(r.state ?? (r.osmType === "state" ? r.name : null)), kind: kindFromOsm(r.osmType) }))
      .filter((r): r is { name: string; display: string; state: RegionName; kind: string } => Boolean(r.state));
  } catch (err) {
    return { ok: false as const, ours, osm, message: err instanceof Error ? err.message : "Map search failed." };
  }
  return { ok: true as const, ours, osm };
}

function kindFromOsm(t: string | null): string {
  if (!t) return "attraction";
  if (t === "state") return "state";
  if (t === "city") return "city";
  if (["town", "village", "hamlet", "suburb", "municipality"].includes(t)) return "town";
  if (["county", "state_district", "district", "region"].includes(t)) return "region";
  if (["place_of_worship", "temple"].includes(t)) return "temple";
  if (["water", "lake", "reservoir"].includes(t)) return "lake";
  if (["peak", "viewpoint"].includes(t)) return "viewpoint";
  if (t === "museum") return "museum";
  return "attraction";
}

/** Step 2 of the 3-action flow: create (or reuse) the destination and start generating it on the server. */
export async function createDestinationAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const fields = { state: String(form.get("state") ?? ""), name: String(form.get("name") ?? "").slice(0, 120), kind: String(form.get("kind") ?? "") };
  const parsed = createDestinationSchema.safeParse({ state: form.get("state") ?? "", name: form.get("name") || undefined, kind: form.get("kind") || undefined, parentId: form.get("parentId") || undefined });
  if (!parsed.success) return { ok: false, message: "Choose a state and a place.", fields };
  const region = matchRegion(parsed.data.state);
  if (!region) return { ok: false, message: "Choose a state or union territory of India.", fields };
  const state = await ensureState(region, user.id);
  const db = getDb();

  let target = state;
  const name = parsed.data.name?.trim();
  if (name) {
    const slug = slugify(name);
    if (!SLUG_RE.test(slug)) return { ok: false, message: "That name can’t make a valid web address.", fields };
    const kind = parsed.data.kind && parsed.data.kind !== "state" ? parsed.data.kind : "town";
    const [dup] = await db.select().from(places).where(and(eq(places.stateId, state.id), eq(places.slug, slug))).limit(1);
    if (dup) return { ok: false, message: `“${dup.name}” already exists in ${region}. Open it to continue.`, fields: { ...fields, existingId: dup.id } };
    let parentId = state.id;
    if (parsed.data.parentId && uuid.safeParse(parsed.data.parentId).success) {
      const [parent] = await db.select().from(places).where(and(eq(places.id, parsed.data.parentId), eq(places.stateId, state.id))).limit(1);
      if (parent && CONTAINER_KINDS.includes(parent.kind)) parentId = parent.id;
    }
    try {
      const [row] = await db.insert(places).values({ kind, name, slug, parentId, stateId: state.id, createdBy: user.id }).returning();
      await audit({ actorId: user.id, action: "place.create", entityType: "place", entityId: row.id, details: { kind, name, slug } });
      target = row;
    } catch (err) {
      if (isUniqueViolation(err)) return { ok: false, message: `“${slug}” already exists in ${region}.`, fields };
      throw err;
    }
  }
  const started = await startGeneration({ placeId: target.id, placeKind: target.kind, userId: user.id, full: true });
  if (!started.ok) return { ok: false, message: started.message, fields: { ...fields, existingId: target.id } };
  redirect(`/admin/places/${target.id}/generate`);
}

/** "Regenerate selected": rewrites only the chosen sections (edited ones get a suggestion instead). */
export async function regenerateSectionsAction(placeId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!uuid.safeParse(placeId).success) return { ok: false, message: "Unknown place." };
  const keys = form.getAll("sections").map(String).filter((k) => (SECTION_KEYS as string[]).includes(k));
  const everything = form.get("scope") === "all";
  if (!keys.length && !everything) return { ok: false, message: "Tick the sections to regenerate." };
  const [p] = await getDb().select({ kind: places.kind }).from(places).where(eq(places.id, placeId)).limit(1);
  if (!p) return { ok: false, message: "Unknown place." };
  const started = await startGeneration({ placeId, placeKind: p.kind, userId: user.id, sections: everything ? undefined : keys, full: everything });
  if (!started.ok) return { ok: false, message: started.message };
  redirect(`/admin/places/${placeId}/generate`);
}

export async function resumeGenerationAction(placeId: string, jobId: string) {
  await requireUser();
  if (!uuid.safeParse(placeId).success || !uuid.safeParse(jobId).success) return;
  await resumeGeneration(jobId);
  revalidatePath(`/admin/places/${placeId}/generate`);
}

export async function generateIllustrationAction(placeId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!uuid.safeParse(placeId).success) return { ok: false, message: "Unknown place." };
  const r = await generateIllustration(placeId, user.id);
  revalidatePath(`/admin/places/${placeId}`);
  return r.ok ? { ok: true, message: "AI illustration created. It is labelled as an illustration everywhere it appears." } : { ok: false, message: r.message };
}

const mediaEditSchema = z.object({ alt: z.string().trim().min(5, "Alt text needs at least 5 characters.").max(200), caption: optionalText(300) });

export async function updateMediaAction(placeId: string, mediaId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!uuid.safeParse(placeId).success || !uuid.safeParse(mediaId).success) return { ok: false, message: "Unknown image." };
  const parsed = mediaEditSchema.safeParse({ alt: form.get("alt") ?? "", caption: form.get("caption") ?? "" });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  const [m] = await getDb().select({ kind: media.kind }).from(media).where(and(eq(media.id, mediaId), eq(media.placeId, placeId))).limit(1);
  if (!m) return { ok: false, message: "Unknown image." };
  // AI images keep their label in the alt text.
  const alt = m.kind === "ai_generated" && !/AI-generated/i.test(parsed.data.alt) ? `${parsed.data.alt} (AI-generated illustration)` : parsed.data.alt;
  await getDb().update(media).set({ alt: alt.slice(0, 200), caption: parsed.data.caption }).where(eq(media.id, mediaId));
  await getDb().update(places).set({ updatedAt: new Date() }).where(eq(places.id, placeId));
  await audit({ actorId: user.id, action: "media.edit", entityType: "place", entityId: placeId, details: { mediaId } });
  revalidatePath(`/admin/places/${placeId}`);
  return { ok: true, message: "Saved." };
}

/** "Save draft": keeps everything as an unpublished draft (moves an in-review place back to draft). */
export async function saveDraftAction(placeId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!uuid.safeParse(placeId).success) return { ok: false, message: "Unknown place." };
  await getDb().update(places).set({ status: "draft", updatedAt: new Date() }).where(and(eq(places.id, placeId), eq(places.status, "in_review")));
  await audit({ actorId: user.id, action: "place.save_draft", entityType: "place", entityId: placeId });
  revalidatePath(`/admin/places/${placeId}`);
  return { ok: true, message: "Saved as a draft. Nothing is public until you publish." };
}
