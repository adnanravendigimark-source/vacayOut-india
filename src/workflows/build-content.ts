import { FatalError } from "workflow";
import * as steps from "@/lib/builder/steps";

/**
 * Durable one-click build (Vercel Workflows). The workflow only orders the
 * steps; each step is retried on failure and re-checks the job row before
 * doing (or paying for) anything, so retries never repeat finished work.
 * A BuildStop ends the build with a message for the admin.
 */

async function wrap<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof steps.BuildStop) throw new FatalError(err.message);
    throw err;
  }
}

async function plan(id: string) {
  "use step";
  return wrap(() => steps.planStep(id));
}

async function destination(id: string, key: string) {
  "use step";
  return wrap(() => steps.destStep(id, key));
}
destination.maxRetries = 2;

async function statePage(id: string) {
  "use step";
  return wrap(() => steps.stateStep(id));
}
statePage.maxRetries = 2;

async function trips(id: string) {
  "use step";
  return wrap(() => steps.tripsStep(id));
}
trips.maxRetries = 2;

async function apply(id: string) {
  "use step";
  return wrap(() => steps.applyStep(id));
}

async function images(id: string) {
  "use step";
  return wrap(() => steps.imagesStep(id));
}

async function publish(id: string) {
  "use step";
  return wrap(() => steps.publishStep(id));
}

async function fail(id: string, message: string) {
  "use step";
  await steps.failBuild(id, message);
}

export async function buildContent(id: string) {
  "use workflow";
  try {
    const p = await plan(id);
    for (const key of p.dests) await destination(id, key);
    if (p.state) await statePage(id);
    await trips(id);
    await apply(id);
    for (let i = 0; i < 20 && !(await images(id)); i++);
    await publish(id);
    return { ok: true };
  } catch (err) {
    await fail(id, err instanceof Error ? err.message : "The build failed.");
    return { ok: false };
  }
}
