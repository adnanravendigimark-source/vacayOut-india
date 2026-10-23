import assert from "node:assert/strict";
import { test } from "node:test";
import { sniffImage } from "./sniff";
import { pathsToRefresh, publicLocation } from "../publish/paths";

test("image type comes from file bytes, not the name", () => {
  assert.equal(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  const webp = new TextEncoder().encode("RIFF0000WEBPVP8 ");
  assert.equal(sniffImage(webp), "image/webp");
  assert.equal(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>")), null);
  assert.equal(sniffImage(new TextEncoder().encode("GIF89a")), null);
});

test("refresh paths and public locations", () => {
  assert.deepEqual(pathsToRefresh({ kind: "state", slug: "himachal-pradesh", displayMode: "page", stateSlug: "himachal-pradesh", parentPath: null }), ["/india/himachal-pradesh"]);
  assert.deepEqual(
    pathsToRefresh({ kind: "city", slug: "manali", displayMode: "page", stateSlug: "himachal-pradesh", parentPath: "/india/himachal-pradesh" }),
    ["/india/himachal-pradesh/manali", "/india/himachal-pradesh"],
  );
  assert.equal(
    publicLocation({ kind: "temple", slug: "hadimba-temple", displayMode: "parent_section", stateSlug: "himachal-pradesh", parentPath: "/india/himachal-pradesh/manali" }),
    "/india/himachal-pradesh/manali#hadimba-temple",
  );
});
