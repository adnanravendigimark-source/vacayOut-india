import assert from "node:assert/strict";
import { test } from "node:test";
import { mapLimit, preloadedImageUrls, summarise, warmPaths } from "./warm";

test("mapLimit keeps at most N in flight and preserves order", async () => {
  let active = 0;
  let peak = 0;
  const out = await mapLimit([1, 2, 3, 4, 5, 6], 2, async (n) => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, 5));
    active--;
    return n * 10;
  });
  assert.deepEqual(out, [10, 20, 30, 40, 50, 60]);
  assert.equal(peak, 2);
});

test("only same-origin optimiser URLs from image preloads are warmed", () => {
  const html = `<link rel="preload" as="image" href="/brand/logo.svg"/>
<link rel="preload" as="image" imageSrcSet="/_next/image?url=a&amp;w=640&amp;q=75 640w, /_next/image?url=a&amp;w=1080&amp;q=75 1080w" imageSizes="100vw"/>
<link rel="preload" as="font" href="/_next/image?url=nope"/>`;
  assert.deepEqual(preloadedImageUrls(html, "https://x.test"), ["https://x.test/_next/image?url=a&w=640&q=75", "https://x.test/_next/image?url=a&w=1080&q=75"]);
});

test("warmPaths reports failures without throwing and respects the deadline", async () => {
  const seen: string[] = [];
  const fake = (async (url: string) => {
    seen.push(url);
    if (url.endsWith("/broken")) throw new Error("boom");
    return new Response("<html></html>", { status: url.endsWith("/missing") ? 404 : 200, headers: { "x-vercel-cache": "HIT" } });
  }) as unknown as typeof fetch;
  const res = await warmPaths("https://x.test/", ["/", "/missing", "/broken"], { fetchImpl: fake, concurrency: 1 });
  assert.deepEqual(res.map((r) => r.status), [200, 404, 0]);
  const s = summarise(res);
  assert.equal(s.ok, 1);
  assert.equal(s.failed.length, 2);

  let clock = 0;
  const late = await warmPaths("https://x.test", ["/a", "/b", "/c"], { fetchImpl: fake, concurrency: 1, deadline: 1, now: () => clock++ });
  assert.ok(late.length < 3, `stopped early (${late.length})`);
  assert.ok(seen.every((u) => u.startsWith("https://x.test/")));
});
