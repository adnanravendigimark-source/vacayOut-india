import assert from "node:assert/strict";
import { test } from "node:test";
import { STOP_REF_RE, stopRef, validateItinerary } from "./plan";

const base = {
  slug: "two-days-test",
  title: "Two days in a test city",
  summary: "A short, realistic plan used only by these tests to exercise validation.",
  durationDays: 2,
  tripTypes: ["heritage"],
  seoTitle: "Two days in a test city",
  seoDescription: "A short, realistic two-day plan used only by these tests to exercise the itinerary validation rules.",
  plan: {
    overview: "Overview text.",
    days: [
      { title: "Day one", stops: [{ name: "Fort", placeSlug: "red-fort" }] },
      { title: "Day two", stops: [{ name: "Palace", placeSlug: "rajasthan/amber-fort" }] },
    ],
    budget: { assumptions: "Entry fees only.", lines: [] },
    booking: [],
    alternatives: [],
  },
};

test("stop references are a slug or state/slug", () => {
  for (const ok of ["red-fort", "rajasthan/amber-fort", "delhi"]) assert.ok(STOP_REF_RE.test(ok), ok);
  for (const bad of ["Red-Fort", "a/b/c", "/x", "x/", "rajasthan/", "../etc"]) assert.ok(!STOP_REF_RE.test(bad), bad);
  assert.deepEqual(stopRef("red-fort", "delhi"), { state: "delhi", slug: "red-fort" });
  assert.deepEqual(stopRef("rajasthan/amber-fort", "delhi"), { state: "rajasthan", slug: "amber-fort" });
  assert.equal(stopRef("red-fort", null), null);
});

test("a plan with same-state and cross-state stops validates", () => {
  const r = validateItinerary(base);
  assert.ok(r.ok, r.ok ? "" : r.error);
});

test("days must match the duration and bad stop links are rejected", () => {
  assert.equal(validateItinerary({ ...base, durationDays: 3 }).ok, false);
  const bad = structuredClone(base);
  bad.plan.days[0].stops[0].placeSlug = "Not A Slug";
  assert.equal(validateItinerary(bad).ok, false);
});
