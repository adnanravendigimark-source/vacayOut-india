import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { contentSuggestions, places, researchFindings, researchRuns, type GenerationProgress } from "@/lib/db/schema";
import { geocode } from "@/lib/geocode";
import { bestCommonsPhoto, importCommonsToPlace } from "@/lib/media/import";
import { writeGeneratedSection } from "@/lib/places/review";
import { SECTION_KEYS, type SectionKey } from "@/lib/places/sections";
import { draftDetails, draftSection } from "@/lib/research/draft";
import { discoverPlaces, researchPlaceFacts } from "@/lib/research/engine";
import { StillRunning } from "@/lib/research/openai";
import { fetchPage } from "@/lib/research/safe-fetch";
import { checkModel, draftModel, existingPlaceNames, loadDraftContext, locationOf, persistCandidates, persistFindings, researchModel } from "@/lib/research/service";
import { claimStep, finishJob, finishStep, getJob, markStep, releaseLease, RESERVE, stepClient } from "./jobs";

/**
 * The body of each generation step. Every function is safe to run again:
 * it checks what is already done before doing (or paying for) anything.
 * Return values: "done" | "waiting_budget" | "busy" (another attempt holds the lease).
 */
export type StepOutcome = "done" | "waiting_budget" | "busy";

/** Signals the workflow to retry later without counting as a failure (e.g. a background response still running). */
export class RetryLater extends Error {
  constructor(message: string, public readonly afterSeconds: number) {
    super(message);
  }
}

async function placeOf(jobId: string) {
  const job = await getJob(jobId);
  if (!job) throw new Error("Generation job not found.");
  const [place] = await getDb().select().from(places).where(eq(places.id, job.placeId)).limit(1);
  if (!place) throw new Error("The destination was deleted.");
  return { job, place };
}

export async function startJobStep(jobId: string) {
  const { job } = await placeOf(jobId);
  await getDb().update(researchRuns).set({ status: "running", startedAt: sql`coalesce(${researchRuns.startedAt}, now())`, heartbeatAt: new Date() }).where(and(eq(researchRuns.id, jobId), sql`${researchRuns.status} in ('queued','running')`));
  const p = job.progress as GenerationProgress;
  return { steps: p.steps.map((s) => ({ key: s.key, status: s.status })), sections: p.sections };
}

export async function coordinatesStep(jobId: string, attempt = 1): Promise<StepOutcome> {
  const { place } = await placeOf(jobId);
  if (place.lat != null && place.lng != null) {
    await markStep(jobId, "coordinates", "skipped", "Already set");
    return "done";
  }
  await markStep(jobId, "coordinates", "running");
  const where = await locationOf(getDb(), place);
  let results;
  try {
    results = await geocode(`${place.name}, ${where}`);
  } catch (err) {
    // Coordinates are optional: after a few tries, carry on without them.
    if (attempt < 4) throw new RetryLater(err instanceof Error ? err.message : "Map search failed", err instanceof Error && /wait a second/.test(err.message) ? 2 : 20);
    await markStep(jobId, "coordinates", "done", "Map search unavailable — add coordinates in SEO & details");
    return "done";
  }
  const best = results[0];
  if (best) {
    // Never overwrites coordinates an admin entered meanwhile.
    await getDb().update(places).set({ lat: best.lat, lng: best.lng, updatedAt: new Date() }).where(and(eq(places.id, place.id), isNull(places.lat), isNull(places.lng)));
    await markStep(jobId, "coordinates", "done", best.display.slice(0, 120));
  } else {
    await markStep(jobId, "coordinates", "done", "Not found on OpenStreetMap — add it in SEO & details");
  }
  return "done";
}

async function claimOrSay(jobId: string, key: string, kind: "place_facts" | "discover_places" | "draft", reserve: number, focus: string[] = []) {
  const claim = await claimStep(jobId, key, kind, reserve, focus);
  if (claim.state === "waiting_budget") await markStep(jobId, key, "waiting_budget", "Waiting for AI budget — raise it in Settings, or the job continues next month");
  if (claim.state === "done") await markStep(jobId, key, "done");
  return claim;
}

export async function researchStep(jobId: string): Promise<StepOutcome> {
  const { place } = await placeOf(jobId);
  const claim = await claimOrSay(jobId, "research", "place_facts", RESERVE.research());
  if (claim.state !== "claimed") return claim.state;
  await markStep(jobId, "research", "running", "Searching the web and checking sources (2–4 minutes)");
  const db = getDb();
  try {
    const known = await db.select({ claim: researchFindings.claim }).from(researchFindings).where(and(eq(researchFindings.placeId, place.id), eq(researchFindings.status, "approved"))).orderBy(desc(researchFindings.reviewedAt)).limit(40);
    const result = await researchPlaceFacts(
      { name: place.name, kind: place.kind, location: await locationOf(db, place), known: known.map((k) => k.claim) },
      [],
      { call: stepClient(claim.runId, claim.openaiResponseId), fetchPage, researchModel: researchModel(), checkModel: checkModel() },
    );
    await db.transaction(async (tx) => {
      await persistFindings(tx, claim.runId, place.id, result.findings);
      await finishStep(tx, claim.runId, `${result.findings.length} finding(s).${result.notes ? `\n${result.notes}` : ""}`);
    });
    await markStep(jobId, "research", "done", `${result.findings.length} facts found`);
    return "done";
  } catch (err) {
    await releaseLease(claim.runId);
    if (err instanceof StillRunning) throw new RetryLater(err.message, 30);
    throw err;
  }
}

export async function discoverStep(jobId: string): Promise<StepOutcome> {
  const { place } = await placeOf(jobId);
  const claim = await claimOrSay(jobId, "discover", "discover_places", RESERVE.discover());
  if (claim.state !== "claimed") return claim.state;
  await markStep(jobId, "discover", "running");
  const db = getDb();
  try {
    const result = await discoverPlaces(
      { name: place.name, kind: place.kind, location: await locationOf(db, place), known: [], existing: await existingPlaceNames(place) },
      { call: stepClient(claim.runId, claim.openaiResponseId), fetchPage, researchModel: researchModel(), checkModel: checkModel() },
    );
    let added = 0;
    await db.transaction(async (tx) => {
      added = await persistCandidates(tx, claim.runId, place, result.candidates);
      await finishStep(tx, claim.runId, `${added} new suggestion(s).`);
    });
    await markStep(jobId, "discover", "done", `${added} places suggested`);
    return "done";
  } catch (err) {
    await releaseLease(claim.runId);
    if (err instanceof StillRunning) throw new RetryLater(err.message, 30);
    throw err;
  }
}

export async function draftStep(jobId: string, key: string): Promise<StepOutcome> {
  const stepKey = `draft:${key}`;
  if (!SECTION_KEYS.includes(key as SectionKey)) throw new Error(`Unknown section ${key}`);
  const { place } = await placeOf(jobId);
  const ctx = await loadDraftContext(place.id, "checked");
  if (!ctx?.facts.length) {
    await markStep(jobId, stepKey, "skipped", "No checked facts for this yet");
    return "done";
  }
  const claim = await claimOrSay(jobId, stepKey, "draft", RESERVE.draft(), [key]);
  if (claim.state !== "claimed") return claim.state;
  await markStep(jobId, stepKey, "running");
  try {
    const r = await draftSection(key as SectionKey, ctx, { call: stepClient(claim.runId, null), model: draftModel() });
    const db = getDb();
    let detail = "";
    await db.transaction(async (tx) => {
      if (r.ok) {
        const how = await writeGeneratedSection(tx, { placeId: place.id, key: key as SectionKey, body: r.body, sources: r.sources, findingIds: r.findingIds, runId: claim.runId, notes: r.notes || null });
        detail = how === "written" ? "Written" : "Your edited version was kept — new draft saved as a suggestion";
      } else {
        detail = r.message.slice(0, 160);
      }
      await finishStep(tx, claim.runId, detail);
    });
    await markStep(jobId, stepKey, r.ok ? "done" : "skipped", detail);
    return "done";
  } catch (err) {
    await releaseLease(claim.runId);
    throw err;
  }
}

export async function detailsStep(jobId: string): Promise<StepOutcome> {
  const { place } = await placeOf(jobId);
  const ctx = await loadDraftContext(place.id, "checked");
  if (!ctx?.facts.length) {
    await markStep(jobId, "details", "skipped", "No checked facts yet");
    return "done";
  }
  const claim = await claimOrSay(jobId, "details", "draft", RESERVE.draft());
  if (claim.state !== "claimed") return claim.state;
  await markStep(jobId, "details", "running");
  try {
    const r = await draftDetails(ctx, { call: stepClient(claim.runId, null), model: draftModel() });
    const db = getDb();
    let detail = r.ok ? "" : r.message;
    await db.transaction(async (tx) => {
      if (r.ok) {
        const [cur] = await tx.select().from(places).where(eq(places.id, place.id)).for("update").limit(1);
        // Fill only empty fields; anything already written is left alone and offered as a suggestion.
        const fill = {
          ...(!cur.summary && r.body.summary ? { summary: r.body.summary } : {}),
          ...(!cur.seoTitle && r.body.seoTitle ? { seoTitle: r.body.seoTitle } : {}),
          ...(!cur.seoDescription && r.body.seoDescription ? { seoDescription: r.body.seoDescription } : {}),
        };
        if (Object.keys(fill).length) await tx.update(places).set({ ...fill, updatedAt: new Date() }).where(eq(places.id, place.id));
        // Trip types are only ever suggested; an editor confirms them on the SEO & details tab.
        if (r.tripTypes) await tx.update(places).set({ suggestedTripTypes: r.tripTypes }).where(eq(places.id, place.id));
        const leftOver = (cur.summary && r.body.summary !== cur.summary) || (cur.seoTitle && r.body.seoTitle !== cur.seoTitle) || (cur.seoDescription && r.body.seoDescription !== cur.seoDescription);
        if (leftOver) {
          await tx.update(contentSuggestions).set({ status: "discarded", resolvedAt: new Date() }).where(and(eq(contentSuggestions.placeId, place.id), isNull(contentSuggestions.sectionKey), eq(contentSuggestions.status, "pending")));
          await tx.insert(contentSuggestions).values({ placeId: place.id, runId: claim.runId, sectionKey: null, body: r.body, sources: r.sources, findingIds: r.findingIds, notes: r.notes || null });
        }
        detail = Object.keys(fill).length ? "Filled in" : "Your text was kept — suggestion saved";
      }
      await finishStep(tx, claim.runId, detail);
    });
    await markStep(jobId, "details", r.ok ? "done" : "skipped", detail);
    return "done";
  } catch (err) {
    await releaseLease(claim.runId);
    throw err;
  }
}

export async function imageStep(jobId: string, attempt = 1): Promise<StepOutcome> {
  const { place } = await placeOf(jobId);
  if (place.heroMediaId) {
    await markStep(jobId, "image", "skipped", "Already has a main image");
    return "done";
  }
  await markStep(jobId, "image", "running");
  const where = (await locationOf(getDb(), place)).replace(/, India$/, "");
  // The photo is optional: if Commons can't be reached after a few tries, finish and let the admin add one.
  const giveUp = async (why: string) => {
    await markStep(jobId, "image", "done", why, { needsImage: true });
    return "done" as const;
  };
  let photo;
  try {
    photo = (await bestCommonsPhoto(`${place.name} ${where.split(",")[0] ?? ""}`.trim(), place.name)) ?? (await bestCommonsPhoto(place.name, place.name));
  } catch (err) {
    if (attempt < 3) throw new RetryLater(err instanceof Error ? err.message : "Commons unavailable", 60);
    return giveUp("Couldn’t reach Wikimedia Commons — add a photo from the Images tab");
  }
  if (!photo) return giveUp("No free photo found — upload one or create an AI illustration");
  const alt = (photo.description || `${place.name}, ${where}`).slice(0, 200);
  let r;
  try {
    r = await importCommonsToPlace({ placeId: place.id, pageId: photo.pageId, alt, userId: null });
  } catch (err) {
    if (attempt < 3) throw new RetryLater(err instanceof Error ? err.message : "Import failed", 60);
    return giveUp("The photo couldn’t be imported — add one from the Images tab");
  }
  await markStep(jobId, "image", "done", r.ok || ("duplicate" in r && r.duplicate) ? `${photo.title} (${photo.license})` : r.message);
  return "done";
}

export async function finishJobStep(jobId: string) {
  await markStep(jobId, "finish", "done", "Ready for review");
  await finishJob(jobId, "done");
}

export async function failJobStep(jobId: string, message: string) {
  await finishJob(jobId, "failed", message);
}

