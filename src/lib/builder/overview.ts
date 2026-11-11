import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { media, places } from "@/lib/db/schema";
import { INDIA_REGIONS } from "@/lib/places/states";

/** Every state in VacayOut with its hero and how many places it holds, by status. */
export async function stateOverview() {
  const rows = await getDb()
    .select({
      id: places.id,
      name: places.name,
      slug: places.slug,
      status: places.status,
      heroUrl: media.url,
      heroKind: media.kind,
      total: sql<number>`(select count(*) from places c where c.state_id = "places"."id")::int`,
      published: sql<number>`(select count(*) from places c where c.state_id = "places"."id" and c.status = 'published')::int`,
      drafts: sql<number>`(select count(*) from places c where c.state_id = "places"."id" and c.status in ('draft','in_review'))::int`,
    })
    .from(places)
    .leftJoin(media, eq(media.id, places.heroMediaId))
    .where(eq(places.kind, "state"))
    .orderBy(asc(places.name));
  return rows;
}

/** States and union territories that aren't in VacayOut yet (the "Create destination" list). */
export async function missingStates() {
  const have = new Set((await getDb().select({ name: places.name }).from(places).where(eq(places.kind, "state"))).map((r) => r.name.toLowerCase()));
  return INDIA_REGIONS.filter((r) => !have.has(r.name.toLowerCase()));
}
