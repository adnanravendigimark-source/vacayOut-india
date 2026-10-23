/**
 * Chat integration: quotas, traveller accounts, retrieval of PUBLISHED content
 * only, and the answer pipeline with stubbed model calls. Local/*_test DB only.
 */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

const url = process.env.TEST_DATABASE_URL;
const safe = !!url && (/@(localhost|127\.0\.0\.1)[:/]/.test(url) || /\/[a-z0-9_]*_test(\?|$)/.test(url));

if (!safe) {
  test("chat integration (skipped: set TEST_DATABASE_URL to a local or *_test database)", { skip: true }, () => {});
} else {
  process.env.DATABASE_URL = url;
  delete process.env.UPSTASH_REDIS_REST_URL;
  const { sql, eq } = await import("drizzle-orm");
  const { getDb } = await import("@/lib/db");
  const s = await import("@/lib/db/schema");
  const { hit } = await import("@/lib/limiter");
  const quota = await import("./quota");
  const trav = await import("@/lib/auth/travellers");
  const { publishPlace } = await import("@/lib/publish/service");
  const { answer } = await import("./live/agent");
  const { findGuides } = await import("./live/retrieve");

  const db = getDb();
  let staff = "";
  const ids: Record<string, string> = {};
  const words = (n: number) => Array.from({ length: n }, (_, i) => `snow${i % 9}`).join(" ");

  async function makePlace(v: Partial<typeof s.places.$inferInsert> & { kind: (typeof s.placeKind.enumValues)[number]; name: string; slug: string }, text: string) {
    const [p] = await db.insert(s.places).values({ summary: `${v.name} summary.`, seoTitle: `${v.name} guide`, seoDescription: `Plan ${v.name}.`, ...v }).returning();
    await db.insert(s.sections).values([
      { placeId: p.id, key: "overview", body: { text: `${text} ${words(130)}` }, status: "approved" },
      { placeId: p.id, key: "travel_tips", body: { items: [{ body: "Carry layers." }] }, status: "approved" },
      { placeId: p.id, key: "best_time", body: { text: "DRAFT-SECRET best time" }, status: "draft" },
    ]);
    const [m] = await db.insert(s.media).values({ placeId: p.id, url: "/uploads/x.jpg", storageKey: "local:x.jpg", contentType: "image/jpeg", bytes: 1, alt: `${v.name} view`, license: "CC BY-SA 4.0", attribution: "Ann via Wikimedia Commons" }).returning();
    await db.update(s.places).set({ heroMediaId: m.id }).where(eq(s.places.id, p.id));
    return p.id;
  }

  before(async () => {
    await db.execute(sql`truncate audit_log, app_settings, usage_counters, chat_requests, web_research, email_tokens, travellers, sources, publish_jobs, search_documents, sections, place_versions, media, places, users cascade`);
    const [u] = await db.insert(s.users).values({ email: "c@test.local", name: "C", passwordHash: "x", role: "admin" }).returning();
    staff = u.id;
    ids.hp = await makePlace({ kind: "state", name: "Himachal Pradesh", slug: "himachal-pradesh" }, "Mountain state.");
    ids.manali = await makePlace({ kind: "city", name: "Manali", slug: "manali", parentId: ids.hp, stateId: ids.hp }, "Hadimba Temple opens at 8 AM.");
    ids.kasol = await makePlace({ kind: "town", name: "Kasol", slug: "kasol", parentId: ids.hp, stateId: ids.hp }, "Riverside village.");
    assert.ok((await publishPlace(ids.hp, staff)).ok);
    assert.ok((await publishPlace(ids.manali, staff)).ok);
    // Kasol stays a draft.
  });

  after(async () => {
    await (getDb() as unknown as { $client: { end: () => Promise<void> } }).$client.end();
  });

  test("limiter counts per fixed window and can peek without counting", async () => {
    const t = Date.UTC(2026, 9, 22, 10, 0, 30);
    for (let i = 1; i <= 3; i++) assert.equal((await hit("k1", 3, 60, { now: t })).ok, true);
    assert.equal((await hit("k1", 3, 60, { now: t, consume: false })).ok, false);
    assert.equal((await hit("k1", 3, 60, { now: t })).ok, false);
    assert.equal((await hit("k1", 3, 60, { now: t + 60_000 })).ok, true, "next window");
  });

  test("anonymous visitors get 5 messages, then must sign up; travellers continue", async () => {
    const req = new Request("http://x/api/chat", { headers: { "x-forwarded-for": "203.0.113.9", cookie: "vo_anon=11111111-1111-4111-8111-111111111111" } });
    const v = await quota.resolveVisitor(req, null);
    assert.equal(v.kind, "anon");
    assert.equal(v.newCookie, null);
    const lefts: (number | null)[] = [];
    for (let i = 0; i < 5; i++) {
      const a = await quota.admitMessage(v);
      assert.ok(a.ok);
      if (a.ok) lefts.push(a.freeLeft);
    }
    assert.deepEqual(lefts, [4, 3, 2, 1, 0]);
    const sixth = await quota.admitMessage(v);
    assert.equal(sixth.ok, false);
    if (!sixth.ok) assert.equal(sixth.code, "auth_required");

    const [t] = await db.insert(s.travellers).values({ email: "a@b.in", name: "A", emailVerifiedAt: new Date() }).returning();
    const tv = await quota.resolveVisitor(req, { user: { id: t.id, kind: "traveller" } });
    assert.equal(tv.kind, "traveller");
    assert.ok((await quota.admitMessage(tv)).ok);
    // A staff session is not a traveller.
    assert.equal((await quota.resolveVisitor(req, { user: { id: staff, kind: "staff" } })).kind, "anon");
    // No cookie → a new anonymous id is issued.
    assert.ok((await quota.resolveVisitor(new Request("http://x"), null)).newCookie);
  });

  test("email verification links are single-use and stored hashed", async () => {
    const [t] = await db.insert(s.travellers).values({ email: "v@b.in", name: "V", passwordHash: "x" }).returning();
    const logs: string[] = [];
    const orig = console.info;
    console.info = (m: string) => logs.push(m);
    await trav.sendVerification(t);
    console.info = orig;
    const token = /token=([A-Za-z0-9_-]+)/.exec(logs.join("\n"))?.[1];
    assert.ok(token);
    const stored = await db.select().from(s.emailTokens).where(eq(s.emailTokens.travellerId, t.id));
    assert.notEqual(stored[0].tokenHash, token, "raw token not stored");
    assert.equal(await trav.consumeVerification(token!), t.id);
    assert.equal(await trav.consumeVerification(token!), null, "single use");
    const [after] = await db.select().from(s.travellers).where(eq(s.travellers.id, t.id));
    assert.ok(after.emailVerifiedAt);
  });

  test("Google sign-in links to an existing account by email", async () => {
    const [t] = await db.insert(s.travellers).values({ email: "g@b.in", name: "G", passwordHash: "x" }).returning();
    const linked = await trav.upsertGoogleTraveller({ sub: "google-123", email: "G@b.in", name: "G" });
    assert.equal(linked?.id, t.id);
    assert.equal(linked?.googleSub, "google-123");
    assert.ok(linked?.emailVerifiedAt);
    const fresh = await trav.upsertGoogleTraveller({ sub: "google-999", email: "new@b.in", name: "New" });
    assert.notEqual(fresh?.id, t.id);
  });

  test("retrieval returns published guides only — never drafts or draft sections", async () => {
    const m = await findGuides(["Manali"]);
    assert.equal(m.length, 1);
    assert.equal(m[0].href, "/india/himachal-pradesh/manali");
    assert.ok(!m[0].text.includes("DRAFT-SECRET"));
    assert.equal(m[0].hero?.credit, "Ann via Wikimedia Commons · CC BY-SA 4.0");
    assert.equal((await findGuides(["Kasol"])).length, 0, "draft place not retrievable");
    assert.deepEqual((await findGuides(["Manali, Himachal Pradesh"])).map((g) => g.name), ["Manali", "Himachal Pradesh"], "comma parts tried most-specific first");
    const state = await findGuides(["Himachal Pradesh"]);
    assert.deepEqual(state[0].children.map((c) => c.name), ["Manali"], "only published children listed");
  });

  const msg = (json: unknown, usage = { input_tokens: 1000, output_tokens: 100 }) => ({ id: "r", status: "completed", usage, output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(json) }] }] });
  const route = (o: Record<string, unknown>) => msg({ scope: "india_travel", destinations: [], intent: "plan_trip", days: null, travellers: null, budget: null, month: null, interests: [], needs_live_info: false, standalone: "q", ...o });

  test("off-topic questions are declined after one cheap call", async () => {
    let calls = 0;
    const events: unknown[] = [];
    const out = await answer(
      { turns: [{ role: "user", content: "Explain how Python works" }], memory: null },
      (e) => events.push(e),
      { call: (async () => (calls++, route({ scope: "off_topic" }))) as never, allowResearch: async () => assert.fail("no research") },
    );
    assert.equal(calls, 1);
    assert.equal(out.meta.outcome, "out_of_scope");
    const text = JSON.stringify(events);
    assert.match(text, /only help with travel in India/);
  });

  test("a covered question is answered from the guide, with a destination card and guide source", async () => {
    const blocks: { type: string }[] = [];
    let n = 0;
    const out = await answer(
      { turns: [{ role: "user", content: "Tips for Manali" }], memory: null },
      (e) => e.type === "block" && blocks.push(e.block),
      {
        allowResearch: async () => assert.fail("guide covers it, no research"),
        call: (async () => {
          n++;
          if (n === 1) return route({ destinations: ["Manali"], intent: "general" });
          return msg({ blocks: [{ type: "tips", items: ["Hadimba Temple opens at 8 AM."], refs: ["G1"] }], summary: "Tips for Manali.", follow_ups: ["Best time?"], memory: { destination: "Manali", days: null, travellers: null, budget: null, month: null, interests: [], plan: [] } });
        }) as never,
      },
    );
    assert.deepEqual(blocks.map((b) => b.type), ["destination", "tips", "sources", "suggestions"]);
    assert.equal(out.meta.usedGuides, true);
    assert.equal(out.meta.researched, false);
    assert.ok(out.meta.costMicroUsd > 0);
  });

  test("a place without a guide uses web research (labelled), cached for the next visitor", async () => {
    let researchCalls = 0;
    const deps = (allow: boolean) => ({
      allowResearch: async () => allow,
      call: (async (body: { tools?: unknown; text: { format: { name: string } } }) => {
        const name = body.text.format.name;
        if (name === "route") return route({ destinations: ["Kasol"], intent: "things_to_do" });
        if (name === "web_facts") {
          researchCalls++;
          return {
            id: "w", status: "completed", usage: { input_tokens: 5000, output_tokens: 300 },
            output: [
              { type: "web_search_call", action: { type: "search", sources: [{ type: "url", url: "https://himachaltourism.gov.in/kasol" }] } },
              { type: "message", content: [{ type: "output_text", text: JSON.stringify({ facts: [{ claim: "Kasol is on the Parvati river.", claim_type: "general", evidence: [{ url: "https://himachaltourism.gov.in/kasol", title: "Kasol", quote: "Kasol lies on the Parvati" }] }, { claim: "Made up fact.", claim_type: "general", evidence: [{ url: "https://invented.example/x", title: null, quote: "x" }] }] }) }] },
            ],
          };
        }
        return msg({ blocks: [{ type: "text", text: "Kasol sits on the Parvati river.", refs: ["W1"] }], summary: "About Kasol.", follow_ups: [], memory: { destination: "Kasol", days: null, travellers: null, budget: null, month: null, interests: [], plan: [] } });
      }) as never,
    });
    const blocks: { type: string; text?: string; web?: { url: string }[] }[] = [];
    const first = await answer({ turns: [{ role: "user", content: "Things to do in Kasol" }], memory: null }, (e) => e.type === "block" && blocks.push(e.block as never), deps(true));
    assert.equal(researchCalls, 1);
    assert.equal(first.meta.cacheHit, false);
    assert.equal(blocks[0].type, "notice");
    assert.match(blocks[0].text!, /isn’t in VacayOut’s reviewed guides yet/);
    const src = blocks.find((b) => b.type === "sources");
    assert.deepEqual(src?.web?.map((w) => w.url), ["https://himachaltourism.gov.in/kasol"], "invented source dropped");
    const [row] = await db.select().from(s.webResearch);
    assert.equal(row.facts.length, 1);
    assert.equal(row.review, "new");

    const second = await answer({ turns: [{ role: "user", content: "Things to do in Kasol" }], memory: null }, () => {}, deps(false));
    assert.equal(researchCalls, 1, "second visitor served from cache");
    assert.equal(second.meta.cacheHit, true);

    // Expired cache + no allowance → stale result, clearly dated.
    await db.update(s.webResearch).set({ expiresAt: new Date(Date.now() - 1000), retrievedAt: new Date("2026-09-01T06:00:00Z") });
    const stale: { type: string; text?: string }[] = [];
    await answer({ turns: [{ role: "user", content: "Things to do in Kasol" }], memory: null }, (e) => e.type === "block" && stale.push(e.block as never), deps(false));
    assert.ok(stale.some((b) => b.type === "notice" && /from 1 Sept 2026 and may be out of date/.test(b.text ?? "")), JSON.stringify(stale.map((b) => b.text)));
  });

  test("no guide and research paused → says so, invents nothing", async () => {
    const blocks: { type: string; text?: string }[] = [];
    let n = 0;
    const out = await answer(
      { turns: [{ role: "user", content: "Plan Spiti" }], memory: null },
      (e) => e.type === "block" && blocks.push(e.block as never),
      { allowResearch: async () => false, call: (async () => (n++, route({ destinations: ["Spiti Valley"] }))) as never },
    );
    assert.equal(n, 1, "no composing without sources");
    assert.equal(out.meta.outcome, "no_sources");
    assert.match(blocks[0].text ?? "", /isn’t in VacayOut’s guides yet/);
  });

  test("chat budget counts recorded spend this month", async () => {
    await quota.setChatBudgetUsd(1, staff);
    const v = await quota.resolveVisitor(new Request("http://x"), null);
    await quota.recordRequest(v, { outcome: "answered", costMicroUsd: 950_000 });
    const b = await quota.chatBudget();
    assert.ok(b.remaining < quota.ANSWER_RESERVE_MICRO);
  });
}
