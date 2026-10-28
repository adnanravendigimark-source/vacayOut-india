/** Things-to-do categories for activity places (filters on the hubs and place pages). */
export const ACTIVITY_CATEGORIES = [
  { key: "adventure", label: "Adventure" },
  { key: "nature", label: "Nature & views" },
  { key: "culture", label: "Culture & heritage" },
  { key: "spiritual", label: "Spiritual" },
  { key: "wellness", label: "Wellness" },
  { key: "food_shopping", label: "Food & shopping" },
  { key: "events", label: "Festivals & events" },
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number]["key"];

const KEYS = new Set<string>(ACTIVITY_CATEGORIES.map((c) => c.key));
export const isCategory = (v: unknown): v is ActivityCategory => typeof v === "string" && KEYS.has(v);
export const categoryLabel = (key: string | null | undefined) => ACTIVITY_CATEGORIES.find((c) => c.key === key)?.label ?? null;
