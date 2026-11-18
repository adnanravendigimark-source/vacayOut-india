import type { Name } from "@/components/icons/icon";
import { INDIA_MAP_PATHS } from "./india-map-data";

/** The six regions used on the homepage and /india (the islands are shown with the South). */
export type Zone = "north" | "south" | "east" | "west" | "central" | "northeast";
export const zoneOf = (z: (typeof INDIA_MAP_PATHS)[number]["zone"]): Zone => (z === "islands" ? "south" : z);

export interface RegionState {
  /** Map shape id (one shape can stand for two places, e.g. J&K and Ladakh). */
  id: string;
  name: string;
  slug: string;
}

// The base map predates the Ladakh and DNH–DD reorganisations, so a few shapes need fixing up.
const FIX: Record<string, { name: string; slug: string }[]> = {
  jk: [
    { name: "Jammu and Kashmir", slug: "jammu-and-kashmir" },
    { name: "Ladakh", slug: "ladakh" },
  ],
  dn: [{ name: "Dadra & Nagar Haveli and Daman & Diu", slug: "dadra-and-nagar-haveli-and-daman-and-diu" }],
  dd: [{ name: "Dadra & Nagar Haveli and Daman & Diu", slug: "dadra-and-nagar-haveli-and-daman-and-diu" }],
};
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** The VacayOut states a map shape stands for (usually one; J&K's shape also covers Ladakh). */
export function shapeStates(id: string, name: string): { name: string; slug: string }[] {
  return FIX[id] ?? [{ name, slug: slugify(name) }];
}

function build(): Record<Zone, RegionState[]> {
  const out: Record<Zone, RegionState[]> = { north: [], south: [], east: [], west: [], central: [], northeast: [] };
  const seen = new Set<string>();
  for (const p of INDIA_MAP_PATHS) {
    for (const s of shapeStates(p.id, p.name)) {
      if (seen.has(s.slug)) continue;
      seen.add(s.slug);
      out[zoneOf(p.zone)].push({ id: p.id, ...s });
    }
  }
  for (const z of Object.keys(out) as Zone[]) out[z].sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/** States and UTs in each region, counted from the map itself so the numbers always add up to 36. */
export const REGION_STATES = build();
export const zoneCount = (z: Zone) => REGION_STATES[z].length;

export const REGIONS: { slug: Zone; name: string; icon: Name; line: string }[] = [
  { slug: "north", name: "North India", icon: "palace", line: "Himalaya, deserts and the capital" },
  { slug: "south", name: "South India", icon: "palm", line: "Backwaters, temple towns and islands" },
  { slug: "east", name: "East India", icon: "temple", line: "Temples, deltas and the tea hills" },
  { slug: "west", name: "West India", icon: "sun", line: "Beaches, caves and salt plains" },
  { slug: "central", name: "Central India", icon: "compass", line: "The Ganga, tiger forests and pilgrim towns" },
  { slug: "northeast", name: "Northeast India", icon: "mountain", line: "The seven sisters and Sikkim" },
];
