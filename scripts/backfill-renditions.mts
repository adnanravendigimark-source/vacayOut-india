/**
 * Converts images stored before the rendition pipeline (full-size originals, some 40 MB)
 * into the WebP rendition ladder, and points every reference at the new URL.
 *
 *   npx tsx --env-file-if-exists=.env.local --conditions=react-server scripts/backfill-renditions.mts            # dry run: lists what would change
 *   npx tsx --env-file-if-exists=.env.local --conditions=react-server scripts/backfill-renditions.mts --apply    # converts (resumable)
 *       [--limit=50]          stop after N images (run again to continue)
 *       [--delete-old]        delete each original after its references are switched
 *
 * Safe to stop and re-run: a converted image no longer matches, so it is skipped.
 * Old originals are kept unless --delete-old (pages cached before the switch still point at them).
 * Afterwards, refresh the live pages: scripts/refresh-cache.mts or wait for their timer.
 */
const { readFile } = await import("node:fs/promises");
const path = (await import("node:path")).default;
const { sql } = await import("drizzle-orm");
const { getDb } = await import("@/lib/db");
const { media } = await import("@/lib/db/schema");
const { storeImage, removeImage } = await import("@/lib/media/storage");
const { parseRenditionUrl } = await import("@/lib/media/renditions");
const { sniffImage } = await import("@/lib/media/sniff");

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const deleteOld = args.includes("--delete-old");
const limit = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? Infinity);

/** jsonb columns that can embed an image URL. Text replace is exact-match on the full URL string. */
const JSON_COLUMNS: [table: string, column: string][] = [
  ["place_versions", "snapshot"],
  ["sections", "body"],
  ["content_suggestions", "body"],
  ["itineraries", "plan"],
  ["itineraries", "published_snapshot"],
  ["travel_guides", "body"],
  ["travel_guides", "published_snapshot"],
];

const db = getDb();
const rows = await db.select({ id: media.id, url: media.url, storageKey: media.storageKey, contentType: media.contentType, bytes: media.bytes }).from(media);
// One file can back several media rows (the same photo attached to more than one place): convert it once, repoint them all.
const todo = [...new Map(rows.filter((r) => !parseRenditionUrl(r.url) && /^image\/(jpeg|png|webp)$/.test(r.contentType)).map((r) => [r.url, r])).values()];
console.log(`${rows.length} images, ${todo.length} still full-size (${Math.round(todo.reduce((s, r) => s + r.bytes, 0) / 1048576)} MB).`);
if (!apply) {
  for (const r of todo.slice(0, 20)) console.log(`  ${Math.round(r.bytes / 1024)} KB  ${r.url}`);
  console.log("Dry run. Re-run with --apply to convert.");
  process.exit(0);
}

/** Original bytes: local dev uploads are read from disk, everything else is downloaded. */
async function load(url: string): Promise<Uint8Array> {
  if (url.startsWith("/uploads/")) {
    const root = path.join(process.cwd(), "public", "uploads");
    const file = path.join(root, url.slice("/uploads/".length));
    if (!file.startsWith(root)) throw new Error("bad local path");
    return new Uint8Array(await readFile(file));
  }
  const res = await fetch(url.startsWith("/") ? `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}${url}` : url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`download ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

let tried = 0;
let done = 0;
let saved = 0;
for (const r of todo) {
  // --limit counts attempts, so a small trial run stays small even when some downloads fail.
  if (tried++ >= limit) break;
  try {
    const bytes = await load(r.url);
    const type = sniffImage(bytes);
    if (!type) throw new Error("not a JPG/PNG/WebP");
    const key = r.storageKey.replace(/^local:/, "").replace(/-[A-Za-z0-9]{30}(\.[a-z]+)$/, "$1");
    const stored = await storeImage(key, bytes, type);
    if (!parseRenditionUrl(stored.url)) throw new Error("encode failed; original left in place");
    await db.transaction(async (tx) => {
      await tx.update(media).set({ url: stored.url, storageKey: stored.storageKey, contentType: stored.contentType, bytes: stored.bytes }).where(sql`${media.url} = ${r.url}`);
      for (const [table, column] of JSON_COLUMNS) {
        await tx.execute(sql`update ${sql.identifier(table)} set ${sql.identifier(column)} = replace(${sql.identifier(column)}::text, ${r.url}, ${stored.url})::jsonb where ${sql.identifier(column)}::text like ${"%" + r.url + "%"}`);
      }
    });
    if (deleteOld) await removeImage(r.url, r.storageKey).catch((e) => console.warn("  could not delete old file", e instanceof Error ? e.message : e));
    done++;
    saved += bytes.length - stored.bytes;
    console.log(`✓ ${Math.round(bytes.length / 1024)} KB → ${Math.round(stored.bytes / 1024)} KB  ${stored.url}`);
  } catch (err) {
    console.error(`✗ ${r.url}: ${err instanceof Error ? err.message : err}`);
  }
}
console.log(`Converted ${done} image(s); largest files ${Math.round(saved / 1048576)} MB smaller. ${todo.length - done} left.`);
process.exit(0);
