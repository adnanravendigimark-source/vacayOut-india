import type { ItemStatus } from "@/lib/db/schema";

/**
 * The page assistant's knowledge: everything a place page shows, flattened into
 * short searchable notes. Built on the server from the published snapshot and
 * passed to the browser, so most answers need no server call at all.
 */
export type Note = {
  /** Stable within one pack: "s3" etc. */
  id: string;
  /** Section key (best_time, faqs…) or a record type (activity, itinerary…). */
  topic: string;
  /** Human label shown on answer cards ("How to reach"). */
  label: string;
  /** Item title or FAQ question, when there is one. */
  title?: string;
  text: string;
  status?: ItemStatus;
  /** Where "Read more" goes: an anchor on this page or another page. */
  href?: string;
};

export type Pack = {
  place: { name: string; kind: string; stateSlug: string; slug: string; stateName: string | null };
  /** Changes whenever the published content changes (used to cache AI answers). */
  version: string;
  notes: Note[];
  /** Ready-made questions shown as chips, each answerable from the notes. */
  suggestions: string[];
};

export type LocalAnswer = {
  /** high: answer shown without AI; low: a best guess; none: nothing relevant. */
  confidence: "high" | "low" | "none";
  notes: Note[];
  /** Topics covered on this page, offered when nothing matched. */
  topics: { label: string; question: string }[];
};
