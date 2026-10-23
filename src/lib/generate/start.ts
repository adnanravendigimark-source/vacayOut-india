import "server-only";
import { start } from "workflow/api";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { researchRuns, type GenerationProgress } from "@/lib/db/schema";
import { SECTION_KEYS } from "@/lib/places/sections";
import { openaiConfigured } from "@/lib/research/openai";
import { generateDestination } from "@/workflows/generate-destination";
import { createJob, getJob, isStalled, setWorkflowRun } from "./jobs";

const CONTAINER = ["state", "region", "city", "town"];

/** Starts generation for a place on the server. Returns immediately; progress is in the database. */
export async function startGeneration(input: { placeId: string; placeKind: string; userId: string; sections?: string[]; full?: boolean }) {
  if (!openaiConfigured()) return { ok: false as const, message: "Add OPENAI_API_KEY to enable generation." };
  const full = input.full ?? true;
  const sections = (input.sections?.length ? input.sections : SECTION_KEYS).filter((k) => (SECTION_KEYS as string[]).includes(k));
  const include: GenerationProgress["include"] = full
    ? { coordinates: true, research: true, discover: CONTAINER.includes(input.placeKind), details: true, image: true }
    : { coordinates: false, research: false, discover: false, details: false, image: false };
  const job = await createJob({ placeId: input.placeId, userId: input.userId, sections, include });
  if (!job.ok) return job;
  const run = await start(generateDestination, [job.jobId]);
  await setWorkflowRun(job.jobId, run.runId);
  return { ok: true as const, jobId: job.jobId };
}

/** Restarts a stalled job. Finished steps are skipped; paid steps that already ran are not paid for again. */
export async function resumeGeneration(jobId: string) {
  const job = await getJob(jobId);
  if (!job) return { ok: false as const, message: "Unknown job." };
  if (!isStalled(job) && job.status !== "failed") return { ok: false as const, message: "This job is still running." };
  await getDb()
    .update(researchRuns)
    .set({ status: "running", error: null, finishedAt: null, heartbeatAt: new Date() })
    .where(eq(researchRuns.id, jobId));
  const run = await start(generateDestination, [jobId]);
  await setWorkflowRun(jobId, run.runId);
  return { ok: true as const };
}

/** Daily safety net: restart jobs whose heartbeat stopped (e.g. a lost local run). */
export async function resumeStalledJobs() {
  const rows = await getDb().select().from(researchRuns).where(sql`${researchRuns.kind} = 'generate' and ${researchRuns.status} in ('queued','running')`);
  let resumed = 0;
  for (const j of rows) if (isStalled(j) && (await resumeGeneration(j.id)).ok) resumed++;
  return resumed;
}
