import "server-only";
import { getDb } from "../src/lib/db/index.js";
import { places, placeVersions, media } from "../src/lib/db/schema.js";
import { eq } from "drizzle-orm";

async function main() {
  const db = getDb();
  const rows = await db.select({ id: places.id, slug: places.slug, name: places.name, kind: places.kind, status: places.status, parentId: places.parentId }).from(places);
  const uk = rows.filter(r => /uttar|rishikesh|nainital|haridwar|dehradun|mussoorie|corbett|kedarnath|badrinath|auli/i.test(r.slug) || /uttar|rishikesh|nainital|haridwar|dehradun|mussoorie|corbett|kedarnath|badrinath|auli/i.test(r.name));
  console.log("Uttarakhand related places in DB:", uk);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
