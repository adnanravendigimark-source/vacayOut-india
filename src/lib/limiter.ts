import "server-only";
import { createHmac } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { usageCounters } from "@/lib/db/schema";

/**
 * Fixed-window counters shared by every server instance. Uses Upstash Redis
 * (REST) when UPSTASH_REDIS_REST_URL/TOKEN are set, otherwise Postgres. If
 * Upstash is unreachable we fall back to Postgres rather than letting traffic
 * through unchecked.
 */

export type HitResult = { ok: boolean; count: number; limit: number; retryAfterSeconds: number };

/** Keys never contain raw IPs, emails or cookie values. */
export function hashKey(value: string): string {
  const salt = process.env.AUTH_SECRET || "vacayout-dev-salt";
  return createHmac("sha256", salt).update(value).digest("base64url").slice(0, 32);
}

function windowStart(windowSeconds: number, now: number) {
  return Math.floor(now / 1000 / windowSeconds) * windowSeconds;
}

async function upstash(commands: (string | number)[][]): Promise<unknown[] | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}`);
    const out = (await res.json()) as { result?: unknown; error?: string }[];
    if (out.some((r) => r.error)) throw new Error("Upstash command failed");
    return out.map((r) => r.result);
  } catch (err) {
    console.error("[limiter] Upstash unavailable, using Postgres", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Counts one event against `limit` per `windowSeconds`. With `consume: false`
 * it only reports the current count (used to check before spending money).
 */
export async function hit(key: string, limit: number, windowSeconds: number, opts: { consume?: boolean; now?: number } = {}): Promise<HitResult> {
  const consume = opts.consume ?? true;
  const now = opts.now ?? Date.now();
  const ws = windowStart(windowSeconds, now);
  const retryAfterSeconds = Math.max(1, ws + windowSeconds - Math.floor(now / 1000));
  const redisKey = `vo:${key}:${ws}`;

  const r = await upstash(consume ? [["INCR", redisKey], ["EXPIRE", redisKey, windowSeconds + 60]] : [["GET", redisKey]]);
  let count: number;
  if (r) {
    count = Number(r[0] ?? 0);
  } else {
    const db = getDb();
    const start = new Date(ws * 1000);
    if (consume) {
      const [row] = await db
        .insert(usageCounters)
        .values({ key, windowStart: start, count: 1, expiresAt: new Date((ws + windowSeconds) * 1000) })
        .onConflictDoUpdate({ target: [usageCounters.key, usageCounters.windowStart], set: { count: sql`${usageCounters.count} + 1` } })
        .returning({ count: usageCounters.count });
      count = row.count;
      if (Math.random() < 0.01) await db.delete(usageCounters).where(lt(usageCounters.expiresAt, new Date(now)));
    } else {
      const rows = await db.execute(sql`select count from usage_counters where key = ${key} and window_start = ${start}`);
      count = Number((rows.rows[0] as { count?: number } | undefined)?.count ?? 0);
    }
  }
  // When consuming, `count` includes this event.
  const ok = consume ? count <= limit : count < limit;
  return { ok, count, limit, retryAfterSeconds };
}
