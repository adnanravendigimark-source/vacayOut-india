import { INDIA_MAP_PATHS } from "@/components/home/india-map-data";

/**
 * Projection for the @svg-maps/india paths (viewBox 0 0 612 696): Mercator,
 * fitted to the state outlines (error under 2 map units across the country).
 */
export function project(lat: number, lng: number): [number, number] {
  const merc = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  return [20.9076 * lng - 1425.29, -1201.637 * merc + 837.37];
}

export type MapZone = (typeof INDIA_MAP_PATHS)[number]["zone"];

/** Map shapes → VacayOut state slugs (the base map predates the Ladakh and DNH-DD reorganisations). */
const SLUG_FIX: Record<string, string[]> = {
  jk: ["jammu-and-kashmir", "ladakh"],
  dn: ["dadra-and-nagar-haveli-and-daman-and-diu"],
  dd: ["dadra-and-nagar-haveli-and-daman-and-diu"],
  an: ["andaman-and-nicobar-islands"],
};
export function slugsOf(id: string, name: string): string[] {
  return SLUG_FIX[id] ?? [name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")];
}

export const ZONE_INFO: Record<MapZone, { title: string; line: string; color: string; ink: string }> = {
  north: { title: "The North", line: "Himalaya, deserts and the capital", color: "#2F55D4", ink: "#F6F3EA" },
  west: { title: "The West", line: "Coasts, caves and Gujarat's salt plains", color: "#C35933", ink: "#F6F3EA" },
  central: { title: "The Heartland", line: "The Ganga, tiger forests and pilgrim towns", color: "#D99A2B", ink: "#1C1A17" },
  east: { title: "The East", line: "Temples, deltas and the tea hills", color: "#1F4A35", ink: "#F6F3EA" },
  northeast: { title: "The Northeast", line: "Seven sisters and Sikkim", color: "#23201C", ink: "#F6F3EA" },
  south: { title: "The South", line: "Backwaters, temple towns and the Ghats", color: "#1E6B73", ink: "#F6F3EA" },
  islands: { title: "The Islands", line: "Andaman, Nicobar and Lakshadweep", color: "#3B3F8C", ink: "#F6F3EA" },
};
export const ZONE_ORDER: MapZone[] = ["north", "west", "central", "east", "northeast", "south", "islands"];
