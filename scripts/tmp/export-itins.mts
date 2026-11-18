import "server-only";
import { getDb } from "../../src/lib/db/index.js";
import { itineraries, places } from "../../src/lib/db/schema.js";
import { eq, inArray } from "drizzle-orm";
import { writeFileSync } from "node:fs";
const slugs = process.argv.slice(2);
const rows = await getDb().select({ it: itineraries, pslug: places.slug, pname: places.name, pkind: places.kind, parent: places.parentId }).from(itineraries).innerJoin(places, eq(places.id, itineraries.placeId)).where(inArray(itineraries.slug, slugs));
for (const r of rows) writeFileSync(`.tmp-itins/${r.it.slug}.json`, JSON.stringify({ place: r.pslug, placeName: r.pname, kind: r.pkind, slug: r.it.slug, title: r.it.title, summary: r.it.summary, durationDays: r.it.durationDays, tripTypes: r.it.tripTypes, seoTitle: r.it.seoTitle, seoDescription: r.it.seoDescription, plan: r.it.plan }, null, 1));
console.log(rows.length); process.exit(0);
