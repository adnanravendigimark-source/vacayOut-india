/**
 * Trip types used for "Find your kind of trip". A place gets a type only when
 * an editor ticks it; generation may *suggest* types, never set them.
 */
export const TRIP_TYPES = [
  { key: "mountains", label: "Mountains & hills", icon: "mountain", prompt: "Suggest a mountain or hill trip in India" },
  { key: "beaches", label: "Beaches & coast", icon: "waves", prompt: "Suggest a beach trip in India" },
  { key: "heritage", label: "Heritage & history", icon: "palace", prompt: "Suggest a heritage and history trip in India" },
  { key: "spiritual", label: "Spiritual journeys", icon: "temple", prompt: "Suggest a spiritual or pilgrimage trip in India" },
  { key: "nature", label: "Nature & outdoors", icon: "compass", prompt: "Suggest a nature trip in India" },
  { key: "wildlife", label: "Wildlife", icon: "paw", prompt: "Suggest a wildlife trip in India" },
  { key: "food", label: "Food & culture", icon: "utensils", prompt: "Suggest a food and culture trip in India" },
  { key: "adventure", label: "Adventure & treks", icon: "route", prompt: "Suggest an adventure or trekking trip in India" },
  { key: "family", label: "Family holidays", icon: "family", prompt: "Suggest a family-friendly trip in India" },
  { key: "romantic", label: "Couples & honeymoon", icon: "heart", prompt: "Suggest a trip in India for a couple or honeymoon" },
  { key: "weekend", label: "Short breaks", icon: "calendar", prompt: "Suggest a 2–3 day short break in India" },
] as const;

export type TripTypeKey = (typeof TRIP_TYPES)[number]["key"];

const KEYS = new Set<string>(TRIP_TYPES.map((t) => t.key));

/** Keeps only known trip types, in the canonical order, without duplicates. */
export function cleanTripTypes(values: readonly unknown[]): TripTypeKey[] {
  const picked = new Set(values.filter((v): v is string => typeof v === "string" && KEYS.has(v)));
  return TRIP_TYPES.map((t) => t.key).filter((k) => picked.has(k));
}

export const tripTypeLabel = (key: string) => TRIP_TYPES.find((t) => t.key === key)?.label ?? key;
