// Read-only: hero photo + licence data for the blog posts, written to scripts/tmp/blog-photos.json.
import "server-only";
import { writeFileSync } from "node:fs";
import { getDb } from "../../src/lib/db/index.js";
import { places, placeVersions } from "../../src/lib/db/schema.js";
import { and, eq, inArray } from "drizzle-orm";
const want = process.argv[2].split(",");
const rows = await getDb().select({ id: places.id, slug: places.slug, snap: placeVersions.snapshot }).from(places).innerJoin(placeVersions, eq(placeVersions.id, places.publishedVersionId)).where(and(eq(places.status, "published"), inArray(places.slug, want)));
const out: Record<string, unknown> = {};
for (const r of rows) {
  const s = r.snap as any; const h = s.place.hero;
  out[r.slug] = { id: r.id, name: s.place.name, path: s.place.kind === "state" ? `/india/${s.place.slug}` : `/india/${s.place.state?.slug}/${s.place.slug}`, url: h?.url, alt: h?.alt, kind: h?.kind, license: h?.license, licenseUrl: h?.licenseUrl, attribution: h?.attribution, sourceUrl: h?.sourceUrl };
}
writeFileSync("scripts/tmp/blog-photos.json", JSON.stringify(out, null, 1));
console.log(Object.keys(out).length, "of", want.length, "missing:", want.filter((w) => !out[w]).join(",") || "none");
process.exit(0);
