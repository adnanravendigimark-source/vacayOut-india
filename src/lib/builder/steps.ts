import "server-only";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { itineraries, places, travelGuides, type BuildReport } from "@/lib/db/schema";
import { publishGuide } from "@/lib/guides/service";
import { publishItinerary } from "@/lib/itineraries/service";
import { commonsPageId } from "@/lib/media/commons";
import { bestCommonsPhoto, importCommonsToPlace } from "@/lib/media/import";
import { approveSectionWithFacts } from "@/lib/places/review";
import { slugify } from "@/lib/places/slug";
import { publishPlace, runPendingJobs } from "@/lib/publish/service";
import { refreshHubs } from "@/lib/publish/hubs";
import type { SectionKey } from "@/lib/places/sections";
import { applyContentFile } from "@/lib/seed/apply";
import { slugOf } from "@/lib/seed/content-file";
import { gatherDestination, gatherState, stateCandidates, type Candidate } from "./gather";
import { addSteps, canSpend, finishBuild, getBuild, log, markStep, savePart, updateProgress, type BuildRow } from "./jobs";
import { assemble, emptyPart, partFromDestination, tripsFromOutput, type Part } from "./pack";
import { fetchArticle, wikivoyageViews } from "./sources";
import { parseListings } from "./wiki";
import { writePages, writeTrips } from "./write";

/**
 * The body of each build step. Every step first checks whether it already
 * ran (progress on the job row), so a retried or resumed workflow never
 * repeats work or spending. Nothing here overwrites content a person edited:
 * the content seed only adds drafts and fills empty fields.
 */

/** Stops the build with a message for the admin (not retried). */
export class BuildStop extends Error {}

const MAX_DESTINATIONS = { state: 8, more: 5, destination: 1 } as const;
const MAX_SIGHTS = { state: 4, more: 4, destination: 6 } as const;

async function job(id: string): Promise<BuildRow> {
  const j = await getBuild(id);
  if (!j) throw new BuildStop("This build no longer exists.");
  return j;
}
const stepDone = (j: BuildRow, key: string) => j.progress.steps.some((s) => s.key === key && (s.status === "done" || s.status === "skipped"));
const partsOf = (j: BuildRow) => j.parts as Record<string, Part>;
const contentParts = (j: BuildRow) => Object.entries(partsOf(j)).filter(([k]) => !k.startsWith("_")).map(([, p]) => p);

/** Slugs in the state and Wikidata items anywhere in VacayOut, plus what this build has written. */
async function taken(j: BuildRow) {
  const db = getDb();
  const [state] = await db.select({ id: places.id }).from(places).where(and(eq(places.kind, "state"), eq(places.slug, j.stateSlug))).limit(1);
  const inState = state ? await db.select({ slug: places.slug }).from(places).where(eq(places.stateId, state.id)) : [];
  const wd = await db.select({ id: places.wikidataId }).from(places).where(isNotNull(places.wikidataId));
  const slugs = new Set(inState.map((r) => r.slug));
  const wikidata = new Set(wd.map((r) => r.id!));
  for (const p of contentParts(j))
    for (const pl of p.places) {
      slugs.add(slugOf(pl.key));
      if (pl.wikidataId) wikidata.add(pl.wikidataId);
    }
  return { stateId: state?.id ?? null, slugs, wikidata };
}

// ---------- plan ----------

async function rank(cands: Candidate[], max: number): Promise<Candidate[]> {
  const scored: { c: Candidate; views: number | null; richness: number }[] = [];
  let viewsOk = true;
  for (const c of cands) {
    const a = await fetchArticle("wikivoyage", c.article ?? c.name).catch(() => null);
    if (!a) continue;
    const views = viewsOk ? await wikivoyageViews(a.title) : null;
    if (views === null) viewsOk = false;
    scored.push({ c: { ...c, article: a.title }, views, richness: parseListings(a.raw).filter((l) => l.type === "see").length * 2 + a.raw.length / 5000 });
  }
  // Traveller interest (Wikivoyage readers) when the stats API answered for every article; otherwise richer articles first.
  const score = (s: (typeof scored)[number]) => (viewsOk ? (s.views ?? 0) : s.richness);
  scored.sort((a, b) => score(b) - score(a));
  // Alternate cities and other destinations (parks, beaches, ruins) so a state isn't only its biggest towns.
  const cities = scored.filter((s) => s.c.group !== "other");
  const others = scored.filter((s) => s.c.group === "other");
  const out: Candidate[] = [];
  let cityTurn = !others.length || (cities.length > 0 && score(cities[0]) >= score(others[0]));
  while (out.length < max && (cities.length || others.length)) {
    const from = cityTurn ? (cities.length ? cities : others) : others.length ? others : cities;
    out.push(from.shift()!.c);
    cityTurn = !cityTurn;
  }
  return out;
}

async function findDestination(name: string, stateName: string): Promise<Candidate> {
  const wv = await fetchArticle("wikivoyage", name);
  const wp = wv ? null : await fetchArticle("wikipedia", name);
  const a = wv ?? wp;
  if (!a) throw new BuildStop(`Couldn’t find “${name}” on Wikivoyage or Wikipedia. Check the spelling.`);
  if (!a.raw.toLowerCase().includes(stateName.toLowerCase())) throw new BuildStop(`Couldn’t confirm that “${a.title}” is in ${stateName}.`);
  return { name: a.title.replace(/\s*\(.*\)$/, ""), article: wv ? a.title : null, lat: null, lng: null, wikidata: null, image: null, description: "" };
}

export async function planStep(id: string): Promise<{ dests: string[]; state: boolean }> {
  let j = await job(id);
  if (!stepDone(j, "plan")) {
    await updateProgress(id, (p) => (p.steps[0].status = "running"), { status: "running" });
    const t = await taken(j);
    const kind = j.kind as keyof typeof MAX_DESTINATIONS;
    let cands: Candidate[];
    if (kind === "destination") {
      const c = await findDestination(j.target ?? "", j.stateName);
      if (t.slugs.has(slugify(c.name))) throw new BuildStop(`${c.name} is already in VacayOut.`);
      cands = [c];
    } else {
      const { article, candidates } = await stateCandidates(j.stateName);
      if (!article) throw new BuildStop(`Wikivoyage has no article for ${j.stateName}, so there is nothing to build from.`);
      const fresh = candidates.filter((c) => !t.slugs.has(slugify(c.name)) && !(c.wikidata && t.wikidata.has(c.wikidata)));
      cands = await rank(fresh, MAX_DESTINATIONS[kind]);
      if (!cands.length) throw new BuildStop(kind === "more" ? `No new destinations found for ${j.stateName} — every place Wikivoyage lists is already in VacayOut.` : `Wikivoyage lists no destinations for ${j.stateName}.`);
    }
    const steps = [
      ...cands.map((c) => ({ key: `dest:${slugify(c.name)}`, label: `Research and write ${c.name}`, status: "pending" as const })),
      ...(kind === "state" ? [{ key: "state", label: `Write the ${j.stateName} page`, status: "pending" as const }] : []),
      { key: "trips", label: "Write trip plans and guides", status: "pending" as const },
      { key: "apply", label: "Check everything and save drafts", status: "pending" as const },
      { key: "images", label: "Import photos", status: "pending" as const },
      { key: "publish", label: "Publish what passed the checks", status: "pending" as const },
    ];
    await updateProgress(id, (p) => {
      p.candidates = cands.map((c) => ({ name: c.name, article: c.article, lat: c.lat, lng: c.lng, wikidata: c.wikidata, image: c.image, description: c.description.slice(0, 300) }));
      p.steps[0].status = "done";
      p.steps[0].detail = cands.map((c) => c.name).join(", ").slice(0, 300);
    });
    await addSteps(id, steps);
    j = await job(id);
  }
  return { dests: j.progress.steps.filter((s) => s.key.startsWith("dest:")).map((s) => s.key), state: j.progress.steps.some((s) => s.key === "state") };
}

// ---------- destinations and state page ----------

export async function destStep(id: string, key: string) {
  const j = await job(id);
  if (stepDone(j, key)) return;
  if (!(await canSpend(id))) return markStep(id, key, "skipped", "Spending cap reached");
  await markStep(id, key, "running");
  const cand = j.progress.candidates?.find((c) => `dest:${slugify(c.name)}` === key);
  if (!cand) return markStep(id, key, "skipped", "Not in the plan");
  const t = await taken(j);
  t.slugs.delete(slugOf(key)); // the plan already checked this one
  const r = await gatherDestination({ stateKey: j.stateSlug, stateName: j.stateName, candidate: cand, maxSights: MAX_SIGHTS[j.kind as keyof typeof MAX_SIGHTS] ?? 4, takenSlugs: t.slugs, takenWikidata: t.wikidata });
  if ("error" in r) {
    await log(id, [r.error]);
    return markStep(id, key, "skipped", r.error);
  }
  const w = await writePages(r, { name: cand.name, location: `${j.stateName}, India`, isState: false });
  const part = w.raw ? partFromDestination(w.raw, { prefix: key.replace(/^dest:/, ""), drafts: r.drafts, sentences: r.sentences, sources: r.sources, isState: false }) : { ...emptyPart(), notes: [`${cand.name}: the writing model didn’t finish`] };
  await savePart(id, key, part, w.costMicroUsd);
  await log(id, part.notes);
  if (!part.places.length) return markStep(id, key, "skipped", part.notes[0] ?? "Nothing usable was written");
  await markStep(id, key, "done", `${part.places.length} page${part.places.length === 1 ? "" : "s"}, ${Object.keys(part.facts).length} sourced facts`);
}

export async function stateStep(id: string) {
  const j = await job(id);
  if (stepDone(j, "state")) return;
  if (!(await canSpend(id))) throw new BuildStop("Spending cap reached before the state page was written.");
  await markStep(id, "state", "running");
  const r = await gatherState({ stateKey: j.stateSlug, stateName: j.stateName, wv: null });
  if ("error" in r) throw new BuildStop(r.error);
  // No photo of the state itself: use the first destination's photo.
  if (!r.drafts[0].image) {
    const first = contentParts(j).flatMap((p) => p.places).find((p) => p.images[0]);
    if (first) {
      r.drafts[0].image = first.images[0].commons;
      r.drafts[0].imageAlt = first.images[0].alt;
    }
  }
  const w = await writePages(r, { name: j.stateName, location: "India", isState: true });
  const part = w.raw ? partFromDestination(w.raw, { prefix: j.stateSlug, drafts: r.drafts, sentences: r.sentences, sources: r.sources, isState: true }) : emptyPart();
  await savePart(id, "state", part, w.costMicroUsd);
  if (!part.places.length) throw new BuildStop(`The ${j.stateName} page couldn’t be written from the sources (${part.notes[0] ?? "no answer"}).`);
  await markStep(id, "state", "done", `${Object.keys(part.facts).length} sourced facts`);
}

// ---------- trips ----------

export async function tripsStep(id: string) {
  const j = await job(id);
  if (stepDone(j, "trips")) return;
  const all = contentParts(j);
  const built = all.flatMap((p) => p.places);
  if (!built.length) return markStep(id, "trips", "skipped", "No pages were written");
  if (!(await canSpend(id))) return markStep(id, "trips", "skipped", "Spending cap reached");
  await markStep(id, "trips", "running");
  const refs = new Map<string, { key: string; name: string }>();
  built.forEach((p, i) => refs.set(`R${i + 1}`, { key: p.key, name: p.name }));
  const facts = Object.assign({}, ...all.map((p) => p.facts)) as Part["facts"];
  const nameOf = new Map(built.map((p) => [p.key, p.name]));
  const mainKey = j.kind === "destination" ? built[0].key : j.stateSlug;
  const area = j.kind === "destination" ? `${built[0].name}, ${j.stateName}` : j.stateName;
  const plans = {
    state: [`2 plans: a 3–4 day plan around one or two of the best-known destinations, and a 6–8 day circuit linking several destinations`, `3 guides, skipping any the facts can't support: "How to reach and get around ${j.stateName}", "Best time to visit ${j.stateName}", "First-time visitor's guide to ${j.stateName}"`],
    more: [`1 plan of 3–5 days linking the destinations in PLACES`, `none — return an empty list`],
    destination: [`1 plan of 2–3 days in and around ${built[0].name}`, `1 guide: "${built[0].name} travel guide: how to reach, get around and when to go"`],
  }[j.kind as "state" | "more" | "destination"];
  const w = await writeTrips({
    area,
    places: [...refs].map(([r, p]) => `${r} — ${p.name} — ${built.find((b) => b.key === p.key)?.kind}`).join("\n"),
    facts: Object.entries(facts).slice(0, 450).map(([fid, f]) => `${fid} — ${nameOf.get(f.place) ?? j.stateName} — ${f.claim}`).join("\n"),
    itineraries: plans[0],
    guides: plans[1],
  });
  const db = getDb();
  const takenSlugs = new Set([...(await db.select({ s: itineraries.slug }).from(itineraries)).map((r) => r.s), ...(await db.select({ s: travelGuides.slug }).from(travelGuides)).map((r) => r.s)]);
  const out = w.raw ? tripsFromOutput(w.raw, { mainKey, refs, facts, takenSlugs }) : { itineraries: [], guides: [], notes: ["Trip plans: the writing model didn’t finish"] };
  await savePart(id, "trips", { ...emptyPart(), ...out }, w.costMicroUsd);
  await log(id, out.notes);
  await markStep(id, "trips", "done", `${out.itineraries.length} trip plan${out.itineraries.length === 1 ? "" : "s"}, ${out.guides.length} guide${out.guides.length === 1 ? "" : "s"}`);
}

// ---------- apply, images, publish ----------

type Applied = { places: { key: string; name: string; kind: string; displayMode: string; image: string | null; alt: string; sections: string[] }[]; itineraries: string[]; guides: string[]; dropped: string[] };

export async function applyStep(id: string) {
  const j = await job(id);
  if (stepDone(j, "apply")) return;
  await markStep(id, "apply", "running");
  const t = await taken(j);
  const db = getDb();
  const inState = t.stateId ? await db.select({ slug: places.slug }).from(places).where(eq(places.stateId, t.stateId)) : [];
  const knownKeys = new Set<string>(t.stateId ? [j.stateSlug, ...inState.map((r) => `${j.stateSlug}/${r.slug}`)] : []);
  const res = assemble(contentParts(j), {
    cluster: j.stateSlug,
    title: j.kind === "destination" ? `${j.target}, ${j.stateName}` : j.stateName,
    date: new Date().toISOString().slice(0, 10),
    selection: `One-click build (${j.kind}) from Wikivoyage, Wikipedia and Wikidata; written by ${process.env.OPENAI_BUILDER_MODEL || "gpt-6-luna"}.`,
    knownKeys,
    requiredKeys: j.kind === "state" ? [j.stateSlug] : [],
  });
  if (!res.ok) throw new BuildStop(`The content didn’t pass its checks: ${res.problems.slice(0, 3).join("; ")}`);
  const report = await applyContentFile(res.file, res.checks, { images: false });
  const applied: Applied = {
    places: res.file.places.map((p) => ({ key: p.key, name: p.name, kind: p.kind, displayMode: p.displayMode, image: p.images[0]?.commons ?? null, alt: p.images[0]?.alt ?? p.name, sections: Object.keys(p.sections) })),
    itineraries: res.file.itineraries.map((i) => i.slug),
    guides: res.file.guides.map((g) => g.slug),
    dropped: res.dropped,
  };
  await savePart(id, "_applied", applied, 0);
  await log(id, res.dropped.map((d) => `Left out: ${d}`));
  await markStep(id, "apply", "done", `${report.places.created} new pages, ${report.facts.created} facts, ${report.itineraries.created} plans, ${report.guides.created} guides saved as drafts`);
}

async function placeRows(stateSlug: string) {
  const db = getDb();
  const [state] = await db.select().from(places).where(and(eq(places.kind, "state"), eq(places.slug, stateSlug))).limit(1);
  if (!state) return new Map<string, typeof places.$inferSelect>();
  const inside = await db.select().from(places).where(eq(places.stateId, state.id));
  return new Map([[stateSlug, state], ...inside.map((p) => [`${stateSlug}/${p.slug}`, p] as const)]);
}

/** Imports photos for a few places per call. Returns true when every place has been tried. */
export async function imagesStep(id: string): Promise<boolean> {
  const j = await job(id);
  if (stepDone(j, "images")) return true;
  await markStep(id, "images", "running");
  const applied = partsOf(j)._applied as unknown as Applied | undefined;
  const tried = new Set((partsOf(j)._images as unknown as string[] | undefined) ?? []);
  const rows = await placeRows(j.stateSlug);
  const deadline = Date.now() + 150_000;
  let imported = 0;
  for (const p of applied?.places ?? []) {
    if (Date.now() > deadline) break;
    if (tried.has(p.key)) continue;
    tried.add(p.key);
    const row = rows.get(p.key);
    if (!row || row.heroMediaId) continue;
    let ok = false;
    if (p.image) {
      try {
        const pageId = await commonsPageId(p.image);
        if (pageId) ok = (await importCommonsToPlace({ placeId: row.id, pageId, alt: p.alt, userId: null })).ok;
      } catch {}
    }
    if (!ok && p.displayMode === "page") {
      // The chosen file failed its licence check or download: try a search for a photo that names the place.
      try {
        const f = await bestCommonsPhoto(`${p.name} ${j.stateName}`, p.name);
        if (f) ok = (await importCommonsToPlace({ placeId: row.id, pageId: f.pageId, alt: p.alt, userId: null })).ok;
      } catch {}
    }
    if (ok) imported++;
    else if (p.displayMode === "page") await log(id, [`${p.name}: no usable free-licence photo`]);
    await savePart(id, "_images", [...tried], 0);
  }
  const all = (applied?.places ?? []).every((p) => tried.has(p.key));
  const prev = Number(j.progress.steps.find((s) => s.key === "images")?.detail?.match(/^(\d+)/)?.[1] ?? 0);
  if (all) await markStep(id, "images", "done", `${prev + imported} photos imported`);
  else await markStep(id, "images", "running", `${prev + imported} photos imported so far`);
  return all;
}

const SIGHT_KINDS = new Set(["attraction", "temple", "lake", "viewpoint", "trek", "nature", "museum", "activity"]);

export async function publishStep(id: string) {
  const j = await job(id);
  if (stepDone(j, "publish")) return;
  if (!j.requestedBy) throw new BuildStop("The admin who started this build no longer exists, so nothing was published.");
  const user = j.requestedBy;
  await markStep(id, "publish", "running");
  const applied = partsOf(j)._applied as unknown as Applied | undefined;
  const rows = await placeRows(j.stateSlug);
  const db = getDb();
  const report: BuildReport = { published: [], drafts: [], itineraries: 0, guides: 0, dropped: applied?.dropped ?? [] };

  for (const p of applied?.places ?? []) {
    const row = rows.get(p.key);
    if (!row) continue;
    if (row.status === "published") continue;
    let displayMode = row.displayMode;
    if (!row.heroMediaId && displayMode === "page") {
      if (SIGHT_KINDS.has(row.kind)) {
        // No photo: show it as a section on its parent page instead of its own page.
        await db.update(places).set({ displayMode: "parent_section", updatedAt: new Date() }).where(eq(places.id, row.id));
        displayMode = "parent_section";
      } else {
        report.drafts.push({ name: p.name, why: "No free-licence photo — add one, then publish." });
        continue;
      }
    }
    const problems: string[] = [];
    for (const key of p.sections) {
      const r = await approveSectionWithFacts(row.id, key as SectionKey, user);
      if (!r.ok) problems.push(...r.problems);
    }
    const res = await publishPlace(row.id, user);
    if (res.ok) report.published.push({ name: p.name, path: p.kind === "state" ? `/india/${row.slug}` : displayMode === "page" ? `/india/${j.stateSlug}/${row.slug}` : null });
    else report.drafts.push({ name: p.name, why: [...(res.problems ?? [res.message]), ...problems].slice(0, 3).join(" ") });
  }
  if (applied?.itineraries.length) {
    for (const it of await db.select({ id: itineraries.id, title: itineraries.title, status: itineraries.status }).from(itineraries).where(inArray(itineraries.slug, applied.itineraries))) {
      if (it.status === "published") continue;
      const r = await publishItinerary(it.id, user);
      if (r.ok) report.itineraries++;
      else report.drafts.push({ name: it.title, why: ("problems" in r && r.problems?.length ? r.problems : [r.message]).slice(0, 3).join(" ") });
    }
  }
  if (applied?.guides.length) {
    for (const g of await db.select({ id: travelGuides.id, title: travelGuides.title, status: travelGuides.status }).from(travelGuides).where(inArray(travelGuides.slug, applied.guides))) {
      if (g.status === "published") continue;
      const r = await publishGuide(g.id, user);
      if (r.ok) report.guides++;
      else report.drafts.push({ name: g.title, why: ("problems" in r && r.problems?.length ? r.problems : [r.message]).slice(0, 3).join(" ") });
    }
  }
  try {
    refreshHubs();
    await runPendingJobs({ limit: 100 });
  } catch (err) {
    await log(id, [`Cache refresh will retry on the next cron run (${err instanceof Error ? err.message : "error"})`]);
  }
  await markStep(id, "publish", "done", `${report.published.length} pages, ${report.itineraries} plans, ${report.guides} guides live; ${report.drafts.length} left as drafts`);
  await finishBuild(id, "done", { report });
}

export async function failBuild(id: string, message: string) {
  const j = await getBuild(id);
  if (!j) return;
  await updateProgress(id, (p) => {
    for (const s of p.steps) if (s.status === "running") s.status = "failed";
  });
  await finishBuild(id, "failed", { error: message.slice(0, 1000) });
}
