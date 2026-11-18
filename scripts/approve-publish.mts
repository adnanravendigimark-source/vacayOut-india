/**
 * After `seed:content` and a clean quote check, approves the DRAFT sections that a content file
 * wrote (through the same approveSectionWithFacts the admin uses — facts with a conflict note or
 * unsupported quotes are refused) and publishes each place through publishPlace.
 * Then publishes the file's itineraries (publishItinerary re-checks their cited facts) unless edited by a person.
 * Locked (person-edited) sections are never touched. SEO title/description are taken from the
 * file only when the stored ones are empty or fail the publish length limits.
 *
 *   tsx --env-file-if-exists=.env.local --conditions=react-server scripts/approve-publish.mts content/travel/<cluster>.json [--dry]
 */
import { readFileSync } from "node:fs";
import { and, eq, ne } from "drizzle-orm";
const { getDb } = await import("@/lib/db");
const { places, sections, users } = await import("@/lib/db/schema");
const { approveSectionWithFacts } = await import("@/lib/places/review");
const { publishPlace } = await import("@/lib/publish/service");
const { publishItinerary } = await import("@/lib/itineraries/service");
const { itineraries } = await import("@/lib/db/schema");
type SK = Parameters<typeof approveSectionWithFacts>[1];

const file = JSON.parse(readFileSync(process.argv[2], "utf8"));
const dry = process.argv.includes("--dry");
const db = getDb();
const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
const order = (k: string) => (k.includes("/") ? 1 : 0); // states first, then destinations, then children by file order
for (const p of [...file.places].sort((a: { key: string }, b: { key: string }) => order(a.key) - order(b.key))) {
  const [stateSlug, slug] = p.key.includes("/") ? p.key.split("/") : [p.key, p.key];
  const [state] = await db.select().from(places).where(and(eq(places.kind, "state"), eq(places.slug, stateSlug))).limit(1);
  const [row] = p.key.includes("/") ? await db.select().from(places).where(and(eq(places.stateId, state.id), eq(places.slug, slug), ne(places.kind, "state"))).limit(1) : [state];
  if (!row) { console.log(`✗ ${p.key}: not in DB (seed first)`); continue; }
  const fix: Record<string, string> = {};
  if (!row.seoTitle || row.seoTitle.length > 70) fix.seoTitle = p.seoTitle;
  if (!row.seoDescription || row.seoDescription.length > 170) fix.seoDescription = p.seoDescription;
  if (Object.keys(fix).length && !dry) await db.update(places).set({ ...fix, updatedAt: new Date() }).where(eq(places.id, row.id));
  const secs = await db.select().from(sections).where(eq(sections.placeId, row.id));
  const refused: string[] = [];
  let approved = 0;
  for (const key of Object.keys(p.sections ?? {})) {
    const s = secs.find((x) => x.key === key);
    if (!s || s.status !== "draft" || s.locked) continue;
    if (dry) { approved++; continue; }
    const r = await approveSectionWithFacts(row.id, key as SK, admin.id);
    if (r.ok) approved++; else refused.push(`${key}: ${r.problems.join("; ")}`);
  }
  let pub = "dry run";
  if (!dry) {
    const r = await publishPlace(row.id, admin.id);
    pub = r.ok ? `published v${r.version}` : `NOT published — ${"problems" in r && r.problems ? r.problems.join("; ") : r.message}`;
  }
  console.log(`${p.key}: approved ${approved}${Object.keys(fix).length ? `, fixed ${Object.keys(fix).join("+")}` : ""}, ${pub}`);
  for (const x of refused) console.log(`   refused ${x}`);
}
for (const it of file.itineraries ?? []) {
  const [row] = await db.select({ id: itineraries.id, status: itineraries.status, locked: itineraries.locked }).from(itineraries).where(eq(itineraries.slug, it.slug)).limit(1);
  if (!row) { console.log(`✗ itinerary ${it.slug}: not in DB`); continue; }
  if (row.status === "published" || row.locked || dry) { console.log(`itinerary ${it.slug}: ${row.status}${row.locked ? " (edited by a person)" : ""}, left alone`); continue; }
  const r = await publishItinerary(row.id, admin.id);
  console.log(`itinerary ${it.slug}: ${r.ok ? "published" : `NOT published — ${"problems" in r && r.problems ? r.problems.join("; ") : r.message}`}`);
}
process.exit(0);
