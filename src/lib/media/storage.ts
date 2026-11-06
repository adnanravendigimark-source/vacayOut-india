import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";
import { encodeRenditions, isRaster, type EncodedImage } from "./encode";
import { allRenditionUrls, parseRenditionUrl, renditionDir, renditionKey } from "./renditions";

/**
 * Image storage. Vercel Blob in any real environment. For `next dev` without a
 * Blob token, files go to public/uploads (git-ignored). Refused in production:
 * a production server only serves public/ files that existed at build time.
 *
 * Photos (JPG/PNG/WebP) are not stored as uploaded: they are resized once into the
 * WebP rendition ladder (see renditions.ts) and the largest rendition's URL is returned.
 * Every caller — admin uploads, Commons imports, AI images and seed scripts — goes
 * through storeImage, so every new image is fast without the caller changing.
 */
const LOCAL_DIR = path.join(process.cwd(), "public", "uploads");
const ONE_YEAR = 31536000;
/** storageKey marker for a rendition set (the set is deleted as a whole). */
const SET_PREFIX = "renditions:";

/**
 * Vercel Blob credentials: a read-write token, or (on Vercel) the store ID with
 * the platform's OIDC token, which @vercel/blob picks up by itself.
 */
function blobConfigured() {
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) return true;
  if (process.env.NODE_ENV === "production") throw new Error("Vercel Blob isn’t configured (set BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN)");
  return false;
}

export type StoredImage = {
  url: string;
  storageKey: string;
  /** What was actually stored (WebP for photos), and its size in bytes (the largest rendition). */
  contentType: string;
  bytes: number;
  width?: number;
  height?: number;
};

/** One file, at an exact key (renditions) or with a random suffix (originals). */
async function writeOne(key: string, bytes: Uint8Array, contentType: string, exact: boolean): Promise<{ url: string; pathname: string }> {
  if (blobConfigured()) {
    const blob = await put(key, Buffer.from(bytes), { access: "public", contentType, addRandomSuffix: !exact, cacheControlMaxAge: ONE_YEAR });
    return { url: blob.url, pathname: blob.pathname };
  }
  const safe = key.replace(/[^a-z0-9/._-]/gi, "-");
  const file = path.join(LOCAL_DIR, safe);
  if (!file.startsWith(LOCAL_DIR)) throw new Error("Invalid storage key");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
  return { url: `/uploads/${safe}`, pathname: `local:${safe}` };
}

async function storeSet(key: string, enc: EncodedImage): Promise<StoredImage> {
  const dir = renditionDir(key, crypto.randomUUID());
  let url = "";
  // Smallest first, largest last: the stored URL is only returned once every width exists.
  for (const f of enc.files) url = (await writeOne(renditionKey(dir, f.width), f.bytes, enc.contentType, true)).url;
  const top = enc.files[enc.files.length - 1];
  return { url, storageKey: `${SET_PREFIX}${dir}`, contentType: enc.contentType, bytes: top.bytes.length, width: enc.width, height: enc.height };
}

export async function storeImage(key: string, bytes: Uint8Array, contentType: string): Promise<StoredImage> {
  if (isRaster(contentType)) {
    let enc: EncodedImage | null = null;
    try {
      enc = await encodeRenditions(bytes);
    } catch (err) {
      // An image sharp can't decode is still kept as uploaded (and served through the optimiser) rather than lost.
      console.warn("[media] rendition encode failed, storing original", key, err instanceof Error ? err.message : err);
    }
    if (enc) return storeSet(key, enc);
  }
  const one = await writeOne(key, bytes, contentType, false);
  return { url: one.url, storageKey: one.pathname, contentType, bytes: bytes.length };
}

export async function removeImage(url: string, storageKey: string) {
  const urls = storageKey.startsWith(SET_PREFIX) || parseRenditionUrl(url) ? allRenditionUrls(url) : [url];
  for (const u of urls) {
    if (u.startsWith("/uploads/")) {
      const file = path.join(LOCAL_DIR, u.slice("/uploads/".length));
      if (file.startsWith(LOCAL_DIR)) await unlink(file).catch(() => {});
    } else if (storageKey.startsWith("local:")) {
      const file = path.join(LOCAL_DIR, storageKey.slice("local:".length));
      if (file.startsWith(LOCAL_DIR)) await unlink(file).catch(() => {});
    } else {
      await del(u);
    }
  }
}
