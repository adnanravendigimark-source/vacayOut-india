import assert from "node:assert/strict";
import { test } from "node:test";
import { isSafePath, publicPaths } from "./paths";
import { hasBearer } from "@/lib/ops/bearer";

test("public paths: hubs first, states before destinations, no duplicates, inline places skipped", () => {
  const paths = publicPaths({
    places: [
      { kind: "town", slug: "kochi", stateSlug: "kerala" },
      { kind: "state", slug: "kerala", stateSlug: null },
      { kind: "attraction", slug: "orphan", stateSlug: null },
      { kind: "town", slug: "kochi", stateSlug: "kerala" },
    ],
    itineraries: [{ slug: "kerala-5-days" }],
    guides: [{ slug: "" }],
  });
  assert.equal(paths[0], "/");
  assert.ok(paths.indexOf("/india/kerala") < paths.indexOf("/india/kerala/kochi"));
  assert.equal(paths.filter((p) => p === "/india/kerala/kochi").length, 1);
  assert.ok(paths.includes("/itineraries/kerala-5-days"));
  assert.ok(!paths.some((p) => p.includes("orphan") || p === "/travel-guides/"));
});

test("refresh accepts only site-relative slug paths", () => {
  for (const ok of ["/", "/india/kerala", "/india/kerala/kochi", "/travel-guides/a-b"]) assert.equal(isSafePath(ok), true, ok);
  for (const bad of ["india", "//evil.com", "/india/../admin", "/a?b=1", "/A", "https://x.test/", "/a/", 42]) assert.equal(isSafePath(bad), false, String(bad));
});

test("bearer check is exact and fails closed without a secret", () => {
  const req = (h?: string) => new Request("https://x.test", { headers: h ? { authorization: h } : {} });
  assert.equal(hasBearer(req("Bearer s3cret"), "s3cret"), true);
  assert.equal(hasBearer(req("Bearer s3cre"), "s3cret"), false);
  assert.equal(hasBearer(req("Bearer "), ""), false);
  assert.equal(hasBearer(req(), undefined), false);
});
