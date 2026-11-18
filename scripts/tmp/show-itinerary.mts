// Read-only: print one itinerary's draft plan compactly.
import "server-only";
import { getDb } from "../../src/lib/db/index.js";
import { itineraries } from "../../src/lib/db/schema.js";
import { eq } from "drizzle-orm";
for (const slug of process.argv.slice(2)) {
  const [r] = await getDb().select().from(itineraries).where(eq(itineraries.slug, slug));
  const p = r.plan;
  console.log(`\n##### ${slug} | ${r.title}\nSUMMARY: ${r.summary}\nOVERVIEW: ${p.overview}\nstart=${p.start} end=${p.end} season=${p.season} transport=${p.transport}`);
  for (const [i, d] of p.days.entries()) {
    console.log(`DAY ${i + 1}: ${d.title} | overnight=${d.overnight ?? "-"} | dist=${d.distance ?? d.distanceKm ?? "-"} | drive=${d.driveTime ?? "-"} | travel=${(d.travel ?? "-").slice(0, 120)}`);
    for (const s of d.stops) console.log(`   ${s.time ?? ""} ${s.name} [${s.duration ?? ""}] ${(s.note ?? "").slice(0, 140)}`);
  }
  console.log("BUDGET:", JSON.stringify(p.budget).slice(0, 400));
  console.log("BOOKING:", p.booking.length, "| TIPS:", (p.tips ?? []).length, "| ALTS:", p.alternatives.length, "| SOURCES:", r.sources.map((s) => s.site).join(", ").slice(0, 300));
}
process.exit(0);
