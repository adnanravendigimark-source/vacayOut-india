import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { media, type SnapshotImage } from "@/lib/db/schema";
import { buildSnapshot, publishProblems } from "./publish";
import { getPlaceForAdmin, listInlineChildren, listPublishedChildren, listPublishedRelated } from "./repo";
import { unapprovedCitations } from "./review";

/**
 * What the public page would look like. `includeDrafts` shows draft sections
 * too (the review workspace); without it, exactly what Publish would put live.
 * `problems` are the same checks Publish runs.
 */
export async function previewData(placeId: string, opts: { includeDrafts: boolean }) {
  const data = await getPlaceForAdmin(placeId);
  if (!data) return null;
  const { place, sections, parent, state } = data;
  const [heroRow] = place.heroMediaId ? await getDb().select().from(media).where(eq(media.id, place.heroMediaId)).limit(1) : [];
  const hero: SnapshotImage | null = heroRow
    ? { url: heroRow.url, alt: heroRow.alt, caption: heroRow.caption, kind: heroRow.kind, license: heroRow.license, licenseUrl: heroRow.licenseUrl, attribution: heroRow.attribution, sourceUrl: heroRow.sourceUrl }
    : null;
  const shown = opts.includeDrafts
    ? sections.filter((s) => s.body.text?.trim() || (s.body.items ?? []).length).map((s) => ({ ...s, status: "approved" as const }))
    : sections;
  const snapshot = buildSnapshot(place, shown, {
    state: state ? { name: state.name, slug: state.slug } : null,
    parent: parent && parent.kind !== "state" ? { name: parent.name, slug: parent.slug, kind: parent.kind } : null,
    hero,
  });
  const problems = [
    ...publishProblems(place, sections, { parentPublished: parent?.status === "published", isState: place.kind === "state", hero }),
    ...(await unapprovedCitations(getDb(), place.id)),
  ];
  const [children, inline, related] = await Promise.all([listPublishedChildren(place.id), listInlineChildren(place.id), listPublishedRelated(place.id)]);
  const stateSlug = place.kind === "state" ? place.slug : (state?.slug ?? "");
  return { data, snapshot, problems, children, inline, related, stateSlug, tripTypes: place.tripTypes };
}
