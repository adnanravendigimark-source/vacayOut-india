import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { encodeRenditions, isRaster } from "./encode";

const photo = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 30, g: 120, b: 200 } } }).jpeg().toBuffer().then((b) => new Uint8Array(b));

test("a large photo becomes the full WebP ladder with proportional height", async () => {
  const enc = await encodeRenditions(await photo(3000, 2000));
  assert.deepEqual(enc.files.map((f) => f.width), [384, 640, 828, 1200, 1920]);
  assert.equal(enc.width, 1920);
  assert.equal(enc.height, 1280);
  for (const f of enc.files) {
    const meta = await sharp(f.bytes).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.width, f.width);
  }
});

test("small sources are never upscaled", async () => {
  const enc = await encodeRenditions(await photo(500, 400));
  assert.deepEqual(enc.files.map((f) => f.width), [384, 500]);
});

test("garbage input throws instead of storing a broken image; only photos are resized", async () => {
  await assert.rejects(encodeRenditions(new Uint8Array([1, 2, 3, 4])));
  assert.equal(isRaster("image/jpeg"), true);
  assert.equal(isRaster("image/svg+xml"), false);
});

test("EXIF rotation is applied before sizing (portrait phone photos stay portrait)", async () => {
  const sideways = new Uint8Array(await sharp({ create: { width: 900, height: 300, channels: 3, background: "red" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer());
  const enc = await encodeRenditions(sideways);
  assert.equal(enc.width, 300);
  assert.equal(enc.height, 900);
});
