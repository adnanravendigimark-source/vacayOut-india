/**
 * Picks the part of a published guide that answers the question, so the model
 * reads a short, relevant excerpt instead of the whole page (fewer tokens,
 * fewer off-topic cards). Pure: no database, no network.
 */
import type { PublishedSnapshot } from "@/lib/db/schema";
import type { Intent } from "./classify";

/** Intents that build a day-by-day plan; they get the wider excerpt and the stronger model. */
export const PLAN_INTENTS: readonly Intent[] = ["plan_trip", "itinerary", "modify_plan"];
export const isPlanIntent = (i: Intent) => PLAN_INTENTS.includes(i);

/** Sections that answer each kind of question, most useful first. */
const SECTIONS: Record<Intent, string[]> = {
  how_to_reach: ["how_to_reach", "local_transport", "key_facts", "faqs"],
  best_time: ["best_time", "key_facts", "highlights", "faqs"],
  budget: ["budget", "where_to_stay", "local_transport", "practical_info", "faqs"],
  things_to_do: ["things_to_do", "highlights", "visit_info", "key_facts", "faqs"],
  stay: ["where_to_stay", "neighbourhoods", "budget", "faqs"],
  food: ["food", "shopping", "faqs"],
  general: ["overview", "key_facts", "faqs", "practical_info", "travel_tips", "safety_health"],
  plan_trip: ["overview", "itinerary", "things_to_do", "highlights", "how_to_reach", "best_time", "where_to_stay", "local_transport", "travel_tips"],
  itinerary: ["itinerary", "things_to_do", "highlights", "how_to_reach", "best_time", "where_to_stay", "local_transport", "travel_tips"],
  discover: ["best_time", "highlights", "overview"],
  modify_plan: ["itinerary", "things_to_do", "highlights", "where_to_stay", "local_transport", "budget", "travel_tips"],
};

export const excerptBudget = (intent: Intent) => (isPlanIntent(intent) ? 5000 : 2000);

function sectionText(s: PublishedSnapshot["sections"][number]): string {
  const parts: string[] = [];
  if (s.body.text) parts.push(s.body.text);
  for (const it of s.body.items ?? []) parts.push(it.title ? `${it.title}: ${it.body}` : it.body);
  return parts.join("\n").trim();
}

/**
 * The guide's name and summary, then the sections for this intent, then the
 * rest of the page while there is room. Cut at a line break, never mid-word.
 */
export function focusedText(snap: PublishedSnapshot, intent: Intent, max = excerptBudget(intent)): string {
  const wanted = SECTIONS[intent] ?? SECTIONS.general;
  const order = [
    ...wanted.map((k) => snap.sections.find((s) => s.key === k)).filter((s): s is NonNullable<typeof s> => Boolean(s)),
    ...snap.sections.filter((s) => !wanted.includes(s.key)),
  ];
  let out = [snap.place.name, snap.place.summary ?? ""].filter(Boolean).join("\n");
  for (const s of order) {
    const t = sectionText(s);
    if (!t) continue;
    const next = `${out}\n\n${t}`;
    if (next.length <= max) {
      out = next;
      continue;
    }
    // Room for part of this section: keep whole lines only.
    const room = max - out.length - 2;
    if (room > 200) {
      const cut = t.slice(0, room);
      const nl = cut.lastIndexOf("\n");
      out = `${out}\n\n${nl > 80 ? cut.slice(0, nl) : cut.slice(0, cut.lastIndexOf(" "))}`;
    }
    break;
  }
  return out.trim();
}
