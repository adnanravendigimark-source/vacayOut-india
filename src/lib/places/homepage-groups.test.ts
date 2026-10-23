import assert from "node:assert/strict";
import { test } from "node:test";
import { INDIA_REGIONS, ZONE_OF, zoneOf } from "./states";
import { cleanTripTypes, TRIP_TYPES } from "./trip-types";

test("every state and UT has exactly one homepage zone", () => {
  assert.equal(Object.keys(ZONE_OF).length, INDIA_REGIONS.length);
  for (const r of INDIA_REGIONS) assert.ok(ZONE_OF[r.name], r.name);
  assert.equal(zoneOf("Himachal Pradesh"), "North");
  assert.equal(zoneOf("Orissa"), "East");
  assert.equal(zoneOf("Sikkim"), "Northeast");
  assert.equal(zoneOf("Lakshadweep"), "Islands");
  assert.equal(zoneOf("Atlantis"), null);
});

test("trip types are filtered to known keys, deduplicated and ordered", () => {
  assert.deepEqual(cleanTripTypes(["weekend", "mountains", "mountains", "bogus", 7, null]), ["mountains", "weekend"]);
  assert.deepEqual(cleanTripTypes([]), []);
  assert.equal(new Set(TRIP_TYPES.map((t) => t.key)).size, TRIP_TYPES.length);
});
