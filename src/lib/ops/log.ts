import "server-only";
import { getDb } from "@/lib/db";
import { appErrors } from "@/lib/db/schema";
import { hit } from "@/lib/limiter";

/**
 * Error logging: one JSON line to stdout (searchable in Vercel logs) and a
 * row in `app_errors` for the admin System page. Storage is capped at 300
 * rows/hour so an error storm can't flood the database. Never throws.
 */
export async function logError(source: string, err: unknown, extra: { path?: string; digest?: string } = {}) {
  const message = (err instanceof Error ? err.message : String(err)).replace(/\s+/g, " ").slice(0, 500);
  console.error(JSON.stringify({ level: "error", source, message, path: extra.path, digest: extra.digest, at: new Date().toISOString() }));
  try {
    if (!(await hit("ops:errors", 300, 3600)).ok) return;
    await getDb().insert(appErrors).values({ source: source.slice(0, 60), message, digest: extra.digest?.slice(0, 80) ?? null, path: extra.path?.split("?")[0].slice(0, 200) ?? null });
  } catch {
    // Logging must never break the request.
  }
}
