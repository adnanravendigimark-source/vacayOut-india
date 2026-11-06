/**
 * Which public URLs exist — one definition shared by the sitemap and the cache warmer,
 * so a page type added to one can't be forgotten by the other.
 */
import { HUB_PATHS } from "@/lib/publish/hubs";

export type PlaceRow = { kind: string; slug: string; stateSlug: string | null };

/** Public path of a published place page, or null for places that only appear inside another page. */
export function placePath(r: PlaceRow): string | null {
  if (r.kind === "state") return `/india/${r.slug}`;
  return r.stateSlug ? `/india/${r.stateSlug}/${r.slug}` : null;
}

export const itineraryPath = (slug: string) => `/itineraries/${slug}`;
export const guidePath = (slug: string) => `/travel-guides/${slug}`;

/** Every public page worth keeping warm, hubs first (they're the most visited and link to the rest). */
export function publicPaths(input: { places: PlaceRow[]; itineraries: { slug: string }[]; guides: { slug: string }[] }): string[] {
  const out: string[] = [...HUB_PATHS];
  // States before destinations: a state page is the entry point to all of its destinations.
  const sorted = [...input.places].sort((a, b) => Number(b.kind === "state") - Number(a.kind === "state"));
  for (const r of sorted) {
    const p = placePath(r);
    if (p) out.push(p);
  }
  for (const it of input.itineraries) if (it.slug) out.push(itineraryPath(it.slug));
  for (const g of input.guides) if (g.slug) out.push(guidePath(g.slug));
  return [...new Set(out)];
}

/** Paths a caller may ask to refresh: site-relative, lowercase slugs only (no query, no traversal). */
const SAFE_PATH = /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/;
export function isSafePath(p: unknown): p is string {
  return typeof p === "string" && p.length <= 200 && SAFE_PATH.test(p);
}
