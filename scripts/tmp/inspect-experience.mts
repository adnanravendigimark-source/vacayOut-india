// Read-only: what sections experience/attraction pages actually have.
import "server-only";
import { getPublishedPlace } from "../../src/lib/places/repo.js";
import { getDb } from "../../src/lib/db/index.js";
import { places, placeVersions } from "../../src/lib/db/schema.js";
import { and, eq, notInArray } from "drizzle-orm";

const p = await getPublishedPlace("kerala", "alleppey-backwater-houseboat-cruise");
if (p) {
  const s = p.snapshot;
  console.log(JSON.stringify({ kind: s.place.kind, category: (s.place as any).category, keys: Object.keys(s.place), hero: !!s.place.hero, gallery: (s as any).gallery?.length ?? (s.place as any).gallery?.length }, null, 1));
  for (const sec of s.sections) console.log("SECTION", sec.key, "| items:", sec.body.items?.length ?? 0, "| text:", (sec.body.text ?? "").length, "|", JSON.stringify(sec.body).slice(0, 260));
  console.log("TOP KEYS", Object.keys(s));
}
const rows = await getDb().select({ kind: places.kind, snap: placeVersions.snapshot }).from(places).innerJoin(placeVersions, eq(placeVersions.id, places.publishedVersionId)).where(and(eq(places.status, "published"), notInArray(places.kind, ["state", "region", "city", "town"])));
const tally: Record<string, number> = {};
const kinds: Record<string, number> = {};
for (const r of rows) { kinds[r.kind] = (kinds[r.kind] ?? 0) + 1; for (const sec of (r.snap as any).sections) if ((sec.body.items ?? []).length || sec.body.text?.trim()) tally[sec.key] = (tally[sec.key] ?? 0) + 1; }
console.log("TOTAL", rows.length, "KINDS", JSON.stringify(kinds));
console.log("SECTION COVERAGE", JSON.stringify(Object.entries(tally).sort((a, b) => b[1] - a[1])));
process.exit(0);
