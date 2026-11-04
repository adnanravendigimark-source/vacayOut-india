import "server-only";
import { getDb } from "../src/lib/db/index.js";
import { places, placeVersions, sections, media } from "../src/lib/db/schema.js";
import { eq } from "drizzle-orm";

async function inspectGoaSnapshot() {
  const db = getDb();
  const [goa] = await db.select().from(places).where(eq(places.slug, "goa")).limit(1);
  if (!goa) return;

  const [pv] = await db.select().from(placeVersions).where(eq(placeVersions.id, goa.publishedVersionId!)).limit(1);
  const snap = pv?.snapshot as any;
  console.log("Published version:", pv?.version);
  console.log("Snapshot sections:", snap?.sections?.map((s: any) => s.key));

  const regionsSec = snap?.sections?.find((s: any) => s.key === "regions");
  console.log("Regions in snapshot:", JSON.stringify(regionsSec?.body, null, 2));

  const stateMedia = await db.select({ id: media.id, url: media.url, caption: media.caption, kind: media.kind }).from(media).where(eq(media.placeId, goa.id));
  console.log("Goa media count:", stateMedia.length);
  for (const m of stateMedia) {
    console.log("-", m.caption, m.url.slice(0, 60));
  }
}

inspectGoaSnapshot().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

