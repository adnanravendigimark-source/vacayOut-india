import assert from "node:assert/strict";
import { test } from "node:test";
import { quotaRules, type QuotaStore, type QuotaVisitor } from "./quota-core";

/** In-memory store with the same fixed-window semantics as the real limiter. */
function memoryStore(): QuotaStore & { counts: Map<string, number>; threads: Map<string, string> } {
  const counts = new Map<string, number>();
  const threads = new Map<string, string>();
  const k = (key: string, w: number, now: number) => `${key}:${Math.floor(now / 1000 / w)}`;
  return {
    counts,
    threads,
    now: () => Date.UTC(2026, 10, 19, 12),
    async hit(key, limit, w, opts = {}) {
      const id = k(key, w, opts.now ?? Date.now());
      const consume = opts.consume ?? true;
      const count = (counts.get(id) ?? 0) + (consume ? 1 : 0);
      if (consume) counts.set(id, count);
      return { ok: consume ? count <= limit : count < limit, count, limit, retryAfterSeconds: 1 };
    },
    async release(key, w, opts = {}) {
      const id = k(key, w, opts.now ?? Date.now());
      counts.set(id, Math.max(0, (counts.get(id) ?? 0) - 1));
    },
    async getThread(v) {
      return threads.get(v) ?? null;
    },
    async bindThread(v, chatId) {
      if (!threads.has(v)) threads.set(v, chatId);
    },
  };
}

const LIMITS = { freeQuestions: 5, anonPerNetworkPerDay: 40, travellerPerDay: 80, perMinute: 1000 };
const anon: QuotaVisitor = { kind: "anon", key: "a1", network: "n1" };
const CHAT = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

async function ask(r: ReturnType<typeof quotaRules>, chatId: string, answered: boolean) {
  const a = await r.admit(anon, chatId);
  if (!a.ok) return { a, left: null };
  return { a, left: await r.settle(anon, a, { answered, chatId }) };
}

test("errors, declines and other non-answers don't use a free question", async () => {
  const r = quotaRules(LIMITS, memoryStore());
  for (let i = 0; i < 10; i++) {
    const { a, left } = await ask(r, CHAT, false);
    assert.ok(a.ok, `attempt ${i + 1} admitted`);
    assert.equal(left, 5);
  }
  assert.equal((await r.state(anon)).left, 5);
});

test("the 6th anonymous question is blocked; only answers count", async () => {
  const r = quotaRules(LIMITS, memoryStore());
  const lefts: (number | null)[] = [];
  for (let i = 0; i < 5; i++) {
    await ask(r, CHAT, false); // a failed try in between changes nothing
    lefts.push((await ask(r, CHAT, true)).left);
  }
  assert.deepEqual(lefts, [4, 3, 2, 1, 0]);
  const sixth = await r.admit(anon, CHAT);
  assert.equal(sixth.ok, false);
  if (!sixth.ok) assert.equal(sixth.code, "auth_required");
});

test("an anonymous visitor's second conversation is blocked on the server", async () => {
  const store = memoryStore();
  const r = quotaRules(LIMITS, store);
  // Before any answer, no conversation is tied yet (a failed first try doesn't tie it).
  await ask(r, OTHER, false);
  assert.equal(store.threads.size, 0);
  await ask(r, CHAT, true);
  assert.equal((await r.state(anon)).chatId, CHAT);
  const second = await r.admit(anon, OTHER);
  assert.equal(second.ok, false);
  if (!second.ok) assert.equal(second.code, "one_conversation");
  // The first conversation continues.
  assert.ok((await r.admit(anon, CHAT)).ok);
});

test("questions sent at the same moment can't pass the limit together", async () => {
  const r = quotaRules(LIMITS, memoryStore());
  for (let i = 0; i < 4; i++) await ask(r, CHAT, true);
  const [x, y] = await Promise.all([r.admit(anon, CHAT), r.admit(anon, CHAT)]);
  assert.equal([x, y].filter((a) => a.ok).length, 1);
});

test("signed-in travellers keep their daily limit and have no conversation rule", async () => {
  const r = quotaRules({ ...LIMITS, travellerPerDay: 2 }, memoryStore());
  const t: QuotaVisitor = { kind: "traveller", key: "t1", network: "n1" };
  assert.ok((await r.admit(t, CHAT)).ok);
  assert.ok((await r.admit(t, OTHER)).ok);
  const third = await r.admit(t, CHAT);
  assert.equal(third.ok, false);
  if (!third.ok) assert.equal(third.code, "daily_limit");
  assert.deepEqual(await r.state(t), { signedIn: true, limit: 5, left: null, chatId: null });
});
