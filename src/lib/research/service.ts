import "server-only";
import { and, asc, desc, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { appSettings, contentSuggestions, findingEvidence, placeCandidates, placeRelations, places, researchFindings, researchRuns, sections, sources, type SectionSource } from "@/lib/db/schema";
import { SECTION_KEYS, type SectionKey } from "@/lib/places/sections";
import { slugify } from "@/lib/places/slug";
import { discoverPlaces, researchPlaceFacts, type EngineDeps } from "./engine";
import type { DraftContext, Fact } from "./draft";
import { createResponse, openaiConfigured, type CallModel } from "./openai";
import { costMicroUsd } from "./cost";
import { fetchPage } from "./safe-fetch";
import { logError } from "@/lib/ops/log";

/**
 * Research runs: budget-checked start, background execution, persistence.
 * Results are stored as PENDING findings; nothing here touches sections,
 * published versions or the search index.
 */

export const researchModel = () => process.env.OPENAI_RESEARCH_MODEL || "gpt-5.5";
export const checkModel = () => process.env.OPENAI_CHECK_MODEL || "gpt-5.4-mini";
export const draftModel = () => process.env.OPENAI_DRAFT_MODEL || "gpt-5.5";
export const imageModel = () => process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-flare";
/** Estimated cost of one illustration (OpenAI bills images separately from tokens); held and recorded as-is. */
export const imageCostMicroUsd = () => Math.round((Number(process.env.OPENAI_IMAGE_COST_USD ?? "0.2") || 0.2) * 1e6);
/** Drafting makes one small call (no web search), so it holds less budget while it runs. */
const DRAFT_RESERVE_MICRO_USD = 250_000;

const BUDGET_KEY = "research.monthly_budget_usd";
const DEFAULT_BUDGET_USD = 20;
const MAX_ACTIVE_RUNS = 3;
/** A run still "running" after this long is treated as dead (e.g. the server was stopped). */
const STALE_MINUTES = 15;

function reserveMicroUsd(): number {
  const v = Number(process.env.RESEARCH_RUN_RESERVE_USD ?? "1.5");
  return Math.round((Number.isFinite(v) && v > 0 ? v : 1.5) * 1e6);
}

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Budget months follow India time. */
const monthStartSql = sql`(date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')`;

export async function getBudgetUsd(db: Db | Tx = getDb()): Promise<number> {
  const [row] = await db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, BUDGET_KEY)).limit(1);
  const fromEnv = Number(process.env.RESEARCH_MONTHLY_BUDGET_USD);
  const v = typeof row?.value === "number" ? row.value : Number.isFinite(fromEnv) && fromEnv >= 0 ? fromEnv : DEFAULT_BUDGET_USD;
  return v;
}

export async function setBudgetUsd(value: number, actorId: string) {
  const db = getDb();
  await db
    .insert(appSettings)
    .values({ key: BUDGET_KEY, value, updatedBy: actorId })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedBy: actorId, updatedAt: new Date() } });
  await audit({ actorId, action: "research.budget", entityType: "settings", details: { monthlyBudgetUsd: value } });
}

async function expireStaleRuns(db: Db | Tx) {
  await db
    .update(researchRuns)
    .set({ status: "failed", error: "Stopped before finishing (server restarted or timed out).", reservedMicroUsd: 0, finishedAt: new Date() })
    .where(
      and(
        inArray(researchRuns.status, ["queued", "running"]),
        sql`${researchRuns.kind} <> 'generate'`,
        lt(researchRuns.createdAt, sql`now() - make_interval(mins => ${STALE_MINUTES})`),
        sql`(${researchRuns.leaseUntil} is null or ${researchRuns.leaseUntil} < now() - make_interval(mins => ${STALE_MINUTES}))`,
      ),
    );
}

export async function budgetStatus(db: Db | Tx = getDb()) {
  await expireStaleRuns(db);
  const [row] = await db
    .select({
      spent: sql<string>`coalesce(sum(${researchRuns.costMicroUsd}), 0)`,
      reserved: sql<string>`coalesce(sum(${researchRuns.reservedMicroUsd}) filter (where ${researchRuns.status} in ('queued','running')), 0)`,
      active: sql<string>`count(*) filter (where ${researchRuns.status} in ('queued','running') and ${researchRuns.kind} <> 'generate' and ${researchRuns.parentRunId} is null)`,
    })
    .from(researchRuns)
    .where(gte(researchRuns.createdAt, monthStartSql));
  const budgetMicro = Math.round((await getBudgetUsd(db)) * 1e6);
  const spent = Number(row?.spent ?? 0);
  const reserved = Number(row?.reserved ?? 0);
  return { budgetMicro, spent, reserved, active: Number(row?.active ?? 0), remaining: Math.max(0, budgetMicro - spent - reserved), reserve: reserveMicroUsd() };
}

export type StartResult = { ok: true; runId: string } | { ok: false; message: string };

export async function startRun(input: { kind: "place_facts" | "discover_places" | "draft" | "image"; placeId: string; focus: SectionKey[]; userId: string }): Promise<StartResult> {
  if (!openaiConfigured()) return { ok: false, message: "Research isn’t configured: add OPENAI_API_KEY to the server environment." };
  const db = getDb();
  const [place] = await db.select({ id: places.id, kind: places.kind, name: places.name }).from(places).where(eq(places.id, input.placeId)).limit(1);
  if (!place) return { ok: false, message: "Unknown place." };
  if (input.kind === "discover_places" && !["state", "region", "city", "town"].includes(place.kind)) {
    return { ok: false, message: "Discovery works on a state, region, city or town." };
  }
  const focus = input.focus.filter((k) => SECTION_KEYS.includes(k));
  const reserve = input.kind === "draft" ? DRAFT_RESERVE_MICRO_USD : input.kind === "image" ? imageCostMicroUsd() : reserveMicroUsd();
  const model = input.kind === "draft" ? draftModel() : input.kind === "image" ? imageModel() : researchModel();

  return db.transaction(async (tx) => {
    // Serialise starts so two clicks can't both pass the budget check.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('vacayout.research.start'))`);
    const status = await budgetStatus(tx);
    if (status.active >= MAX_ACTIVE_RUNS) return { ok: false as const, message: `${MAX_ACTIVE_RUNS} research runs are already in progress. Try again when one finishes.` };
    const [busy] = await tx
      .select({ id: researchRuns.id })
      .from(researchRuns)
      .where(and(eq(researchRuns.placeId, place.id), eq(researchRuns.kind, input.kind), inArray(researchRuns.status, ["queued", "running"])))
      .limit(1);
    if (busy) return { ok: false as const, message: input.kind === "draft" ? "A draft for this place is already being written." : input.kind === "image" ? "An illustration is already being made for this place." : "Research for this place is already running." };
    if (status.spent + status.reserved + reserve > status.budgetMicro) {
      return { ok: false as const, message: "This month’s AI budget is used up. An admin can raise it on the Research page." };
    }
    const [run] = await tx
      .insert(researchRuns)
      .values({ kind: input.kind, placeId: place.id, focus, model, requestedBy: input.userId, reservedMicroUsd: reserve })
      .returning({ id: researchRuns.id });
    await audit({ actorId: input.userId, action: `research.start.${input.kind}`, entityType: "place", entityId: place.id, details: { runId: run.id, focus } }, tx);
    return { ok: true as const, runId: run.id };
  });
}

export async function locationOf(db: Db, place: { parentId: string | null; stateId: string | null; name: string }) {
  const chain: string[] = [];
  let parentId = place.parentId;
  for (let i = 0; parentId && i < 6; i++) {
    const [p] = await db.select({ name: places.name, parentId: places.parentId }).from(places).where(eq(places.id, parentId)).limit(1);
    if (!p) break;
    chain.push(p.name);
    parentId = p.parentId;
  }
  return [...chain, "India"].join(", ");
}

/**
 * Executes a queued run. Every model call is metered as it happens, so the
 * real cost is recorded even when a later step fails.
 */
export async function executeRun(runId: string, overrides: Partial<EngineDeps> = {}) {
  const db = getDb();
  const [run] = await db
    .update(researchRuns)
    .set({ status: "running", startedAt: new Date() })
    .where(and(eq(researchRuns.id, runId), eq(researchRuns.status, "queued")))
    .returning();
  if (!run) return;

  const { call, metered } = meter(overrides.call ?? createResponse);
  const deps: EngineDeps = { researchModel: researchModel(), checkModel: checkModel(), fetchPage, ...overrides, call };

  try {
    const [place] = await db.select().from(places).where(eq(places.id, run.placeId)).limit(1);
    if (!place) throw new Error("The place was deleted.");
    const location = await locationOf(db, place);

    if (run.kind === "place_facts") {
      const known = await db
        .select({ claim: researchFindings.claim })
        .from(researchFindings)
        .where(and(eq(researchFindings.placeId, place.id), eq(researchFindings.status, "approved")))
        .orderBy(desc(researchFindings.reviewedAt))
        .limit(40);
      const result = await researchPlaceFacts(
        { name: place.name, kind: place.kind, location, known: known.map((k) => k.claim) },
        (run.focus as SectionKey[]) ?? [],
        deps,
      );
      await db.transaction(async (tx) => {
        await persistFindings(tx, run.id, place.id, result.findings);
        await finish(tx, run.id, metered(), `${result.findings.length} finding(s).${result.notes ? `\n${result.notes}` : ""}`);
      });
    } else {
      const existingNames = await existingPlaceNames(place);
      const result = await discoverPlaces({ name: place.name, kind: place.kind, location, known: [], existing: existingNames }, deps);
      await db.transaction(async (tx) => {
        const added = await persistCandidates(tx, run.id, place, result.candidates);
        await finish(tx, run.id, metered(), `${added} new suggestion(s).${result.notes ? `\n${result.notes}` : ""}`);
      });
    }
  } catch (err) {
    await logError(`research:${run.kind}`, err);
    const message = err instanceof Error ? err.message : "Research failed.";
    await db
      .update(researchRuns)
      .set({ status: "failed", error: message.slice(0, 500), reservedMicroUsd: 0, finishedAt: new Date(), ...meteredColumns(metered()) })
      .where(eq(researchRuns.id, run.id));
  }
}

/** Wraps a model client so every call's usage is added up as it happens. */
function meter(base: CallModel) {
  const m = { cost: 0, input: 0, output: 0, search: 0 };
  const call: CallModel = async (body) => {
    const r = await base(body);
    const calls = r.output.filter((i) => i.type === "web_search_call").length;
    m.cost += costMicroUsd(String(body.model), r.usage, calls);
    m.input += r.usage?.input_tokens ?? 0;
    m.output += r.usage?.output_tokens ?? 0;
    m.search += calls;
    return r;
  };
  return { call, metered: () => ({ costMicroUsd: m.cost, inputTokens: m.input, outputTokens: m.output, searchCalls: m.search }) };
}

function meteredColumns(m: { costMicroUsd: number; inputTokens: number; outputTokens: number; searchCalls: number }) {
  return { costMicroUsd: m.costMicroUsd, inputTokens: m.inputTokens, outputTokens: m.outputTokens, searchCalls: m.searchCalls };
}

export async function persistFindings(tx: Tx, runId: string, placeId: string, findings: Awaited<ReturnType<typeof researchPlaceFacts>>["findings"]) {
  for (const f of findings) {
    const [finding] = await tx
      .insert(researchFindings)
      .values({ runId, placeId, sectionKey: f.sectionKey, topic: f.topic, claim: f.claim, claimType: f.claimType, conflictNote: f.conflictNote, verification: f.verification })
      .returning({ id: researchFindings.id });
    for (const e of f.evidence) {
      const sourceId = await upsertSource(tx, e);
      await tx.insert(findingEvidence).values({
        findingId: finding.id,
        sourceId,
        quote: e.quote,
        sourceDate: e.sourceDate,
        support: e.support,
        supportNote: e.supportNote,
        checkedAt: e.support === "not_checked" ? null : new Date(),
      });
    }
  }
}

type PlaceRow = typeof places.$inferSelect;

export async function existingPlaceNames(place: PlaceRow) {
  const rows = await getDb()
    .select({ name: places.name })
    .from(places)
    .where(place.kind === "state" ? or(eq(places.stateId, place.id), eq(places.id, place.id)) : eq(places.stateId, place.stateId ?? place.id));
  return rows.map((r) => r.name);
}

/** Saves discovery suggestions, skipping repeats of pending ones and flagging likely duplicates. Returns how many were added. */
export async function persistCandidates(tx: Tx, runId: string, place: PlaceRow, candidates: Awaited<ReturnType<typeof discoverPlaces>>["candidates"]) {
  const existing = await tx
    .select({ id: places.id, slug: places.slug })
    .from(places)
    .where(place.kind === "state" ? or(eq(places.stateId, place.id), eq(places.id, place.id)) : eq(places.stateId, place.stateId ?? place.id));
  const pending = await tx
    .select({ name: placeCandidates.name })
    .from(placeCandidates)
    .where(and(eq(placeCandidates.parentId, place.id), eq(placeCandidates.status, "pending")));
  const bySlug = new Map(existing.map((e) => [e.slug, e.id]));
  const pendingSlugs = new Set(pending.map((p) => slugify(p.name)));
  let added = 0;
  for (const c of candidates) {
    const slug = slugify(c.name);
    if (!slug || pendingSlugs.has(slug)) continue;
    pendingSlugs.add(slug);
    await tx.insert(placeCandidates).values({ runId, parentId: place.id, name: c.name, kind: c.kind, reason: c.reason, evidence: c.evidence, matchedPlaceId: bySlug.get(slug) ?? null });
    added++;
  }
  return added;
}

export async function finish(tx: Tx | Db, runId: string, m: Parameters<typeof meteredColumns>[0], notes: string) {
  await tx
    .update(researchRuns)
    .set({ status: "done", notes: notes.slice(0, 2000), reservedMicroUsd: 0, finishedAt: new Date(), ...meteredColumns(m) })
    .where(eq(researchRuns.id, runId));
}

async function upsertSource(tx: Tx, e: { url: string; host: string; site: string; title: string | null; authority: (typeof sources.$inferInsert)["authority"] }) {
  const [row] = await tx
    .insert(sources)
    .values({ url: e.url, host: e.host, site: e.site, title: e.title, authority: e.authority })
    .onConflictDoUpdate({ target: sources.url, set: { lastRetrievedAt: new Date(), title: sql`coalesce(excluded.title, ${sources.title})` } })
    .returning({ id: sources.id });
  return row.id;
}

// ---------------- queries for the admin UI ----------------

export async function listRunsForPlace(placeId: string, limit = 6) {
  return getDb().select().from(researchRuns).where(eq(researchRuns.placeId, placeId)).orderBy(desc(researchRuns.createdAt)).limit(limit);
}

export async function listRecentRuns(limit = 50) {
  return getDb()
    .select({ run: researchRuns, placeName: places.name })
    .from(researchRuns)
    .innerJoin(places, eq(places.id, researchRuns.placeId))
    .orderBy(desc(researchRuns.createdAt))
    .limit(limit);
}

export async function listFindingsForPlace(placeId: string) {
  const db = getDb();
  const findings = await db.select().from(researchFindings).where(eq(researchFindings.placeId, placeId)).orderBy(asc(researchFindings.sectionKey), asc(researchFindings.createdAt));
  if (!findings.length) return [];
  const ev = await db
    .select({ e: findingEvidence, s: sources })
    .from(findingEvidence)
    .innerJoin(sources, eq(sources.id, findingEvidence.sourceId))
    .where(inArray(findingEvidence.findingId, findings.map((f) => f.id)));
  const byFinding = new Map<string, typeof ev>();
  for (const row of ev) byFinding.set(row.e.findingId, [...(byFinding.get(row.e.findingId) ?? []), row]);
  return findings.map((f) => ({ ...f, evidence: byFinding.get(f.id) ?? [] }));
}

export async function listCandidates(parentId: string) {
  return getDb()
    .select({ c: placeCandidates, matchedName: places.name })
    .from(placeCandidates)
    .leftJoin(places, eq(places.id, placeCandidates.matchedPlaceId))
    .where(eq(placeCandidates.parentId, parentId))
    .orderBy(asc(placeCandidates.status), asc(placeCandidates.name));
}



// ---------------- drafting (Phase 3) ----------------

/** Approved findings (with their checked sources) and real nearby places, as drafting input. */
/**
 * Facts for drafting. "approved": admin-approved only. "checked": also pending
 * facts our source check found support for (single source / corroborated) or
 * that conflict (shown as Needs review) — never rejected or unsupported ones.
 */
export async function loadDraftContext(placeId: string, mode: "approved" | "checked" = "approved"): Promise<DraftContext | null> {
  const db = getDb();
  const [place] = await db.select().from(places).where(eq(places.id, placeId)).limit(1);
  if (!place) return null;
  const findings = await db
    .select()
    .from(researchFindings)
    .where(
      mode === "approved"
        ? and(eq(researchFindings.placeId, placeId), eq(researchFindings.status, "approved"))
        : and(eq(researchFindings.placeId, placeId), sql`${researchFindings.status} <> 'rejected'`, sql`(${researchFindings.status} = 'approved' or ${researchFindings.verification} <> 'unsupported')`),
    )
    .orderBy(asc(researchFindings.createdAt))
    .limit(80);
  const ev = findings.length
    ? await db
        .select({ findingId: findingEvidence.findingId, support: findingEvidence.support, url: sources.url, title: sources.title, site: sources.site })
        .from(findingEvidence)
        .innerJoin(sources, eq(sources.id, findingEvidence.sourceId))
        .where(inArray(findingEvidence.findingId, findings.map((f) => f.id)))
    : [];
  const facts: Fact[] = findings.map((f, i) => {
    const mine = ev.filter((e) => e.findingId === f.id);
    // Prefer sources our check found supportive; fall back to all cited sources.
    const good = mine.filter((e) => e.support === "supports" || e.support === "partial");
    const list: SectionSource[] = (good.length ? good : mine).map((e) => ({ url: e.url, title: e.title, site: e.site }));
    return { ref: `F${i + 1}`, findingId: f.id, section: f.sectionKey, topic: f.topic, claim: f.claim, claimType: f.claimType, sources: list };
  });
  const children = await db
    .select({ name: places.name, kind: places.kind })
    .from(places)
    .where(and(eq(places.parentId, placeId), sql`${places.status} <> 'archived'`));
  const related = await db
    .select({ name: places.name, kind: places.kind })
    .from(placeRelations)
    .innerJoin(places, eq(places.id, placeRelations.toId))
    .where(and(eq(placeRelations.fromId, placeId), sql`${places.status} <> 'archived'`));
  return { name: place.name, kind: place.kind, location: await locationOf(db, place), facts, places: [...children, ...related] };
}


export async function listSuggestions(placeId: string) {
  return getDb()
    .select()
    .from(contentSuggestions)
    .where(and(eq(contentSuggestions.placeId, placeId), eq(contentSuggestions.status, "pending")))
    .orderBy(desc(contentSuggestions.createdAt));
}


/** Applies a suggestion: a section becomes a DRAFT (re-approval needed); details fill the place fields. */
export async function applySuggestion(id: string, userId: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [sug] = await tx.select().from(contentSuggestions).where(eq(contentSuggestions.id, id)).for("update").limit(1);
    if (!sug || sug.status !== "pending") return { ok: false as const, message: "This suggestion was already handled." };
    const now = new Date();
    if (sug.sectionKey) {
      const body = sug.body as import("@/lib/db/schema").SectionBody;
      await tx
        .insert(sections)
        .values({ placeId: sug.placeId, key: sug.sectionKey, body, sources: sug.sources, findingIds: sug.findingIds, status: "draft", locked: false, updatedBy: userId })
        .onConflictDoUpdate({
          target: [sections.placeId, sections.key],
          set: { body, sources: sug.sources, findingIds: sug.findingIds, status: "draft", locked: false, updatedBy: userId, approvedBy: null, approvedAt: null, updatedAt: now },
        });
    } else {
      const d = sug.body as import("@/lib/db/schema").DetailsSuggestion;
      // Only fields the draft could support are filled; the others keep their current value.
      await tx
        .update(places)
        .set({ ...(d.summary ? { summary: d.summary } : {}), ...(d.seoTitle ? { seoTitle: d.seoTitle } : {}), ...(d.seoDescription ? { seoDescription: d.seoDescription } : {}), updatedAt: now })
        .where(eq(places.id, sug.placeId));
    }
    await tx.update(places).set({ updatedAt: now }).where(eq(places.id, sug.placeId));
    await tx.update(contentSuggestions).set({ status: "applied", resolvedBy: userId, resolvedAt: now }).where(eq(contentSuggestions.id, id));
    await audit({ actorId: userId, action: "suggestion.apply", entityType: "place", entityId: sug.placeId, details: { suggestionId: id, section: sug.sectionKey ?? "details" } }, tx);
    return { ok: true as const, placeId: sug.placeId, section: sug.sectionKey };
  });
}

export async function discardSuggestion(id: string, userId: string) {
  const [row] = await getDb()
    .update(contentSuggestions)
    .set({ status: "discarded", resolvedBy: userId, resolvedAt: new Date() })
    .where(and(eq(contentSuggestions.id, id), eq(contentSuggestions.status, "pending")))
    .returning({ placeId: contentSuggestions.placeId });
  return row?.placeId ?? null;
}

/** How many suggestions were applied per target — used to refresh editor forms after "Use this draft". */
export async function appliedSuggestionCounts(placeId: string) {
  const rows = await getDb()
    .select({ key: contentSuggestions.sectionKey, n: sql<number>`count(*)::int` })
    .from(contentSuggestions)
    .where(and(eq(contentSuggestions.placeId, placeId), eq(contentSuggestions.status, "applied")))
    .groupBy(contentSuggestions.sectionKey);
  return Object.fromEntries(rows.map((r) => [r.key ?? "details", r.n])) as Record<string, number>;
}

