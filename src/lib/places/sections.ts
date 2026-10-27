import { z } from "zod";
import type { SectionBody } from "@/lib/db/schema";

/**
 * Definition of every destination-page section: how it is edited and what
 * shape its content must have. The same definitions drive the admin editor,
 * validation on save, publish checks and the public page.
 */
export type SectionShape = "text" | "list" | "faq" | "days" | "budget" | "pairs";

export const SECTION_DEFS = [
  { key: "overview", label: "Overview", shape: "text", required: true, help: "What this place is and who it suits. 2–4 short paragraphs." },
  { key: "highlights", label: "Highlights", shape: "list", required: false, help: "One highlight per line." },
  { key: "things_to_do", label: "Things to do", shape: "list", required: false, help: "One activity per line." },
  { key: "best_time", label: "Best time to visit", shape: "text", required: false, help: "Seasons and what to expect. Only what sources support." },
  { key: "how_to_reach", label: "How to reach", shape: "text", required: false, help: "Air, rail and road access. No timetables or fares." },
  { key: "local_transport", label: "Local transport", shape: "text", required: false, help: "Getting around once there." },
  { key: "travel_tips", label: "Travel tips", shape: "list", required: false, help: "One tip per line." },
  { key: "faqs", label: "FAQs", shape: "faq", required: false, help: "Questions travellers actually ask, with short answers." },
  { key: "itinerary", label: "Suggested itinerary", shape: "days", required: false, help: "One entry per day: a short title and the plan. Only real places." },
  { key: "budget", label: "Budget estimate", shape: "budget", required: false, help: "Assumptions first, then one line per cost with the amount and what it’s based on. Estimates only." },
  { key: "visit_info", label: "Visiting information", shape: "pairs", required: false, help: "Opening hours, entry fees, closed days, booking and the official website — only what an official source states, with the date checked." },
  { key: "where_to_stay", label: "Where to stay", shape: "text", required: false, help: "Areas to stay in and who each suits. No hotel prices or ratings." },
  { key: "food", label: "Food and drink", shape: "list", required: false, help: "Local dishes and where to try them. One per line." },
  { key: "culture_etiquette", label: "Culture and etiquette", shape: "list", required: false, help: "Customs, dress, photography and religious-site etiquette. One per line." },
  { key: "practical_info", label: "Practical information", shape: "pairs", required: false, help: "Money and payments, connectivity, language, what to wear and pack, permits." },
  { key: "safety_health", label: "Safety and health", shape: "pairs", required: false, help: "Safety, health precautions, common scams, accessibility and emergency numbers." },
] as const satisfies readonly { key: string; label: string; shape: SectionShape; required: boolean; help: string }[];

export type SectionKey = (typeof SECTION_DEFS)[number]["key"];
export const SECTION_KEYS = SECTION_DEFS.map((d) => d.key) as SectionKey[];

export function sectionDef(key: string) {
  return SECTION_DEFS.find((d) => d.key === key);
}

const text = z.string().trim().min(1).max(6000);
const line = z.string().trim().min(1).max(500);

const shapes = {
  text: z.object({ text }).strict(),
  list: z.object({ items: z.array(z.object({ body: line }).strict()).min(1).max(30) }).strict(),
  faq: z
    .object({ items: z.array(z.object({ title: line, body: z.string().trim().min(1).max(2000) }).strict()).min(1).max(20) })
    .strict(),
  days: z
    .object({ items: z.array(z.object({ title: z.string().trim().min(1).max(120), body: z.string().trim().min(1).max(2000) }).strict()).min(1).max(10) })
    .strict(),
  pairs: z
    .object({ items: z.array(z.object({ title: line, body: z.string().trim().min(1).max(2000) }).strict()).min(1).max(20) })
    .strict(),
  budget: z
    .object({
      text: z.string().trim().min(1).max(1500),
      items: z.array(z.object({ title: z.string().trim().min(1).max(120), body: z.string().trim().min(1).max(400) }).strict()).min(1).max(20),
    })
    .strict(),
} satisfies Record<SectionShape, z.ZodType<SectionBody>>;

export function validateSectionBody(key: string, body: unknown): { ok: true; body: SectionBody } | { ok: false; error: string } {
  const def = sectionDef(key);
  if (!def) return { ok: false, error: "Unknown section" };
  const r = shapes[def.shape].safeParse(body);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Invalid content" };
  return { ok: true, body: r.data };
}

/** Builds a section body from the admin form fields. */
export function bodyFromForm(key: string, form: FormData): unknown {
  const def = sectionDef(key);
  if (!def) return null;
  if (def.shape === "text") return { text: String(form.get("text") ?? "") };
  if (def.shape === "list") {
    const items = String(form.get("items") ?? "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((body) => ({ body }));
    return { items };
  }
  // faq, days, pairs and budget all use title/body rows; budget also has assumptions text.
  const qs = form.getAll("q").map(String);
  const as = form.getAll("a").map(String);
  const items = qs
    .map((q, i) => ({ title: q.trim(), body: (as[i] ?? "").trim() }))
    .filter((it) => it.title || it.body);
  if (def.shape === "budget") return { text: String(form.get("text") ?? ""), items };
  return { items };
}
