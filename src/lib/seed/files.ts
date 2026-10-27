import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/** Places that existed before the content seed (edited by people); content files may reference them. */
export const PREEXISTING_PLACE_KEYS = ["goa", "himachal-pradesh", "himachal-pradesh/manali"] as const;

export type ContentFileEntry = { name: string; cluster: string; path: string; checksPath: string; raw: unknown };

/**
 * Content files in dependency order: states.json first (it defines the parent
 * states), then one file per destination cluster, then routes/*.json — multi-city
 * itineraries that link places defined in several clusters.
 */
export function listContentFiles(dir: string): ContentFileEntry[] {
  const top = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort((a, b) => (a === "states.json" ? -1 : b === "states.json" ? 1 : a.localeCompare(b)));
  const routesDir = path.join(dir, "routes");
  const routes = existsSync(routesDir) ? readdirSync(routesDir).filter((f) => f.endsWith(".json")).sort() : [];
  const entry = (base: string, name: string, label: string): ContentFileEntry => ({
    name: label,
    cluster: name.replace(/\.json$/, ""),
    path: path.join(base, name),
    checksPath: path.join(base, "checks", name),
    raw: JSON.parse(readFileSync(path.join(base, name), "utf8")),
  });
  return [...top.map((f) => entry(dir, f, f)), ...routes.map((f) => entry(routesDir, f, `routes/${f}`))];
}

/** Every place key any content file defines (used so a single cluster can be checked or seeded on its own). */
export function allPlaceKeys(files: ContentFileEntry[]): Set<string> {
  const keys = new Set<string>(PREEXISTING_PLACE_KEYS);
  for (const f of files) {
    const places = (f.raw as { places?: { key?: unknown }[] }).places ?? [];
    for (const p of places) if (typeof p.key === "string") keys.add(p.key);
  }
  return keys;
}
