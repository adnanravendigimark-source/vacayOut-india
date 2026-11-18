// Read-only: experience pages with the most sections, to test the layout.
import "server-only";
import { getDb } from "../../src/lib/db/index.js";
import { places, placeVersions } from "../../src/lib/db/schema.js";
import { and, eq, notInArray } from "drizzle-orm";
const rows = await getDb().select({ slug: places.slug, kind: places.kind, snap: placeVersions.snapshot }).from(places).innerJoin(placeVersions, eq(placeVersions.id, places.publishedVersionId)).where(and(eq(places.status, "published"), eq(places.displayMode, "page"), notInArray(places.kind, ["state", "region", "city", "town"])));
const scored = rows.map((r) => { const s = r.snap as any; const n = s.sections.filter((x: any) => (x.body.items ?? []).length || x.body.text?.trim()).length; return { url: `/india/${s.place.state?.slug}/${r.slug}`, kind: r.kind, n }; }).sort((a, b) => b.n - a.n);
console.log(JSON.stringify(scored.slice(0, 4)));
process.exit(0);
