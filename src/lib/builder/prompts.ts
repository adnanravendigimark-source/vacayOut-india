/**
 * Prompts and output schemas for the cheap writing model. The model only
 * ever sees numbered source sentences; every fact it states must cite them,
 * and every section must cite facts — pack.ts throws away anything that
 * doesn't. Pure: no I/O.
 */
import { TRIP_TYPES } from "@/lib/places/trip-types";
import { ACTIVITY_CATEGORIES } from "@/lib/places/categories";

export const RULES = `RULES
- Use ONLY the numbered source sentences. Never add facts from memory.
- Every fact cites 1–3 sentence numbers (just the numbers) that state it directly.
- Never write prices, fees, fares, opening hours, phone numbers, timetables, flight or train names, or travel times — even if a sentence has them. Those change; travellers must check current details.
- Skip sentences that read as dated ("as of 2017", "recently", "new airline"), as opinion, or as hotel or shop adverts.
- Prose cites the fact ids it is based on. Anything you can't cite, leave out. Fewer, true items beat many weak ones.
- Plain, friendly British English for Indian travellers. Short sentences. No hype words (nestled, paradise, breathtaking, must-visit, hidden gem). No "VacayOut".
- Don't write fact ids (F1) or sentence numbers inside the prose, and never mention "the source", "the sources" or "the facts" — just state the information.`;

const refs = { type: "array", items: { type: "string" } } as const;
const ints = { type: "array", items: { type: "integer" } } as const;
const textBlock = { type: "object", additionalProperties: false, required: ["text", "facts"], properties: { text: { type: "string" }, facts: refs } } as const;
const lines = { type: "array", items: textBlock } as const;
const faqs = { type: "array", items: { type: "object", additionalProperties: false, required: ["question", "answer", "facts"], properties: { question: { type: "string" }, answer: { type: "string" }, facts: refs } } } as const;
const pairs = { type: "array", items: { type: "object", additionalProperties: false, required: ["label", "detail", "facts"], properties: { label: { type: "string" }, detail: { type: "string" }, facts: refs } } } as const;

const factsSchema = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    required: ["id", "about", "topic", "claim", "claim_type", "sentences"],
    properties: {
      id: { type: "string", description: "F1, F2, …" },
      about: { type: "string", description: "Which place the fact is about: a place ref from PLACES." },
      topic: { type: "string", description: "Short label, e.g. 'Nearest airport', 'History'." },
      claim: { type: "string", description: "One self-contained statement, rewritten in your words." },
      claim_type: { type: "string", enum: ["general", "distance", "rule", "schedule"] },
      sentences: ints,
    },
  },
} as const;

const meta = {
  summary: { type: "string", description: "Card summary, 1–2 sentences, 80–280 characters." },
  seo_title: { type: "string", description: "Under 60 characters, starts with the place name." },
  seo_description: { type: "string", description: "Meta description, 110–160 characters." },
  trip_types: { type: "array", items: { type: "string", enum: TRIP_TYPES.map((t) => t.key) } },
} as const;

export const PLACE_KINDS = ["city", "town", "region", "attraction", "temple", "lake", "viewpoint", "trek", "nature", "museum", "activity"] as const;

/** One page: the destination or state itself. */
const pageSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "category", ...Object.keys(meta), "overview", "highlights", "things_to_do", "best_time", "how_to_reach", "local_transport", "food", "culture_etiquette", "travel_tips", "faqs", "regions"],
  properties: {
    kind: { type: "string", enum: [...PLACE_KINDS] },
    category: { type: "string", enum: ["none", ...ACTIVITY_CATEGORIES.map((c) => c.key)], description: "Only for kind=activity; else none." },
    ...meta,
    overview: { ...textBlock, description: "2–4 short paragraphs (blank line between), at least 140 words: what it is, why people go, who it suits." },
    highlights: lines,
    things_to_do: lines,
    best_time: { ...textBlock, description: "Empty text if the sources say nothing about seasons." },
    how_to_reach: { ...textBlock, description: "Air, rail, road — which hubs, no timetables or fares. Empty if unknown." },
    local_transport: textBlock,
    food: lines,
    culture_etiquette: lines,
    travel_tips: lines,
    faqs,
    regions: { ...pairs, description: "States only: main regions and what each is known for. Else empty." },
  },
} as const;

const sightSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ref", "kind", "category", ...Object.keys(meta), "overview", "highlights", "travel_tips"],
  properties: {
    ref: { type: "string" },
    kind: { type: "string", enum: [...PLACE_KINDS] },
    category: { type: "string", enum: ["none", ...ACTIVITY_CATEGORIES.map((c) => c.key)] },
    ...meta,
    overview: { ...textBlock, description: "2–3 short paragraphs, at least 120 words." },
    highlights: lines,
    travel_tips: lines,
  },
} as const;

export const DESTINATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["facts", "page", "sights", "notes"],
  properties: { facts: factsSchema, page: pageSchema, sights: { type: "array", items: sightSchema }, notes: { type: "string" } },
} as const;

const daySchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "morning", "afternoon", "evening", "stops", "overnight", "facts"],
  properties: {
    title: { type: "string" },
    morning: { type: "string" },
    afternoon: { type: "string" },
    evening: { type: "string" },
    stops: { type: "array", items: { type: "string", description: "Place refs from PLACES, in visiting order." } },
    overnight: { type: "string", description: "Place name where you sleep." },
    facts: refs,
  },
} as const;

export const TRIPS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["itineraries", "guides", "notes"],
  properties: {
    notes: { type: "string" },
    itineraries: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", ...Object.keys(meta), "overview", "start", "end", "season", "transport", "days", "booking", "alternatives", "tips", "facts"],
        properties: {
          title: { type: "string", description: "e.g. '4 days in Coorg and Mysore'" },
          ...meta,
          overview: { type: "string" },
          start: { type: "string" },
          end: { type: "string" },
          season: { type: "string", description: "When this plan works best, from facts; empty if unknown." },
          transport: { type: "string" },
          days: { type: "array", items: daySchema },
          booking: { type: "array", items: { type: "object", additionalProperties: false, required: ["item", "detail"], properties: { item: { type: "string" }, detail: { type: "string" } } } },
          alternatives: { type: "array", items: { type: "string" } },
          tips: { type: "array", items: { type: "string" } },
          facts: refs,
        },
      },
    },
    guides: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", ...Object.keys(meta), "intro", "sections", "checklist", "places", "facts"],
        properties: {
          title: { type: "string" },
          ...meta,
          intro: { type: "string", description: "40–120 words." },
          sections: { type: "array", items: { type: "object", additionalProperties: false, required: ["heading", "text", "facts"], properties: { heading: { type: "string" }, text: { type: "string" }, facts: refs } } },
          checklist: { type: "array", items: { type: "string" } },
          places: refs,
          facts: refs,
        },
      },
    },
  },
} as const;

export function destinationPrompt(input: { name: string; isState: boolean; location: string; places: string; sentences: string }) {
  return `You research travel content for VacayOut, an India travel planner.
Write the ${input.isState ? "STATE overview page" : "destination page"} for ${input.name} (${input.location})${input.isState ? "" : " and a short page for each sight in PLACES"}.

${RULES}
- First extract facts (F1…), then write the pages citing those facts.
- ${input.isState ? "This is a state page: overview, regions, highlights (best-known destinations), best time, how to reach, getting around, food, culture, tips and FAQs for the whole state. sights must be []." : "Write one entry in sights for each sight ref in PLACES that the sentences describe (skip ones with too little material). The destination page must not repeat the sight pages: summarise them in highlights."}
- Lists: 3–8 items each when the sources support it; [] otherwise. FAQs: 3–6, only questions the facts answer.

PLACES
${input.places}

SOURCE SENTENCES
${input.sentences}`;
}

export function tripsPrompt(input: { area: string; places: string; facts: string; itineraries: string; guides: string }) {
  return `You plan trips for VacayOut, an India travel planner, using ONLY the researched facts below for ${input.area}.

${RULES}
- Itineraries: ${input.itineraries}. Every day has morning, afternoon and evening plans with a meal or rest break, stops that are place refs from PLACES in a sensible geographic order, and an overnight place. Don't put far-apart places on the same day; when moving between bases, say it is a travel day and suggest checking current road or rail options. Don't state distances or journey times unless a fact gives them. alternatives: 2–4 ways to shorten, extend or swap parts of the plan. booking: what to arrange in advance (stays, permits) — no prices.
- Cite facts ONLY in the "facts" lists, as bare ids exactly as written below (e.g. "mysore-F3"). Never put ids or brackets in any text.
- Guides: ${input.guides}. Each guide answers a question travellers ask before the trip, has 3–6 sections (heading + 1–3 paragraphs) citing facts, a short checklist, and lists the place refs it mentions. Don't repeat the place pages word for word; organise the facts around the traveller's question.

PLACES (ref — name — kind)
${input.places}

FACTS (id — place — claim)
${input.facts}`;
}
