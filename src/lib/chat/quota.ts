import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appSettings, chatRequests, travellers } from "@/lib/db/schema";
import { hashKey, hit } from "@/lib/limiter";

/**
 * Who is chatting, and how much they may use. Anonymous visitors get a few
 * free messages (tracked by an httpOnly cookie, with a per-network backstop);
 * signed-in travellers get a daily allowance. Live web research has its own,
 * smaller daily quota, and chat has a monthly spending cap.
 */

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : d;
};
export const LIMITS = {
  freeMessages: num(process.env.CHAT_FREE_MESSAGES, 5),
  anonPerNetworkPerDay: 40,
  travellerPerDay: num(process.env.CHAT_DAILY_MESSAGES, 80),
  perMinute: 8,
  researchAnonPerDay: num(process.env.CHAT_RESEARCH_PER_DAY_ANON, 10),
  researchTravellerPerDay: num(process.env.CHAT_RESEARCH_PER_DAY, 25),
};
const DAY = 86_400;
const FOREVER = 10 * 365 * DAY;
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

export type Admission =
  | { ok: true; freeLeft: number | null }
  | { ok: false; status: 401 | 429; code: "auth_required" | "rate_limited" | "daily_limit"; message: string; retryAfter: number };

export async function admitMessage(v: Visitor): Promise<Admission> {
  const burst = await hit(`chat:min:${v.key}`, LIMITS.perMinute, 60);
  if (!burst.ok) return { ok: false, status: 429, code: "rate_limited", message: "You’re sending messages quickly — give it a few seconds.", retryAfter: burst.retryAfterSeconds };

  if (v.kind === "traveller") {
    const day = await hit(`chat:day:${v.key}`, LIMITS.travellerPerDay, DAY);
    if (!day.ok) return { ok: false, status: 429, code: "daily_limit", message: "You’ve reached today’s message limit. It resets tomorrow.", retryAfter: day.retryAfterSeconds };
    return { ok: true, freeLeft: null };
  }

  // Check first (no charge), so a visitor who is out of free messages isn't counted again.
  const used = await hit(`chat:free:${v.key}`, LIMITS.freeMessages, FOREVER, { consume: false });
  if (!used.ok) return { ok: false, status: 401, code: "auth_required", message: "You’ve used your free messages. Sign up free to keep planning.", retryAfter: 0 };
  const net = await hit(`chat:net:${v.network}`, LIMITS.anonPerNetworkPerDay, DAY);
  if (!net.ok) return { ok: false, status: 401, code: "auth_required", message: "Sign up free to keep planning.", retryAfter: 0 };
  const now = await hit(`chat:free:${v.key}`, LIMITS.freeMessages, FOREVER);
  return { ok: true, freeLeft: Math.max(0, LIMITS.freeMessages - now.count) };
}

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
