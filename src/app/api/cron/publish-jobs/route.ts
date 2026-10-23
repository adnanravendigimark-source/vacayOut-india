import { timingSafeEqual } from "node:crypto";
import { logError } from "@/lib/ops/log";
import { cleanup, sendDigestIfNeeded } from "@/lib/ops/status";
import { runPendingJobs } from "@/lib/publish/service";
import { resumeStalledJobs } from "@/lib/generate/start";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Daily job (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`):
 * retries failed page refreshes, restarts stalled destination generations,
 * clears expired data, and emails admins
 * if something needs attention.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const ok = !!secret && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return new Response("Unauthorized", { status: 401 });
  const processed = await runPendingJobs({ limit: 100 });
  let resumed = 0;
  try {
    resumed = await resumeStalledJobs();
  } catch (err) {
    await logError("cron:resume", err);
  }
  let cleaned = true;
  let digest: unknown = null;
  try {
    await cleanup();
  } catch (err) {
    cleaned = false;
    await logError("cron:cleanup", err);
  }
  try {
    digest = await sendDigestIfNeeded();
  } catch (err) {
    await logError("cron:digest", err);
  }
  return Response.json({ processed, resumed, cleaned, digest });
}
