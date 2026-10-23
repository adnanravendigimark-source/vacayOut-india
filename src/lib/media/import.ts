import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { media, places } from "@/lib/db/schema";
import { attributionFor, fetchCommonsImage, searchCommons, type CommonsFile } from "./commons";
import { EXT, sniffImage } from "./sniff";
import { storeImage } from "./storage";

/**
 * Imports a Wikimedia Commons file into a place's images, with its licence,
 * licence link, author credit and file page. Safe to repeat: a file already
 * imported for the place is returned instead of stored twice.
 */
export async function importCommonsToPlace(input: { placeId: string; pageId: number; alt: string; caption?: string | null; userId: string | null }) {
  const db = getDb();
  const [place] = await db.select({ id: places.id, slug: places.slug, heroMediaId: places.heroMediaId }).from(places).where(eq(places.id, input.placeId)).limit(1);
  if (!place) return { ok: false as const, message: "Unknown place." };
  const got = await fetchCommonsImage(input.pageId);
  const [dup] = await db.select({ id: media.id }).from(media).where(and(eq(media.placeId, place.id), eq(media.sourceUrl, got.file.descriptionUrl))).limit(1);
  if (dup) return { ok: false as const, duplicate: true, mediaId: dup.id, message: "This image is already in this place’s images." };
  const type = sniffImage(got.bytes);
  if (!type) return { ok: false as const, message: "The downloaded file isn’t a JPG, PNG or WebP image." };
  const stored = await storeImage(`places/${place.slug}/${crypto.randomUUID()}.${EXT[type]}`, got.bytes, type);
  const [row] = await db
    .insert(media)
    .values({
      placeId: place.id,
      url: stored.url,
      storageKey: stored.storageKey,
      contentType: type,
      bytes: got.bytes.length,
      alt: input.alt.slice(0, 200),
      caption: input.caption ?? null,
      kind: "photo",
      license: got.file.license,
      licenseUrl: got.file.licenseUrl,
      attribution: attributionFor(got.file),
      sourceUrl: got.file.descriptionUrl,
      createdBy: input.userId,
    })
    .returning({ id: media.id });
  // Becomes the hero only if the place still has none (never replaces the admin's choice).
  await db.update(places).set({ heroMediaId: row.id, updatedAt: new Date() }).where(and(eq(places.id, place.id), sql`${places.heroMediaId} is null`));
  if (input.userId) await audit({ actorId: input.userId, action: "media.import_commons", entityType: "place", entityId: place.id, details: { mediaId: row.id, file: got.file.title, license: got.file.license } });
  return { ok: true as const, mediaId: row.id, title: got.file.title };
}

/** First freely licensed Commons photo for a query, or null. */
const norm = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Whether a Commons file's title or description names the place (so we never auto-pick a photo of somewhere nearby). */
export function namesPlace(f: Pick<CommonsFile, "title" | "description">, placeName: string) {
  const name = norm(placeName);
  if (!name) return false;
  const hay = ` ${norm(`${f.title} ${f.description}`)} `;
  return hay.includes(` ${name} `);
}

/** The first allowed, freely licensed photo whose title or description names the place — or null. */
export async function bestCommonsPhoto(query: string, placeName: string) {
  const files = await searchCommons(query);
  return files.find((f) => f.allowed && namesPlace(f, placeName)) ?? null;
}

