import { aiAnswer, quickCall } from "@/lib/assistant/ai";
import { findGuideNamedIn } from "@/lib/assistant/elsewhere";
import { loadPack } from "@/lib/assistant/load";
import { normalize, notesForAi, search } from "@/lib/assistant/search";
import { chatBudget, recordRequest } from "@/lib/chat/quota";
import { hashKey, hit } from "@/lib/limiter";
import { logError } from "@/lib/ops/log";
import { openaiConfigured } from "@/lib/research/openai";

/**
 * The page assistant's AI fallback: a short answer written by the cheapest model from
 * the page's own notes. GET, so the CDN caches identical questions (same page version)
 * for a week and repeats cost nothing. Limits: per network per minute and hour, a
 * site-wide daily cap on AI answers, and the chat's monthly budget.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : d;
};
const DAILY_AI_ANSWERS = () => num(process.env.ASSISTANT_DAILY_AI_ANSWERS, 2000);
const PER_HOUR = 40;
const PER_MINUTE = 8;
/** Keep this much of the monthly chat budget for the full planner. */
const BUDGET_FLOOR_MICRO = 5_000;

function reply(status: number, body: Record<string, unknown>, cacheSeconds = 0) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": cacheSeconds ? `public, max-age=0, s-maxage=${cacheSeconds}` : "no-store",
    },
  });
}

export async function GET(req: Request) {
  // Browsers send this header; requests from other sites (cross-site) are refused.
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return reply(403, { error: "Forbidden" });

  const url = new URL(req.url);
  const state = url.searchParams.get("s") ?? "";
  const placeSlug = url.searchParams.get("p") || null;
  const question = normalize(url.searchParams.get("q") ?? "");
  if (question.length < 3 || question.length > 200) return reply(400, { error: "Ask a question of 3–200 characters." });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const network = hashKey(`ip:${ip}`);
  const minute = await hit(`asst:min:${network}`, PER_MINUTE, 60);
  if (!minute.ok) return reply(429, { error: "You’re asking quickly — try again in a few seconds.", fallback: true });
  const hour = await hit(`asst:hour:${network}`, PER_HOUR, 3600);
  if (!hour.ok) return reply(429, { error: "Hourly question limit reached.", fallback: true });

  const pack = await loadPack(state, placeSlug);
  if (!pack) return reply(404, { error: "Unknown page." });

  // The question names another place we have a guide for ("Kedarnath" on the Rishikesh page):
  // answer from that guide instead. Same model, same limits; no web search.
  // If the visitor also names this page's place ("Haridwar to Rishikesh" on Rishikesh), stay here unless this page has nothing.
  const hits = search(pack, question, 6);
  const weakHere = !hits.length || hits[0].score < 1;
  const namesHere = ` ${question} `.includes(` ${normalize(pack.place.name)} `);
  const other = !namesHere || weakHere ? await findGuideNamedIn(question, { stateSlug: state, placeSlug }).catch(() => null) : null;
  const otherPack = other ? await loadPack(other.stateSlug, other.placeSlug) : null;
  const otherHits = otherPack ? search(otherPack, question, 6) : [];
  const useOther = Boolean(otherPack && otherHits.length && otherHits[0].score >= 1);
  const source = useOther ? otherPack! : pack;

  // Nothing on this page (or the named guide) is even close: say so without paying for a model call.
  if (!useOther && weakHere) return reply(200, { notCovered: true }, 604800);

  if (!openaiConfigured()) return reply(503, { error: "AI answers are off.", fallback: true });
  const day = await hit("asst:day", DAILY_AI_ANSWERS(), 86_400);
  if (!day.ok) return reply(503, { error: "AI answers are paused for today.", fallback: true });
  const budget = await chatBudget();
  if (budget.remaining < BUDGET_FLOOR_MICRO) return reply(503, { error: "AI answers are paused.", fallback: true });

  const notes = notesForAi(source, question, 6);
  try {
    const r = await aiAnswer(source, question, notes, { call: quickCall });
    await recordRequest(
      { kind: "anon", key: network, travellerId: null, network, newCookie: null },
      { outcome: "page_assistant", destination: source.place.name, usedGuides: true, costMicroUsd: r.costMicroUsd },
    ).catch(() => {});
    const from = useOther && other && r.text ? { name: other.name, href: other.path } : undefined;
    return reply(200, { answer: r.text, notCovered: r.notCovered, sources: from ? [] : notes.slice(0, 3).map((n) => n.id), version: pack.version, ...(from ? { from } : {}) }, 604800);
  } catch (err) {
    await logError("assistant", err, { path: "/api/assistant" });
    return reply(503, { error: "AI answer unavailable.", fallback: true });
  }
}
