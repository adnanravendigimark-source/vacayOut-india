import "server-only";
import { getDb } from "../src/lib/db/index.js";
import { places, placeVersions, sections, itineraries, travelGuides, media } from "../src/lib/db/schema.js";
import { eq, inArray } from "drizzle-orm";

async function checkJaipur() {
  const db = getDb();
  const rows = await db
    .select({ id: itineraries.id, slug: itineraries.slug, title: itineraries.title, placeId: itineraries.placeId, snap: itineraries.publishedSnapshot })
    .from(itineraries)
    .where(eq(itineraries.status, "published"));
  for (const r of rows) {
    const s = r.snap as any;
    console.log(`Itinerary: ${r.slug}`);
    console.log(`  s exists: ${!!s}`);
    console.log(`  s.plan exists: ${!!s?.plan}`);
    console.log(`  s.plan.days exists: ${!!s?.plan?.days} (count: ${s?.plan?.days?.length})`);
    if (!s?.plan?.days) {
      console.log(`  --> MISSING DAYS in snapshot for ${r.slug}!`);
    }
  }
}

checkJaipur().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
