import "server-only";
import { getDb } from "../src/lib/db/index.js";
import { places, media } from "../src/lib/db/schema.js";
import { eq, inArray } from "drizzle-orm";

async function checkPlaceMedia() {
  const db = getDb();
  const slugs = ["calangute-beach", "fort-aguada", "basilica-of-bom-jesus", "old-goa", "panaji", "dudhsagar-falls", "anjuna-beach", "palolem", "agonda", "colva", "morjim", "arambol", "vagator"];
  const rows = await db
    .select({ slug: places.slug, name: places.name, heroMediaId: places.heroMediaId, m: media })
    .from(places)
    .leftJoin(media, eq(media.id, places.heroMediaId))
    .where(inArray(places.slug, slugs));

  console.log(`Found ${rows.length} places:`);
  for (const r of rows) {
    console.log(`- ${r.name} (${r.slug}): ${r.m ? r.m.url.slice(0, 60) : 'NO MEDIA'}`);
  }
}

checkPlaceMedia().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

