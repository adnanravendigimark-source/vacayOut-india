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

const stop = z
  .object({
    time: z.string().trim().max(40).optional(),
    name: z.string().trim().min(1).max(120),
    /** Guide to link: "slug" (same state as the itinerary) or "state/slug" (another state). Linked only while that place is published. */
    placeSlug: z.string().regex(STOP_REF_RE, "Use a place slug or state/slug").optional(),
    duration: z.string().trim().max(60).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

const day = z
  .object({
    title: z.string().trim().min(1).max(120),
    summary: z.string().trim().max(600).optional(),
    stops: z.array(stop).min(1).max(8),
    travel: z.string().trim().max(600).optional(),
    meals: z.string().trim().max(400).optional(),
    overnight: z.string().trim().max(160).optional(),
  })
  .strict();

export const planSchema = z
  .object({
    overview: para,
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
  }
  parts.push(p.budget.assumptions, ...p.budget.lines.map((l) => `${l.label} ${l.amount} ${l.basis}`));
  parts.push(...p.booking.map((b) => `${b.item} ${b.detail}`), ...p.alternatives, ...(p.tips ?? []));
  return parts.filter(Boolean).join("\n");
}

export const durationLabel = (days: number) => `${days} day${days === 1 ? "" : "s"}`;
