// Read-only audit of every itinerary: structure, completeness, sources, status.
import "server-only";
import { getDb } from "../../src/lib/db/index.js";
import { itineraries, places } from "../../src/lib/db/schema.js";
import { eq } from "drizzle-orm";
const rows = await getDb().select({ it: itineraries, placeName: places.name, placeKind: places.kind }).from(itineraries).innerJoin(places, eq(places.id, itineraries.placeId));
const out = rows.map(({ it, placeName, placeKind }) => {
  const p = it.plan;
  const days = p.days ?? [];
  const stops = days.reduce((n, d) => n + (d.stops?.length ?? 0), 0);
  const has = (f: (d: any) => unknown) => days.filter(f).length;
  const pub = it.publishedSnapshot ? JSON.stringify(it.publishedSnapshot.plan) === JSON.stringify(p) : null;
  return {
    slug: it.slug, status: it.status, locked: it.locked, place: `${placeName} (${placeKind})`, days: it.durationDays, planDays: days.length,
    stops, timed: days.reduce((n, d) => n + (d.stops ?? []).filter((s: any) => s.time).length, 0),
    overnight: has((d) => d.overnight), dist: has((d) => d.distance || d.distanceKm), drive: has((d) => d.driveTime || d.travel), meals: has((d) => d.meals),
    budgetLines: p.budget?.lines?.length ?? 0, booking: p.booking?.length ?? 0, tips: p.tips?.length ?? 0, faqs: p.faqs?.length ?? 0,
    season: !!p.season, start: !!p.start, sources: it.sources.length, findings: it.findingIds.length, draftSameAsPublished: pub,
    overviewLen: (p.overview ?? "").length, updated: it.updatedAt.toISOString().slice(0, 10),
  };
});
console.table(out.map(({ slug, status, locked, days, planDays, stops, timed, overnight, dist, drive, budgetLines, sources, findings, draftSameAsPublished }) => ({ slug: slug.slice(0, 38), status, locked, days, planDays, stops, timed, overnight, dist, drive, budgetLines, sources, findings, same: draftSameAsPublished })));
console.log("TOTAL", out.length, "| published", out.filter((o) => o.status === "published").length, "| locked", out.filter((o) => o.locked).length);
console.log(JSON.stringify(out.map((o) => [o.slug, o.place, o.days]), null, 0));
process.exit(0);
