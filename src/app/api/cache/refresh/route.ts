import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { hasBearer } from "@/lib/ops/bearer";
import { logError } from "@/lib/ops/log";
import { isSafePath } from "@/lib/cache/paths";
import { warmOrigin } from "@/lib/cache/targets";
import { warmPaths } from "@/lib/cache/warm";
import { HUB_PATHS, refreshHubs } from "@/lib/publish/hubs";
import { runPendingJobs } from "@/lib/publish/service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const Body = z.object({
  /** Extra pages to refresh (site-relative). Pending publish jobs are always processed. */
  paths: z.array(z.string()).max(200).default([]),
  /** Request the refreshed pages afterwards so they are rebuilt before a visitor arrives. */
  warm: z.boolean().default(true),
});

/**
 * Refreshes cached pages right away instead of waiting for their timer — for publishing done
 * outside the app (seed and maintenance scripts), where Next can't revalidate in-process.
 * Auth: `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(req: Request) {
  if (!hasBearer(req, process.env.CRON_SECRET)) return new Response("Unauthorized", { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid body" }, { status: 400 });
  const paths = parsed.data.paths.filter(isSafePath);
  if (paths.length !== parsed.data.paths.length) return Response.json({ error: "Paths must be site-relative slugs like /india/kerala" }, { status: 400 });

  for (const p of paths) revalidatePath(p);
  refreshHubs();
  const jobs = await runPendingJobs({ limit: 100 });

  const targets = [...new Set([...HUB_PATHS, ...paths])];
  if (parsed.data.warm) {
    // After the response: route-handler revalidation happens on the next visit, so make that visit ours.
    after(async () => {
      try {
        await warmPaths(warmOrigin(), targets, { concurrency: 4, deadline: Date.now() + 90_000 });
      } catch (err) {
        await logError("cache:refresh-warm", err);
      }
    });
  }
  return Response.json({ refreshed: targets.length, jobs });
}
