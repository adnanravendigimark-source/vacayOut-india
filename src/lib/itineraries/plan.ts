import { z } from "zod";
import type { ItineraryPlan } from "@/lib/db/schema";
import { TRIP_TYPES } from "@/lib/places/trip-types";
import { SLUG_RE } from "@/lib/places/slug";

/**
 * Shape and limits of a ready-made itinerary. Used by the admin editor, the
 * content seed and publishing, so a plan that reaches a public page has always
 * passed the same checks. Travel times and costs are written as estimates in
 * the text itself ("about 3–4 hours by road"); nothing here invents numbers.
 */

const SLUG = SLUG_RE.source.slice(1, -1);
export const STOP_REF_RE = new RegExp(`^${SLUG}(?:/${SLUG})?$`);

/** "red-fort" → the itinerary's own state; "rajasthan/amber-fort" → that state. */
export function stopRef(ref: string, stateSlug: string | null): { state: string; slug: string } | null {
  const [a, b] = ref.split("/");
  if (b) return { state: a, slug: b };
  return stateSlug ? { state: stateSlug, slug: a } : null;
}

const line = z.string().trim().min(1).max(300);
const para = z.string().trim().min(1).max(1500);

export const planPhotoSchema = z
  .object({
    url: z.string().url(),
    alt: z.string().trim().min(1).max(200),
    caption: z.string().trim().max(200).optional(),
    attribution: z.string().trim().max(200).optional(),
    license: z.string().trim().max(100).optional(),
  })
  .strict();

const stop = z
  .object({
    time: z.string().trim().max(40).optional(),
    name: z.string().trim().min(1).max(120),
    /** Guide to link: "slug" (same state as the itinerary) or "state/slug" (another state). Linked only while that place is published. */
    placeSlug: z.string().regex(STOP_REF_RE, "Use a place slug or state/slug").optional(),
    duration: z.string().trim().max(60).optional(),
    note: z.string().trim().max(500).optional(),
    photo: planPhotoSchema.optional(),
  })
  .strict();

const short = z.string().trim().min(1).max(160).optional();
const metres = z.number().int().min(0).max(8000).optional();

const day = z
  .object({
    title: z.string().trim().min(1).max(120),
    summary: z.string().trim().max(1200).optional(),
    stops: z.array(stop).min(1).max(8),
    travel: z.string().trim().max(600).optional(),
    meals: z.string().trim().max(400).optional(),
    overnight: z.string().trim().max(160).optional(),
    /** Road distance for the day's main move, in km (sourced or a clearly labelled estimate). */
    distanceKm: z.number().min(0).max(2000).optional(),
    /** The day's distance as written (e.g. "222 km", "about 115 km (estimate)"). */
    distance: short,
    /** Driving / journey time as stated by a source (e.g. "About 8 hours (HPTDC)"). */
    driveTime: short,
    transport: short,
    /** Altitude of the night's stop, in metres. */
    altitude: metres,
    /** Highest point crossed that day. */
    highPoint: z.object({ name: z.string().trim().min(1).max(80), altitude: z.number().int().min(0).max(8000) }).strict().optional(),
    /** When this day's road or sights are open (e.g. "Kunzum road: about June–October"). */
    access: short,
    /** Permits or registrations needed that day. */
    permits: short,
    /** Practical warning for the day (fuel, signal, cash, checkpoints). */
    logistics: z.string().trim().max(500).optional(),
    photo: planPhotoSchema.optional(),
    photos: z.array(planPhotoSchema).max(6).optional(),
  })
  .strict();

export const planSchema = z
  .object({
    overview: para,
    /** Trip facts shown at the top. */
    style: short,
    start: short,
    end: short,
    season: z.string().trim().min(1).max(300).optional(),
    difficulty: short,
    transport: z.string().trim().min(1).max(300).optional(),
    days: z.array(day).min(1).max(21),
    budget: z
      .object({
        assumptions: para,
        lines: z.array(z.object({ label: z.string().trim().min(1).max(120), amount: z.string().trim().min(1).max(120), basis: line }).strict()).max(15),
      })
      .strict(),
    booking: z.array(z.object({ item: z.string().trim().min(1).max(120), detail: line }).strict()).max(12),
    alternatives: z.array(line).max(10),
    tips: z.array(line).max(10).optional(),
    /** Preparation notes: permits, fuel, altitude, packing, money and signal. */
    prep: z.array(z.object({ title: z.string().trim().min(1).max(80), body: z.string().trim().min(1).max(800) }).strict()).max(8).optional(),
    faqs: z.array(z.object({ q: z.string().trim().min(1).max(200), a: z.string().trim().min(1).max(1200) }).strict()).max(10).optional(),
  })
  .strict();

const TYPE_KEYS = new Set<string>(TRIP_TYPES.map((t) => t.key));

export const itineraryFieldsSchema = z
  .object({
    slug: z.string().regex(SLUG_RE, "Use lowercase letters, numbers and hyphens"),
    title: z.string().trim().min(3).max(100),
    summary: z.string().trim().min(20).max(300),
    durationDays: z.number().int().min(1).max(21),
    tripTypes: z.array(z.string()).max(6).refine((a) => a.every((t) => TYPE_KEYS.has(t)), "Unknown trip type"),
    seoTitle: z.string().trim().min(10).max(70),
    seoDescription: z.string().trim().min(50).max(170),
    plan: planSchema,
  })
  .refine((v) => v.plan.days.length === v.durationDays, { message: "The plan must have one entry per day", path: ["plan", "days"] });

export type ItineraryFields = z.infer<typeof itineraryFieldsSchema>;

export function validateItinerary(input: unknown): { ok: true; value: ItineraryFields } | { ok: false; error: string } {
  const r = itineraryFieldsSchema.safeParse(input);
  if (r.success) return { ok: true, value: r.data };
  const i = r.error.issues[0];
  return { ok: false, error: i ? `${i.path.join(".") || "itinerary"}: ${i.message}` : "Invalid itinerary" };
}

/** Plain text of a plan (for word counts and the AI search index). */
export function planText(title: string, p: ItineraryPlan): string {
  const parts = [title, p.overview];
  for (const d of p.days) {
    parts.push(d.title, d.summary ?? "", d.travel ?? "", d.meals ?? "", d.overnight ?? "");
    for (const s of d.stops) parts.push(s.name, s.duration ?? "", s.note ?? "");
    parts.push(d.distance ?? "", d.driveTime ?? "", d.transport ?? "", d.access ?? "", d.permits ?? "", d.logistics ?? "");
  }
  parts.push(p.budget.assumptions, ...p.budget.lines.map((l) => `${l.label} ${l.amount} ${l.basis}`));
  parts.push(...p.booking.map((b) => `${b.item} ${b.detail}`), ...p.alternatives, ...(p.tips ?? []));
  parts.push(p.start ?? "", p.end ?? "", p.season ?? "", p.transport ?? "", ...(p.prep ?? []).map((x) => `${x.title} ${x.body}`), ...(p.faqs ?? []).map((f) => `${f.q} ${f.a}`));
  return parts.filter(Boolean).join("\n");
}

export const durationLabel = (days: number) => `${days} day${days === 1 ? "" : "s"}`;
