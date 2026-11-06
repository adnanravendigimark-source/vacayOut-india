import assert from "node:assert/strict";
import { test } from "node:test";
import { allRenditionUrls, parseRenditionUrl, pickWidth, planWidths, renditionDir, renditionUrl } from "./renditions";
import { renditionLoader } from "@/components/media/image";

const BLOB = "https://abc123.public.blob.vercel-storage.com/";

test("a large source gets the full ladder; a small one stops at its own width", () => {
  assert.deepEqual(planWidths(6000), [384, 640, 828, 1200, 1920]);
  assert.deepEqual(planWidths(1000), [384, 640, 828, 1000]);
  assert.deepEqual(planWidths(300), [300]);
  assert.deepEqual(planWidths(1920), [384, 640, 828, 1200, 1920]);
});

test("rendition URLs are recognised; originals, query strings and look-alikes are not", () => {
  assert.deepEqual(parseRenditionUrl(`${BLOB}img/places/kochi-3f1c/w1920.webp`), { root: BLOB, dir: "img/places/kochi-3f1c", maxWidth: 1920 });
  assert.deepEqual(parseRenditionUrl("/uploads/img/places/x-1/w828.webp"), { root: "/uploads/", dir: "img/places/x-1", maxWidth: 828 });
  assert.equal(parseRenditionUrl(`${BLOB}places/kochi/abc.jpg`), null);
  assert.equal(parseRenditionUrl(`${BLOB}img/a/w1920.webp?x=1`), null);
  assert.equal(parseRenditionUrl(`${BLOB}img/a/w9.webp`), null);
  assert.equal(parseRenditionUrl("/images/states/goa.jpg"), null);
});

test("never upscales: picks the smallest width that covers the request, capped at what exists", () => {
  assert.equal(pickWidth(600, 1920), 640);
  assert.equal(pickWidth(640, 1920), 640);
  assert.equal(pickWidth(3840, 1920), 1920);
  assert.equal(pickWidth(1080, 1000), 1000);
  assert.equal(pickWidth(16, 1920), 384);
});

test("the loader maps next/image widths to sibling files; other URLs pass through", () => {
  const src = `${BLOB}img/places/goa-1/w1920.webp`;
  assert.equal(renditionLoader({ src, width: 750 }), `${BLOB}img/places/goa-1/w828.webp`);
  assert.equal(renditionUrl(parseRenditionUrl(src)!, 384), `${BLOB}img/places/goa-1/w384.webp`);
  assert.equal(renditionLoader({ src: "/x.jpg", width: 750 }), "/x.jpg");
  assert.equal(allRenditionUrls(src).length, 5);
});

test("set folders keep the place grouping, drop the extension and unsafe characters", () => {
  assert.equal(renditionDir("places/kerala/abc.jpg", "1234-abcd"), "img/places/kerala/abc-1234-abcd");
  const hostile = renditionDir("../../etc/pass wd", "id/../x");
  assert.ok(!hostile.includes("..") && !hostile.includes(" ") && hostile.startsWith("img/"), hostile);
});
