import { z } from "zod";
import { placeKind } from "@/lib/db/schema";
import { SLUG_RE } from "@/lib/places/slug";
import { SECTION_KEYS, validateSectionBody } from "@/lib/places/sections";
import { TRIP_TYPES } from "@/lib/places/trip-types";
import { matchRegion } from "@/lib/places/states";
import { MIN_WORDS, countWords } from "@/lib/places/publish";
import { stopRef, validateItinerary } from "@/lib/itineraries/plan";

/**
 * Format of the researched content files in content/travel/*.json, which the
 * content seed (scripts/seed-content.mts) loads as DRAFTS for editor review.
 *
 * - Every factual claim is a `fact` with at least one quoted source. Sections
 *   and itineraries cite facts by id; approving them in the admin approves the
 *   verified facts they cite, exactly like AI-researched content.
 * - `kind` labels what a fact is: verified (stated by the source), seasonal,
 *   estimate (a researched range, still sourced) — advice needs no fact.
 * - Places are addressed as "<state-slug>" for states and
 *   "<state-slug>/<slug>" for everything else.
 */

const TYPE_KEYS = TRIP_TYPES.map((t) => t.key) as [string, ...string[]];
const placeKey = z.string().regex(/^[a-z0-9-]+(\/[a-z0-9-]+)?$/, "Use <state> or <state>/<slug>");

const source = z
  .object({
    url: z.string().url().refine((u) => /^https:\/\//.test(u), "https only"),
    title: z.string().trim().min(2).max(200),
    authority: z.enum(["government", "reference", "media", "travel_platform", "other"]),
  })
  .strict();

const evidence = z
  .object({
    source: z.string().min(1),
    quote: z.string().trim().min(8).max(1200),
    /** Date the page itself shows (as written), if any. */
    sourceDate: z.string().trim().max(60).optional(),
  })
  .strict();

const fact = z
  .object({
    place: placeKey,
    topic: z.string().trim().min(3).max(120),
    claim: z.string().trim().min(8).max(600),
    claimType: z.enum(["general", "price", "schedule", "opening_hours", "distance", "rule", "contact"]),
    kind: z.enum(["verified", "seasonal", "estimate"]).default("verified"),
    /** Set when sources disagree or the information may be outdated — blocks approval until an editor decides. */
    conflictNote: z.string().trim().max(600).optional(),
    evidence: z.array(evidence).min(1).max(4),
  })
  .strict();

const sectionInput = z
  .object({
    text: z.string().optional(),
    items: z.array(z.object({ title: z.string().optional(), body: z.string() }).strict()).optional(),
    facts: z.array(z.string()).default([]),
  })
  .strict();

const image = z
  .object({
    /** Wikimedia Commons file title, e.g. "File:Taj Mahal (Edited).jpeg". The licence is re-read and checked at import. */
    commons: z.string().regex(/^File:.+\.(jpe?g|png|webp)$/i),
    alt: z.string().trim().min(10).max(200),
    caption: z.string().trim().max(200).optional(),
    hero: z.boolean().default(false),
  })
  .strict();

const place = z
  .object({
    key: placeKey,
    kind: z.enum(placeKind.enumValues),
    name: z.string().trim().min(2).max(120),
    /** Parent place key (defaults to the state for non-state places). */
    parent: placeKey.optional(),
    summary: z.string().trim().min(20).max(300),
    seoTitle: z.string().trim().min(10).max(70),
    seoDescription: z.string().trim().min(50).max(170),
    lat: z.number().min(6).max(38),
    lng: z.number().min(68).max(98),
    wikidataId: z.string().regex(/^Q\d+$/).optional(),
    displayMode: z.enum(["page", "parent_section"]).default("page"),
    featured: z.boolean().default(false),
    tripTypes: z.array(z.enum(TYPE_KEYS)).max(5).default([]),
    images: z.array(image).max(6).default([]),
    sections: z.record(z.string(), sectionInput).default({}),
    relations: z.array(z.object({ to: placeKey, type: z.enum(["nearby", "day_trip"]) }).strict()).default([]),
  })
  .strict();

const itinerary = z
  .object({
    place: placeKey,
    slug: z.string(),
    title: z.string(),
    summary: z.string(),
    durationDays: z.number(),
    tripTypes: z.array(z.string()).default([]),
    seoTitle: z.string(),
    seoDescription: z.string(),
    plan: z.unknown(),
    facts: z.array(z.string()).default([]),
    sources: z.array(z.string()).default([]),
  })
  .strict();

export const contentFileSchema = z
  .object({
    cluster: z.string().regex(SLUG_RE),
    title: z.string(),
    researchedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Why this destination was selected (shown to reviewers, not public). */
    selection: z.string().min(20),
    sources: z.record(z.string(), source),
    facts: z.record(z.string(), fact),
    /** Empty for route files (content/travel/routes/), which only hold multi-destination itineraries. */
    places: z.array(place).default([]),
    itineraries: z.array(itinerary).default([]),
  })
  .strict();

export type ContentFile = z.infer<typeof contentFileSchema>;
export type ContentPlace = ContentFile["places"][number];
export type ContentFact = ContentFile["facts"][string];

/** Result of re-fetching each quote's page (written by research/tools/verify.py). Keyed by `${factId}#${index}`. */
export const checksSchema = z.record(
  z.string(),
  z.object({
    support: z.enum(["supports", "quote_not_found", "unreachable"]),
    checkedAt: z.string(),
    pageDate: z.string().nullable().optional(),
    note: z.string().optional(),
  }),
);
export type Checks = z.infer<typeof checksSchema>;

export const stateOf = (key: string) => key.split("/")[0];
export const slugOf = (key: string) => key.split("/").pop()!;

/**
 * Everything that must hold before a file may be seeded. Pure (no DB, no
 * network): structure, slugs, section shapes, SEO lengths, itinerary plans,
 * and that every reference (place, fact, source) resolves.
 */
export function checkContentFile(raw: unknown, knownPlaceKeys: Set<string> = new Set()): { ok: true; file: ContentFile } | { ok: false; problems: string[] } {
  const parsed = contentFileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, problems: parsed.error.issues.slice(0, 20).map((i) => `${i.path.join(".")}: ${i.message}`) };
  const f = parsed.data;
  const problems: string[] = [];
  if (!f.places.length && !f.itineraries.length) problems.push("the file has no places and no itineraries");
  const keys = new Set([...knownPlaceKeys, ...f.places.map((p) => p.key)]);

  for (const [id, fc] of Object.entries(f.facts)) {
    if (!keys.has(fc.place)) problems.push(`fact ${id}: unknown place ${fc.place}`);
    fc.evidence.forEach((e, i) => {
      if (!f.sources[e.source]) problems.push(`fact ${id} evidence ${i}: unknown source ${e.source}`);
    });
  }
  const seen = new Set<string>();
  for (const p of f.places) {
    if (seen.has(p.key)) problems.push(`duplicate place ${p.key}`);
    seen.add(p.key);
    const isState = p.kind === "state";
    if (isState !== !p.key.includes("/")) problems.push(`${p.key}: states use "<slug>", other places "<state>/<slug>"`);
    if (!SLUG_RE.test(slugOf(p.key))) problems.push(`${p.key}: invalid slug`);
    if (isState && !matchRegion(p.name)) problems.push(`${p.key}: "${p.name}" isn't an Indian state/UT name`);
    if (!isState && !keys.has(stateOf(p.key))) problems.push(`${p.key}: state ${stateOf(p.key)} isn't defined`);
    if (p.parent && !keys.has(p.parent)) problems.push(`${p.key}: unknown parent ${p.parent}`);
    if (p.parent && stateOf(p.parent) !== stateOf(p.key)) problems.push(`${p.key}: parent must be in the same state`);
    if (p.displayMode === "page" && !p.images.some((i) => i.hero)) problems.push(`${p.key}: a page needs a hero image`);
    if (p.images.filter((i) => i.hero).length > 1) problems.push(`${p.key}: only one hero image`);
    if (!p.sections.overview) problems.push(`${p.key}: overview section is required`);
    for (const [key, s] of Object.entries(p.sections)) {
      if (!(SECTION_KEYS as string[]).includes(key)) {
        problems.push(`${p.key}: unknown section ${key}`);
        continue;
      }
      const v = validateSectionBody(key, { ...(s.text !== undefined ? { text: s.text } : {}), ...(s.items ? { items: s.items } : {}) });
      if (!v.ok) problems.push(`${p.key}.${key}: ${v.error}`);
      for (const id of s.facts) {
        if (!f.facts[id]) problems.push(`${p.key}.${key}: unknown fact ${id}`);
      }
    }
    for (const r of p.relations) if (!keys.has(r.to)) problems.push(`${p.key}: relation to unknown ${r.to}`);
    // Enough words to publish once approved — not counting sections that cite a disputed fact (an editor must decide those first).
    const publishable = Object.entries(p.sections)
      .filter(([, s]) => !s.facts.some((id) => f.facts[id]?.conflictNote))
      .map(([key, s]) => ({ key, status: "approved" as const, body: { ...(s.text !== undefined ? { text: s.text } : {}), ...(s.items ? { items: s.items } : {}) } }));
    const words = countWords(publishable);
    if (words < MIN_WORDS[p.displayMode]) problems.push(`${p.key}: only ${words} words outside disputed sections (publishing needs ${MIN_WORDS[p.displayMode]})`);
  }
  for (const it of f.itineraries) {
    if (!keys.has(it.place)) problems.push(`itinerary ${it.slug}: unknown place ${it.place}`);
    const v = validateItinerary({ slug: it.slug, title: it.title, summary: it.summary, durationDays: it.durationDays, tripTypes: it.tripTypes, seoTitle: it.seoTitle, seoDescription: it.seoDescription, plan: it.plan });
    if (!v.ok) problems.push(`itinerary ${it.slug}: ${v.error}`);
    else {
      const state = stateOf(it.place);
      for (const d of v.value.plan.days)
        for (const s of d.stops) {
          if (!s.placeSlug) continue;
          const ref = stopRef(s.placeSlug, state)!;
          const key = ref.slug === ref.state ? ref.state : `${ref.state}/${ref.slug}`;
          if (!keys.has(key)) problems.push(`itinerary ${it.slug}: stop link ${s.placeSlug} isn't a known place`);
        }
    }
    for (const id of it.facts) if (!f.facts[id]) problems.push(`itinerary ${it.slug}: unknown fact ${id}`);
    for (const id of it.sources) if (!f.sources[id]) problems.push(`itinerary ${it.slug}: unknown source ${id}`);
  }
  // Every fact should be used somewhere, otherwise it's research nobody reviews in context.
  const used = new Set([...f.places.flatMap((p) => Object.values(p.sections).flatMap((s) => s.facts)), ...f.itineraries.flatMap((i) => i.facts)]);
  for (const id of Object.keys(f.facts)) if (!used.has(id)) problems.push(`fact ${id} isn't cited by any section or itinerary`);
  return problems.length ? { ok: false, problems } : { ok: true, file: f };
}
