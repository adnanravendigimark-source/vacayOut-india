import "server-only";
import { eq } from "drizzle-orm";
import { start } from "workflow/api";
import { getDb } from "@/lib/db";
import { buildJobs } from "@/lib/db/schema";
import { openaiConfigured } from "@/lib/research/openai";
import { buildContent } from "@/workflows/build-content";
import { createBuild, getBuild, isActive, type BuildKind } from "./jobs";

/** Creates a build and starts its workflow. Returns immediately; progress is on the job row. */
export async function startBuild(input: { kind: BuildKind; stateName: string; target?: string; userId: string }) {
  if (!openaiConfigured()) return { ok: false as const, message: "Add OPENAI_API_KEY to enable the builder." };
  const created = await createBuild(input);
  if (!created.ok) return created;
  const run = await start(buildContent, [created.id]);
  await getDb().update(buildJobs).set({ workflowRunId: run.runId }).where(eq(buildJobs.id, created.id));
  return { ok: true as const, id: created.id };
}

/** Restarts a failed or stalled build: finished steps are skipped and not paid for again. */
export async function resumeBuild(id: string) {
  const j = await getBuild(id);
  if (!j) return { ok: false as const, message: "Unknown build." };
  if (j.status === "done") return { ok: false as const, message: "This build already finished." };
  if (isActive(j)) return { ok: false as const, message: "This build is still running." };
  await getDb().update(buildJobs).set({ status: "running", error: null, finishedAt: null, heartbeatAt: new Date() }).where(eq(buildJobs.id, id));
  const run = await start(buildContent, [id]);
  await getDb().update(buildJobs).set({ workflowRunId: run.runId }).where(eq(buildJobs.id, id));
  return { ok: true as const };
}
