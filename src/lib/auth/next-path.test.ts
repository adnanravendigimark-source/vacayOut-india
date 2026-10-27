import assert from "node:assert/strict";
import { test } from "node:test";
import { safeNext } from "./next-path";

test("only same-site, non-admin paths are allowed after sign-in", () => {
  assert.equal(safeNext("/chat"), "/chat");
  assert.equal(safeNext("/india/kerala?x=1"), "/india/kerala?x=1");
  for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "/admin", "/admin/places", "/api/me", "javascript:alert(1)", "", null, "/a b"]) assert.equal(safeNext(bad), "/account", String(bad));
});
