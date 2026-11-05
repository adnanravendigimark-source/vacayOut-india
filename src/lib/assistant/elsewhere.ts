import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

export type OtherGuide = { name: string; path: string; stateSlug: string; placeSlug: string | null };

const PATH_RE = /^\/india\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/;

/**
 * When a visitor on one page asks about another place ("best time for Kedarnath"
 * on the Rishikesh page), find that place's PUBLISHED guide by name. Only whole
 * names of 4+ characters that appear in the question count; a named place beats
 * its state, longer names beat shorter ones, and the same state comes first.
 * One small query; no AI.
 */
export async function findGuideNamedIn(question: string, current: { stateSlug: string; placeSlug: string | null }): Promise<OtherGuide | null> {
  const q = ` ${question} `;
  const here = current.placeSlug ? `/india/${current.stateSlug}/${current.placeSlug}` : `/india/${current.stateSlug}`;
  const rows = await getDb().execute(sql`
    select sd.name, sd.path
    from search_documents sd
    join places p on p.id = sd.place_id and p.status = 'published' and p.published_version_id = sd.version_id
    where length(sd.name) >= 4
      and sd.path <> ${here}
      and position(' ' || trim(regexp_replace(lower(sd.name), '[^a-z0-9]+', ' ', 'g')) || ' ' in ${q}) > 0
    order by (sd.kind = 'state') asc,
             length(sd.name) desc,
             (sd.path like ${`/india/${current.stateSlug}%`}) desc
    limit 3`);
  for (const r of rows.rows as { name: string; path: string }[]) {
    const m = PATH_RE.exec(r.path);
    if (m) return { name: r.name, path: r.path, stateSlug: m[1], placeSlug: m[2] ?? null };
  }
  return null;
}
