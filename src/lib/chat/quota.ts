import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appSettings, chatAnonThreads, chatRequests, travellers } from "@/lib/db/schema";
import { hashKey, hit, release } from "@/lib/limiter";
import { DAY, quotaRules, type Admission } from "./quota-core";

/**
 * Who is chatting, and how much they may use. Anonymous visitors get one
 * conversation with a few free questions (only real answers count; rules in
 * ./quota-core.ts), then must sign up. Tracked by an httpOnly cookie, with a per-network backstop;
 * signed-in travellers get a daily allowance. Live web research has its own,
 * smaller daily quota, and chat has a monthly spending cap.
 */

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : d;
};
export const LIMITS = {
  /** Questions a visitor may ask (across all conversations) before signing up. */
  freeQuestions: num(process.env.CHAT_FREE_QUESTIONS, 5),
  anonPerNetworkPerDay: 40,
  travellerPerDay: num(process.env.CHAT_DAILY_MESSAGES, 80),
  perMinute: 8,
  researchAnonPerDay: num(process.env.CHAT_RESEARCH_PER_DAY_ANON, 10),
  researchTravellerPerDay: num(process.env.CHAT_RESEARCH_PER_DAY, 25),
};
export const ANON_COOKIE = "vo_anon";

export type Visitor = { kind: "anon" | "traveller"; key: string; travellerId: string | null; network: string; newCookie: string | null };

function readCookie(req: Request, name: string) {
  const m = (req.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m?.[1] ?? null;
}

export async function resolveVisitor(req: Request, session: { user?: { id?: string; kind?: string } } | null): Promise<Visitor> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const network = hashKey(`ip:${ip}`);
  if (session?.user?.kind === "traveller" && session.user.id) {
    const [t] = await getDb().select({ id: travellers.id, active: travellers.active }).from(travellers).where(eq(travellers.id, session.user.id)).limit(1);
    if (t?.active) return { kind: "traveller", key: hashKey(`t:${t.id}`), travellerId: t.id, network, newCookie: null };
  }
  let anon = readCookie(req, ANON_COOKIE);
  let newCookie: string | null = null;
  if (!anon || !/^[0-9a-f-]{36}$/.test(anon)) {
    anon = randomUUID();
    newCookie = anon;
  }
  return { kind: "anon", key: hashKey(`a:${anon}`), travellerId: null, network, newCookie };
}

const rules = quotaRules(LIMITS, {
  hit,
  release,
  async getThread(visitor) {
    const [row] = await getDb().select({ chatId: chatAnonThreads.chatId }).from(chatAnonThreads).where(eq(chatAnonThreads.visitor, visitor)).limit(1);
    return row?.chatId ?? null;
  },
  async bindThread(visitor, chatId) {
    await getDb().insert(chatAnonThreads).values({ visitor, chatId }).onConflictDoNothing();
  },
});

export type { Admission };

/** Checks limits; for anonymous visitors, reserves one free question and enforces one conversation. */
export const admitMessage = (v: Visitor, chatId: string): Promise<Admission> => rules.admit(v, chatId);
/** Keeps the reserved question only if a real answer was delivered; returns free questions left. */
export const settleMessage = (v: Visitor, a: Extract<Admission, { ok: true }>, r: { answered: boolean; chatId: string }) => rules.settle(v, a, r);
/** Free questions left and the visitor's one conversation (for the chat UI). */
export const quotaState = (v: Visitor) => rules.state(v);

/** Consumes one live-research allowance. Cache hits don't call this. */
export async function takeResearch(v: Visitor): Promise<boolean> {
  const limit = v.kind === "traveller" ? LIMITS.researchTravellerPerDay : LIMITS.researchAnonPerDay;
  return (await hit(`chat:research:${v.key}`, limit, DAY)).ok;
}

// ---------- monthly chat budget ----------

const BUDGET_KEY = "chat.monthly_budget_usd";
/** Rough upper estimate of one answer, held back so the cap isn't overshot. */
export const ANSWER_RESERVE_MICRO = 60_000;

export async function getChatBudgetUsd(): Promise<number> {
  const [row] = await getDb().select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, BUDGET_KEY)).limit(1);
  if (typeof row?.value === "number") return row.value;
  return num(process.env.CHAT_MONTHLY_BUDGET_USD, 30);
}

export async function setChatBudgetUsd(value: number, actorId: string) {
  await getDb()
    .insert(appSettings)
    .values({ key: BUDGET_KEY, value, updatedBy: actorId })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedBy: actorId, updatedAt: new Date() } });
}

const monthStart = sql`(date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')`;

export async function chatBudget() {
  const [row] = await getDb()
    .select({ spent: sql<string>`coalesce(sum(${chatRequests.costMicroUsd}), 0)` })
    .from(chatRequests)
    .where(gte(chatRequests.at, monthStart));
  const budgetMicro = Math.round((await getChatBudgetUsd()) * 1e6);
  const spent = Number(row?.spent ?? 0);
  return { budgetMicro, spent, remaining: Math.max(0, budgetMicro - spent) };
}

export async function recordRequest(v: Visitor, r: { outcome: string; destination?: string | null; usedGuides?: boolean; researched?: boolean; cacheHit?: boolean; costMicroUsd: number }) {
  await getDb()
    .insert(chatRequests)
    .values({
      visitor: v.key,
      travellerId: v.travellerId,
      outcome: r.outcome,
      destination: r.destination?.slice(0, 120) ?? null,
      usedGuides: r.usedGuides ?? false,
      researched: r.researched ?? false,
      researchCacheHit: r.cacheHit ?? false,
      costMicroUsd: Math.round(r.costMicroUsd),
    });
}

export async function chatStats() {
  const [row] = await getDb()
    .select({
      total: sql<number>`count(*)::int`,
      outOfScope: sql<number>`(count(*) filter (where ${chatRequests.outcome} = 'out_of_scope'))::int`,
      researched: sql<number>`(count(*) filter (where ${chatRequests.researched}))::int`,
      cacheHits: sql<number>`(count(*) filter (where ${chatRequests.researchCacheHit}))::int`,
      guides: sql<number>`(count(*) filter (where ${chatRequests.usedGuides}))::int`,
      travellers: sql<number>`(count(distinct ${chatRequests.travellerId}))::int`,
    })
    .from(chatRequests)
    .where(and(gte(chatRequests.at, monthStart)));
  return row;
}
