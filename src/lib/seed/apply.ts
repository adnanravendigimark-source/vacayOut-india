import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  contentSuggestions,
  findingEvidence,
  itineraries,
  media,
  travelGuidePlaces,
  travelGuides,
  placeRelations,
  places,
  researchFindings,
  researchRuns,
  sections,
  sources,
  type SectionBody,
  type SectionSource,
} from "@/lib/db/schema";
import { validateItinerary } from "@/lib/itineraries/plan";
import { validateGuide } from "@/lib/guides/body";
import { commonsPageId } from "@/lib/media/commons";
import { importCommonsToPlace } from "@/lib/media/import";
import { writeGeneratedSection } from "@/lib/places/review";
import { validateSectionBody, type SectionKey } from "@/lib/places/sections";
import { computeVerification } from "@/lib/research/verify";
import { authorityOf, siteOf } from "@/lib/research/urls";
import { slugOf, stateOf, type Checks, type ContentFile, type ContentPlace } from "./content-file";

/**
 * Loads one researched content file into the database as DRAFTS.
 *
 * Idempotent and conservative:
 * - places are matched by state + slug; existing rows only get EMPTY fields
 *   filled (never overwritten), and archived rows move back to draft;
 * - sections go through writeGeneratedSection: untouched drafts are refreshed,
 *   anything edited or approved gets a suggestion instead;
 * - facts are matched by place + topic + claim, evidence by source + quote;
 * - images are imported once per Commons file and licence-checked again;
 * - itineraries are matched by slug; edited (locked) or published ones are left alone.
 * Nothing is approved or published here — that stays with the editor.
 */

export const SEED_MODEL = "vacayout-content-seed";

/** JSON with sorted keys — Postgres jsonb doesn't keep key order, so plain JSON.stringify can't compare bodies. */
export function canonical(v: unknown): string {
  return JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x));
}

type Report = { places: { created: number; filled: number; unarchived: string[] }; facts: { created: number; reused: number }; evidence: number; sections: { written: number; suggested: number; unchanged: number }; images: { imported: number; skipped: number; failed: string[] }; relations: number; itineraries: { created: number; updated: number; skipped: string[] }; guides: { created: number; updated: number; skipped: string[] } };

export function emptyReport(): Report {
  return { places: { created: 0, filled: 0, unarchived: [] }, facts: { created: 0, reused: 0 }, evidence: 0, sections: { written: 0, suggested: 0, unchanged: 0 }, images: { imported: 0, skipped: 0, failed: [] }, relations: 0, itineraries: { created: 0, updated: 0, skipped: [] }, guides: { created: 0, updated: 0, skipped: [] } };
}

type Db = ReturnType<typeof getDb>;

/** Parents before children (states first). */
function ordered(ps: ContentPlace[]): ContentPlace[] {
  const depth = (p: ContentPlace, seen = 0): number => {
    if (p.kind === "state") return 0;
    const parent = ps.find((x) => x.key === (p.parent ?? stateOf(p.key)));
    return parent && seen < 10 ? 1 + depth(parent, seen + 1) : 1;
  };
  return [...ps].sort((a, b) => depth(a) - depth(b));
}

const CREATED = ":created-place";
const K = (...parts: string[]) => parts.join("\u0000");

type PlaceRow = typeof places.$inferSelect;
type EvidenceRow = { id: string; support: string; sourceDate: string | null; checkedAt: Date | null; supportNote: string | null };

/**
 * Everything the seed needs to look up, loaded in a few bulk queries up front
 * (one round trip per table instead of one per row — the seed runs over slow
 * links). Updated in memory as rows are inserted.
 */
type Index = {
  placeByKey: Map<string, PlaceRow>;
  wikidataOwner: Map<string, string>;
  createdBySeed: Set<string>;
  runs: Map<string, { id: string; notes: string | null }[]>;
  findings: Map<string, { id: string; verification: string; status: string }>;
  evidence: Map<string, EvidenceRow>;
  sourceByUrl: Map<string, string>;
  sectionBody: Map<string, SectionBody>;
  pendingSuggestion: Set<string>;
  mediaSource: Set<string>;
};

async function buildIndex(db: Db, file: ContentFile): Promise<Index> {
  const stateSlugs = [...new Set([...file.places.map((p) => stateOf(p.key)), ...Object.values(file.facts).map((f) => stateOf(f.place)), ...file.itineraries.map((i) => stateOf(i.place)), ...file.guides.flatMap((g) => [g.place, ...g.places].map(stateOf))])];
  const states = stateSlugs.length ? await db.select().from(places).where(and(eq(places.kind, "state"), inArray(places.slug, stateSlugs))) : [];
  const stateIds = states.map((x) => x.id);
  const inside = stateIds.length ? await db.select().from(places).where(and(inArray(places.stateId, stateIds), sql`${places.kind} <> 'state'`)) : [];
  const slugOfState = new Map(states.map((x) => [x.id, x.slug]));
  const placeByKey = new Map<string, PlaceRow>([...states.map((x) => [x.slug, x] as const), ...inside.map((x) => [`${slugOfState.get(x.stateId!)}/${x.slug}`, x] as const)]);
  const ids = [...placeByKey.values()].map((x) => x.id);
  const wikis = file.places.map((p) => p.wikidataId).filter((x): x is string => !!x);
  const urls = Object.values(file.sources).map((x) => x.url);
  const [wikiRows, runRows, findingRows, sourceRows, sectionRows, suggestionRows, mediaRows] = await Promise.all([
    wikis.length ? db.select({ id: places.id, wikidataId: places.wikidataId }).from(places).where(inArray(places.wikidataId, wikis)) : Promise.resolve([]),
    ids.length ? db.select({ id: researchRuns.id, placeId: researchRuns.placeId, notes: researchRuns.notes }).from(researchRuns).where(and(inArray(researchRuns.placeId, ids), eq(researchRuns.model, SEED_MODEL))) : Promise.resolve([]),
    ids.length ? db.select({ id: researchFindings.id, placeId: researchFindings.placeId, topic: researchFindings.topic, claim: researchFindings.claim, verification: researchFindings.verification, status: researchFindings.status }).from(researchFindings).where(inArray(researchFindings.placeId, ids)) : Promise.resolve([]),
    urls.length ? db.select({ id: sources.id, url: sources.url }).from(sources).where(inArray(sources.url, urls)) : Promise.resolve([]),
    ids.length ? db.select({ placeId: sections.placeId, key: sections.key, body: sections.body }).from(sections).where(inArray(sections.placeId, ids)) : Promise.resolve([]),
    ids.length ? db.select({ placeId: contentSuggestions.placeId, key: contentSuggestions.sectionKey, notes: contentSuggestions.notes }).from(contentSuggestions).where(and(inArray(contentSuggestions.placeId, ids), eq(contentSuggestions.status, "pending"))) : Promise.resolve([]),
    ids.length ? db.select({ placeId: media.placeId, sourceUrl: media.sourceUrl }).from(media).where(inArray(media.placeId, ids)) : Promise.resolve([]),
  ]);
  const findingIdList = findingRows.map((f) => f.id);
  const evidenceRows = findingIdList.length
    ? await db.select({ id: findingEvidence.id, findingId: findingEvidence.findingId, sourceId: findingEvidence.sourceId, quote: findingEvidence.quote, support: findingEvidence.support, sourceDate: findingEvidence.sourceDate, checkedAt: findingEvidence.checkedAt, supportNote: findingEvidence.supportNote }).from(findingEvidence).where(inArray(findingEvidence.findingId, findingIdList))
    : [];
  const runs = new Map<string, { id: string; notes: string | null }[]>();
  for (const r of runRows) runs.set(r.placeId, [...(runs.get(r.placeId) ?? []), { id: r.id, notes: r.notes }]);
  return {
    placeByKey,
    wikidataOwner: new Map(wikiRows.map((w) => [w.wikidataId!, w.id])),
    createdBySeed: new Set(runRows.filter((r) => r.notes?.endsWith(CREATED)).map((r) => r.placeId)),
    runs,
    findings: new Map(findingRows.map((f) => [K(f.placeId, f.topic, f.claim), { id: f.id, verification: f.verification, status: f.status }])),
    evidence: new Map(evidenceRows.map((e) => [K(e.findingId, e.sourceId, e.quote), { id: e.id, support: e.support, sourceDate: e.sourceDate, checkedAt: e.checkedAt, supportNote: e.supportNote }])),
    sourceByUrl: new Map(sourceRows.map((x) => [x.url, x.id])),
    sectionBody: new Map(sectionRows.map((x) => [K(x.placeId, x.key), x.body])),
    pendingSuggestion: new Set(suggestionRows.map((x) => K(x.placeId, x.key ?? "", x.notes ?? ""))),
    mediaSource: new Set(mediaRows.map((m) => K(m.placeId, m.sourceUrl ?? ""))),
  };
}

const idOfKey = (idx: Index, key: string) => idx.placeByKey.get(key)?.id ?? null;

async function upsertPlace(db: Db, idx: Index, p: ContentPlace, cluster: string, report: Report, preexisting: Set<string>): Promise<string> {
  const cur = idx.placeByKey.get(p.key);
  const existing = cur?.id ?? null;
  // True unless the content seed itself created the place — so user-created places stay protected on every run.
  if (existing && !idx.createdBySeed.has(existing)) preexisting.add(existing);
  const parentKey = p.parent ?? (p.kind === "state" ? null : stateOf(p.key));
  const parentId = parentKey ? idOfKey(idx, parentKey) : null;
  const stateId = p.kind === "state" ? null : idOfKey(idx, stateOf(p.key));
  if (p.kind !== "state" && (!parentId || !stateId)) throw new Error(`${p.key}: parent or state missing — seed it first`);
  let wikidataId: string | null = p.wikidataId ?? null;
  if (wikidataId) {
    const owner = idx.wikidataOwner.get(wikidataId);
    if (owner && owner !== existing) wikidataId = null;
  }
  if (!cur) {
    const [row] = await db
      .insert(places)
      .values({
        kind: p.kind,
        name: p.name,
        slug: slugOf(p.key),
        parentId,
        stateId,
        summary: p.summary,
        lat: p.lat,
        lng: p.lng,
        wikidataId,
        seoTitle: p.seoTitle,
        seoDescription: p.seoDescription,
        status: "draft",
        displayMode: p.displayMode,
        category: p.category ?? null,
        // Trip types are an editor decision: the research only suggests them.
        suggestedTripTypes: p.tripTypes,
      })
      .returning();
    idx.placeByKey.set(p.key, row);
    if (wikidataId) idx.wikidataOwner.set(wikidataId, row.id);
    idx.createdBySeed.add(row.id);
    report.places.created++;
    await seedRun(db, idx, row.id, `${cluster}${CREATED}`);
    return row.id;
  }
  const fill: Partial<typeof places.$inferInsert> = {};
  if (!cur.summary?.trim()) fill.summary = p.summary;
  if (!cur.seoTitle?.trim()) fill.seoTitle = p.seoTitle;
  if (!cur.seoDescription?.trim()) fill.seoDescription = p.seoDescription;
  if (cur.lat == null || cur.lng == null) Object.assign(fill, { lat: p.lat, lng: p.lng });
  if (!cur.wikidataId && wikidataId) fill.wikidataId = wikidataId;
  if (cur.kind === "activity" && !cur.category && p.category) fill.category = p.category;
  if (!cur.tripTypes.length) {
    const merged = [...new Set([...cur.suggestedTripTypes, ...p.tripTypes])];
    if (merged.length !== cur.suggestedTripTypes.length) fill.suggestedTripTypes = merged;
  }
  if (cur.status === "archived") {
    fill.status = "draft";
    report.places.unarchived.push(p.key);
  }
  if (Object.keys(fill).length) {
    await db.update(places).set({ ...fill, updatedAt: new Date() }).where(eq(places.id, cur.id));
    idx.placeByKey.set(p.key, { ...cur, ...fill } as PlaceRow);
    report.places.filled++;
  }
  return cur.id;
}

/** The research run that seeded facts belong to (one per place and content file). */
async function seedRun(db: Db, idx: Index, placeId: string, cluster: string): Promise<string> {
  const note = `content-seed:${cluster}`;
  const base = note.replace(CREATED, "");
  const run = (idx.runs.get(placeId) ?? []).find((r) => r.notes === base || r.notes === `${base}${CREATED}`);
  if (run) return run.id;
  const [row] = await db
    .insert(researchRuns)
    .values({ kind: "place_facts", placeId, status: "done", model: SEED_MODEL, notes: note, startedAt: new Date(), finishedAt: new Date() })
    .returning({ id: researchRuns.id });
  idx.runs.set(placeId, [...(idx.runs.get(placeId) ?? []), { id: row.id, notes: note }]);
  return row.id;
}

async function sourceId(db: Db, idx: Index, src: ContentFile["sources"][string]): Promise<string> {
  const known = idx.sourceByUrl.get(src.url);
  if (known) return known;
  const [row] = await db
    .insert(sources)
    .values({ url: src.url, host: new URL(src.url).hostname, site: siteOf(src.url), title: src.title, authority: src.authority ?? authorityOf(src.url) })
    .onConflictDoUpdate({ target: sources.url, set: { title: sql`coalesce(${sources.title}, excluded.title)` } })
    .returning({ id: sources.id });
  idx.sourceByUrl.set(src.url, row.id);
  return row.id;
}

/** Applies one content file. `checks` holds the re-fetch results for each quote. */
export async function applyContentFile(file: ContentFile, checks: Checks, opts: { images: boolean; log?: (m: string) => void }): Promise<Report> {
  const db = getDb();
  const report = emptyReport();
  const log = opts.log ?? (() => {});
  log(`${file.cluster}: ${file.places.length} places, ${Object.keys(file.facts).length} facts, ${file.itineraries.length} itineraries`);
  const placeIds = new Map<string, string>();
  const preexisting = new Set<string>();
  const idx = await buildIndex(db, file);

  for (const p of ordered(file.places)) placeIds.set(p.key, await upsertPlace(db, idx, p, file.cluster, report, preexisting));
  const idOf = async (key: string) => placeIds.get(key) ?? idOfKey(idx, key);

  // Facts and their evidence.
  const findingIds = new Map<string, string>();
  const srcIds = new Map<string, string>();
  const runs = new Map<string, string>();
  for (const [factId, fc] of Object.entries(file.facts)) {
    const placeId = await idOf(fc.place);
    if (!placeId) throw new Error(`fact ${factId}: place ${fc.place} not found`);
    if (!runs.has(placeId)) runs.set(placeId, await seedRun(db, idx, placeId, file.cluster));
    const topic = (fc.kind === "estimate" ? "[Estimate] " : fc.kind === "seasonal" ? "[Seasonal] " : "") + fc.topic;
    const found = idx.findings.get(K(placeId, topic, fc.claim));
    let id = found?.id;
    if (id) report.facts.reused++;
    else {
      const [row] = await db
        .insert(researchFindings)
        .values({ runId: runs.get(placeId)!, placeId, topic, claim: fc.claim, claimType: fc.claimType, conflictNote: fc.conflictNote ?? null, verification: "unsupported", status: "pending" })
        .returning({ id: researchFindings.id });
      id = row.id;
      idx.findings.set(K(placeId, topic, fc.claim), { id, verification: "unsupported", status: "pending" });
      report.facts.created++;
    }
    findingIds.set(factId, id);

    const ev: { support: "supports" | "quote_not_found" | "unreachable" | "not_checked"; site: string }[] = [];
    for (const [i, e] of fc.evidence.entries()) {
      const src = file.sources[e.source];
      if (!srcIds.has(e.source)) srcIds.set(e.source, await sourceId(db, idx, src));
      const check = checks[`${factId}#${i}`];
      const support = check?.support ?? "not_checked";
      ev.push({ support, site: siteOf(src.url) });
      const evKey = K(id, srcIds.get(e.source)!, e.quote);
      const dup = idx.evidence.get(evKey);
      const values = {
        support,
        sourceDate: e.sourceDate ?? check?.pageDate ?? null,
        checkedAt: check ? new Date(check.checkedAt) : null,
        supportNote: check
          ? support === "supports"
            ? "Quote found on the page by an automated re-fetch; the claim was written from this quote by the researcher."
            : (check.note ?? (support === "unreachable" ? "The page couldn’t be fetched for checking — open it and confirm." : "The quote wasn’t found on the page when re-checked — confirm or reject."))
          : "Not checked yet.",
      };
      // Skip no-op updates: re-runs over slow connections should cost as few round trips as possible.
      const same =
        dup &&
        dup.support === values.support &&
        (dup.sourceDate ?? null) === (values.sourceDate ?? null) &&
        (dup.checkedAt?.getTime() ?? null) === (values.checkedAt?.getTime() ?? null) &&
        dup.supportNote === values.supportNote;
      if (dup) {
        if (!same) await db.update(findingEvidence).set(values).where(eq(findingEvidence.id, dup.id));
      } else {
        const [row] = await db.insert(findingEvidence).values({ findingId: id, sourceId: srcIds.get(e.source)!, quote: e.quote, retrievedAt: check ? new Date(check.checkedAt) : new Date(), ...values }).returning({ id: findingEvidence.id });
        idx.evidence.set(evKey, { id: row.id, ...values });
        report.evidence++;
      }
    }
    // Recompute verification only for facts nobody has decided on yet (and only when it changes).
    const verification = computeVerification(ev.map((e) => ({ support: e.support === "not_checked" ? "not_checked" : e.support, site: e.site })), fc.conflictNote ?? null);
    if (!found || (found.status === "pending" && found.verification !== verification))
      await db
        .update(researchFindings)
        .set({ verification })
        .where(and(eq(researchFindings.id, id), eq(researchFindings.status, "pending")));
  }

  const sourcesFor = (factIds: string[], extra: string[] = []): SectionSource[] => {
    const seen = new Map<string, SectionSource>();
    const add = (sid: string) => {
      const s = file.sources[sid];
      if (s && !seen.has(s.url)) seen.set(s.url, { url: s.url, title: s.title, site: siteOf(s.url) });
    };
    for (const f of factIds) for (const e of file.facts[f]?.evidence ?? []) add(e.source);
    extra.forEach(add);
    return [...seen.values()];
  };

  // Sections (draft, or a suggestion when a person has edited/approved the section).
  for (const p of file.places) {
    const placeId = placeIds.get(p.key)!;
    for (const [key, s] of Object.entries(p.sections)) {
      const body = { ...(s.text !== undefined ? { text: s.text } : {}), ...(s.items ? { items: s.items } : {}) };
      const v = validateSectionBody(key, body);
      if (!v.ok) throw new Error(`${p.key}.${key}: ${v.error}`);
      const runId = runs.get(placeId) ?? (await seedRun(db, idx, placeId, file.cluster));
      const notes = `Researched content (${file.cluster}, ${file.researchedAt}).`;
      const secSources = sourcesFor(s.facts);
      const secFacts = s.facts.map((f) => findingIds.get(f)!);
      const curBody = idx.sectionBody.get(K(placeId, key));
      const cur = curBody ? { body: curBody } : undefined;
      const filled = cur && (cur.body.text?.trim() || (cur.body.items ?? []).length);
      // Already what the research says (draft or approved): nothing to write or suggest.
      if (filled && canonical(cur.body) === canonical(v.body)) {
        report.sections.unchanged++;
        continue;
      }
      if (filled) {
        // This research is already waiting for the editor as a suggestion: don't queue it twice.
        if (idx.pendingSuggestion.has(K(placeId, key, notes))) {
          report.sections.suggested++;
          continue;
        }
        // Places that existed before the seed: never replace any non-empty section, even an untouched draft.
        if (preexisting.has(placeId)) {
          await db.insert(contentSuggestions).values({ placeId, runId, sectionKey: key as SectionKey, body: v.body, sources: secSources, findingIds: secFacts, notes });
          idx.pendingSuggestion.add(K(placeId, key, notes));
          report.sections.suggested++;
          continue;
        }
      }
      const res = await db.transaction((tx) =>
        writeGeneratedSection(tx, { placeId, key: key as SectionKey, body: v.body, sources: secSources, findingIds: secFacts, runId, notes }),
      );
      if (res === "written") idx.sectionBody.set(K(placeId, key), v.body);
      report.sections[res]++;
    }
  }

  // Relations.
  for (const p of file.places) {
    for (const r of p.relations) {
      const to = await idOf(r.to);
      if (!to) continue;
      const rows = await db.insert(placeRelations).values({ fromId: placeIds.get(p.key)!, toId: to, type: r.type }).onConflictDoNothing().returning({ fromId: placeRelations.fromId });
      report.relations += rows.length;
    }
  }

  // Images: hero first — the importer makes the first image the hero only when the place has none.
  if (opts.images) {
    for (const p of file.places) {
      const placeId = placeIds.get(p.key)!;
      for (const img of [...p.images].sort((a, b) => Number(b.hero) - Number(a.hero))) {
        // Cheap pre-check (the importer also refuses duplicates, after downloading).
        const fileName = img.commons.replace(/^File:/, "").replace(/ /g, "_");
        const have = idx.mediaSource.has(K(placeId, `https://commons.wikimedia.org/wiki/File:${fileName}`)) || idx.mediaSource.has(K(placeId, `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`));
        if (have) {
          report.images.skipped++;
          continue;
        }
        try {
          const pageId = await commonsPageId(img.commons);
          if (!pageId) throw new Error("not found on Commons");
          const r = await importCommonsToPlace({ placeId, pageId, alt: img.alt, caption: img.caption ?? null, userId: null });
          if (r.ok) report.images.imported++;
          else if ("duplicate" in r && r.duplicate) report.images.skipped++;
          else throw new Error(r.message);
        } catch (err) {
          report.images.failed.push(`${p.key}: ${img.commons} — ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }

  // Itineraries.
  for (const it of file.itineraries) {
    const placeId = await idOf(it.place);
    if (!placeId) throw new Error(`itinerary ${it.slug}: place ${it.place} not found`);
    const v = validateItinerary({ slug: it.slug, title: it.title, summary: it.summary, durationDays: it.durationDays, tripTypes: it.tripTypes, seoTitle: it.seoTitle, seoDescription: it.seoDescription, plan: it.plan });
    if (!v.ok) throw new Error(`itinerary ${it.slug}: ${v.error}`);
    const values = { ...v.value, placeId, sources: sourcesFor(it.facts, it.sources), findingIds: it.facts.map((f) => findingIds.get(f)!) };
    const [cur] = await db
      .select({ id: itineraries.id, locked: itineraries.locked, status: itineraries.status, title: itineraries.title, summary: itineraries.summary, durationDays: itineraries.durationDays, tripTypes: itineraries.tripTypes, seoTitle: itineraries.seoTitle, seoDescription: itineraries.seoDescription, plan: itineraries.plan, placeId: itineraries.placeId, sources: itineraries.sources, findingIds: itineraries.findingIds })
      .from(itineraries).where(eq(itineraries.slug, it.slug)).limit(1);
    const sameIt = cur && canonical({ ...values, slug: it.slug }) === canonical({ slug: it.slug, title: cur.title, summary: cur.summary, durationDays: cur.durationDays, tripTypes: cur.tripTypes, seoTitle: cur.seoTitle, seoDescription: cur.seoDescription, plan: cur.plan, placeId: cur.placeId, sources: cur.sources, findingIds: cur.findingIds });
    if (sameIt) continue;
    if (!cur) {
      await db.insert(itineraries).values({ ...values, status: "draft" });
      report.itineraries.created++;
    } else if (!cur.locked && cur.status !== "archived") {
      // Safe for published plans too: the public page reads only the frozen snapshot until an editor publishes again.
      await db.update(itineraries).set({ ...values, updatedAt: new Date() }).where(eq(itineraries.id, cur.id));
      report.itineraries.updated++;
    } else report.itineraries.skipped.push(`${it.slug} (${cur.locked ? "edited by a person" : cur.status})`);
  }

  // Travel guides (same rules as itineraries) and the places they appear on.
  for (const g of file.guides) {
    const placeId = await idOf(g.place);
    if (!placeId) throw new Error(`guide ${g.slug}: place ${g.place} not found`);
    const v = validateGuide({ slug: g.slug, title: g.title, summary: g.summary, tripTypes: g.tripTypes, seoTitle: g.seoTitle, seoDescription: g.seoDescription, body: g.body });
    if (!v.ok) throw new Error(`guide ${g.slug}: ${v.error}`);
    const values = { ...v.value, placeId, sources: sourcesFor(g.facts, g.sources), findingIds: g.facts.map((f) => findingIds.get(f)!) };
    const [cur] = await db
      .select({ id: travelGuides.id, locked: travelGuides.locked, status: travelGuides.status, title: travelGuides.title, summary: travelGuides.summary, tripTypes: travelGuides.tripTypes, seoTitle: travelGuides.seoTitle, seoDescription: travelGuides.seoDescription, body: travelGuides.body, placeId: travelGuides.placeId, sources: travelGuides.sources, findingIds: travelGuides.findingIds })
      .from(travelGuides).where(eq(travelGuides.slug, g.slug)).limit(1);
    let guideId: string | null = null;
    const sameGuide = cur && canonical({ ...values, slug: g.slug }) === canonical({ slug: g.slug, title: cur.title, summary: cur.summary, tripTypes: cur.tripTypes, seoTitle: cur.seoTitle, seoDescription: cur.seoDescription, body: cur.body, placeId: cur.placeId, sources: cur.sources, findingIds: cur.findingIds });
    if (sameGuide) guideId = cur.id;
    else if (!cur) {
      const [row] = await db.insert(travelGuides).values({ ...values, status: "draft" }).returning({ id: travelGuides.id });
      guideId = row.id;
      report.guides.created++;
    } else if (!cur.locked && cur.status !== "archived") {
      await db.update(travelGuides).set({ ...values, updatedAt: new Date() }).where(eq(travelGuides.id, cur.id));
      guideId = cur.id;
      report.guides.updated++;
    } else report.guides.skipped.push(`${g.slug} (${cur.locked ? "edited by a person" : cur.status})`);
    if (guideId) {
      const ids = [placeId];
      for (const k of g.places) {
        const id = await idOf(k);
        if (id) ids.push(id);
      }
      // Links only grow from the seed; an editor removes them in the admin.
      await db.insert(travelGuidePlaces).values([...new Set(ids)].map((id) => ({ guideId: guideId!, placeId: id }))).onConflictDoNothing();
    }
  }
  return report;
}
