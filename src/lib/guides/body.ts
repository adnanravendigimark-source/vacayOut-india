import { z } from "zod";
import type { GuideBody } from "@/lib/db/schema";
import { SLUG_RE } from "@/lib/places/slug";
import { ITEM_STATUSES } from "@/lib/places/sections";
import { TRIP_TYPES } from "@/lib/places/trip-types";

/** Shape of a travel guide article. Pure (used by the admin, the seed and publishing). */

const item = z
  .object({ title: z.string().trim().min(1).max(160).optional(), body: z.string().trim().min(1).max(1200), status: z.enum(ITEM_STATUSES).optional() })
  .strict();

export const guideBodySchema = z
  .object({
    intro: z.string().trim().min(40).max(1500),
    sections: z
      .array(
        z
          .object({ heading: z.string().trim().min(2).max(120), text: z.string().trim().min(1).max(4000).optional(), items: z.array(item).min(1).max(20).optional() })
          .strict()
          .refine((s) => s.text || s.items, "A section needs text or items"),
      )
      .min(2)
      .max(14),
    checklist: z.array(z.string().trim().min(1).max(300)).max(20).optional(),
  })
  .strict() satisfies z.ZodType<GuideBody>;

const TYPE_KEYS = new Set<string>(TRIP_TYPES.map((t) => t.key));

export const guideFieldsSchema = z
  .object({
    slug: z.string().regex(SLUG_RE, "Use lowercase letters, numbers and hyphens"),
    title: z.string().trim().min(8).max(110),
    summary: z.string().trim().min(20).max(300),
    tripTypes: z.array(z.string()).max(6).refine((a) => a.every((t) => TYPE_KEYS.has(t)), "Unknown trip type"),
    seoTitle: z.string().trim().min(10).max(70),
    seoDescription: z.string().trim().min(50).max(170),
    body: guideBodySchema,
  })
  .strict();

export type GuideFields = z.infer<typeof guideFieldsSchema>;

export function validateGuide(input: unknown): { ok: true; value: GuideFields } | { ok: false; error: string } {
  const r = guideFieldsSchema.safeParse(input);
  if (r.success) return { ok: true, value: r.data };
  const i = r.error.issues[0];
  return { ok: false, error: i ? `${i.path.join(".") || "guide"}: ${i.message}` : "Invalid guide" };
}

/** Plain text of a guide (word counts and the search index). */
export function guideText(title: string, b: GuideBody): string {
  const parts = [title, b.intro];
  for (const s of b.sections) {
    parts.push(s.heading, s.text ?? "");
    for (const it of s.items ?? []) parts.push(`${it.title ?? ""} ${it.body}`);
  }
  parts.push(...(b.checklist ?? []));
  return parts.filter(Boolean).join("\n");
}
