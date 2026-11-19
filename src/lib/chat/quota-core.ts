/**
 * Quota rules for the chat, with storage passed in (so they can be tested
 * without a database). Wired to Redis/Postgres in ./quota.ts.
 *
 * Anonymous visitors: one conversation, a few free questions in total. A
 * question is reserved atomically before the model runs and given back if no
 * real answer was delivered (errors, declines, "not configured", budget), so
 * only real answers count and two questions sent together can't both slip past
 * the limit. Signed-in travellers keep their daily allowance.
 */

export type HitResult = { ok: boolean; count: number; limit: number; retryAfterSeconds: number };
export type QuotaStore = {
  hit: (key: string, limit: number, windowSeconds: number, opts?: { consume?: boolean; now?: number }) => Promise<HitResult>;
  release: (key: string, windowSeconds: number, opts?: { now?: number }) => Promise<void>;
  /** The conversation an anonymous visitor is tied to, if any. */
  getThread: (visitor: string) => Promise<string | null>;
  /** Ties the visitor to this conversation unless already tied (first one wins). */
  bindThread: (visitor: string, chatId: string) => Promise<void>;
  now?: () => number;
};

export type QuotaVisitor = { kind: "anon" | "traveller"; key: string; network: string };

export type Limits = { freeQuestions: number; anonPerNetworkPerDay: number; travellerPerDay: number; perMinute: number };

export const DAY = 86_400;
export const FOREVER = 10 * 365 * DAY;

export type Reservation = { key: string; window: number; at: number };
export type Admission =
  | { ok: true; freeLeft: number | null; reservation: Reservation | null }
  | {
      ok: false;
      status: 401 | 429;
      code: "auth_required" | "one_conversation" | "rate_limited" | "daily_limit";
      message: string;
      retryAfter: number;
    };

/** Outcomes that count as a real answer (and so use a free question). */
export const ANSWERED_OUTCOMES = new Set(["answered"]);

export function quotaRules(limits: Limits, store: QuotaStore) {
  const now = () => store.now?.() ?? Date.now();
  const freeKey = (v: QuotaVisitor) => `chat:q:${v.key}`;
  const signUp = (message = `You’ve used your ${limits.freeQuestions} free questions. Sign up free to keep planning.`): Admission => ({
    ok: false,
    status: 401,
    code: "auth_required",
    message,
    retryAfter: 0,
  });

  async function boundThread(v: QuotaVisitor): Promise<string | null> {
    try {
      return await store.getThread(v.key);
    } catch (err) {
      // Fail open on the one-conversation rule only: the question quota below still applies.
      console.error("[quota] thread lookup failed", err instanceof Error ? err.message : err);
      return null;
    }
  }

  /** Checks limits and, for anonymous visitors, reserves one free question. */
  async function admit(v: QuotaVisitor, chatId: string): Promise<Admission> {
    const t = now();
    const burst = await store.hit(`chat:min:${v.key}`, limits.perMinute, 60, { now: t });
    if (!burst.ok) return { ok: false, status: 429, code: "rate_limited", message: "You’re sending messages quickly — give it a few seconds.", retryAfter: burst.retryAfterSeconds };

    if (v.kind === "traveller") {
      const day = await store.hit(`chat:day:${v.key}`, limits.travellerPerDay, DAY, { now: t });
      if (!day.ok) return { ok: false, status: 429, code: "daily_limit", message: "You’ve reached today’s message limit. It resets tomorrow.", retryAfter: day.retryAfterSeconds };
      return { ok: true, freeLeft: null, reservation: null };
    }

    const bound = await boundThread(v);
    if (bound && bound !== chatId) {
      return { ok: false, status: 401, code: "one_conversation", message: "Free planning includes one conversation. Sign up free to start a new trip — it takes a minute.", retryAfter: 0 };
    }

    const key = freeKey(v);
    // Peek first (no charge), so a visitor who is out of allowance isn't counted again.
    if (!(await store.hit(key, limits.freeQuestions, FOREVER, { consume: false, now: t })).ok) return signUp();
    // Abuse backstop per network: counts attempts, not answers.
    const net = await store.hit(`chat:net:${v.network}`, limits.anonPerNetworkPerDay, DAY, { now: t });
    if (!net.ok) return signUp("Sign up free to keep planning.");
    // Atomic reservation: two messages sent at the same moment can't both pass the limit.
    const used = await store.hit(key, limits.freeQuestions, FOREVER, { now: t });
    if (!used.ok) {
      await store.release(key, FOREVER, { now: t });
      return signUp();
    }
    return { ok: true, freeLeft: Math.max(0, limits.freeQuestions - used.count), reservation: { key, window: FOREVER, at: t } };
  }

  /**
   * Called once the answer is finished. A real answer keeps the reservation
   * (and ties an anonymous visitor to this conversation); anything else gives
   * the question back. Returns the free questions left (null when signed in).
   */
  async function settle(v: QuotaVisitor, admission: Extract<Admission, { ok: true }>, r: { answered: boolean; chatId: string }): Promise<number | null> {
    if (v.kind !== "anon" || !admission.reservation) return admission.freeLeft;
    if (r.answered) {
      try {
        await store.bindThread(v.key, r.chatId);
      } catch (err) {
        console.error("[quota] thread bind failed", err instanceof Error ? err.message : err);
      }
      return admission.freeLeft;
    }
    await store.release(admission.reservation.key, admission.reservation.window, { now: admission.reservation.at });
    return admission.freeLeft === null ? null : Math.min(limits.freeQuestions, admission.freeLeft + 1);
  }

  /** What the chat UI shows before any question: free questions left and the visitor's conversation. */
  async function state(v: QuotaVisitor): Promise<{ signedIn: boolean; limit: number; left: number | null; chatId: string | null }> {
    if (v.kind === "traveller") return { signedIn: true, limit: limits.freeQuestions, left: null, chatId: null };
    const used = await store.hit(freeKey(v), limits.freeQuestions, FOREVER, { consume: false, now: now() });
    return { signedIn: false, limit: limits.freeQuestions, left: Math.max(0, limits.freeQuestions - used.count), chatId: await boundThread(v) };
  }

  return { admit, settle, state };
}
