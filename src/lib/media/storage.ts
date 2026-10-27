import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";

/**
 * Image storage. Vercel Blob in any real environment. For `next dev` without a
 * Blob token, files go to public/uploads (git-ignored). Refused in production:
 * a production server only serves public/ files that existed at build time.
 */
const LOCAL_DIR = path.join(process.cwd(), "public", "uploads");

/**
 * Vercel Blob credentials: a read-write token, or (on Vercel) the store ID with
 * the platform's OIDC token, which @vercel/blob picks up by itself.
 */
function blobConfigured() {
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) return true;
  if (process.env.NODE_ENV === "production") throw new Error("Vercel Blob isn’t configured (set BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN)");
  return false;
}

export async function storeImage(key: string, bytes: Uint8Array, contentType: string): Promise<{ url: string; storageKey: string }> {
  if (blobConfigured()) {
    const blob = await put(key, Buffer.from(bytes), { access: "public", contentType, addRandomSuffix: true, cacheControlMaxAge: 31536000 });
    return { url: blob.url, storageKey: blob.pathname };
  }
  const safe = key.replace(/[^a-z0-9/._-]/gi, "-");
  const file = path.join(LOCAL_DIR, safe);
  if (!file.startsWith(LOCAL_DIR)) throw new Error("Invalid storage key");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
  return { url: `/uploads/${safe}`, storageKey: `local:${safe}` };
}

export async function removeImage(url: string, storageKey: string) {
  if (storageKey.startsWith("local:")) {
    const file = path.join(LOCAL_DIR, storageKey.slice("local:".length));
    if (file.startsWith(LOCAL_DIR)) await unlink(file).catch(() => {});
    return;
  }
  await del(url);
}
