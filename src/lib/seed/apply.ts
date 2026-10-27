import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  contentSuggestions,
  findingEvidence,
  itineraries,
  media,
  placeRelations,
  places,
  researchFindings,
  researchRuns,
  sections,
  sources,
  type SectionSource,
} from "@/lib/db/schema";
import { validateItinerary } from "@/lib/itineraries/plan";
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

type Report = { places: { created: number; filled: number; unarchived: string[] }; facts: { created: number; reused: number }; evidence: number; sections: { written: number; suggested: number; unchanged: number }; images: { imported: number; skipped: number; failed: string[] }; relations: number; itineraries: { created: number; updated: number; skipped: string[] } };

export function emptyReport(): Report {
  return { places: { created: 0, filled: 0, unarchived: [] }, facts: { created: 0, reused: 0 }, evidence: 0, sections: { written: 0, suggested: 0, unchanged: 0 }, images: { imported: 0, skipped: 0, failed: [] }, relations: 0, itineraries: { created: 0, updated: 0, skipped: [] } };
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

export async function findPlaceId(db: Db, key: string): Promise<string | null> {
  const stateSlug = stateOf(key);
  const [state] = await db.select({ id: places.id }).from(places).where(and(eq(places.kind, "state"), eq(places.slug, stateSlug))).limit(1);
  if (!state) return null;
  if (!key.includes("/")) return state.id;
  const [p] = await db.select({ id: places.id }).from(places).where(and(eq(places.stateId, state.id), eq(places.slug, slugOf(key)), sql`${places.kind} <> 'state'`)).limit(1);
  return p?.id ?? null;
}

const CREATED = ":created-place";

/** True unless the content seed itself created the place — so user-created places stay protected on every run. */
async function isPreexisting(db: Db, placeId: string) {
  const [run] = await db
    .select({ id: researchRuns.id })
    .from(researchRuns)
    .where(and(eq(researchRuns.placeId, placeId), eq(researchRuns.model, SEED_MODEL), sql`${researchRuns.notes} like ${`%${CREATED}`}`))
    .limit(1);
  return !run;
}

async function upsertPlace(db: Db, p: ContentPlace, cluster: string, report: Report, preexisting: Set<string>): Promise<string> {
  const existing = await findPlaceId(db, p.key);
  if (existing && (await isPreexisting(db, existing))) preexisting.add(existing);
  const parentKey = p.parent ?? (p.kind === "state" ? null : stateOf(p.key));
  const parentId = parentKey ? await findPlaceId(db, parentKey) : null;
  const stateId = p.kind === "state" ? null : await findPlaceId(db, stateOf(p.key));
  if (p.kind !== "state" && (!parentId || !stateId)) throw new Error(`${p.key}: parent or state missing — seed it first`);
  let wikidataId: string | null = p.wikidataId ?? null;
  if (wikidataId) {
    const [taken] = await db.select({ id: places.id }).from(places).where(eq(places.wikidataId, wikidataId)).limit(1);
    if (taken && taken.id !== existing) wikidataId = null;
  }
  if (!existing) {
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
        // Trip types are an editor decision: the research only suggests them.
        suggestedTripTypes: p.tripTypes,
      })
      .returning({ id: places.id });
    report.places.created++;
    await seedRun(db, row.id, `${cluster}${CREATED}`);
    return row.id;
  }
  const [cur] = await db.select().from(places).where(eq(places.id, existing)).limit(1);
  const fill: Partial<typeof places.$inferInsert> = {};
  if (!cur.summary?.trim()) fill.summary = p.summary;
  if (!cur.seoTitle?.trim()) fill.seoTitle = p.seoTitle;
  if (!cur.seoDescription?.trim()) fill.seoDescription = p.seoDescription;
  if (cur.lat == null || cur.lng == null) Object.assign(fill, { lat: p.lat, lng: p.lng });
  if (!cur.wikidataId && wikidataId) fill.wikidataId = wikidataId;
  if (!cur.tripTypes.length) {
    const merged = [...new Set([...cur.suggestedTripTypes, ...p.tripTypes])];
    if (merged.length !== cur.suggestedTripTypes.length) fill.suggestedTripTypes = merged;
  }
  if (cur.status === "archived") {
    fill.status = "draft";
    report.places.unarchived.push(p.key);
  }
  if (Object.keys(fill).length) {
    await db.update(places).set({ ...fill, updatedAt: new Date() }).where(eq(places.id, existing));
    report.places.filled++;
  }
  return existing;
}

/** The research run that seeded facts belong to (one per place and content file). */
async function seedRun(db: Db, placeId: string, cluster: string): Promise<string> {
  const note = `content-seed:${cluster}`;
  const base = note.replace(CREATED, "");
  const [run] = await db
    .select({ id: researchRuns.id })
    .from(researchRuns)
    .where(and(eq(researchRuns.placeId, placeId), eq(researchRuns.model, SEED_MODEL), sql`(${researchRuns.notes} = ${base} or ${researchRuns.notes} = ${`${base}${CREATED}`})`))
    .limit(1);
  if (run) return run.id;
  const [row] = await db
    .insert(researchRuns)
    .values({ kind: "place_facts", placeId, status: "done", model: SEED_MODEL, notes: note, startedAt: new Date(), finishedAt: new Date() })
    .returning({ id: researchRuns.id });
  return row.id;
}

async function sourceId(db: Db, src: ContentFile["sources"][string]): Promise<string> {
  const [row] = await db
    .insert(sources)
    .values({ url: src.url, host: new URL(src.url).hostname, site: siteOf(src.url), title: src.title, authority: src.authority ?? authorityOf(src.url) })
    .onConflictDoUpdate({ target: sources.url, set: { title: sql`coalesce(${sources.title}, excluded.title)` } })
    .returning({ id: sources.id });
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

  for (const p of ordered(file.places)) placeIds.set(p.key, await upsertPlace(db, p, file.cluster, report, preexisting));
  const idOf = async (key: string) => placeIds.get(key) ?? (await findPlaceId(db, key));

  // Facts and their evidence.
  const findingIds = new Map<string, string>();
  const srcIds = new Map<string, string>();
  const runs = new Map<string, string>();
  for (const [factId, fc] of Object.entries(file.facts)) {
    const placeId = await idOf(fc.place);
    if (!placeId) throw new Error(`fact ${factId}: place ${fc.place} not found`);
    if (!runs.has(placeId)) runs.set(placeId, await seedRun(db, placeId, file.cluster));
    const topic = (fc.kind === "estimate" ? "[Estimate] " : fc.kind === "seasonal" ? "[Seasonal] " : "") + fc.topic;
    const [found] = await db
      .select({ id: researchFindings.id, verification: researchFindings.verification, status: researchFindings.status })
      .from(researchFindings)
      .where(and(eq(researchFindings.placeId, placeId), eq(researchFindings.topic, topic), eq(researchFindings.claim, fc.claim)))
      .limit(1);
    let id = found?.id;
    if (id) report.facts.reused++;
    else {
      const [row] = await db
        .insert(researchFindings)
        .values({ runId: runs.get(placeId)!, placeId, topic, claim: fc.claim, claimType: fc.claimType, conflictNote: fc.conflictNote ?? null, verification: "unsupported", status: "pending" })
        .returning({ id: researchFindings.id });
      id = row.id;
      report.facts.created++;
    }
    findingIds.set(factId, id);

    const ev: { support: "supports" | "quote_not_found" | "unreachable" | "not_checked"; site: string }[] = [];
    for (const [i, e] of fc.evidence.entries()) {
      const src = file.sources[e.source];
      if (!srcIds.has(e.source)) srcIds.set(e.source, await sourceId(db, src));
      const check = checks[`${factId}#${i}`];
      const support = check?.support ?? "not_checked";
      ev.push({ support, site: siteOf(src.url) });
      const [dup] = await db
        .select({ id: findingEvidence.id, support: findingEvidence.support, sourceDate: findingEvidence.sourceDate, checkedAt: findingEvidence.checkedAt, supportNote: findingEvidence.supportNote })
        .from(findingEvidence).where(and(eq(findingEvidence.findingId, id), eq(findingEvidence.sourceId, srcIds.get(e.source)!), eq(findingEvidence.quote, e.quote))).limit(1);
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
        await db.insert(findingEvidence).values({ findingId: id, sourceId: srcIds.get(e.source)!, quote: e.quote, retrievedAt: check ? new Date(check.checkedAt) : new Date(), ...values });
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
      const runId = runs.get(placeId) ?? (await seedRun(db, placeId, file.cluster));
      const notes = `Researched content (${file.cluster}, ${file.researchedAt}).`;
      const secSources = sourcesFor(s.facts);
      const secFacts = s.facts.map((f) => findingIds.get(f)!);
      const [cur] = await db.select({ body: sections.body }).from(sections).where(and(eq(sections.placeId, placeId), eq(sections.key, key as SectionKey))).limit(1);
      const filled = cur && (cur.body.text?.trim() || (cur.body.items ?? []).length);
      // Already what the research says (draft or approved): nothing to write or suggest.
      if (filled && canonical(cur.body) === canonical(v.body)) {
        report.sections.unchanged++;
        continue;
      }
      if (filled) {
        // This research is already waiting for the editor as a suggestion: don't queue it twice.
        const [pending] = await db
          .select({ id: contentSuggestions.id })
          .from(contentSuggestions)
          .where(and(eq(contentSuggestions.placeId, placeId), eq(contentSuggestions.sectionKey, key as SectionKey), eq(contentSuggestions.status, "pending"), eq(contentSuggestions.notes, notes)))
          .limit(1);
        if (pending) {
          report.sections.suggested++;
          continue;
        }
        // Places that existed before the seed: never replace any non-empty section, even an untouched draft.
        if (preexisting.has(placeId)) {
          await db.insert(contentSuggestions).values({ placeId, runId, sectionKey: key as SectionKey, body: v.body, sources: secSources, findingIds: secFacts, notes });
          report.sections.suggested++;
          continue;
        }
      }
      const res = await db.transaction((tx) =>
        writeGeneratedSection(tx, { placeId, key: key as SectionKey, body: v.body, sources: secSources, findingIds: secFacts, runId, notes }),
      );
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
        const [have] = await db.select({ id: media.id }).from(media).where(and(eq(media.placeId, placeId), sql`${media.sourceUrl} in (${`https://commons.wikimedia.org/wiki/File:${fileName}`}, ${`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`})`)).limit(1);
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
    const [cur] = await db.select({ id: itineraries.id, locked: itineraries.locked, status: itineraries.status }).from(itineraries).where(eq(itineraries.slug, it.slug)).limit(1);
    if (!cur) {
      await db.insert(itineraries).values({ ...values, status: "draft" });
      report.itineraries.created++;
    } else if (!cur.locked && cur.status === "draft") {
      await db.update(itineraries).set({ ...values, updatedAt: new Date() }).where(eq(itineraries.id, cur.id));
      report.itineraries.updated++;
    } else report.itineraries.skipped.push(`${it.slug} (${cur.locked ? "edited by a person" : cur.status})`);
  }
  return report;
}
