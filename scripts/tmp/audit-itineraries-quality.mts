// Read-only: validates every itinerary against the app's own schema and scores completeness.
import "server-only";
import { getDb } from "../../src/lib/db/index.js";
import { itineraries, places } from "../../src/lib/db/schema.js";
import { eq } from "drizzle-orm";
import { validateItinerary, planText } from "../../src/lib/itineraries/plan.js";
import { writeFileSync } from "node:fs";
const rows = await getDb().select({ it: itineraries, placeName: places.name, placeSlug: places.slug, kind: places.kind }).from(itineraries).innerJoin(places, eq(places.id, itineraries.placeId));
const out = rows.map(({ it, placeName, placeSlug, kind }) => {
  const p: any = it.plan; const days: any[] = p.days ?? [];
  const v = validateItinerary({ slug: it.slug, title: it.title, summary: it.summary, durationDays: it.durationDays, tripTypes: it.tripTypes, seoTitle: it.seoTitle ?? "", seoDescription: it.seoDescription ?? "", plan: p });
  const stops = days.flatMap((d) => d.stops ?? []);
  const cnt = (f: (d: any) => unknown) => days.filter(f).length;
  let words = 0; try { words = planText(it.title, p).split(/\s+/).length; } catch {}
  const travelDays = days.length;
  const score = {
    overnight: cnt((d) => d.overnight) / travelDays, distance: cnt((d) => d.distance || d.distanceKm) / travelDays,
    driveTime: cnt((d) => d.driveTime) / travelDays, meals: cnt((d) => d.meals) / travelDays,
    stopTime: stops.filter((s) => s.time).length / Math.max(1, stops.length), stopDur: stops.filter((s) => s.duration).length / Math.max(1, stops.length),
    linked: stops.filter((s) => s.placeSlug).length / Math.max(1, stops.length),
  };
  return { slug: it.slug, title: it.title, status: it.status, locked: it.locked, place: placeName, placeSlug, kind, days: it.durationDays, valid: v.ok ? "ok" : v.error,
    nStops: stops.length, words, budgetLines: p.budget?.lines?.length ?? 0, booking: p.booking?.length ?? 0, tips: p.tips?.length ?? 0, prep: p.prep?.length ?? 0, faqs: p.faqs?.length ?? 0,
    sources: it.sources.length, findings: it.findingIds.length, tripTypes: it.tripTypes, season: p.season ?? null, start: p.start ?? null, end: p.end ?? null,
    score: Object.fromEntries(Object.entries(score).map(([k, x]) => [k, Math.round(x * 100)])),
    sameAsPublished: it.publishedSnapshot ? JSON.stringify((it.publishedSnapshot as any).plan) === JSON.stringify(p) : null, updated: it.updatedAt.toISOString().slice(0, 10) };
});
writeFileSync(".tmp-itinerary-audit.json", JSON.stringify(out, null, 1));
console.log("TOTAL", out.length, "published", out.filter((o) => o.status === "published").length, "draft", out.filter((o) => o.status !== "published").length, "locked", out.filter((o) => o.locked).length, "invalid", out.filter((o) => o.valid !== "ok").length);
for (const o of out.filter((o) => o.valid !== "ok")) console.log("INVALID", o.slug, o.valid);
process.exit(0);
