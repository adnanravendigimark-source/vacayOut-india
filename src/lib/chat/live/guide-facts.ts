import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import type { PublishedSnapshot } from "@/lib/db/schema";
import { factsFromSnapshot, namedIn, type Dest } from "./guide-facts-core";

/**
 * Short facts from our PUBLISHED guides for the destinations a question names
 * (best time, how to reach, altitude, days needed…), added to the prompt so
 * the model answers from reviewed data where we have it. Kept to about 300
 * tokens; whole guides are never sent. Names and facts are cached in memory
 * for a few minutes per server instance.
 */

const TTL = 10 * 60_000;
const MAX_CHARS = 1_200; // ≈ 300 tokens

let index: { at: number; list: Dest[] } | null = null;
const factCache = new Map<string, { at: number; text: string }>();

async function destinations(): Promise<Dest[]> {
  if (index && Date.now() - index.at < TTL) return index.list;
  const res = await getDb().execute(sql`
    select distinct on (lower(sd.name)) lower(sd.name) as key, sd.name, sd.place_id
    from search_documents sd
    join places p on p.id = sd.place_id and p.status = 'published' and p.published_version_id = sd.version_id
    where sd.kind in ('state', 'region', 'city', 'town')
    order by lower(sd.name), array_position(array['city','town','region','state'], sd.kind::text)`);
  const list = (res.rows as { key: string; name: string; place_id: string }[])
    .filter((r) => r.key.length >= 3)
    .map((r) => ({ key: r.key, name: r.name, placeId: r.place_id }))
    // Longest first, so "Old Goa" wins over "Goa".
    .sort((a, b) => b.key.length - a.key.length);
  index = { at: Date.now(), list };
  return list;
}

async function factsFor(d: Dest, budget: number): Promise<string> {
  const hit = factCache.get(d.placeId);
  if (hit && Date.now() - hit.at < TTL) return hit.text;
  const res = await getDb().execute(sql`
    select pv.snapshot->'sections' as sections
    from places p join place_versions pv on pv.id = p.published_version_id
    where p.id = ${d.placeId} and p.status = 'published' limit 1`);
  const sections = (res.rows[0] as { sections?: PublishedSnapshot["sections"] } | undefined)?.sections ?? [];
  const t = factsFromSnapshot(d.name, { sections }, budget);
  factCache.set(d.placeId, { at: Date.now(), text: t });
  return t;
}

/** Facts for the destinations named in the question (or the trip so far). Never throws. */
export async function guideFacts(question: string, memoryDestination: string | null): Promise<{ text: string; names: string[] }> {
  try {
    const list = await destinations();
    let named = namedIn(question, list);
    if (!named.length && memoryDestination) named = namedIn(memoryDestination, list, 1);
    if (!named.length) return { text: "", names: [] };
    const each = Math.floor(MAX_CHARS / named.length);
    const texts = await Promise.all(named.map((d) => factsFor(d, each)));
    return { text: texts.filter(Boolean).join("\n"), names: named.map((d) => d.name) };
  } catch (err) {
    console.error("[chat] guide facts failed", err instanceof Error ? err.message : err);
    return { text: "", names: [] };
  }
}
