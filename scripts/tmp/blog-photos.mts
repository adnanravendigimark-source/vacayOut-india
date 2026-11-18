// Read-only: published places matching blog topics, with hero photo licence and credit.
import "server-only";
import { getDb } from "../../src/lib/db/index.js";
import { places, placeVersions } from "../../src/lib/db/schema.js";
import { and, eq, inArray } from "drizzle-orm";
const want = (process.argv[2] ?? "").split(",");
const rows = await getDb().select({ slug: places.slug, kind: places.kind, displayMode: places.displayMode, snap: placeVersions.snapshot }).from(places).innerJoin(placeVersions, eq(placeVersions.id, places.publishedVersionId)).where(and(eq(places.status, "published"), inArray(places.slug, want)));
for (const r of rows) {
  const s = r.snap as any; const h = s.place.hero;
  const path = s.place.kind === "state" ? `/india/${s.place.slug}` : `/india/${s.place.state?.slug}/${s.place.slug}`;
  console.log(`${r.slug} | ${r.kind}/${r.displayMode} | ${path} | ${h ? `${h.kind} | ${h.license} | ${h.attribution} | ${h.url}` : "NO HERO"}`);
}
process.exit(0);
