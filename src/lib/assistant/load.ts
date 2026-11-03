import "server-only";
import { SLUG_RE } from "@/lib/places/slug";
import { getPublishedPlace, getPublishedState, listInlineChildren, listPublishedRelated } from "@/lib/places/repo";
import { placeRollup } from "@/lib/places/rollup";
import { buildPack } from "./pack";

/** The same pack the page was built with, rebuilt from the published data (for AI answers). */
export async function loadPack(stateSlug: string, placeSlug: string | null) {
  if (!SLUG_RE.test(stateSlug) || (placeSlug !== null && !SLUG_RE.test(placeSlug))) return null;
  const p = placeSlug ? await getPublishedPlace(stateSlug, placeSlug) : await getPublishedState(stateSlug);
  if (!p) return null;
  const place = p.snapshot.place;
  const [inline, related, rollup] = await Promise.all([listInlineChildren(p.id), listPublishedRelated(p.id), placeRollup({ id: p.id, slug: place.slug, kind: place.kind }, stateSlug)]);
  return buildPack({ snapshot: p.snapshot, stateSlug, rollup, inline, related });
}
