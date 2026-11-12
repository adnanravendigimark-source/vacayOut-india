import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import type { Candidate } from "./discover";
import { validHero, validHref } from "./discover";

/**
 * Published states, plus regions, cities and towns that have a best-time
 * section or are featured. Cached in memory for 10 minutes: the list only
 * changes when an editor publishes.
 */
let cache: { at: number; rows: Candidate[] } | null = null;
const TTL = 10 * 60_000;

const one = (t: string | null, n: number) => {
  const s = (t ?? "").replace(/\s+/g, " ").trim();
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
};

type Row = { path: string; name: string; kind: string; state_name: string | null; summary: string | null; hero: { url?: string; alt?: string; kind?: string; attribution?: string; license?: string } | null; best_time: string | null };

function toCandidates(rows: Row[]): Candidate[] {
  return rows
    .filter((r) => validHref(r.path))
    .map((r, i): Candidate => ({
      ref: `G${i + 1}`,
      name: r.name,
      kind: r.kind,
      stateName: r.state_name,
      href: r.path,
      summary: one(r.summary, 150),
      bestTime: one(r.best_time, 200),
      hero:
        r.hero?.url && validHero(r.hero.url)
          ? { url: r.hero.url, alt: r.hero.alt ?? r.name, credit: [r.hero.kind === "ai_generated" ? "AI-generated illustration" : null, r.hero.attribution, r.hero.license].filter(Boolean).join(" · ") || null }
          : null,
    }));
}

const BEST = sql`(select concat_ws(' ', s->'body'->>'text',
                     (select string_agg(concat_ws(': ', i->>'title', i->>'body'), '; ')
                        from jsonb_array_elements(coalesce(s->'body'->'items', '[]'::jsonb)) i))
              from jsonb_array_elements(pv.snapshot->'sections') s where s->>'key' = 'best_time' limit 1)`;

const scoped = new Map<string, { at: number; rows: Candidate[] }>();

/** Places inside one state (by state name), for "best places in Kerala". Empty if the name isn't a published state. */
export async function stateCandidates(stateName: string): Promise<Candidate[]> {
  const key = stateName.trim().toLowerCase().slice(0, 80);
  const hit = scoped.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.rows;
  const res = await getDb().execute(sql`
    select sd.path, sd.name, sd.kind, sd.state_name,
           pv.snapshot->'place'->>'summary' as summary, pv.snapshot->'place'->'hero' as hero, ${BEST} as best_time
    from search_documents sd
    join places p on p.id = sd.place_id and p.status = 'published' and p.published_version_id = sd.version_id
    join place_versions pv on pv.id = sd.version_id
    where lower(sd.state_name) = ${key} and sd.kind <> 'state'
      and coalesce(pv.snapshot->'place'->>'displayMode', 'page') = 'page'
    order by p.featured desc, (sd.kind in ('region','city','town')) desc, sd.name
    limit 60`);
  const rows = toCandidates(res.rows as Row[]);
  if (scoped.size > 50) scoped.clear();
  scoped.set(key, { at: Date.now(), rows });
  return rows;
}

export async function discoveryCandidates(): Promise<Candidate[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.rows;
  const res = await getDb().execute(sql`
    select sd.path, sd.name, sd.kind, sd.state_name,
           pv.snapshot->'place'->>'summary' as summary,
           pv.snapshot->'place'->'hero' as hero,
           (select concat_ws(' ', s->'body'->>'text',
                     (select string_agg(concat_ws(': ', i->>'title', i->>'body'), '; ')
                        from jsonb_array_elements(coalesce(s->'body'->'items', '[]'::jsonb)) i))
              from jsonb_array_elements(pv.snapshot->'sections') s where s->>'key' = 'best_time' limit 1) as best_time
    from search_documents sd
    join places p on p.id = sd.place_id and p.status = 'published' and p.published_version_id = sd.version_id
    join place_versions pv on pv.id = sd.version_id
    where sd.kind = 'state'
       or (sd.kind in ('region', 'city', 'town')
           and (p.featured or exists (select 1 from jsonb_array_elements(pv.snapshot->'sections') s where s->>'key' = 'best_time')))
    order by (sd.kind = 'state') desc, sd.name
    limit 140`);
  const rows = toCandidates(res.rows as Row[]);
  cache = { at: Date.now(), rows };
  return rows;
}

/** Strips a generic suffix so "Kedarkantha Trek" can also match a guide called "Kedarkantha". */
const SUFFIX = / (trek|trail|hike|national park|wildlife sanctuary|tiger reserve|beach|hill station|town|city)$/i;

export type GuideMatch = { name: string; href: string; photo?: { src: string; alt: string }; credit?: string; lat: number | null; lng: number | null };

/**
 * Finds our published guide for each place name (exact name, case-insensitive,
 * then without a generic suffix). Pages shown only as a section of a parent are skipped.
 */
export async function matchGuides(names: string[]): Promise<Map<string, GuideMatch>> {
  const out = new Map<string, GuideMatch>();
  const want = new Map<string, string>(); // variant → original (lower-cased)
  for (const n of names.slice(0, 12)) {
    const k = n.trim().toLowerCase().slice(0, 80);
    if (!k) continue;
    if (!want.has(k)) want.set(k, k);
    const bare = k.replace(SUFFIX, "");
    if (bare !== k && bare.length > 2 && !want.has(bare)) want.set(bare, k);
  }
  if (!want.size) return out;
  const keys = [...want.keys()];
  const res = await getDb().execute(sql`
    select distinct on (lower(sd.name)) lower(sd.name) as key, sd.path, sd.name,
           pv.snapshot->'place'->'hero' as hero,
           (pv.snapshot->'place'->>'lat')::float8 as lat, (pv.snapshot->'place'->>'lng')::float8 as lng
    from search_documents sd
    join places p on p.id = sd.place_id and p.status = 'published' and p.published_version_id = sd.version_id
    join place_versions pv on pv.id = sd.version_id
    where lower(sd.name) in (${sql.join(keys.map((k) => sql`${k}`), sql`, `)})
      and coalesce(pv.snapshot->'place'->>'displayMode', 'page') = 'page'
    order by lower(sd.name), (sd.kind in ('state','region','city','town')) desc, p.featured desc`);
  type R = { key: string; path: string; name: string; hero: Row["hero"]; lat: number | null; lng: number | null };
  for (const r of res.rows as R[]) {
    if (!validHref(r.path)) continue;
    const orig = want.get(r.key);
    if (!orig || out.has(orig)) continue;
    const h = r.hero;
    const credit = h ? [h.kind === "ai_generated" ? "AI-generated illustration" : null, h.attribution, h.license].filter(Boolean).join(" · ") : "";
    out.set(orig, {
      name: r.name,
      href: r.path,
      ...(h?.url && validHero(h.url) ? { photo: { src: h.url, alt: one(h.alt ?? r.name, 200) || r.name } } : {}),
      ...(credit ? { credit: one(credit, 200) } : {}),
      lat: r.lat,
      lng: r.lng,
    });
  }
  return out;
}
