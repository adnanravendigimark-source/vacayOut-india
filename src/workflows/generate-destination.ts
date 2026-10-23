import { getStepMetadata, RetryableError, sleep } from "workflow";
import * as steps from "@/lib/generate/steps";

/**
 * Durable destination generation (Vercel Workflows). The workflow only
 * orders the steps; each step is retried on failure and its result is
 * recorded, and every step re-checks the database before doing (or paying
 * for) anything — so a retry or a resumed run never repeats finished work,
 * never overwrites a person's edits, and never publishes.
 */

const BUDGET_WAIT_HOURS = 48;

async function wrap<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof steps.RetryLater) throw new RetryableError(err.message, { retryAfter: err.afterSeconds * 1000 });
    throw err;
  }
}

async function begin(jobId: string) {
  "use step";
  return wrap(() => steps.startJobStep(jobId));
}

async function coordinates(jobId: string) {
  "use step";
  return wrap(() => steps.coordinatesStep(jobId, getStepMetadata().attempt));
}
coordinates.maxRetries = 5;

async function research(jobId: string) {
  "use step";
  return wrap(() => steps.researchStep(jobId));
}
// Background research can take a few minutes: each retry resumes the same OpenAI request.
research.maxRetries = 30;

async function discover(jobId: string) {
  "use step";
  return wrap(() => steps.discoverStep(jobId));
}
discover.maxRetries = 20;

async function draft(jobId: string, key: string) {
  "use step";
  return wrap(() => steps.draftStep(jobId, key));
}

async function details(jobId: string) {
  "use step";
  return wrap(() => steps.detailsStep(jobId));
}

async function image(jobId: string) {
  "use step";
  return wrap(() => steps.imageStep(jobId, getStepMetadata().attempt));
}
image.maxRetries = 5;

async function complete(jobId: string) {
  "use step";
  await steps.finishJobStep(jobId);
}

async function fail(jobId: string, message: string) {
  "use step";
  await steps.failJobStep(jobId, message);
}

/** Runs a paid step, sleeping (without using compute) while the AI budget is exhausted or another attempt holds the step. */
async function withWaits(run: () => Promise<"done" | "waiting_budget" | "busy">) {
  for (let i = 0; i < BUDGET_WAIT_HOURS * 2; i++) {
    const r = await run();
    if (r === "done") return true;
    await sleep(r === "busy" ? "2m" : "30m");
  }
  return false;
}

export async function generateDestination(jobId: string) {
  "use workflow";
  try {
    const plan = await begin(jobId);
    const has = (key: string) => plan.steps.some((s) => s.key === key);
    const done = (key: string) => plan.steps.some((s) => s.key === key && (s.status === "done" || s.status === "skipped"));

    if (has("coordinates") && !done("coordinates")) await coordinates(jobId);
    if (has("research") && !done("research") && !(await withWaits(() => research(jobId)))) throw new Error("Stopped: the AI budget stayed exhausted.");
    if (has("discover") && !done("discover") && !(await withWaits(() => discover(jobId)))) throw new Error("Stopped: the AI budget stayed exhausted.");
    for (const key of plan.sections) {
      if (done(`draft:${key}`)) continue;
      if (!(await withWaits(() => draft(jobId, key)))) throw new Error("Stopped: the AI budget stayed exhausted.");
    }
    if (has("details") && !done("details") && !(await withWaits(() => details(jobId)))) throw new Error("Stopped: the AI budget stayed exhausted.");
    if (has("image") && !done("image")) await image(jobId);
    await complete(jobId);
    return { ok: true };
  } catch (err) {
    await fail(jobId, err instanceof Error ? err.message : "Generation failed.");
    return { ok: false };
  }
}
