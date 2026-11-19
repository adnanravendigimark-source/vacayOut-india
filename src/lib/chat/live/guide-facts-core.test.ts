import assert from "node:assert/strict";
import { test } from "node:test";
import { factsFromSnapshot, namedIn } from "./guide-facts-core";

const list = [
  { key: "himachal pradesh", name: "Himachal Pradesh", placeId: "1" },
  { key: "old goa", name: "Old Goa", placeId: "2" },
  { key: "manali", name: "Manali", placeId: "3" },
  { key: "shimla", name: "Shimla", placeId: "4" },
  { key: "goa", name: "Goa", placeId: "5" },
].sort((a, b) => b.key.length - a.key.length);

test("finds whole destination names, longest first, at most two", () => {
  assert.deepEqual(namedIn("Manali or Shimla for a family trip?", list).map((d) => d.name), ["Manali", "Shimla"]);
  assert.deepEqual(namedIn("Churches of Old Goa", list).map((d) => d.name), ["Old Goa"]);
  assert.deepEqual(namedIn("Goan food", list), []);
});

test("facts stay short: key facts first, then best time and reach if missing", () => {
  const t = factsFromSnapshot(
    "Manali",
    {
      sections: [
        { key: "key_facts", body: { items: [{ title: "Altitude", body: "About 2,050 m" }, { title: "Nearest airport", body: "Bhuntar, 50 km" }] } },
        { key: "best_time", body: { text: "April to July and October to December are the main seasons. Snow falls in winter." } },
        { key: "how_to_reach", body: { text: "By air: Bhuntar is 50 km away." } },
      ] as never,
    },
    400,
  );
  assert.equal(t, "Manali — Altitude: About 2,050 m; Nearest airport: Bhuntar, 50 km; Best time: April to July and October to December are the main seasons.");
  assert.ok(factsFromSnapshot("X", { sections: [] as never }, 400) === "");
});
