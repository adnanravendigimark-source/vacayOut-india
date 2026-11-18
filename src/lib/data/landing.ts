import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import type { PublishedSnapshot } from "@/lib/db/schema";
import { listDirectory } from "@/lib/places/repo";
import { listPublishedItineraries } from "@/lib/itineraries/service";
import { listPublishedGuides } from "@/lib/guides/service";
import { kindLabel } from "@/lib/places/kinds";
import type { ExamplePrompt } from "./types";

/**
 * Data for the /landingpage journey. Everything that names a place, a trip or a
 * number comes from published records; nothing here uses destination photos.
 */

export type LandingPlace = {
  name: string;
  href: string;
  kind: string;
  label: string;
  stateName: string;
  stateSlug: string;
  summary: string;
  lat: number | null;
  lng: number | null;
};

export type LandingState = { name: string; slug: string; href: string; places: number; top: { name: string; href: string }[] };

export type LandingTrip = {
  title: string;
  states: string[];
  href: string;
  summary: string;
  durationDays: number;
  days: { title: string; overnight: string | null; stops: string[] }[];
  route: { name: string; lat: number; lng: number }[];
};

const stripDay = (t: string) => t.replace(/^day\s*\d+\s*[:.–-]\s*/i, "");

export type LandingData = {
  counts: { states: number; places: number; experiences: number; itineraries: number; guides: number };
  states: LandingState[];
  experiences: LandingPlace[];
  trip: LandingTrip | null;
  trust: { sources: number | null; quotes: number | null; official: number | null };
  /** Most-cited source sites, for the proof marquee. */
  sourceSites: string[];
  /** Featured place names for the hero ticker. */
  ticker: { name: string; href: string }[];
  examples: ExamplePrompt[];
};

const EXPERIENCE_KINDS = new Set(["activity", "trek"]);
const CATEGORY_LABEL: Record<string, string> = {
  adventure: "Adventure", nature: "Nature & wildlife", culture: "Culture", spiritual: "Spiritual", wellness: "Wellness",
  food_shopping: "Food & markets", events: "Festivals & events", nightlife: "Nightlife",
};

const EXAMPLES: ExamplePrompt[] = [
  { label: "5 days in Rajasthan", prompt: "Plan 5 days in Rajasthan for a family, forts and food", icon: "route" },
  { label: "Himalaya road trip", prompt: "A 7-day Himalayan road trip from Delhi in October", icon: "mountain" },
  { label: "Kerala slow trip", prompt: "A relaxed week in Kerala: backwaters, tea hills and beaches", icon: "palm" },
  { label: "Temple trail", prompt: "A 4-day temple trail in Tamil Nadu", icon: "temple" },
];

async function topSites(): Promise<string[]> {
  try {
    const r = await getDb().execute(sql`select site from sources group by site order by count(*) desc limit 18`);
    return (r.rows as { site: string }[]).map((x) => x.site).filter(Boolean);
  } catch {
    return [];
  }
}

async function count(q: ReturnType<typeof sql>): Promise<number | null> {
  try {
    const r = await getDb().execute(q);
    const n = Number((r.rows[0] as { n?: number | string } | undefined)?.n);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export async function getLandingData(): Promise<LandingData> {
  const [groups, its, guides, sources, quotes, official, sourceSites] = await Promise.all([
    listDirectory().catch(() => [] as Awaited<ReturnType<typeof listDirectory>>),
    listPublishedItineraries().catch(() => []),
    listPublishedGuides().catch(() => []),
    count(sql`select count(*)::int as n from sources`),
    count(sql`select count(*)::int as n from finding_evidence`),
    count(sql`select count(*)::int as n from sources where authority = 'government'`),
    topSites(),
  ]);

  const coords = new Map<string, { name: string; lat: number; lng: number; state: string }>();
  const states: LandingState[] = [];
  const experiences: LandingPlace[] = [];
  let placeCount = 0;

  for (const g of groups) {
    const st = g.state.snapshot as PublishedSnapshot;
    const stateSlug = g.state.slug;
    const stateHref = `/india/${stateSlug}`;
    placeCount += g.places.length;
    const top = g.places
      .filter((p) => ["city", "town", "region"].includes(p.kind))
      .sort((a, b) => Number(b.featured) - Number(a.featured))
      .slice(0, 4)
      .map((p) => ({ name: (p.snapshot as PublishedSnapshot).place.name, href: `${stateHref}/${p.slug}` }));
    states.push({ name: st.place.name, slug: stateSlug, href: stateHref, places: g.places.length, top });
    for (const p of g.places) {
      const s = (p.snapshot as PublishedSnapshot).place;
      if (s.lat != null && s.lng != null) {
        const c = { name: s.name, lat: s.lat, lng: s.lng, state: st.place.name };
        coords.set(p.slug, c);
        coords.set(`${stateSlug}/${p.slug}`, c);
      }
      if (EXPERIENCE_KINDS.has(p.kind)) {
        experiences.push({
          name: s.name, href: `${stateHref}/${p.slug}`, kind: p.kind,
          label: p.kind === "trek" ? "Trek" : (p.category && CATEGORY_LABEL[p.category]) || kindLabel(p.kind),
          stateName: st.place.name, stateSlug, summary: s.summary ?? "", lat: s.lat, lng: s.lng,
        });
      }
    }
  }

  // Spread experiences across states and categories: round-robin by state, featured first within a state.
  const byState = new Map<string, LandingPlace[]>();
  for (const e of experiences) byState.set(e.stateSlug, [...(byState.get(e.stateSlug) ?? []), e]);
  const spread: LandingPlace[] = [];
  for (let i = 0; spread.length < 12 && i < 6; i++) for (const list of byState.values()) if (list[i] && spread.length < 12) spread.push(list[i]);

  // A real multi-stop itinerary for the "build your trip" chapter: prefer one that crosses states, 4–8 days.
  let trip: LandingTrip | null = null;
  const candidates = its
    .map((it) => {
      const stops = it.plan.days.flatMap((d) => d.stops);
      const route: LandingTrip["route"] = [];
      const states = new Set<string>();
      for (const s of stops) {
        const c = s.placeSlug ? coords.get(s.placeSlug) : undefined;
        if (!c) continue;
        states.add(c.state);
        if (!route.some((r) => r.name === c.name)) route.push({ name: c.name, lat: c.lat, lng: c.lng });
      }
      const spanLat = route.length ? Math.max(...route.map((r) => r.lat)) - Math.min(...route.map((r) => r.lat)) : 0;
      const spanLng = route.length ? Math.max(...route.map((r) => r.lng)) - Math.min(...route.map((r) => r.lng)) : 0;
      const score = (route.length >= 3 ? 10 : 0) + Math.min(spanLat + spanLng, 12) + 8 * Math.min(states.size - 1, 3) + (it.durationDays >= 4 && it.durationDays <= 8 ? 5 : 0);
      return { it, route, score, states: [...states] };
    })
    .filter((c) => c.route.length >= 2)
    .sort((a, b) => b.score - a.score);
  if (candidates[0]) {
    const { it, route, states } = candidates[0];
    trip = {
      title: it.title, states, href: `/itineraries/${it.slug}`, summary: it.summary, durationDays: it.durationDays, route,
      days: it.plan.days.map((d) => ({ title: stripDay(d.title), overnight: d.overnight ?? null, stops: d.stops.map((s) => s.name).slice(0, 4) })),
    };
  }

  const ticker = groups
    .flatMap((g) => g.places.filter((p) => p.featured && ["city", "town", "region"].includes(p.kind)).map((p) => ({ name: (p.snapshot as PublishedSnapshot).place.name, href: `/india/${g.state.slug}/${p.slug}` })))
    .slice(0, 24);

  return {
    counts: { states: states.length, places: placeCount, experiences: experiences.length, itineraries: its.length, guides: guides.length },
    states,
    experiences: spread,
    trip,
    trust: { sources, quotes, official },
    sourceSites,
    ticker,
    examples: EXAMPLES,
  };
}
