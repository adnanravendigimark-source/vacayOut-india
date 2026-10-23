import assert from "node:assert/strict";
import { test } from "node:test";
import { sampleContentEnabled, sampleDestinations, sampleGuides, sampleItineraries, sampleZones } from "./sample";
import { ZONES } from "../places/states";
import { TRIP_TYPES } from "../places/trip-types";

test("sample content is off in production unless explicitly switched on", () => {
  assert.equal(sampleContentEnabled({ NODE_ENV: "production" } as NodeJS.ProcessEnv), false);
  assert.equal(sampleContentEnabled({ NODE_ENV: "development" } as NodeJS.ProcessEnv), true);
  assert.equal(sampleContentEnabled({ NODE_ENV: "production", HOMEPAGE_SAMPLE_CONTENT: "1" } as NodeJS.ProcessEnv), true);
  assert.equal(sampleContentEnabled({ NODE_ENV: "development", HOMEPAGE_SAMPLE_CONTENT: "0" } as NodeJS.ProcessEnv), false);
});

test("every sample item is marked as sample, so it never links to a guide page", () => {
  for (const d of [...sampleDestinations, ...sampleGuides, ...sampleItineraries.map((i) => i.destination)]) assert.equal(d.sample, true, d.name);
  for (const z of sampleZones(ZONES)) for (const s of z.states) assert.equal(s.sample, true, s.name);
  const keys = new Set<string>(TRIP_TYPES.map((t) => t.key));
  for (const d of sampleDestinations) for (const t of d.tripTypes) assert.ok(keys.has(t), `${d.name}: ${t}`);
});
