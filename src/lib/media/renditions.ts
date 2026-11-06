/**
 * Pre-sized image renditions — the "encode once, serve many" half of the media pipeline.
 *
 * Every uploaded photo is resized once, at upload time, into a fixed ladder of WebP files
 * stored side by side: `…/img/<id>/w384.webp`, `…/w640.webp` … up to the largest width the
 * source allows. The URL saved in the database is the largest rendition, so the URL alone
 * says which widths exist and no lookup table is needed.
 *
 * Pages then pick a ready-made file straight from the CDN instead of asking the image
 * optimiser to download a multi-megabyte original and resize it on the first visit.
 *
 * This module is pure (no I/O), so it runs in the browser (the image loader), on the
 * server (storage) and in scripts (backfill), and is unit-tested on its own.
 */

/** Widths produced for every photo; chosen to cover phone, tablet and desktop `sizes` without near-duplicates. */
export const RENDITION_WIDTHS = [384, 640, 828, 1200, 1920] as const;

export const RENDITION_EXT = "webp";
export const RENDITION_TYPE = "image/webp";

/** Encoder quality per width: small cards tolerate more compression than full-width heroes look like they do. */
export function qualityFor(width: number) {
  return width <= 828 ? 74 : 70;
}

/** Folder prefix every rendition set lives under; also how a URL is recognised as one. */
const DIR_PREFIX = "img/";
const URL_RE = /^(.*\/)(img\/[A-Za-z0-9._/-]+?)\/w(\d{2,4})\.webp$/;

export type Rendition = {
  /** Everything before the `img/` folder (a CDN origin with a trailing slash, or `/uploads/` locally). */
  root: string;
  /** The rendition set's folder, e.g. `img/places/kochi/3f1c…`. */
  dir: string;
  /** The largest width that exists for this image. */
  maxWidth: number;
};

/** Recognises a rendition URL (the stored, largest one or any sibling); null for anything else. */
export function parseRenditionUrl(url: string): Rendition | null {
  if (!url || url.includes("?") || url.includes("#")) return null;
  const m = URL_RE.exec(url);
  if (!m) return null;
  const maxWidth = Number(m[3]);
  if (!Number.isInteger(maxWidth) || maxWidth < 16 || maxWidth > 4096) return null;
  return { root: m[1], dir: m[2], maxWidth };
}

/** Storage key of one rendition inside a set. */
export function renditionKey(dir: string, width: number) {
  return `${dir}/w${width}.${RENDITION_EXT}`;
}

/** Public URL of one rendition inside a set. */
export function renditionUrl(r: Pick<Rendition, "root" | "dir">, width: number) {
  return `${r.root}${renditionKey(r.dir, width)}`;
}

/** Widths to encode for a source image: the ladder steps below its width, plus its own width (capped at the top step). */
export function planWidths(sourceWidth: number): number[] {
  const top = RENDITION_WIDTHS[RENDITION_WIDTHS.length - 1];
  const cap = Math.max(1, Math.min(Math.round(sourceWidth), top));
  const out = RENDITION_WIDTHS.filter((w) => w < cap) as number[];
  out.push(cap);
  return out;
}

/** Widths that exist for a set whose largest file is `maxWidth`. */
export function availableWidths(maxWidth: number): number[] {
  return planWidths(maxWidth);
}

/** The smallest existing width that is at least `requested` (or the largest one), so images are never upscaled. */
export function pickWidth(requested: number, maxWidth: number): number {
  const widths = availableWidths(maxWidth);
  return widths.find((w) => w >= requested) ?? widths[widths.length - 1];
}

/** Every URL in a set (used to delete it). */
export function allRenditionUrls(url: string): string[] {
  const r = parseRenditionUrl(url);
  return r ? availableWidths(r.maxWidth).map((w) => renditionUrl(r, w)) : [];
}

/** Folder for a new rendition set, derived from the caller's storage key so files stay grouped by place. */
export function renditionDir(storageKey: string, id: string) {
  const stem = storageKey
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^A-Za-z0-9/_-]+/g, "-")
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .slice(0, 120);
  const safeId = id.replace(/[^A-Za-z0-9-]/g, "").slice(0, 36) || "x";
  return `${DIR_PREFIX}${stem ? `${stem}-` : ""}${safeId}`;
}
