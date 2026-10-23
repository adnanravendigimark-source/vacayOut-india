import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { researchRuns, type GenerationProgress, type GenerationStepStatus } from "@/lib/db/schema";
import { SECTION_DEFS } from "@/lib/places/sections";
import { costMicroUsd } from "@/lib/research/cost";
import { createResponse, durableCall, OpenAIError, type CallModel } from "@/lib/research/openai";
import { budgetStatus, draftModel, researchModel } from "@/lib/research/service";

/**
 * Generation jobs and their paid steps.
 *
 * A job is a `research_runs` row of kind "generate" holding progress. Each paid
 * step (research, discovery, each draft) is a CHILD row (unique per job+step)
 * that reserves budget atomically before running, records actual cost after
 * every model call, and is skipped on retry once done. The workflow engine
 * executes the steps; the database is the source of truth for progress.
 */

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export const LEASE_MINUTES = 6;
/** A running job with no heartbeat for this long is shown as stalled and can be resumed. */
export const STALL_MINUTES = Number(process.env.GENERATION_STALL_MINUTES) || 20;
const MAX_GENERATIONS = 2;

export const RESERVE = {
  research: () => Math.round(Number(process.env.RESEARCH_RUN_RESERVE_USD ?? "1.5") * 1e6) || 1_500_000,
  discover: () => 600_000,
  draft: () => 250_000,
};

const STEP_LABEL: Record<string, string> = {
  coordinates: "Find the location on the map",
  research: "Research the destination",
  discover: "Find places to visit nearby",
  details: "Write summary and SEO",
  image: "Find a photo",
  finish: "Prepare for review",
};

export function planSteps(input: { sections: string[]; include: GenerationProgress["include"] }): GenerationProgress["steps"] {
  const steps: GenerationProgress["steps"] = [];
  if (input.include.coordinates) steps.push({ key: "coordinates", label: STEP_LABEL.coordinates, status: "pending" });
  if (input.include.research) steps.push({ key: "research", label: STEP_LABEL.research, status: "pending" });
  if (input.include.discover) steps.push({ key: "discover", label: STEP_LABEL.discover, status: "pending" });
  for (const k of input.sections) steps.push({ key: `draft:${k}`, label: `Write “${SECTION_DEFS.find((d) => d.key === k)?.label ?? k}”`, status: "pending" });
  if (input.include.details) steps.push({ key: "details", label: STEP_LABEL.details, status: "pending" });
  if (input.include.image) steps.push({ key: "image", label: STEP_LABEL.image, status: "pending" });
  steps.push({ key: "finish", label: STEP_LABEL.finish, status: "pending" });
  return steps;
}

export async function getJob(jobId: string) {
  const [j] = await getDb().select().from(researchRuns).where(and(eq(researchRuns.id, jobId), eq(researchRuns.kind, "generate"))).limit(1);
  return j ?? null;
}

export async function latestJobForPlace(placeId: string) {
  const [j] = await getDb()
    .select()
    .from(researchRuns)
    .where(and(eq(researchRuns.placeId, placeId), eq(researchRuns.kind, "generate")))
    .orderBy(desc(researchRuns.createdAt))
    .limit(1);
  return j ?? null;
}

export function isStalled(job: { status: string; heartbeatAt: Date | null; createdAt: Date }, now = Date.now()) {
  if (job.status !== "running" && job.status !== "queued") return false;
  const last = (job.heartbeatAt ?? job.createdAt).getTime();
  return now - last > STALL_MINUTES * 60_000;
}

/** Creates a job row (no money held: each paid step reserves its own). Refuses a second active job for the place. */
export async function createJob(input: { placeId: string; userId: string; sections: string[]; include: GenerationProgress["include"] }) {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('vacayout.generate.start'))`);
    const active = await tx
      .select({ id: researchRuns.id, placeId: researchRuns.placeId, heartbeatAt: researchRuns.heartbeatAt, createdAt: researchRuns.createdAt, status: researchRuns.status })
      .from(researchRuns)
      .where(and(eq(researchRuns.kind, "generate"), inArray(researchRuns.status, ["queued", "running"])));
    const live = active.filter((a) => !isStalled(a));
    const same = active.find((a) => a.placeId === input.placeId);
    if (same) return { ok: false as const, message: isStalled(same) ? "A previous generation for this place stalled — resume it instead." : "This destination is already being generated.", jobId: same.id };
    if (live.length >= MAX_GENERATIONS) return { ok: false as const, message: `${MAX_GENERATIONS} destinations are being generated already. Try again when one finishes.` };
    const b = await budgetStatus(tx);
    if (input.include.research && b.remaining < RESERVE.research()) return { ok: false as const, message: "This month’s AI budget is too low to research a destination. An admin can raise it in Settings." };
    if (b.remaining < RESERVE.draft()) return { ok: false as const, message: "This month’s AI budget is used up. An admin can raise it in Settings." };
    const progress: GenerationProgress = { steps: planSteps(input), sections: input.sections, include: input.include };
    const [job] = await tx
      .insert(researchRuns)
      .values({ kind: "generate", placeId: input.placeId, model: draftModel(), requestedBy: input.userId, status: "queued", progress, heartbeatAt: new Date() })
      .returning({ id: researchRuns.id });
    return { ok: true as const, jobId: job.id };
  });
}

export async function setWorkflowRun(jobId: string, workflowRunId: string) {
  await getDb().update(researchRuns).set({ workflowRunId, heartbeatAt: new Date() }).where(eq(researchRuns.id, jobId));
}

/** Updates one step's status (and the heartbeat). Safe to repeat. */
export async function markStep(jobId: string, key: string, status: GenerationStepStatus, detail?: string, extra?: Partial<GenerationProgress>) {
  const db = getDb();
  await db.transaction(async (tx) => {
    const [job] = await tx.select({ progress: researchRuns.progress }).from(researchRuns).where(eq(researchRuns.id, jobId)).for("update").limit(1);
    if (!job?.progress) return;
    const progress: GenerationProgress = {
      ...job.progress,
      ...extra,
      steps: job.progress.steps.map((s) => (s.key === key ? { ...s, status, ...(detail !== undefined ? { detail: detail.slice(0, 200) } : {}) } : s)),
    };
    await tx
      .update(researchRuns)
      .set({ progress, heartbeatAt: new Date(), ...(status === "running" ? { status: "running" as const, startedAt: sql`coalesce(${researchRuns.startedAt}, now())` } : {}) })
      .where(eq(researchRuns.id, jobId));
  });
}

export async function stepStatus(jobId: string, key: string): Promise<GenerationStepStatus | null> {
  const job = await getJob(jobId);
  return job?.progress?.steps.find((s) => s.key === key)?.status ?? null;
}

export async function finishJob(jobId: string, status: "done" | "failed", note?: string) {
  const db = getDb();
  await db
    .update(researchRuns)
    .set({ status, finishedAt: new Date(), heartbeatAt: new Date(), ...(status === "failed" ? { error: (note ?? "Generation failed.").slice(0, 500) } : { notes: note ?? null }) })
    .where(and(eq(researchRuns.id, jobId), inArray(researchRuns.status, ["queued", "running"])));
  // Children that never finished give their reservations back.
  await db
    .update(researchRuns)
    .set({ status: "failed", reservedMicroUsd: 0, leaseUntil: null, error: "Stopped with its generation job.", finishedAt: new Date() })
    .where(and(eq(researchRuns.parentRunId, jobId), inArray(researchRuns.status, ["queued", "running"])));
}

// ---------------- paid steps ----------------

export type Claim =
  | { state: "done" }
  | { state: "busy" }
  | { state: "waiting_budget" }
  | { state: "claimed"; runId: string; openaiResponseId: string | null };

/**
 * Atomically claims a paid step. Under the same lock as every other research
 * start, it checks the monthly budget and reserves `reserve` before any call.
 * Re-claiming a step that already holds a reservation (a retry after a crash)
 * keeps that reservation instead of adding another.
 */
export async function claimStep(
  jobId: string,
  stepKey: string,
  kind: "place_facts" | "discover_places" | "draft",
  reserve: number,
  focus: string[] = [],
): Promise<Claim> {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('vacayout.research.start'))`);
    const [job] = await tx.select().from(researchRuns).where(eq(researchRuns.id, jobId)).limit(1);
    if (!job) throw new Error("Generation job not found.");
    const [child] = await tx
      .select()
      .from(researchRuns)
      .where(and(eq(researchRuns.parentRunId, jobId), eq(researchRuns.stepKey, stepKey)))
      .for("update")
      .limit(1);
    if (child?.status === "done") return { state: "done" as const };
    if (child?.status === "running" && child.leaseUntil && child.leaseUntil > new Date()) return { state: "busy" as const };

    const holds = child && (child.status === "running" || child.status === "queued") && child.reservedMicroUsd > 0;
    if (!holds) {
      const b = await budgetStatus(tx);
      if (b.spent + b.reserved + reserve > b.budgetMicro) return { state: "waiting_budget" as const };
    }
    const lease = sql`now() + make_interval(mins => ${LEASE_MINUTES})`;
    if (child) {
      const [row] = await tx
        .update(researchRuns)
        .set({ status: "running", leaseUntil: lease, error: null, startedAt: sql`coalesce(${researchRuns.startedAt}, now())`, ...(holds ? {} : { reservedMicroUsd: reserve }) })
        .where(eq(researchRuns.id, child.id))
        .returning();
      return { state: "claimed" as const, runId: row.id, openaiResponseId: row.openaiResponseId };
    }
    const [row] = await tx
      .insert(researchRuns)
      .values({
        kind,
        placeId: job.placeId,
        focus,
        model: kind === "draft" ? draftModel() : researchModel(),
        requestedBy: job.requestedBy,
        reservedMicroUsd: reserve,
        status: "running",
        parentRunId: jobId,
        stepKey,
        leaseUntil: lease,
        startedAt: new Date(),
      })
      .returning();
    return { state: "claimed" as const, runId: row.id, openaiResponseId: null };
  });
}

/** Adds the actual cost of one model call to a step, consuming its reservation. Each background response is counted once. */
export async function recordCost(runId: string, micro: number, usage: { input: number; output: number; search: number }, responseId?: string) {
  const db = getDb();
  const notBilled = responseId ? sql` and not (${researchRuns.billedResponses} ? ${responseId})` : sql``;
  await db.execute(sql`
    update research_runs set
      cost_micro_usd = cost_micro_usd + ${micro},
      reserved_micro_usd = greatest(reserved_micro_usd - ${micro}, 0),
      input_tokens = input_tokens + ${usage.input},
      output_tokens = output_tokens + ${usage.output},
      search_calls = search_calls + ${usage.search},
      billed_responses = ${responseId ? sql`billed_responses || ${JSON.stringify([responseId])}::jsonb` : sql`billed_responses`}
    where id = ${runId}${notBilled}`);
}

/**
 * A model client for one claimed step: web-search calls go through background
 * mode (resumable by saved id), every call's cost is recorded immediately.
 */
export function stepClient(runId: string, savedResponseId: string | null): CallModel {
  let saved = savedResponseId;
  return async (body) => {
    const model = String(body.model);
    let r;
    if (body.tools) {
      try {
        r = await durableCall(body, {
          waitMs: Number(process.env.OPENAI_BACKGROUND_WAIT_MS) || 150_000,
          pollMs: Number(process.env.OPENAI_BACKGROUND_POLL_MS) || undefined,
          savedId: saved,
          saveId: async (id) => {
            saved = id;
            await getDb().update(researchRuns).set({ openaiResponseId: id }).where(eq(researchRuns.id, runId));
          },
        });
      } catch (err) {
        // A failed background response can't be resumed: forget it so the retry starts a new one.
        if (err instanceof OpenAIError && saved) {
          saved = null;
          await getDb().update(researchRuns).set({ openaiResponseId: null }).where(eq(researchRuns.id, runId));
        }
        throw err;
      }
      const calls = r.output.filter((i) => i.type === "web_search_call").length;
      await recordCost(runId, costMicroUsd(model, r.usage, calls), { input: r.usage?.input_tokens ?? 0, output: r.usage?.output_tokens ?? 0, search: calls }, r.id);
      return r;
    }
    r = await createResponse(body);
    await recordCost(runId, costMicroUsd(model, r.usage, 0), { input: r.usage?.input_tokens ?? 0, output: r.usage?.output_tokens ?? 0, search: 0 });
    return r;
  };
}

/** Lets a crashed attempt's lease go so the retry can claim the step straight away (reservation kept). */
export async function releaseLease(runId: string) {
  await getDb().update(researchRuns).set({ leaseUntil: null }).where(eq(researchRuns.id, runId));
}

export async function finishStep(tx: Tx | Db, runId: string, notes: string) {
  await tx
    .update(researchRuns)
    .set({ status: "done", reservedMicroUsd: 0, leaseUntil: null, finishedAt: new Date(), notes: notes.slice(0, 2000) })
    .where(eq(researchRuns.id, runId));
}
