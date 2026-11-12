import "server-only";
import type { Block, ChatTurn, TripMemory } from "@/lib/chat/schema";
import { costMicroUsd } from "@/lib/research/cost";
import { createResponse, type CallModel } from "@/lib/research/openai";
import { classify, quickGreeting, type Classification, type Intent } from "./classify";
import { isPlanIntent } from "./focus";
import { compose, type GuideDoc, type WebFactRef } from "./compose";
import { cacheKeyFor, lookupCache, researchFresh, touchCache, type ResearchResult } from "./research";
import { findGuides } from "./retrieve";
import { discover } from "./discover";
import { discoveryCandidates, matchGuides, stateCandidates, type GuideMatch } from "./candidates";
import { fastAnswer, needsWeb, priorityCostFactor, toBlocks } from "./fast";
import { mapPoints } from "@/lib/map";
import { bookingsBlock } from "@/lib/booking/links";
import { GUIDE_HREF_RE } from "@/lib/chat/constants";

/** Every answer uses the cheap no-reasoning "luna" tier by default; override per step with env vars. */
export const chatModel = () => process.env.OPENAI_CHAT_MODEL || "gpt-6-luna";
export const quickChatModel = () => process.env.OPENAI_CHAT_QUICK_MODEL || "gpt-6-luna";
export const routeModel = () => process.env.OPENAI_ROUTE_MODEL || "gpt-6-luna";
export const composeModelFor = (intent: Intent) => (isPlanIntent(intent) ? chatModel() : quickChatModel());
export const chatResearchModel = () => process.env.OPENAI_CHAT_RESEARCH_MODEL || "gpt-5.4-mini";

/** Which guide section answers which kind of question; missing section → research. */
const COVERAGE: Partial<Record<Intent, string[]>> = {
  how_to_reach: ["how_to_reach"],
  best_time: ["best_time"],
  budget: ["budget"],
  things_to_do: ["things_to_do", "highlights"],
  itinerary: ["itinerary", "things_to_do", "highlights"],
  plan_trip: ["things_to_do", "highlights", "itinerary"],
  food: ["food"],
  stay: ["where_to_stay", "neighbourhoods"],
};

/** Maps and booking links only where they help: a trip plan. */
const MAP_INTENTS: Intent[] = ["plan_trip", "itinerary", "modify_plan"];
const BOOK_INTENTS: Intent[] = ["plan_trip", "itinerary", "modify_plan"];
const BROAD_RE = /^(india|bharat|north|south|east|west|central|north[- ]?east|northeast)(ern)?( india)?$/i;

export type Emit = (e: { type: "status"; text: string } | { type: "block"; block: Block }) => void;

export type AnswerMeta = { outcome: string; destination: string | null; usedGuides: boolean; researched: boolean; cacheHit: boolean; costMicroUsd: number };

export type AgentDeps = {
  call?: CallModel;
  findGuides?: typeof findGuides;
  discoveryCandidates?: typeof discoveryCandidates;
  stateCandidates?: typeof stateCandidates;
  matchGuides?: typeof matchGuides;
  lookupCache?: typeof lookupCache;
  researchFresh?: typeof researchFresh;
  /** Consumes the visitor's research allowance; false when used up or the budget is low. */
  allowResearch: () => Promise<boolean>;
  /** Told about every model charge as it happens, so cost is recorded even if a later step fails. */
  onCost?: (microUsd: number) => void;
  now?: () => Date;
};

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const fmtDay = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

const DECLINE: Record<string, string> = {
  other_travel: "I only plan trips within India, so I can’t help with that one. Ask me about anywhere in India — a weekend in the hills, a beach break or a long road trip.",
  off_topic: "I’m VacayOut’s India travel planner, so I can only help with travel in India — places, routes, seasons, budgets and itineraries. Where would you like to go?",
  greeting: "Hi! Tell me where in India you’d like to go, how many days you have, and who’s travelling — I’ll plan it with you. You can keep asking to change anything.",
};

type AnswerFn = (input: { turns: ChatTurn[]; memory: TripMemory | null }, emit: Emit, deps: AgentDeps) => Promise<{ summary: string; memory: TripMemory | null; meta: AnswerMeta }>;

/**
 * Default: the model answers from its own knowledge (plus web search for live
 * questions) and we add our guide links. CHAT_MODE=guides switches back to the
 * strict guides-only engine below.
 */
export const answer: AnswerFn = (input, emit, deps) => (process.env.CHAT_MODE === "guides" ? guidedAnswer(input, emit, deps) : quickAnswer(input, emit, deps));

const SUGGEST = ["Best treks in December", "Plan 3 days in Udaipur", "Weekend trips from Delhi"];

export const quickAnswer: AnswerFn = async (input, emit, deps) => {
  let spent = 0;
  const base = deps.call ?? createResponse;
  const call: CallModel = async (body) => {
    const r = await base(body);
    const priority = (r as { service_tier?: string }).service_tier === "fast" || body.service_tier === "priority";
    const c = Math.round(costMicroUsd(String(body.model), r.usage, r.output.filter((i) => i.type === "web_search_call").length) * (priority ? priorityCostFactor() : 1));
    spent += c;
    deps.onCost?.(c);
    return r;
  };
  const now = deps.now?.() ?? new Date();
  const meta: AnswerMeta = { outcome: "answered", destination: null, usedGuides: false, researched: false, cacheHit: false, costMicroUsd: 0 };
  const done = (summary: string, memory: TripMemory | null) => ({ summary, memory, meta: { ...meta, costMicroUsd: spent } });

  const latest = input.turns[input.turns.length - 1]?.content ?? "";
  if (quickGreeting(latest)) {
    meta.outcome = "greeting";
    emit({ type: "block", block: { type: "text", text: input.memory?.destination ? `Happy to help! Ask me anything else about ${input.memory.destination}.` : DECLINE.greeting } });
    emit({ type: "block", block: { type: "suggestions", items: SUGGEST } });
    return done("Greeted the traveller.", input.memory);
  }

  // Live questions (prices, timings, this year's dates) get a web search, within the visitor's daily allowance.
  const web = needsWeb(latest) && (await deps.allowResearch());
  emit({ type: "status", text: web ? "Checking the latest on the web…" : "Thinking…" });
  const a = await fastAnswer({ turns: input.turns, memory: input.memory, web, now }, { call, model: quickChatModel() });
  meta.researched = web;

  if (a.scope !== "india_travel") {
    meta.outcome = a.scope === "greeting" ? "greeting" : "out_of_scope";
    emit({ type: "block", block: { type: "text", text: DECLINE[a.scope] } });
    emit({ type: "block", block: { type: "suggestions", items: SUGGEST } });
    return done(a.scope === "greeting" ? "Greeted the traveller." : "Declined a request outside India travel.", input.memory);
  }
  if (!a.reply && !a.places.length && !a.itinerary && !a.compare) {
    meta.outcome = "nothing_grounded";
    emit({ type: "block", block: { type: "text", text: "I couldn’t answer that one. Try asking it another way." } });
    return done("No answer.", input.memory);
  }

  // Show the reply at once; cards follow after the guide lookup.
  if (a.reply) emit({ type: "block", block: { type: "text", text: a.reply } });

  // Our own guide links and photos for the places mentioned (best effort: a DB hiccup never loses the answer).
  const names = [...a.places.map((p) => p.name), ...a.alternatives.map((p) => p.name), ...(a.memory.destination ? [a.memory.destination] : [])];
  const guides = await (deps.matchGuides ?? matchGuides)(names).catch(() => new Map<string, GuideMatch>());
  meta.usedGuides = guides.size > 0;
  meta.destination = a.memory.destination;

  // A single-destination answer (no list) links to our guide with a small card.
  const dest = a.memory.destination ? guides.get(a.memory.destination.toLowerCase()) : undefined;
  if (dest && !a.places.length && !a.compare) {
    emit({ type: "block", block: { type: "destination", name: dest.name, stateName: "India", tagline: `VacayOut guide to ${dest.name}`.slice(0, 200), ...(dest.photo ? { photo: dest.photo } : {}), href: dest.href } as Block });
  }
  for (const b of toBlocks({ ...a, reply: "" }, guides, { showMap: Boolean(a.itinerary) })) emit({ type: "block", block: b });
  if (a.itinerary) {
    const bk = bookingsBlock({ name: a.memory.destination ?? a.places[0]?.name ?? "India", kind: "town", stateName: null });
    if (bk) emit({ type: "block", block: bk });
  }
  if (a.followUps.length) emit({ type: "block", block: { type: "suggestions", items: a.followUps } });

  const memory: TripMemory = {
    destination: a.memory.destination ?? input.memory?.destination ?? null,
    days: a.memory.days ?? input.memory?.days ?? null,
    travellers: a.memory.travellers ?? input.memory?.travellers ?? null,
    budget: a.memory.budget ?? input.memory?.budget ?? null,
    month: a.memory.month ?? input.memory?.month ?? null,
    interests: a.memory.interests.length ? a.memory.interests : (input.memory?.interests ?? []),
    plan: a.itinerary ? a.itinerary.days.map((d) => d.title.slice(0, 120)).slice(0, 10) : (input.memory?.plan ?? []),
  };
  return done(a.summary || "Answered a travel question.", memory);
};

export const guidedAnswer: AnswerFn = async (input, emit, deps) => {
  let spent = 0;
  const base = deps.call ?? createResponse;
  const call: CallModel = async (body) => {
    const r = await base(body);
    const c = costMicroUsd(String(body.model), r.usage, r.output.filter((i) => i.type === "web_search_call").length);
    spent += c;
    deps.onCost?.(c);
    return r;
  };
  const now = deps.now?.() ?? new Date();
  const meta: AnswerMeta = { outcome: "answered", destination: null, usedGuides: false, researched: false, cacheHit: false, costMicroUsd: 0 };
  const done = (summary: string, memory: TripMemory | null) => ({ summary, memory, meta: { ...meta, costMicroUsd: spent } });

  // A bare "hi" / "thanks" is answered without any model call.
  const latest = input.turns[input.turns.length - 1]?.content ?? "";
  if (quickGreeting(latest)) {
    meta.outcome = "greeting";
    emit({ type: "block", block: { type: "text", text: input.memory?.destination ? `Happy to help! Ask me anything else about ${input.memory.destination} — or change the plan.` : DECLINE.greeting } });
    emit({ type: "block", block: { type: "suggestions", items: input.memory?.destination ? [`Best time to visit ${input.memory.destination}`, `How do I reach ${input.memory.destination}?`] : ["Plan 3 days in Udaipur", "Best time to visit Kerala", "Weekend trip from Delhi"] } });
    return done("Greeted the traveller.", input.memory);
  }

  emit({ type: "status", text: "Reading your question…" });
  const cls: Classification = await classify(input.turns, input.memory, { call, model: routeModel() });

  if (cls.scope !== "india_travel") {
    meta.outcome = cls.scope === "greeting" ? "greeting" : "out_of_scope";
    emit({ type: "block", block: { type: "text", text: DECLINE[cls.scope] } });
    emit({ type: "block", block: { type: "suggestions", items: ["Plan 3 days in Udaipur", "Best time to visit Kerala", "Weekend trip from Delhi"] } });
    return done(cls.scope === "greeting" ? "Greeted the traveller." : "Declined a request outside India travel.", input.memory);
  }

  // "India" or "South India" is not a destination: the router sometimes returns it anyway.
  const origin = cls.origin?.trim().toLowerCase() ?? null;
  const named = cls.destinations.filter((d) => !BROAD_RE.test(d.trim()) && d.trim().toLowerCase() !== origin);
  if (cls.intent === "discover" || (!named.length && !input.memory?.destination)) {
    emit({ type: "status", text: "Finding places that fit…" });
    // "Best places in Kerala" stays inside Kerala; anything broader looks across India.
    const inState = named.length ? await (deps.stateCandidates ?? stateCandidates)(named[0]) : [];
    const scope = inState.length >= 3 ? named[0] : null;
    const cands = scope ? inState : await (deps.discoveryCandidates ?? discoveryCandidates)();
    const picked = cands.length ? await discover({ cands, cls, turns: input.turns, scope }, { call, model: quickChatModel() }) : null;
    meta.usedGuides = Boolean(picked?.blocks.length);
    if (!picked?.blocks.length) {
      meta.outcome = "nothing_grounded";
      emit({ type: "block", block: { type: "text", text: "Tell me a bit more — which month, how many days, or what kind of trip (hills, beaches, wildlife, temples)?" } });
      return done("Asked for more detail to suggest places.", input.memory);
    }
    for (const b of picked.blocks) emit({ type: "block", block: b });
    if (picked.followUps.length) emit({ type: "block", block: { type: "suggestions", items: picked.followUps } });
    const memory: TripMemory = {
      destination: input.memory?.destination ?? null,
      days: cls.days ?? input.memory?.days ?? null,
      travellers: cls.travellers ?? input.memory?.travellers ?? null,
      budget: cls.budget ?? input.memory?.budget ?? null,
      month: cls.month ?? input.memory?.month ?? null,
      interests: cls.interests.slice(0, 6),
      plan: input.memory?.plan ?? [],
    };
    return done(picked.summary || "Suggested places across India.", memory);
  }

  const destinations = named.length ? named : [input.memory!.destination!];
  const primary = destinations[0];
  meta.destination = primary;

  // Guides and (cached or live) research run side by side.
  emit({ type: "status", text: "Checking VacayOut’s guides…" });
  // Plans can use several guides; a single question is answered from the best one or two.
  const guidesP = (deps.findGuides ?? findGuides)(destinations, isPlanIntent(cls.intent) ? 3 : 2, cls.intent);
  const researchP = (async (): Promise<(ResearchResult & { label: "fresh" | "cached" | "stale" }) | { label: "paused" | "none" }> => {
    const guides = await guidesP;
    const wanted = COVERAGE[cls.intent];
    const covered = guides.length > 0 && (wanted === undefined || wanted.some((k) => guides[0].sectionKeys.includes(k)));
    if (covered && !cls.needsLiveInfo) return { label: "none" };
    const topic: Intent = cls.intent === "modify_plan" ? "itinerary" : cls.intent;
    const cached = await (deps.lookupCache ?? lookupCache)(cacheKeyFor(primary, topic));
    if (cached && cached.expiresAt > now) {
      await touchCache(cached.id).catch(() => {});
      return { facts: cached.facts, retrievedAt: cached.retrievedAt, cached: true, stale: false, costMicroUsd: 0, label: "cached" };
    }
    if (await deps.allowResearch()) {
      emit({ type: "status", text: "Searching the web for current details…" });
      const fresh = await (deps.researchFresh ?? researchFresh)(
        { destination: primary, topic, question: cls.standalone, placeId: guides[0]?.placeId ?? null },
        { call, model: chatResearchModel(), cost: () => spent },
      );
      return { ...fresh, label: "fresh" };
    }
    if (cached) return { facts: cached.facts, retrievedAt: cached.retrievedAt, cached: true, stale: true, costMicroUsd: 0, label: "stale" };
    return { label: "paused" };
  })();

  const [guideRows, research] = await Promise.all([guidesP, researchP]);
  const guides: GuideDoc[] = guideRows.map((g, i) => ({ ...g, ref: `G${i + 1}` }));
  const webFacts = "facts" in research ? research.facts : [];
  const web: WebFactRef[] = webFacts.map((f, i) => ({ ref: `W${i + 1}`, claim: f.claim, claimType: f.claimType }));
  meta.usedGuides = guides.length > 0;
  meta.researched = research.label === "fresh" || research.label === "cached" || research.label === "stale";
  meta.cacheHit = research.label === "cached" || research.label === "stale";

  if (!guides.length && !web.length) {
    meta.outcome = "no_sources";
    emit({
      type: "block",
      block: {
        type: "notice",
        tone: "warning",
        text:
          research.label === "paused"
            ? `${primary} isn’t in VacayOut’s guides yet, and live web research is paused for you right now (daily limit or budget). Try again later, or ask about a place we cover.`
            : `I couldn’t find reliable information about ${primary} just now, so I won’t guess. Try asking in a different way, or about a nearby place.`,
      },
    });
    emit({ type: "block", block: { type: "suggestions", items: ["Which places do you cover?", "Plan a trip to Himachal Pradesh"] } });
    return done(`Couldn’t answer about ${primary}: no guide and no research.`, input.memory);
  }

  emit({ type: "status", text: "Writing your answer…" });
  const out = await compose({ guides, web, turns: input.turns, memory: input.memory, cls }, { call, model: composeModelFor(cls.intent) });

  // Coverage notices come first, written by us — not the model.
  const usedWeb = web.filter((w) => out.usedRefs.has(w.ref));
  const usedGuides = guides.filter((g) => out.usedRefs.has(g.ref));
  if (!guides.length && usedWeb.length) {
    emit({ type: "block", block: { type: "notice", tone: "warning", text: `${primary} isn’t in VacayOut’s reviewed guides yet. This answer comes from live web research that our team hasn’t checked — confirm details before you book.` } });
  } else if (usedWeb.length) {
    emit({ type: "block", block: { type: "notice", tone: "info", text: "Parts of this answer come from live web research our team hasn’t reviewed yet (listed under sources)." } });
  }
  if ("retrievedAt" in research && research.stale && usedWeb.length) {
    emit({ type: "block", block: { type: "notice", tone: "warning", text: `Live research is paused for you today, so web details are from ${fmtDay(research.retrievedAt)} and may be out of date.` } });
  }

  const lead = guides[0];
  if (lead && (usedGuides.includes(lead) || !usedWeb.length)) {
    emit({
      type: "block",
      block: {
        type: "destination",
        name: lead.name,
        stateName: lead.kind === "state" ? "India" : (lead.stateName ?? "India"),
        tagline: (lead.summary ?? `VacayOut guide to ${lead.name}`).slice(0, 200),
        ...(lead.hero ? { photo: { src: lead.hero.url, alt: lead.hero.alt.slice(0, 200) }, ...(lead.hero.credit ? { credit: lead.hero.credit.slice(0, 200) } : {}) } : {}),
        ...(out.memory?.days ?? cls.days ? { days: out.memory?.days ?? cls.days ?? undefined } : {}),
        href: lead.href,
      } as Block,
    });
  }

  if (lead && MAP_INTENTS.includes(cls.intent)) {
    const points = mapPoints([
      { name: lead.name, lat: lead.lat, lng: lead.lng, href: lead.href, primary: true },
      ...lead.children.map((c) => ({ name: c.name, lat: c.lat, lng: c.lng, href: c.href && GUIDE_HREF_RE.test(c.href) ? c.href : undefined })),
    ]);
    if (points.length) emit({ type: "block", block: { type: "map", title: points.length > 1 ? `${lead.name} and places nearby` : lead.name, points } });
  }

  for (const b of out.blocks) emit({ type: "block", block: b });
  if (out.blocks.length && BOOK_INTENTS.includes(cls.intent)) {
    const bk = bookingsBlock(lead ? { name: lead.name, kind: lead.kind, stateName: lead.stateName } : { name: primary, kind: "town", stateName: null });
    if (bk) emit({ type: "block", block: bk });
  }
  if (!out.blocks.length) {
    meta.outcome = "nothing_grounded";
    emit({ type: "block", block: { type: "text", text: "I couldn’t put together an answer I can back up from our sources for that. Try asking about one part of the trip at a time." } });
  }

  const guideLinks = (usedGuides.length ? usedGuides : out.blocks.length ? [] : guides).map((g) => ({ name: g.name.slice(0, 200), href: g.href }));
  const seen = new Set<string>();
  const webLinks = usedWeb
    .flatMap((w) => webFacts[Number(w.ref.slice(1)) - 1]?.sources ?? [])
    .filter((src) => (seen.has(src.url) ? false : (seen.add(src.url), true)))
    .slice(0, 12)
    .map((src) => ({ title: (src.title || src.site).slice(0, 200), site: src.site.slice(0, 200), url: src.url, retrieved: "retrievedAt" in research ? isoDay(research.retrievedAt) : isoDay(now) }));
  if (guideLinks.length || webLinks.length) {
    emit({
      type: "block",
      block: { type: "sources", guides: guideLinks, web: webLinks, ...(webLinks.length ? { note: "Web sources were found by live research and haven’t been reviewed by VacayOut yet." } : {}) },
    });
  }
  if (out.followUps.length) emit({ type: "block", block: { type: "suggestions", items: out.followUps } });

  const memory: TripMemory = {
    destination: out.memory?.destination ?? primary,
    days: out.memory?.days ?? cls.days ?? input.memory?.days ?? null,
    travellers: out.memory?.travellers ?? cls.travellers ?? input.memory?.travellers ?? null,
    budget: out.memory?.budget ?? cls.budget ?? input.memory?.budget ?? null,
    month: out.memory?.month ?? cls.month ?? input.memory?.month ?? null,
    interests: out.memory?.interests?.length ? out.memory.interests : cls.interests.slice(0, 6),
    plan: out.memory?.plan ?? input.memory?.plan ?? [],
  };
  return done(out.summary || `Answered about ${primary}.`, memory);
};
