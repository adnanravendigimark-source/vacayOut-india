import { createHash } from "node:crypto";
import type { PublishedSnapshot } from "@/lib/db/schema";
import type { PlaceRollup, RollupPlace } from "@/lib/places/rollup";
import { sectionDef } from "@/lib/places/sections";
import { kindLabel } from "@/lib/places/kinds";
import type { Note, Pack } from "./types";

/** Where each section is shown on the place page (for "Read more"). */
const ANCHOR: Record<string, string> = {
  overview: "#overview",
  highlights: "#overview",
  who_its_for: "#overview",
  key_facts: "#overview",
  regions: "#regions",
  neighbourhoods: "#areas",
  things_to_do: "#things",
  itinerary: "#itineraries",
  food: "#food",
  shopping: "#food",
  culture_etiquette: "#food",
  faqs: "#faqs",
  visit_info: "#visit",
};
const anchorOf = (key: string) => ANCHOR[key] ?? "#plan";

const LABEL_OVERRIDES: Record<string, string> = { budget: "Fees and costs", key_facts: "Key facts" };

type Related = { name: string; slug: string; kind: string; summary: string | null; type: "nearby" | "day_trip"; stateSlug: string | null };
type Inline = { slug: string; snapshot: PublishedSnapshot };

const paragraphs = (t: string | undefined) => (t ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
const clip = (t: string, n = 600) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

/** Notes for one place's sections. */
function sectionNotes(snap: PublishedSnapshot, add: (n: Omit<Note, "id">) => void, opts: { hrefPrefix?: string; labelPrefix?: string } = {}) {
  for (const s of snap.sections) {
    const def = sectionDef(s.key);
    if (!def) continue;
    const label = `${opts.labelPrefix ?? ""}${LABEL_OVERRIDES[s.key] ?? def.label}`;
    const href = opts.hrefPrefix ?? anchorOf(s.key);
    for (const p of paragraphs(s.body.text)) add({ topic: s.key, label, text: clip(p), href });
    for (const it of s.body.items ?? []) {
      add({ topic: s.key, label, title: it.title?.trim() || undefined, text: clip(it.body), status: it.status, href });
    }
  }
}

export function buildPack(input: {
  snapshot: PublishedSnapshot;
  stateSlug: string;
  rollup?: PlaceRollup;
  inline?: Inline[];
  related?: Related[];
}): Pack {
  const { snapshot, stateSlug } = input;
  const place = snapshot.place;
  const notes: Note[] = [];
  const add = (n: Omit<Note, "id">) => {
    if (n.text.trim()) notes.push({ id: `n${notes.length}`, ...n });
  };
  const inlineSlugs = new Set((input.inline ?? []).map((c) => c.slug));
  const pageOf = (p: RollupPlace) =>
    p.displayMode === "parent_section" && p.parentSlug
      ? inlineSlugs.has(p.slug)
        ? `#${p.slug}`
        : `${p.parentKind === "state" ? `/india/${p.parentSlug}` : `/india/${stateSlug}/${p.parentSlug}`}#${p.slug}`
      : p.kind === "state"
        ? `/india/${p.slug}`
        : `/india/${stateSlug}/${p.slug}`;

  if (place.summary) add({ topic: "overview", label: "Overview", text: place.summary, href: "#overview" });
  sectionNotes(snapshot, add);

  // Places shown inside this page (short records): their own text, opening as a pop-up.
  for (const c of input.inline ?? []) {
    const p = c.snapshot.place;
    if (p.summary) add({ topic: p.kind === "activity" ? "activity" : "attraction", label: kindLabel(p.kind), title: p.name, text: p.summary, href: `#${c.slug}` });
    sectionNotes(c.snapshot, add, { hrefPrefix: `#${c.slug}`, labelPrefix: `${p.name} · ` });
  }

  const r = input.rollup;
  if (r) {
    for (const a of [...r.attractions, ...r.destinations].filter((x) => !inlineSlugs.has(x.slug))) {
      add({ topic: "attraction", label: kindLabel(a.kind), title: a.name, text: a.summary ?? a.name, href: pageOf(a) });
    }
    for (const a of r.activities.filter((x) => !inlineSlugs.has(x.slug))) {
      add({ topic: "activity", label: "Things to do", title: a.name, text: a.summary ?? a.name, href: pageOf(a) });
    }
    for (const it of r.itineraries) {
      add({ topic: "itinerary", label: `${it.durationDays}-day itinerary`, title: it.title, text: `${it.summary}${it.stopNames.length ? ` Stops include ${it.stopNames.join(", ")}.` : ""}`, href: `/itineraries/${it.slug}` });
    }
    for (const g of r.guides) add({ topic: "guide", label: "Travel guide", title: g.title, text: g.summary, href: `/travel-guides/${g.slug}` });
  }
  for (const n of input.related ?? []) {
    const href = n.kind === "state" ? `/india/${n.slug}` : n.stateSlug ? `/india/${n.stateSlug}/${n.slug}` : undefined;
    add({ topic: "nearby", label: n.type === "day_trip" ? "Day trip" : "Nearby", title: n.name, text: n.summary ?? n.name, href });
  }

  const has = (topic: string) => notes.some((n) => n.topic === topic);
  const name = place.name;
  const suggestions = [
    has("best_time") ? `When is the best time to visit ${name}?` : null,
    has("how_to_reach") ? `How do I reach ${name}?` : null,
    has("activity") || has("things_to_do") ? `What are the top things to do in ${name}?` : null,
    has("itinerary") ? `How many days do I need in ${name}?` : null,
    has("budget") ? `What fees should I budget for?` : null,
    has("where_to_stay") ? `Where should I stay in ${name}?` : null,
    has("food") ? `What local food should I try?` : null,
    has("visit_info") ? `What are the opening hours?` : null,
    has("safety_health") ? `Is ${name} safe? Any tips?` : null,
  ].filter((x): x is string => !!x).slice(0, 6);

  const version = createHash("sha256").update(JSON.stringify(notes)).digest("base64url").slice(0, 12);
  return {
    place: { name, kind: place.kind, stateSlug, slug: place.slug, stateName: place.state?.name ?? (place.kind === "state" ? place.name : null) },
    version,
    notes,
    suggestions,
  };
}
