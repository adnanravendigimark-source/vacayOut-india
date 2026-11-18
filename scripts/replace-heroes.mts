/**
 * Replaces weak hero images with editor-chosen Wikimedia Commons files, then republishes
 * the page through the normal publish service so the public snapshot picks up the new hero.
 * Old images stay in the place's media (switch back in the admin if needed).
 *
 *   tsx --env-file-if-exists=.env.local --conditions=react-server scripts/replace-heroes.mts content/heroes/2026-11-18.json
 * File: [{ "state": "himachal-pradesh", "slug": "shimla", "commons": "File:….jpg", "alt": "…" }]
 */
import { readFileSync } from "node:fs";
import { and, eq, ne } from "drizzle-orm";
const { getDb } = await import("@/lib/db");
const { places, users } = await import("@/lib/db/schema");
const { commonsPageId } = await import("@/lib/media/commons");
const { importCommonsToPlace } = await import("@/lib/media/import");
const { publishPlace } = await import("@/lib/publish/service");

/** publish: also publish a draft whose sections an editor already approved (publishPlace re-checks everything). */
type Row = { state: string; slug: string; commons: string; alt: string; caption?: string; publish?: boolean };
const rows: Row[] = JSON.parse(readFileSync(process.argv[2], "utf8"));
const db = getDb();
const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
if (!admin) throw new Error("No admin user.");

const failed: string[] = [];
for (const r of rows) {
  const tag = `${r.state}/${r.slug}`;
  try {
    const [state] = await db.select({ id: places.id }).from(places).where(and(eq(places.kind, "state"), eq(places.slug, r.state))).limit(1);
    if (!state) throw new Error("unknown state");
    const [place] = await db.select().from(places).where(and(eq(places.stateId, state.id), eq(places.slug, r.slug), ne(places.kind, "state"))).limit(1);
    if (!place) throw new Error("unknown place");
    const pageId = await commonsPageId(r.commons);
    if (!pageId) throw new Error("Commons file not found");
    const imp = await importCommonsToPlace({ placeId: place.id, pageId, alt: r.alt, caption: r.caption ?? null, userId: admin.id });
    const mediaId = imp.ok ? imp.mediaId : "duplicate" in imp && imp.duplicate ? imp.mediaId : null;
    if (!mediaId) throw new Error(imp.message);
    await db.update(places).set({ heroMediaId: mediaId, updatedAt: new Date() }).where(eq(places.id, place.id));
    if (place.status === "published" || (r.publish && place.status === "draft")) {
      const pub = await publishPlace(place.id, admin.id);
      if (!pub.ok) throw new Error(`hero set, republish blocked: ${pub.message} ${JSON.stringify("problems" in pub ? pub.problems : [])}`);
      console.log(`✓ ${tag} → v${pub.version}`);
    } else console.log(`✓ ${tag} hero set (place is ${place.status}, not published)`);
  } catch (e) {
    failed.push(`${tag}: ${e instanceof Error ? e.message : String(e)}`);
    console.log(`✗ ${tag}: ${e instanceof Error ? e.message : String(e)}`);
  }
  await new Promise((res) => setTimeout(res, 500));
}
console.log(`\nDone. ${rows.length - failed.length}/${rows.length} ok.`);
if (failed.length) console.log("Failed:\n  " + failed.join("\n  "));
process.exit(0);
