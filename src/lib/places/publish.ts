import type { PublishedSnapshot, SectionBody, SectionSource, SnapshotImage } from "@/lib/db/schema";
import { SECTION_DEFS, validateSectionBody } from "./sections";

export type PlaceForPublish = {
  id: string;
  kind: string;
  name: string;
  slug: string;
  summary: string | null;
  lat: number | null;
  lng: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  displayMode: "page" | "parent_section";
};

type SectionForPublish = { key: string; status: "draft" | "approved"; body: SectionBody; sources?: SectionSource[] };

/** Minimum words of approved content. Thin places should be shown inside their parent page instead. */
export const MIN_WORDS = { page: 120, parent_section: 40 } as const;

export function countWords(sections: SectionForPublish[]): number {
  let text = "";
  for (const s of sections) {
    if (s.status !== "approved") continue;
    text += ` ${s.body.text ?? ""}`;
    for (const it of s.body.items ?? []) text += ` ${it.title ?? ""} ${it.body}`;
  }
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Everything that must be true before a page can go live. Returned as plain
 * messages so the admin sees exactly what to fix.
 */
export function publishProblems(
  place: PlaceForPublish,
  sections: SectionForPublish[],
  ctx: { parentPublished: boolean; isState: boolean; hero: SnapshotImage | null },
): string[] {
  const problems: string[] = [];
  const ownPage = place.displayMode === "page";
  if (ctx.isState && !ownPage) problems.push("A state always has its own page.");
  if (!ctx.isState && !ctx.parentPublished) problems.push("Publish the parent destination first.");

  if (ownPage) {
    if (!place.seoTitle?.trim()) problems.push("Add an SEO title.");
    else if (place.seoTitle.length > 70) problems.push("SEO title should be 70 characters or fewer.");
    if (!place.seoDescription?.trim()) problems.push("Add a meta description.");
    else if (place.seoDescription.length > 170) problems.push("Meta description should be 170 characters or fewer.");
    if (!ctx.hero) problems.push("Add a hero image (with alt text and licence).");
  }
  if (!place.summary?.trim()) problems.push("Add a card summary.");

  const approved = sections.filter((s) => s.status === "approved");
  for (const def of SECTION_DEFS) {
    if (def.required && !approved.some((s) => s.key === def.key)) problems.push(`Approve the “${def.label}” section.`);
  }
  if (ownPage && approved.length < 2) problems.push("Approve at least two sections so the page is genuinely useful.");
  const words = countWords(sections);
  const min = MIN_WORDS[place.displayMode];
  if (words < min) {
    problems.push(
      ownPage
        ? `Only ${words} words of approved content (need ${min}). Add more, or show this place inside its parent page.`
        : `Only ${words} words of approved content (need ${min}).`,
    );
  }
  for (const s of approved) {
    const v = validateSectionBody(s.key, s.body);
    if (!v.ok) problems.push(`“${s.key}” section is invalid: ${v.error}`);
  }
  return problems;
}

/** The frozen public copy: approved sections only, in the standard order. */
export function buildSnapshot(
  place: PlaceForPublish,
  sections: SectionForPublish[],
  rel: {
    state: { name: string; slug: string } | null;
    parent: { name: string; slug: string; kind: string } | null;
    hero: SnapshotImage | null;
  },
): PublishedSnapshot {
  const order = new Map<string, number>(SECTION_DEFS.map((d, i) => [d.key, i]));
  return {
    place: {
      id: place.id,
      kind: place.kind,
      name: place.name,
      slug: place.slug,
      summary: place.summary,
      lat: place.lat,
      lng: place.lng,
      seoTitle: place.seoTitle ?? place.name,
      seoDescription: place.seoDescription ?? "",
      state: rel.state,
      parent: rel.parent,
      displayMode: place.displayMode,
      hero: rel.hero,
    },
    sections: sections
      .filter((s) => s.status === "approved")
      .sort((a, b) => (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99))
      .map((s) => ({ key: s.key, body: s.body, ...(s.sources?.length ? { sources: s.sources } : {}) })),
  };
}

/** Plain text of a snapshot, for the search index the AI reads. */
export function snapshotText(snap: PublishedSnapshot): string {
  const parts = [snap.place.name, snap.place.summary ?? ""];
  for (const s of snap.sections) {
    if (s.body.text) parts.push(s.body.text);
    for (const it of s.body.items ?? []) parts.push(`${it.title ?? ""} ${it.body}`);
  }
  return parts.join("\n").trim();
}
