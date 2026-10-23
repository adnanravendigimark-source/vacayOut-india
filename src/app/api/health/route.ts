import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** For uptime monitors: 200 when the app can reach its database, 503 otherwise. Reveals nothing else. */
export async function GET() {
  const started = Date.now();
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ ok: true, db: "ok", ms: Date.now() - started }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false, db: "unreachable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
