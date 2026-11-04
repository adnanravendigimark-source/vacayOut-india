import "server-only";
import { getPublishedPlace } from "../src/lib/places/repo.js";
import { getDb } from "../src/lib/db/index.js";
import { places } from "../src/lib/db/schema.js";
import { eq, and } from "drizzle-orm";

async function main() {
  const db = getDb();
  const [p] = await db.select().from(places).where(eq(places.slug, "rishikesh")).limit(1);
  console.log("Rishikesh in DB:", p);
  const res = await getPublishedPlace("uttarakhand", "rishikesh");
  console.log("getPublishedPlace result:", res ? "FOUND" : "NULL");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

