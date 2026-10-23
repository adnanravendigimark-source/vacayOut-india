/** Monitoring, cleanup and coordinate lookup against a real Postgres (local/*_test only). */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const url = process.env.TEST_DATABASE_URL;
const safe = !!url && (/@(localhost|127\.0\.0\.1)[:/]/.test(url) || /\/[a-z0-9_]*_test(\?|$)/.test(url));

if (!safe) {
  test("ops integration (skipped)", { skip: true }, () => {});
} else {
  process.env.DATABASE_URL = url;
  delete process.env.RESEND_API_KEY;
  const { sql } = await import("drizzle-orm");
  const { getDb } = await import("@/lib/db");
  const s = await import("@/lib/db/schema");
  const { logError } = await import("./log");
  const status = await import("./status");
  const { geocode } = await import("@/lib/geocode");
  const { GET: health } = await import("@/app/api/health/route");
  const db = getDb();

  before(async () => {
    await db.execute(sql`truncate app_errors, usage_counters, email_tokens, travellers, auth_failures, chat_requests cascade`);
  });
  after(async () => {
    await (getDb() as unknown as { $client: { end: () => Promise<void> } }).$client.end();
  });

  test("errors are stored (trimmed, no query string) and shown in the summary", async () => {
    await logError("test", new Error("boom ".repeat(200)), { path: "/chat?q=secret", digest: "d1" });
    const [row] = await db.select().from(s.appErrors);
    assert.equal(row.path, "/chat");
    assert.ok(row.message.length <= 500);
    const sum = await status.systemSummary();
    assert.equal(sum.errors24h, 1);
    assert.equal(sum.recentErrors[0].digest, "d1");
  });

  test("cleanup removes expired counters, old tokens, old failures and old errors only", async () => {
    const old = new Date(Date.now() - 40 * 86_400_000);
    await db.insert(s.usageCounters).values([
      { key: "old", windowStart: old, count: 1, expiresAt: old },
      { key: "live", windowStart: new Date(), count: 1, expiresAt: new Date(Date.now() + 3600_000) },
    ]);
    const [t] = await db.insert(s.travellers).values({ email: "o@b.in", name: "O" }).returning();
    await db.insert(s.emailTokens).values({ travellerId: t.id, tokenHash: "h1", purpose: "verify", expiresAt: old });
    await db.insert(s.authFailures).values({ email: "x", ip: "y", at: old });
    await db.insert(s.appErrors).values({ source: "t", message: "old", at: old });
    await status.cleanup();
    const left = await db.execute(sql`select (select count(*) from usage_counters where key = 'old')::int u_old, (select count(*) from usage_counters where key = 'live')::int u_live, (select count(*) from email_tokens)::int e, (select count(*) from auth_failures)::int f, (select count(*) from app_errors)::int a`);
    assert.deepEqual(left.rows[0], { u_old: 0, u_live: 1, e: 0, f: 0, a: 1 });
  });

  test("digest isn't sent without email configured", async () => {
    assert.deepEqual(await status.sendDigestIfNeeded(), { sent: false, reason: "email not configured" });
  });

  test("health check reports the database", async () => {
    const res = await health();
    assert.equal(res.status, 200);
    assert.equal(((await res.json()) as { ok: boolean }).ok, true);
  });

  test("migrations: all applied", async () => {
    const m = await status.migrationStatus();
    assert.ok(m && m.applied === m.expected, JSON.stringify(m));
  });

  test("geocode keeps India results, rounds, and enforces 1 request/second", async () => {
    const fake = (async () =>
      Response.json([
        { name: "Hadimba Devi Temple", display_name: "Hadimba Devi Temple, Manali, Himachal Pradesh, India", lat: "32.2484443", lon: "77.1808391" },
        { name: "Elsewhere", display_name: "x", lat: "51.5", lon: "-0.1" },
      ])) as unknown as typeof fetch;
    const r = await geocode("Hadimba Temple, Manali", fake);
    assert.deepEqual(r.map(({ name, lat, lng }) => ({ name, lat, lng })), [{ name: "Hadimba Devi Temple", lat: 32.248444, lng: 77.180839 }]);
    await assert.rejects(geocode("Manali", fake), /wait a second/);
  });
}
