import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import type { PublishedSnapshot } from "@/lib/db/schema";
import { snapshotText } from "@/lib/places/publish";
import { isLocalImage } from "@/lib/chat/constants";
import type { GuideDoc } from "./compose";

/**
 * Finds PUBLISHED guides for the places in a request. Every query joins the
 * live place row and requires its current published version, so unpublished
 * or archived content can never be retrieved.
 */
export async function findGuides(names: string[], max = 3): Promise<Omit<GuideDoc, "ref">[]> {
  const db = getDb();
  const found = new Map<string, Omit<GuideDoc, "ref">>();
  // "Hadimba Temple, Manali" → try "Hadimba Temple" then "Manali" (most specific first).
  const candidates = [...new Set(names.flatMap((n) => n.split(",")).map((n) => n.trim()).filter(Boolean))];
  for (const name of candidates.slice(0, 5)) {
    const n = name.trim().slice(0, 80);
    if (!n) continue;
    const rows = await db.execute(sql`
      select sd.place_id, sd.path, sd.name, sd.kind, sd.state_name, pv.snapshot
      from search_documents sd
      join places p on p.id = sd.place_id and p.status = 'published' and p.published_version_id = sd.version_id
      join place_versions pv on pv.id = sd.version_id
      where lower(sd.name) = lower(${n}) or sd.tsv @@ plainto_tsquery('simple', ${n})
      order by (lower(sd.name) = lower(${n})) desc,
               (sd.kind in ('state','region','city','town')) desc,
               ts_rank(sd.tsv, plainto_tsquery('simple', ${n})) desc
      limit 1`);
    for (const r of rows.rows as { place_id: string; path: string; name: string; kind: string; state_name: string | null; snapshot: PublishedSnapshot }[]) {
      if (found.has(r.place_id) || found.size >= max) continue;
      const hero = r.snapshot.place.hero;
      const children = await db.execute(sql`
        select pv.snapshot->'place'->>'name' as name, p.kind, pv.snapshot->'place'->>'summary' as summary,
               (pv.snapshot->'place'->>'lat')::float8 as lat, (pv.snapshot->'place'->>'lng')::float8 as lng, sd.path as href
        from places p join place_versions pv on pv.id = p.published_version_id
        left join search_documents sd on sd.place_id = p.id and sd.version_id = pv.id
        where p.parent_id = ${r.place_id} and p.status = 'published'
        order by p.featured desc, p.name limit 20`);
      found.set(r.place_id, {
        placeId: r.place_id,
        name: r.name,
        kind: r.kind,
        stateName: r.state_name,
        href: r.path,
        summary: r.snapshot.place.summary,
        text: snapshotText(r.snapshot).slice(0, 7000),
        sectionKeys: r.snapshot.sections.map((s) => s.key),
        hero: hero && isLocalImage(hero.url) ? { url: hero.url, alt: hero.alt, credit: [hero.kind === "ai_generated" ? "AI-generated illustration" : null, hero.attribution, hero.license].filter(Boolean).join(" · ") || null } : null,
        lat: r.snapshot.place.lat,
        lng: r.snapshot.place.lng,
        children: (children.rows as { name: string; kind: string; summary: string | null; lat: number | null; lng: number | null; href: string | null }[]).map((c) => ({
          name: c.name,
          kind: c.kind,
          summary: c.summary,
          lat: c.lat,
          lng: c.lng,
          href: c.href,
        })),
      });
    }
  }
  return [...found.values()];
}
