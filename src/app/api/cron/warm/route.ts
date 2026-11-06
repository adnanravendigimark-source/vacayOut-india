import { logError } from "@/lib/ops/log";
import { hasBearer } from "@/lib/ops/bearer";
import { listPublicPaths, warmOrigin } from "@/lib/cache/targets";
import { summarise, warmPaths } from "@/lib/cache/warm";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily (Vercel Cron, `Authorization: Bearer $CRON_SECRET`) and on demand after a deploy:
 * requests every published page so visitors get CDN hits, not first renders.
 * Stops starting new requests 60 s before the function limit.
 */
export async function GET(req: Request) {
  if (!hasBearer(req, process.env.CRON_SECRET)) return new Response("Unauthorized", { status: 401 });
  try {
    const paths = await listPublicPaths();
    const results = await warmPaths(warmOrigin(), paths, { concurrency: 4, deadline: Date.now() + (maxDuration - 60) * 1000 });
    return Response.json({ total: paths.length, ...summarise(results) });
  } catch (err) {
    await logError("cron:warm", err);
    return Response.json({ error: "Warm failed" }, { status: 500 });
  }
}
