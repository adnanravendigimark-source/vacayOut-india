import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { buildJobs, places, type BuildProgress, type BuildStep, type GenerationStepStatus } from "@/lib/db/schema";
import { matchRegion } from "@/lib/places/states";
import { slugify } from "@/lib/places/slug";

/** Hard spending cap per build (default $1). */
export const capMicroUsd = () => {
  const usd = Number(process.env.BUILDER_CAP_USD ?? "1");
  return Math.round((Number.isFinite(usd) && usd > 0 ? Math.min(usd, 5) : 1) * 1e6);
};
/** Money kept free before each model call (one call costs well under this with the cheap model). */
export const CALL_RESERVE_MICRO_USD = 60_000;
/** A running build with no heartbeat for this long counts as stalled. */
export const STALL_MINUTES = 30;

export type BuildKind = "state" | "more" | "destination";
export type BuildRow = typeof buildJobs.$inferSelect;

export const isActive = (j: Pick<BuildRow, "status" | "heartbeatAt" | "createdAt">, now = Date.now()) =>
  (j.status === "queued" || j.status === "running") && now - (j.heartbeatAt ?? j.createdAt).getTime() < STALL_MINUTES * 60_000;

export async function getBuild(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [j] = await getDb().select().from(buildJobs).where(eq(buildJobs.id, id)).limit(1);
  return j ?? null;
}

export async function recentBuilds(limit = 20, stateSlug?: string) {
  return getDb().select({ id: buildJobs.id, kind: buildJobs.kind, stateName: buildJobs.stateName, stateSlug: buildJobs.stateSlug, target: buildJobs.target, status: buildJobs.status, costMicroUsd: buildJobs.costMicroUsd, heartbeatAt: buildJobs.heartbeatAt, createdAt: buildJobs.createdAt, finishedAt: buildJobs.finishedAt }).from(buildJobs).where(stateSlug ? eq(buildJobs.stateSlug, stateSlug) : undefined).orderBy(desc(buildJobs.createdAt)).limit(limit);
}

/**
 * Creates a build. Refuses a second active build for the same state, a
 * "state" build for a state already in VacayOut, and "more"/"destination"
 * builds for a state that isn't.
 */
export async function createBuild(input: { kind: BuildKind; stateName: string; target?: string; userId: string }): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const official = matchRegion(input.stateName);
  if (!official) return { ok: false, message: "Choose one of India’s states or union territories." };
  const stateSlug = slugify(official);
  const target = input.target?.replace(/\s+/g, " ").trim();
  if (input.kind === "destination" && (!target || target.length < 2 || target.length > 120)) return { ok: false, message: "Type the destination’s name." };
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`vacayout.build.${stateSlug}`}))`);
    const [state] = await tx.select({ id: places.id }).from(places).where(and(eq(places.kind, "state"), eq(places.slug, stateSlug))).limit(1);
    if (input.kind === "state" && state) return { ok: false as const, message: `${official} is already in VacayOut — open it to add destinations.` };
    if (input.kind !== "state" && !state) return { ok: false as const, message: `${official} isn’t in VacayOut yet — create the state first.` };
    const open = await tx.select().from(buildJobs).where(and(eq(buildJobs.stateSlug, stateSlug), inArray(buildJobs.status, ["queued", "running"])));
    if (open.some((j) => isActive(j))) return { ok: false as const, message: `A build for ${official} is already running.` };
    const progress: BuildProgress = { steps: [{ key: "plan", label: input.kind === "destination" ? `Find ${target}` : `Choose destinations in ${official}`, status: "pending" }], log: [] };
    const [row] = await tx
      .insert(buildJobs)
      .values({ kind: input.kind, stateName: official, stateSlug, target: input.kind === "destination" ? target : null, progress, capMicroUsd: capMicroUsd(), requestedBy: input.userId })
      .returning({ id: buildJobs.id });
    return { ok: true as const, id: row.id };
  });
}

/** Read-modify-write of the progress JSON under a row lock (steps run one at a time, but the page polls). */
export async function updateProgress(id: string, fn: (p: BuildProgress) => void, extra: Partial<typeof buildJobs.$inferInsert> = {}) {
  await getDb().transaction(async (tx) => {
    const [j] = await tx.select({ progress: buildJobs.progress }).from(buildJobs).where(eq(buildJobs.id, id)).for("update").limit(1);
    if (!j) throw new Error("Build not found.");
    const p = structuredClone(j.progress);
    fn(p);
    p.log = p.log.slice(-80);
    await tx.update(buildJobs).set({ progress: p, heartbeatAt: new Date(), ...extra }).where(eq(buildJobs.id, id));
  });
}

export const markStep = (id: string, key: string, status: GenerationStepStatus, detail?: string) =>
  updateProgress(id, (p) => {
    const s = p.steps.find((x) => x.key === key);
    if (s) {
      s.status = status;
      if (detail !== undefined) s.detail = detail.slice(0, 300);
    }
  });

export const addSteps = (id: string, steps: BuildStep[]) =>
  updateProgress(id, (p) => {
    for (const s of steps) if (!p.steps.some((x) => x.key === s.key)) p.steps.push(s);
  });

export const log = (id: string, lines: string[]) => (lines.length ? updateProgress(id, (p) => p.log.push(...lines.map((l) => l.slice(0, 300)))) : Promise.resolve());

/** Stores one step's content part and adds what the step spent. */
export async function savePart(id: string, key: string, part: unknown, spentMicroUsd: number) {
  await getDb()
    .update(buildJobs)
    .set({ parts: sql`${buildJobs.parts} || ${JSON.stringify({ [key]: part })}::jsonb`, costMicroUsd: sql`${buildJobs.costMicroUsd} + ${Math.max(0, Math.round(spentMicroUsd))}`, heartbeatAt: new Date() })
    .where(eq(buildJobs.id, id));
}

export async function addCost(id: string, spentMicroUsd: number) {
  await getDb()
    .update(buildJobs)
    .set({ costMicroUsd: sql`${buildJobs.costMicroUsd} + ${Math.max(0, Math.round(spentMicroUsd))}` })
    .where(eq(buildJobs.id, id));
}

/** Whether another model call fits under this build's cap. */
export async function canSpend(id: string) {
  const j = await getBuild(id);
  return Boolean(j && j.costMicroUsd + CALL_RESERVE_MICRO_USD <= j.capMicroUsd);
}

export async function finishBuild(id: string, status: "done" | "failed", extra: Partial<typeof buildJobs.$inferInsert> = {}) {
  await getDb().update(buildJobs).set({ status, finishedAt: new Date(), heartbeatAt: new Date(), ...extra }).where(eq(buildJobs.id, id));
}
