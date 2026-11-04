import "server-only";
import { getPublishedPlace, listPublishedChildren, listInlineChildren, listPublishedRelated } from "../src/lib/places/repo.js";
import { placeRollup } from "../src/lib/places/rollup.js";

async function main() {
  const state = "uttarakhand";
  const place = "rishikesh";
  const p = await getPublishedPlace(state, place);
  console.log("p:", p ? "exists" : "null");
  if (!p) return;
  console.log("snapshot place:", p.snapshot.place);
  const items = await listPublishedChildren(p.id);
  console.log("items:", items.length);
  const inline = await listInlineChildren(p.id);
  console.log("inline:", inline.length);
  const related = await listPublishedRelated(p.id);
  console.log("related:", related.length);
  const rollup = await placeRollup({ id: p.id, slug: p.snapshot.place.slug, kind: p.snapshot.place.kind }, state);
  console.log("rollup:", rollup);
}

main().then(() => process.exit(0)).catch(e => { console.error("Error:", e); process.exit(1); });

