import "server-only";
import { getDb } from "../src/lib/db/index.js";
import { places, placeVersions, sections, itineraries, travelGuides } from "../src/lib/db/schema.js";
import { eq } from "drizzle-orm";

async function checkGoa() {
  const db = getDb();
  const [goa] = await db.select().from(places).where(eq(places.slug, "goa")).limit(1);
  console.log("Goa place:", goa ? { id: goa.id, slug: goa.slug, name: goa.name, kind: goa.kind, status: goa.status, publishedVersionId: goa.publishedVersionId } : "Not found");

  if (goa) {
    const dests = await db.select({ id: places.id, slug: places.slug, name: places.name, kind: places.kind, status: places.status }).from(places).where(eq(places.parentId, goa.id));
    console.log("Goa child places count:", dests.length);
    for (const d of dests) {
      console.log(`- ${d.name} (${d.slug}, kind: ${d.kind}, status: ${d.status})`);
    }

    const secs = await db.select({ key: sections.key, status: sections.status }).from(sections).where(eq(sections.placeId, goa.id));
    console.log("Goa sections count:", secs.length);
    console.log("Goa section keys:", secs.map(s => `${s.key} (${s.status})`));

    const itins = await db.select({ id: itineraries.id, slug: itineraries.slug, title: itineraries.title, status: itineraries.status }).from(itineraries).where(eq(itineraries.placeId, goa.id));
    console.log("Goa itineraries:", itins);

    const guides = await db.select({ id: travelGuides.id, slug: travelGuides.slug, title: travelGuides.title, status: travelGuides.status }).from(travelGuides).where(eq(travelGuides.placeId, goa.id));
    console.log("Goa guides:", guides);
  }
}

checkGoa().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

