import "server-only";
import { getDb } from "../src/lib/db/index.js";
import { itineraries } from "../src/lib/db/schema.js";
import { eq } from "drizzle-orm";

async function inspectGoaItin() {
  const db = getDb();
  const [it] = await db.select().from(itineraries).where(eq(itineraries.slug, "goa-4-days")).limit(1);
  if (!it) return;
  console.log("Title:", it.title);
  console.log("Days count:", it.plan.days.length);
  for (let i = 0; i < it.plan.days.length; i++) {
    const d = it.plan.days[i];
    console.log(`Day ${i + 1}: ${d.title}`);
    for (const s of d.stops) {
      console.log(`  - ${s.name} (placeSlug: ${s.placeSlug})`);
    }
  }
}

inspectGoaItin().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

